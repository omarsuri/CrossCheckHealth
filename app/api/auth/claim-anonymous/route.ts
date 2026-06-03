import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const claimAnonymousSchema = z.object({
  user_id: z.string().uuid(),
  anonymous_id: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = claimAnonymousSchema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid claim-anonymous payload", 400, parsed.error.flatten());
    }

    const { user_id, anonymous_id } = parsed.data;

    const { data: claimedAssessments, error: assessmentsError } = await supabaseAdmin
      .from("assessments")
      .update({ user_id, is_anonymous: false })
      .eq("anonymous_id", anonymous_id)
      .is("user_id", null)
      .select("id");

    if (assessmentsError) {
      console.error("Claim anonymous assessments failure:", assessmentsError);
      return errorResponse("Failed to claim heart assessment data", 500, assessmentsError);
    }

    const { data: claimedBodyFitness, error: bodyFitnessError } = await supabaseAdmin
      .from("body_fitness_assessments")
      .update({ user_id })
      .eq("anonymous_id", anonymous_id)
      .is("user_id", null)
      .select("id");

    if (bodyFitnessError) {
      console.error("Claim anonymous body fitness failure:", bodyFitnessError);
      return errorResponse("Failed to claim body-fat assessment data", 500, bodyFitnessError);
    }

    return successResponse({
      message: "Anonymous assessment data claimed successfully",
      claimed: {
        assessments: claimedAssessments?.length ?? 0,
        body_fitness_assessments: claimedBodyFitness?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("Claim anonymous route error:", error);
    return errorResponse("Something went wrong while claiming anonymous data", 500, error);
  }
}
