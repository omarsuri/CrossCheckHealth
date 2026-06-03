import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

const schema = z.object({ name: z.string().min(1), email: z.string().email(), topic: z.string().min(1), message: z.string().min(5) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return errorResponse("Invalid support message", 400, parsed.error.flatten());
  const { data, error } = await supabaseAdmin.from("support_tickets").insert({ ...parsed.data, status: "open" }).select().single();
  if (error) return errorResponse("Failed to create support ticket", 500, error);
  return successResponse(data, 201);
}
