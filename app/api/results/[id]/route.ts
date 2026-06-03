import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";
import { calculatePcosRisk } from "@/lib/services/pcos-scoring.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return errorResponse("Result id is required", 400);
    }

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .select("*, assessment_answers(*), assessment_recommendations(*)")
      .eq("id", id)
      .maybeSingle();

    if (assessmentError) {
      console.error("Result heart assessment fetch failure:", assessmentError);
      return errorResponse("Failed to fetch heart assessment result", 500, assessmentError);
    }

    if (assessment) {
      const isPcos = assessment.assessment_type === "pcos";
      const answerMap = Object.fromEntries(
        (assessment.assessment_answers ?? []).map((answer: any) => [
          answer.question_id,
          answer.answer_value,
        ])
      );
      const calculatedPcosResult = isPcos ? calculatePcosRisk(answerMap) : null;

      return successResponse({
        source: isPcos ? "pcos" : "heart",
        assessment,
        assessment_answers: assessment.assessment_answers ?? [],
        assessment_recommendations: assessment.assessment_recommendations ?? [],
        risk_factors: calculatedPcosResult?.riskFactors ?? [],
      });
    }

    const { data: bodyFitnessAssessment, error: bodyFitnessError } = await supabaseAdmin
      .from("body_fitness_assessments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (bodyFitnessError) {
      console.error("Result body-fat assessment fetch failure:", bodyFitnessError);
      return errorResponse("Failed to fetch body-fat assessment result", 500, bodyFitnessError);
    }

    if (bodyFitnessAssessment) {
      return successResponse({
        source: "body_fat",
        body_fitness_assessment: bodyFitnessAssessment,
      });
    }

    return errorResponse("Result not found", 404);
  } catch (error) {
    console.error("Result detail route error:", error);
    return errorResponse("Something went wrong while fetching result details", 500, error);
  }
}
