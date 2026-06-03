import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";
import { calculatePcosRisk } from "@/lib/services/pcos-scoring.service";

const schema = z.object({
  user_id: z.string().uuid().optional(),
  anonymous_id: z.string().optional(),
  anonymous: z.boolean().optional(),
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid PCOS assessment data", 400, parsed.error.flatten());
    }

    const { user_id, anonymous_id, answers } = parsed.data;
    const isAnonymous = !user_id;

    if (isAnonymous && !anonymous_id) {
      return errorResponse("anonymous_id is required for anonymous PCOS assessments", 400);
    }

    const result = calculatePcosRisk(answers);

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: user_id ?? null,
        anonymous_id: isAnonymous ? anonymous_id : null,
        assessment_type: "pcos",
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        result_summary: result.summary,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (assessmentError || !assessment) {
      console.error("PCOS assessment insert failure:", assessmentError);
      return errorResponse("Failed to save PCOS assessment", 500, assessmentError);
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
        console.error("PCOS answer insert failure:", answersError);
        return errorResponse("Failed to save PCOS assessment answers", 500, answersError);
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
        console.error("PCOS recommendation insert failure:", recommendationsError);
        return errorResponse("Failed to save PCOS assessment recommendations", 500, recommendationsError);
      }
    }

    return successResponse({
      assessment_id: assessment.id,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      riskFactors: result.riskFactors,
      summary: result.summary,
      recommendations: result.recommendations,
    });
  } catch (error) {
    console.error("PCOS assessment route error:", error);
    return errorResponse("Something went wrong while saving PCOS assessment", 500, error);
  }
}
