"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoginModal } from "@/components/auth/LoginModal";
import { LandingPage } from "@/components/home/LandingPage";
import { HeartLanding } from "@/components/tools/heart/HeartLanding";
import { QuickHeartFlow } from "@/components/tools/heart/QuickHeartFlow";
import { DetailedHeartFlow } from "@/components/tools/heart/DetailedHeartFlow";
import { BodyFatLanding } from "@/components/tools/body-fat/BodyFatLanding";
import { BodyFatFlow } from "@/components/tools/body-fat/BodyFatFlow";
import { ProductsPage } from "@/components/tools/products/ProductsPage";
import { RaktaSetuPage } from "@/components/tools/raktasetu/RaktaSetuPage";
import { PCOSReflectionPage } from "@/components/tools/pcos/PCOSReflectionPage";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { AssessmentHistory } from "@/components/dashboard/AssessmentHistory";
import { ParentProfilesPage } from "@/components/dashboard/ParentProfilesPage";
import { ParentInvitePage } from "@/components/dashboard/ParentInvitePage";
import { SupportPage } from "@/components/support/SupportPage";
import { LegalDocumentPage, PrivacyPage, DisclaimerPage } from "@/components/legal/LegalDocumentPage";
import { PricingPage } from "@/components/pricing/PricingPage";
import { ToolsPage } from "@/components/tools/ToolsPage";
import { ResultPage } from "@/components/results/ResultPage";
import { supabase } from "@/lib/supabase";
import { getAnonymousId } from "@/lib/anonymous-id";

const getInitialParams = (path: string): Record<string, string> => {
  if (path.includes("/results/")) {
    return { id: path.split("/results/")[1] || "" };
  }

  if (path.includes("/assessment/invite/")) {
    return { token: path.split("/assessment/invite/")[1] || "" };
  }

  return {};
};

const toAppUser = (user: any) => ({
  id: user.id,
  name: user.user_metadata?.full_name || user.email,
  email: user.email,
});

const claimAnonymousAssessments = async (userId: string) => {
  try {
    const response = await fetch("/api/auth/claim-anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        anonymous_id: getAnonymousId(),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || "Failed to claim anonymous assessment data");
    }
  } catch (error) {
    console.error("Claim anonymous assessment data failed:", error);
  }
};

const saveUserProfile = async (user: any) => {
  try {
    const response = await fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || "Failed to save user profile");
    }
  } catch (error) {
    console.error("Save user profile failed:", error);
  }
};

const handleAuthenticatedUser = (sessionUser: any) => {
  setTimeout(() => {
    saveUserProfile(sessionUser);
    claimAnonymousAssessments(sessionUser.id);
  }, 0);
};

// ===================== MAIN APP =====================
function AppShell({ initialPage = "/", initialParams }: { initialPage?: string; initialParams?: Record<string, string> }) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [params, setParams] = useState<Record<string, string>>(initialParams ?? getInitialParams(initialPage));

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user;
      setUser(sessionUser ? toAppUser(sessionUser) : null);
      if (sessionUser?.id) handleAuthenticatedUser(sessionUser);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null);
      if (session?.user?.id) handleAuthenticatedUser(session.user);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const navigate = (path: string) => {
    setPage(path);
    window.scrollTo(0, 0);
    router.push(path);
    // Extract params from path
    if (path.includes("/results/")) {
      const id = path.split("/results/")[1];
      setParams({ id });
    } else if (path.includes("/assessment/invite/")) {
      const token = path.split("/assessment/invite/")[1];
      setParams({ token });
    } else {
      setParams({});
    }
  };

  const handleLogin = (userData: any) => { setUser(userData); setLoginOpen(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); navigate("/"); };

  const renderPage = () => {
    switch (page) {
      case "/": return <LandingPage navigate={navigate} />;
      case "/tools": return <ToolsPage navigate={navigate} />;
      case "/tools/heart-health": return <HeartLanding navigate={navigate} user={user} onLogin={() => setLoginOpen(true)} />;
      case "/tools/heart-health/quick": return <QuickHeartFlow navigate={navigate} />;
      case "/tools/heart-health/detailed": return <DetailedHeartFlow navigate={navigate} />;
      case "/tools/body-fat": return <BodyFatLanding navigate={navigate} user={user} onLogin={() => setLoginOpen(true)} />;
      case "/tools/body-fat/flow": return <BodyFatFlow navigate={navigate} user={user} onLogin={() => setLoginOpen(true)} />;
      case "/tools/products": return <ProductsPage navigate={navigate} />;
      case "/tools/products/scanner": return <ProductsPage navigate={navigate} initialScanner />;
      case "/tools/raktasetu": return <RaktaSetuPage navigate={navigate} />;
      case "/tools/pcos": return <PCOSReflectionPage navigate={navigate} />;
      case "/dashboard": return <Dashboard navigate={navigate} user={user} />;
      case "/dashboard/history": return <AssessmentHistory navigate={navigate} />;
      case "/dashboard/parents": return <ParentProfilesPage navigate={navigate} user={user} />;
      case "/dashboard/parents/add": return <ParentProfilesPage navigate={navigate} user={user} />;
      case "/support": return <SupportPage navigate={navigate} />;
      case "/privacy": return <PrivacyPage navigate={navigate} />;
      case "/terms": return <LegalDocumentPage docKey="terms" navigate={navigate} />;
      case "/disclaimer": return <DisclaimerPage navigate={navigate} />;
      case "/refunds": return <LegalDocumentPage docKey="refunds" navigate={navigate} />;
      case "/grievance": return <LegalDocumentPage docKey="grievance" navigate={navigate} />;
      case "/cookies": return <LegalDocumentPage docKey="cookies" navigate={navigate} />;
      case "/dpa": return <LegalDocumentPage docKey="dpa" navigate={navigate} />;
      case "/pricing": return <PricingPage navigate={navigate} />;
      default:
        if (page.startsWith("/results/")) return <ResultPage navigate={navigate} id={params.id || ""} />;
        if (page.startsWith("/assessment/invite/")) return <ParentInvitePage navigate={navigate} token={params.token || ""} />;
        return <LandingPage navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogin={() => setLoginOpen(true)} onLogout={handleLogout} navigate={navigate} unreadCount={2} />
      <main className="flex-1">{renderPage()}</main>
      <Footer navigate={navigate} />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
    </div>
  );
};

export default AppShell;
