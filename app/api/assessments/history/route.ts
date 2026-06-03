import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id")?.trim();
    const anonymousId = searchParams.get("anonymous_id")?.trim();

    if (!userId && !anonymousId) {
      return errorResponse("user_id or anonymous_id is required", 400);
    }

    const applyIdentityFilter = (query: any) => {
      if (userId) return query.eq("user_id", userId);
      return query.eq("anonymous_id", anonymousId);
    };

    const supportedAssessmentTypes = ["heart_quick", "heart_detailed", "parent_heart", "pcos"];

    const [heartResult, bodyResult] = await Promise.all([
      applyIdentityFilter(
        supabaseAdmin
          .from("assessments")
          .select("*, assessment_recommendations(*)")
          .in("assessment_type", supportedAssessmentTypes)
          .order("created_at", { ascending: false })
      ),
      applyIdentityFilter(
        supabaseAdmin
          .from("body_fitness_assessments")
          .select("*")
          .order("created_at", { ascending: false })
      ),
    ]);

    if (heartResult.error) {
      console.error("Assessment history heart fetch failure:", heartResult.error);
      return errorResponse("Failed to fetch heart assessment history", 500, heartResult.error);
    }

    if (bodyResult.error) {
      console.error("Assessment history body-fat fetch failure:", bodyResult.error);
      return errorResponse("Failed to fetch body-fat assessment history", 500, bodyResult.error);
    }

    const heartHistory = (heartResult.data ?? []).map((assessment) => ({
      id: assessment.id,
      source: "assessments",
      category: assessment.assessment_type === "pcos" ? "pcos" : "heart",
      assessment_type: assessment.assessment_type,
      result: assessment.risk_level,
      score: assessment.risk_score,
      summary: assessment.result_summary,
      created_at: assessment.created_at,
      recommendations: assessment.assessment_recommendations ?? [],
      raw: assessment,
    }));

    const bodyHistory = (bodyResult.data ?? []).map((assessment) => ({
      id: assessment.id,
      source: "body_fitness_assessments",
      category: "body",
      assessment_type: "body_fat",
      result: assessment.estimated_body_fat ?? assessment.result?.estimated_body_fat ?? null,
      score: assessment.adherence_score ?? assessment.result?.adherence_score ?? null,
      summary: assessment.summary ?? assessment.result?.summary ?? null,
      created_at: assessment.created_at,
      recommendations: assessment.recommendations ?? assessment.result?.recommendations ?? [],
      raw: assessment,
    }));

    const history = [...heartHistory, ...bodyHistory].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return successResponse({ history });
  } catch (error) {
    console.error("Assessment history route error:", error);
    return errorResponse("Something went wrong while fetching assessment history", 500, error);
  }
}
