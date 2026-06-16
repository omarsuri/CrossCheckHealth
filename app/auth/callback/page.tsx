"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumePostAuthRedirect } from "@/lib/auth-redirect";
import { getExistingAnonymousId } from "@/lib/anonymous-id";
import { supabase } from "@/lib/supabase";

const saveUserProfile = async (user: any) => {
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";

  const response = await fetch("/api/users/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "Failed to save user profile");
  }
};

const claimAnonymousAssessments = async (userId: string) => {
  const anonymousId = getExistingAnonymousId();
  if (!anonymousId) return;

  const response = await fetch("/api/auth/claim-anonymous", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      anonymous_id: anonymousId,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "Failed to claim anonymous assessment data");
  }
};

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const completeGoogleSignIn = async () => {
      const code = new URLSearchParams(window.location.search).get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        if (!session?.user) {
          router.replace("/?error=google-signin-failed");
          return;
        }

        try {
          await saveUserProfile(session.user);
          await claimAnonymousAssessments(session.user.id);
        } catch (setupError) {
          console.error("Google post-login setup failed:", setupError);
        }

        if (active) router.replace(consumePostAuthRedirect());
      } catch (error) {
        console.error("Google callback error:", error);
        if (active) router.replace("/?error=google-signin-failed");
      }
    };

    completeGoogleSignIn();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-lg font-semibold text-ink">Completing Google sign-in...</p>
        <p className="mt-2 text-sm text-ink/60">You will be redirected shortly.</p>
      </div>
    </main>
  );
}
