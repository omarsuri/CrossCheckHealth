import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) return errorResponse("Invite token is required", 400);

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("parent_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Parent invite token lookup failure:", inviteError);
      return errorResponse("Failed to fetch parent invite", 500, inviteError);
    }

    if (!invite) {
      return errorResponse("Invite token not found", 404);
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return errorResponse("This invite link has expired", 410, { status: "expired" });
    }

    const { data: parent, error: parentError } = await supabaseAdmin
      .from("parent_profiles")
      .select("*")
      .eq("id", invite.parent_profile_id)
      .maybeSingle();

    if (parentError) {
      console.error("Parent invite profile lookup failure:", parentError);
      return errorResponse("Failed to fetch invited parent profile", 500, parentError);
    }

    return successResponse({
      invite,
      parent,
      status: invite.status,
      message: invite.status === "accepted" || invite.status === "completed"
        ? `Invite is already ${invite.status}`
        : undefined,
    });
  } catch (error) {
    console.error("Parent invite token route error:", error);
    return errorResponse("Something went wrong while fetching the invite", 500, error);
  }
}
