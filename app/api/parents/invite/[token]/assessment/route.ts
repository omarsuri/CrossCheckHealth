import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";
import { calculateHeartRisk } from "@/lib/services/heart-scoring.service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

const schema = z.object({
  answers: z.record(z.string(), z.string()),
  consent: z.boolean(),
});

export async function POST(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) return errorResponse("Invite token is required", 400);

    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid invited assessment payload", 400, parsed.error.flatten());
    }

    const { answers, consent } = parsed.data;

    if (!consent) {
      return errorResponse("Consent is required to submit this assessment", 400);
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("parent_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Parent invite assessment token lookup failure:", inviteError);
      return errorResponse("Failed to verify invite token", 500, inviteError);
    }

    if (!invite) {
      return errorResponse("Invite token not found", 404);
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return errorResponse("This invite link has expired", 410, { status: "expired" });
    }

    const { data: parentProfile, error: parentError } = await supabaseAdmin
      .from("parent_profiles")
      .select("*")
      .eq("id", invite.parent_profile_id)
      .maybeSingle();

    if (parentError) {
      console.error("Parent invite assessment profile lookup failure:", parentError);
      return errorResponse("Failed to fetch parent profile", 500, parentError);
    }

    if (!parentProfile) {
      return errorResponse("Linked parent profile not found", 404);
    }

    const result = calculateHeartRisk(answers, "detailed");
    const now = new Date().toISOString();

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: parentProfile.owner_user_id,
        anonymous_id: null,
        assessment_type: "parent_heart",
        parent_profile_id: parentProfile.id,
        parent_invite_id: invite.id,
        submitted_by_type: "parent_invite",
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        result_summary: result.summary,
        is_anonymous: false,
      })
      .select()
      .single();

    if (assessmentError) {
      console.error("Parent invite assessment insert failure:", assessmentError);
      return errorResponse("Failed to save invited parent assessment", 500, assessmentError);
    }

    const answerRows = Object.entries(answers).map(([question_id, answer_value]) => ({
      assessment_id: assessment.id,
      question_id,
      answer_value,
    }));

    if (answerRows.length > 0) {
      const { error: answersError } = await supabaseAdmin
        .from("assessment_answers")
        .insert(answerRows);

      if (answersError) {
        console.error("Parent invite assessment answer insert failure:", answersError);
        return errorResponse("Failed to save invited parent assessment answers", 500, answersError);
      }
    }

    const recommendationRows = result.recommendations.map((recommendation) => ({
      assessment_id: assessment.id,
      ...recommendation,
    }));

    if (recommendationRows.length > 0) {
      const { error: recommendationsError } = await supabaseAdmin
        .from("assessment_recommendations")
        .insert(recommendationRows);

      if (recommendationsError) {
        console.error("Parent invite assessment recommendation insert failure:", recommendationsError);
        return errorResponse("Failed to save invited parent assessment recommendations", 500, recommendationsError);
      }
    }

    const { error: parentUpdateError } = await supabaseAdmin
      .from("parent_profiles")
      .update({
        status: "completed",
        latest_result: result.riskLevel,
        last_assessment: now,
        consent: true,
      })
      .eq("id", parentProfile.id);

    if (parentUpdateError) {
      console.error("Parent profile completion update failure:", parentUpdateError);
      return errorResponse("Failed to update parent profile status", 500, parentUpdateError);
    }

    const { error: inviteUpdateError } = await supabaseAdmin
      .from("parent_invites")
      .update({
        status: "completed",
        accepted_at: now,
      })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      console.error("Parent invite completion update failure:", inviteUpdateError);
      return errorResponse("Failed to update invite status", 500, inviteUpdateError);
    }

    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: parentProfile.owner_user_id,
        type: "parent_assessment_completed",
        title: `${parentProfile.name} completed their heart assessment`,
        message: "Their health awareness result is now available.",
        related_entity_type: "assessment",
        related_entity_id: assessment.id,
      });

    if (notificationError) {
      console.error("Parent assessment completion notification insert failure:", notificationError);
    }

    return successResponse({
      assessment_id: assessment.id,
      result,
    });
  } catch (error) {
    console.error("Parent invite assessment route error:", error);
    return errorResponse("Something went wrong while submitting the invited assessment", 500, error);
  }
}
