import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const profileSchema = z.object({
  age: z.number().int().min(0).max(130).nullable().optional(),
  sex: z.string().nullable().optional(),
  height_cm: z.number().min(80).max(250).nullable().optional(),
  weight_kg: z.number().min(20).max(300).nullable().optional(),
  waist_cm: z.number().min(20).max(250).nullable().optional(),
  smoking_status: z.string().nullable().optional(),
  physical_activity_level: z.string().nullable().optional(),
  has_heart_disease: z.boolean().nullable().optional(),
  has_stroke: z.boolean().nullable().optional(),
  has_high_blood_pressure: z.boolean().nullable().optional(),
  has_diabetes: z.boolean().nullable().optional(),
  has_lung_disease: z.boolean().nullable().optional(),
  has_kidney_disease: z.boolean().nullable().optional(),
  family_heart_history: z.string().nullable().optional(),
  cholesterol_status: z.string().nullable().optional(),
  blood_sugar_status: z.string().nullable().optional(),
  consent_to_autofill: z.boolean().optional(),
});

const getBearerToken = (req: Request) => {
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
};

const getAuthenticatedUserId = async (req: Request) => {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id) return null;

  return data.user.id;
};

export async function GET(req: Request) {
  try {
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      return errorResponse("Login required to view health profile", 401);
    }

    const { data, error } = await supabaseAdmin
      .from("user_health_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Health profile fetch failure:", error);
      return errorResponse("Failed to load health profile", 500, error);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Health profile GET route error:", error);
    return errorResponse("Something went wrong while loading health profile", 500, error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      return errorResponse("Login required to save health profile", 401);
    }

    const parsed = profileSchema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid health profile data", 400, parsed.error.flatten());
    }

    const { data, error } = await supabaseAdmin
      .from("user_health_profile")
      .upsert(
        {
          ...parsed.data,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Health profile upsert failure:", error);
      return errorResponse("Failed to save health profile", 500, error);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Health profile POST route error:", error);
    return errorResponse("Something went wrong while saving health profile", 500, error);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      return errorResponse("Login required to update health profile", 401);
    }

    const parsed = profileSchema.partial().safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid health profile data", 400, parsed.error.flatten());
    }

    const { data, error } = await supabaseAdmin
      .from("user_health_profile")
      .upsert(
        {
          ...parsed.data,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Health profile update failure:", error);
      return errorResponse("Failed to update health profile", 500, error);
    }

    return successResponse(data);
  } catch (error) {
    console.error("Health profile PATCH route error:", error);
    return errorResponse("Something went wrong while updating health profile", 500, error);
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getAuthenticatedUserId(req);

    if (!userId) {
      return errorResponse("Login required to delete health profile", 401);
    }

    const { error } = await supabaseAdmin
      .from("user_health_profile")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Health profile delete failure:", error);
      return errorResponse("Failed to delete health profile", 500, error);
    }

    return successResponse(null);
  } catch (error) {
    console.error("Health profile DELETE route error:", error);
    return errorResponse("Something went wrong while deleting health profile", 500, error);
  }
}
