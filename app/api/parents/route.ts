import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const parentProfileSchema = z.object({
  user_id: z.string().uuid().optional(),
  owner_user_id: z.string().uuid().optional(),
  name: z.string().min(1),
  relation: z.string().min(1),
  age: z.coerce.number().int().positive().optional(),
  gender: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  consent: z.boolean().optional(),
}).refine((data) => data.user_id || data.owner_user_id, {
  message: "user_id is required",
  path: ["user_id"],
});

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("user_id");

    if (!userId) return errorResponse("user_id is required", 400);

    const { data, error } = await supabaseAdmin
      .from("parent_profiles")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Parent profile fetch failure:", error);
      return errorResponse("Failed to fetch parent profiles", 500, error);
    }

    const parents = data ?? [];
    const parentIds = parents.map((parent) => parent.id);

    if (parentIds.length === 0) {
      return successResponse([]);
    }

    const { data: assessments, error: assessmentsError } = await supabaseAdmin
      .from("assessments")
      .select("id, parent_profile_id, created_at")
      .in("parent_profile_id", parentIds)
      .order("created_at", { ascending: false });

    if (assessmentsError) {
      console.error("Parent profile latest assessment fetch failure:", assessmentsError);
      return errorResponse("Failed to fetch parent assessment results", 500, assessmentsError);
    }

    const latestAssessmentByParent = new Map<string, string>();
    for (const assessment of assessments ?? []) {
      if (assessment.parent_profile_id && !latestAssessmentByParent.has(assessment.parent_profile_id)) {
        latestAssessmentByParent.set(assessment.parent_profile_id, assessment.id);
      }
    }

    return successResponse(parents.map((parent) => ({
      ...parent,
      latest_assessment_id: latestAssessmentByParent.get(parent.id) ?? null,
    })));
  } catch (error) {
    console.error("Parent profile route error:", error);
    return errorResponse("Something went wrong while fetching parent profiles", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = parentProfileSchema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid parent profile", 400, parsed.error.flatten());
    }

    const { user_id, owner_user_id, ...profile } = parsed.data;
    const ownerUserId = user_id ?? owner_user_id;

    const { data, error } = await supabaseAdmin
      .from("parent_profiles")
      .insert({
        ...profile,
        owner_user_id: ownerUserId,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Parent profile insert failure:", error);
      return errorResponse("Failed to create parent profile", 500, error);
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error("Parent profile create route error:", error);
    return errorResponse("Something went wrong while creating the parent profile", 500, error);
  }
}
