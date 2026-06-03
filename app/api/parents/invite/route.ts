import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

const schema = z.object({ parent_profile_id: z.string().uuid(), send_to_email: z.string().email().optional(), send_to_phone: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return errorResponse("Invalid invite payload", 400, parsed.error.flatten());
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    const { data, error } = await supabaseAdmin.from("parent_invites").insert({ parent_profile_id: parsed.data.parent_profile_id, token, send_to_email: parsed.data.send_to_email, send_to_phone: parsed.data.send_to_phone, status: "pending", expires_at: expiresAt }).select().single();
    if (error) {
      console.error("Parent invite insert failure:", error);
      return errorResponse("Failed to create invite", 500, error);
    }
    return successResponse({ ...data, invite_url: `/assessment/invite/${token}` }, 201);
  } catch (error) {
    console.error("Parent invite POST failure:", error);
    return errorResponse("Something went wrong while creating the invite", 500, error);
  }
}
