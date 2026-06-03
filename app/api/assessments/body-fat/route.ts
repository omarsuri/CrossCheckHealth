import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calculateBodyFitness } from "@/lib/services/body-fitness.service";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const schema = z.object({
  user_id: z.string().uuid().optional(),
  anonymous_id: z.string().optional(),
  goal: z.string().min(1),
  sex: z.string().min(1),
  age: z.number(),
  height_cm: z.number(),
  weight_kg: z.number(),
  waist_cm: z.number().optional(),
  activity_level: z.string().min(1),
  workout_frequency: z.string().optional(),
  sleep_hours: z.number().optional(),
  timeline_weeks: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid body-fat data", 400, parsed.error.flatten());
    }

    const payload = parsed.data;
    const inputs = {
      anonymous_id: payload.anonymous_id ?? null,
      goal: payload.goal,
      sex: payload.sex,
      age: payload.age,
      height_cm: payload.height_cm,
      weight_kg: payload.weight_kg,
      waist_cm: payload.waist_cm,
      activity_level: payload.activity_level,
      workout_frequency: payload.workout_frequency,
      sleep_hours: payload.sleep_hours,
      timeline_weeks: payload.timeline_weeks,
    };

    const result = calculateBodyFitness(payload);

    const { data, error } = await supabaseAdmin
      .from("body_fitness_assessments")
      .insert({
        user_id: payload.user_id ?? null,
        anonymous_id: payload.anonymous_id ?? null,
        goal: payload.goal,
        sex: payload.sex,
        age: payload.age,
        height_cm: payload.height_cm,
        weight_kg: payload.weight_kg,
        waist_cm: payload.waist_cm ?? null,
        activity_level: payload.activity_level,
        workout_frequency: payload.workout_frequency ?? null,
        sleep_hours: payload.sleep_hours ?? null,
        timeline_weeks: payload.timeline_weeks ?? null,
        bmr: result.bmr,
        tdee: result.tdee,
        estimated_body_fat: result.estimated_body_fat,
        calorie_target: result.calorie_target,
        projected_weight: result.projected_weight,
        adherence_score: result.adherence_score,
        summary: result.summary,
        recommendations: result.recommendations,
        inputs,
        result,
      })
      .select()
      .single();

    if (error) {
      console.error("Body fitness assessment insert failure:", error);
      return errorResponse("Failed to save body assessment", 500, error);
    }

    return successResponse({
      assessment_id: data.id,
      result,
    });
  } catch (err) {
    console.error("Body fitness assessment error:", err);
    return errorResponse("Something went wrong", 500, err);
  }
}
