import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) return errorResponse("user_id is required", 400);
  const { data, error } = await supabaseAdmin.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return errorResponse("Failed to fetch notifications", 500, error);
  return successResponse(data ?? []);
}
