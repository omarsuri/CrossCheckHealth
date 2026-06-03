import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/backend/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const anonymousId = searchParams.get("anonymous_id");

    if (!userId && !anonymousId) {
      return errorResponse("user_id or anonymous_id is required", 400);
    }

    const applyIdentityFilter = (query: any) => {
      if (userId) return query.eq("user_id", userId);
      return query.eq("anonymous_id", anonymousId);
    };

    const [assessmentsResult, bodyResult, parentsResult, notificationsResult] = await Promise.all([
      applyIdentityFilter(
        supabaseAdmin.from("assessments").select("*").order("created_at", { ascending: false }).limit(5)
      ),
      applyIdentityFilter(
        supabaseAdmin.from("body_fitness_assessments").select("*").order("created_at", { ascending: false }).limit(1)
      ),
      userId
        ? supabaseAdmin.from("parent_profiles").select("*").eq("owner_user_id", userId).order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      userId
        ? supabaseAdmin.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (assessmentsResult.error) {
      console.error("Dashboard assessments fetch failure:", assessmentsResult.error);
      return errorResponse("Failed to fetch dashboard assessments", 500, assessmentsResult.error);
    }

    if (bodyResult.error) {
      console.error("Dashboard body-fat fetch failure:", bodyResult.error);
      return errorResponse("Failed to fetch dashboard body-fat assessment", 500, bodyResult.error);
    }

    if (parentsResult.error) {
      console.error("Dashboard parents fetch failure:", parentsResult.error);
      return errorResponse("Failed to fetch dashboard parent profiles", 500, parentsResult.error);
    }

    if (notificationsResult.error) {
      console.error("Dashboard notifications fetch failure:", notificationsResult.error);
      return errorResponse("Failed to fetch dashboard notifications", 500, notificationsResult.error);
    }

    const assessments = assessmentsResult.data ?? [];
    const body = bodyResult.data ?? [];
    const parents = parentsResult.data ?? [];
    const notifications = notificationsResult.data ?? [];

    return successResponse({
      recent_assessments: assessments,
      latest_body_assessment: body[0] ?? null,
      parents,
      notifications,
      stats: {
        assessments: assessments.length + body.length,
        parents: parents.length,
        unread_notifications: notifications.filter((notification) => !notification.read_at).length,
      },
    });
  } catch (error) {
    console.error("Dashboard route error:", error);
    return errorResponse("Something went wrong while fetching dashboard data", 500, error);
  }
}
