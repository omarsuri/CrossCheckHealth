"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MOCK_ASSESSMENTS, MOCK_DOCTORS, MOCK_PARENTS } from "@/data/mockDashboard";
import { MOCK_PRODUCTS } from "@/data/mockProducts";
import { RAKTASETU_TESTS } from "@/data/mockBloodTests";
import { BODY_FITNESS_STEPS } from "@/data/bodyQuestions";
import { QUICK_HEART_QUESTIONS, DETAILED_HEART_QUESTIONS } from "@/data/heartQuestions";
import { PCOS_STEPS } from "@/data/pcosQuestions";
import { LEGAL_DOCS } from "@/data/legalDocs";
import { ECGBackground, MagneticWrap, ScoreRing, ShareButtons, TiltCard, track, useMouseParallax, useScrollReveal, useTilt } from "@/components/shared/prototype";
import { LockedModal } from "@/components/auth/LockedModal";
import { ScannerModal } from "@/components/tools/products/ProductScanner";
import { supabase } from "@/lib/supabase";

const formatDashboardDate = (date?: string) => {
  if (!date) return "Pending";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
};

const heartColor = (riskLevel?: string) => {
  if (riskLevel === "low") return "green";
  if (riskLevel === "higher") return "red";
  return "amber";
};

const formatAssessmentType = (type?: string) => {
  if (type === "heart_detailed") return "Detailed Heart Check";
  if (type === "heart_quick") return "Quick Heart Check";
  return "Heart Assessment";
};

const mapHeartAssessment = (assessment) => ({
  id: assessment.id,
  type: formatAssessmentType(assessment.assessment_type),
  date: formatDashboardDate(assessment.created_at),
  result: assessment.risk_level ? assessment.risk_level.charAt(0).toUpperCase() + assessment.risk_level.slice(1) + " risk" : "Saved result",
  category: "heart",
  color: heartColor(assessment.risk_level),
  progress: assessment.risk_score ?? 0,
});

const mapBodyAssessment = (assessment) => ({
  id: assessment.id,
  type: "Body Fat Assessment",
  date: formatDashboardDate(assessment.created_at),
  result: (assessment.estimated_body_fat ?? assessment.result?.estimated_body_fat ?? "Saved") + "% estimate",
  category: "body",
  color: "teal",
  progress: Math.min(100, Math.round(Number(assessment.estimated_body_fat ?? assessment.result?.estimated_body_fat ?? 0) * 2)),
});

