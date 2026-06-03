import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateHeartRisk } from "@/lib/services/heart-scoring.service";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const schema = z.object({
  user_id: z.string().uuid().optional(),
  anonymous_id: z.string().optional(),
  anonymous: z.boolean().default(true),
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "Invalid assessment data",
        400,
        parsed.error.flatten()
      );
    }

    const { user_id, anonymous_id, anonymous, answers } = parsed.data;

    const result = calculateHeartRisk(answers, "quick");

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .insert({
        user_id: user_id ?? null,
        anonymous_id: anonymous_id ?? null,
        assessment_type: "heart_quick",
        risk_level: result.riskLevel,
        risk_score: result.riskScore,
        result_summary: result.summary,
        is_anonymous: anonymous,
      })
      .select()
      .single();

    if (assessmentError) {
      console.error("Assessment insert failure:", assessmentError);
      return errorResponse("Failed to save assessment", 500, assessmentError);
    }

    const answerRows = Object.entries(answers).map(
      ([question_id, answer_value]) => ({
        assessment_id: assessment.id,
        question_id,
        answer_value,
      })
    );

    if (answerRows.length > 0) {
      const { error: answersError } = await supabaseAdmin
        .from("assessment_answers")
        .insert(answerRows);

      if (answersError) {
        console.error("Answer insert failure:", answersError);
        return errorResponse(
          "Failed to save assessment answers",
          500,
          answersError
        );
      }
    }

    const recommendationRows = result.recommendations.map((rec) => ({
      assessment_id: assessment.id,
      ...rec,
    }));

    if (recommendationRows.length > 0) {
      const { error: recommendationsError } = await supabaseAdmin
        .from("assessment_recommendations")
        .insert(recommendationRows);

      if (recommendationsError) {
        console.error("Recommendation insert failure:", recommendationsError);
        return errorResponse(
          "Failed to save assessment recommendations",
          500,
          recommendationsError
        );
      }
    }

    return successResponse({
      assessment_id: assessment.id,
      ...result,
    });
  } catch (error) {
    console.error("Quick heart assessment error:", error);

    return errorResponse(
      "Something went wrong",
      500,
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error
    );
  }
}
