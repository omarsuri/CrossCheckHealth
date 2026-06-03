import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateHeartRisk } from "@/lib/services/heart-scoring.service";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const schema = z.object({
  user_id: z.string().uuid({ message: "user_id is required for detailed heart assessment" }),
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid detailed assessment data", 400, parsed.error.flatten());
    }

    const { user_id, answers } = parsed.data;

    if (!user_id) {
      return errorResponse("Login is required for detailed heart assessment", 401);
    }

    const result = calculateHeartRisk(answers, "detailed");

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id,
        anonymous_id: null,
        assessment_type: "heart_detailed",
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        result_summary: result.summary,
        is_anonymous: false,
      })
      .select()
      .single();

    if (assessmentError) {
      console.error("Detailed heart assessment insert failure:", assessmentError);
      return errorResponse("Failed to save detailed heart assessment", 500, assessmentError);
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
        console.error("Detailed heart answer insert failure:", answersError);
        return errorResponse("Failed to save detailed heart assessment answers", 500, answersError);
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
        console.error("Detailed heart recommendation insert failure:", recommendationsError);
        return errorResponse("Failed to save detailed heart assessment recommendations", 500, recommendationsError);
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
    console.error("Detailed heart assessment route error:", error);
    return errorResponse("Something went wrong while saving detailed heart assessment", 500, error);
  }
}
