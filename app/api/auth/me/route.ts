import { successResponse } from "@/lib/utils/api-response";

export async function GET() {
  return successResponse({ message: "Auth session endpoint placeholder. Connect Supabase Auth on the frontend next." });
}