export const Dashboard = ({ navigate, user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoadingDashboard(true);
      setDashboardError("");

      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user;

        if (!currentUser?.id) {
          if (active) {
            setSessionUser(null);
            setDashboardData(null);
          }
          return;
        }

        if (active) setSessionUser(currentUser);

        const response = await fetch("/api/dashboard?user_id=" + encodeURIComponent(currentUser.id));
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load dashboard right now.");
        }

        if (active) setDashboardData(payload?.data ?? null);
      } catch (error) {
        if (active) setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard right now.");
      } finally {
        if (active) setLoadingDashboard(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const heartAssessments = (dashboardData?.recent_assessments ?? []).map(mapHeartAssessment);
  const bodyAssessment = dashboardData?.latest_body_assessment ? mapBodyAssessment(dashboardData.latest_body_assessment) : null;
  const backendAssessments = [...heartAssessments, bodyAssessment].filter(Boolean);
  const hasBackendData = backendAssessments.length > 0 || (dashboardData?.parents ?? []).length > 0;
  const displayAssessments = hasBackendData ? backendAssessments : MOCK_ASSESSMENTS;
  const displayParents = hasBackendData && (dashboardData?.parents ?? []).length > 0 ? dashboardData.parents : MOCK_PARENTS;
  const latestHeart = heartAssessments[0];
  const latestBody = bodyAssessment;
  const dashboardUserName = user?.name || sessionUser?.user_metadata?.full_name || sessionUser?.email || "there";

  const trackerData = [
    { label: "Heart Risk", value: latestHeart?.result?.replace(" risk", "") || "Moderate", detail: latestHeart?.type || "Quick Heart Check", date: latestHeart?.date || "11 May 2026", progress: latestHeart?.progress || 62, color: latestHeart?.color === "green" ? "bg-green-500" : latestHeart?.color === "red" ? "bg-red-500" : "bg-amber-400", icon: "heart" },
    { label: "Body Fat", value: latestBody?.result?.replace(" estimate", "") || "24%", detail: "Body Fat Assessment", date: latestBody?.date || "10 May 2026", progress: latestBody?.progress || 48, color: "bg-teal-deep", icon: "scale" },
    { label: "Product Safety", value: "Reviewed", detail: "BP Monitor vs Smart Watch", date: "9 May 2026", progress: 76, color: "bg-blue-500", icon: "search" },
  ];

  if (loadingDashboard) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <Card className="text-center py-12">
          <Icon name="activity" size={32} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-charcoal mb-2">Loading dashboard</h2>
          <p className="text-gray-500">Fetching your latest saved health overview.</p>
        </Card>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <Card className="text-center py-12">
          <Icon name="alertTriangle" size={32} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-charcoal mb-2">Could not load dashboard</h2>
          <p className="text-gray-500 mb-4">{dashboardError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
        <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="lock" size={32} className="text-teal-deep" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3">Login Required</h2>
        <p className="text-gray-500 mb-6">Please sign in to view your dashboard and health overview.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal">Welcome back, {dashboardUserName}</h1>
        <p className="text-gray-500">Here's your health overview for today</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-l-4 border-l-red-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Latest Heart Result</span>
            <Icon name="heart" size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{latestHeart?.result?.replace(" risk", "") || "Moderate"}</p>
          <p className="text-xs text-gray-400">{latestHeart?.date || "11 May 2026"}</p>
        </Card>
        <Card className="border-l-4 border-l-teal-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Body Fat Estimate</span>
            <Icon name="scale" size={18} className="text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{latestBody?.result?.replace(" estimate", "") || "24%"}</p>
          <p className="text-xs text-gray-400">{latestBody?.date || "10 May 2026"}</p>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Saved Comparisons</span>
            <Icon name="search" size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-charcoal">3</p>
          <p className="text-xs text-gray-400">Products compared</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/tools/products")}>View saved comparisons</Button>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Parent Profiles</span>
            <Icon name="users" size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-charcoal">2/2</p>
          <p className="text-xs text-gray-400">Profiles active</p>
        </Card>
      </div>

      <Card className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-semibold text-charcoal">Health Tracker</h3>
            <p className="text-sm text-gray-500">Assessment data from your latest checks</p>
          </div>
          <Button variant="outline" size="sm" icon="clock" onClick={() => navigate("/dashboard/history")}>View History</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {trackerData.map(item => (
            <div key={item.label} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-xl font-bold text-charcoal mt-1">{item.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
                </div>
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  <Icon name={item.icon} size={18} className="text-teal-deep" />
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.progress}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Updated {item.date}</p>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Assessments completed", value: displayAssessments.length },
            { label: "Latest result", value: displayAssessments[0]?.result || "No saved result" },
            { label: "Next suggested check", value: "Detailed Heart" },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="font-semibold text-charcoal mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-charcoal">Assessment History</h3>
              <button onClick={() => navigate("/dashboard/history")} className="text-sm text-teal-deep hover:underline">View all</button>
            </div>
            <div className="space-y-3">
              {displayAssessments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.category === "heart" ? "bg-red-50" : a.category === "body" ? "bg-teal-soft" : "bg-blue-50"}`}>
                      <Icon name={a.category === "heart" ? "heart" : a.category === "body" ? "scale" : "search"} size={18} className={a.category === "heart" ? "text-red-500" : a.category === "body" ? "text-teal-deep" : "text-blue-600"} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-charcoal">{a.type}</p>
                      <p className="text-xs text-gray-400">{a.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color={a.color}>{a.result}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div>
          <Card className="mb-6">
            <h3 className="font-semibold text-charcoal mb-4">Latest Recommendation</h3>
            <div className="bg-teal-soft/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-deep rounded-lg flex items-center justify-center flex-shrink-0"><Icon name="activity" size={16} className="text-white" /></div>
                <div>
                  <p className="text-sm font-medium text-charcoal">Take your detailed heart assessment</p>
                  <p className="text-xs text-gray-500 mt-1">Your quick check suggests more insights would be valuable.</p>
                </div>
              </div>
            </div>
            <Button variant="primary" size="sm" fullWidth className="mt-4" onClick={() => navigate("/tools/heart-health/detailed")}>Start Detailed Check</Button>
          </Card>
          <Card>
            <h3 className="font-semibold text-charcoal mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" fullWidth icon="heart" onClick={() => navigate("/tools/heart-health/quick")}>Start Heart Check</Button>
              <Button variant="outline" size="sm" fullWidth icon="scale" onClick={() => navigate("/tools/body-fat")}>Body Fat Assessment</Button>
              <Button variant="outline" size="sm" fullWidth icon="search" onClick={() => navigate("/tools/products")}>Open SwasthyaSathi</Button>
              <Button variant="outline" size="sm" fullWidth icon="users" onClick={() => navigate("/dashboard/parents/add")}>Add Parent Profile</Button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-charcoal">Parent Profiles</h3>
          <button onClick={() => navigate("/dashboard/parents")} className="text-sm text-teal-deep hover:underline">Manage</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {displayParents.map(parent => (
            <div key={parent.id} className="border border-gray-100 rounded-xl p-4 hover:border-teal-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-soft rounded-full flex items-center justify-center"><Icon name="user" size={18} className="text-teal-deep" /></div>
                  <div>
                    <p className="font-medium text-sm text-charcoal">{parent.name}</p>
                    <p className="text-xs text-gray-400">{parent.relation} · Age {parent.age}</p>
                  </div>
                </div>
                <Badge color={parent.status === "completed" ? "green" : "amber"}>{parent.status === "completed" ? "Done" : "Pending"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last: <span className="text-charcoal">{parent.lastAssessment}</span></span>
                <span className="text-gray-500">Result: <span className="text-charcoal">{parent.latestResult}</span></span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="ghost" size="sm" className="flex-1" icon="send" onClick={() => alert("Reminder sent!")}>Remind</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/dashboard/parents")}>View</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
