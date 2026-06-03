import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const profileSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = profileSchema.safeParse(await req.json());

    if (!parsed.success) {
      return errorResponse("Invalid profile data", 400, parsed.error.flatten());
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("User profile upsert failure:", error);
      return errorResponse("Failed to save user profile", 500, error);
    }

    return successResponse(data);
  } catch (error) {
    console.error("User profile route error:", error);
    return errorResponse("Something went wrong while saving user profile", 500, error);
  }
}
