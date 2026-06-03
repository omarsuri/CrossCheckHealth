"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getAnonymousId } from "@/lib/anonymous-id";
import { supabase } from "@/lib/supabase";

const formatHistoryDate = (date?: string) => {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
};

const formatHistoryType = (assessment) => {
  if (assessment.category === "body") return "Body Fat Assessment";
  if (assessment.assessment_type === "body_fat") return "Body Fat Assessment";
  if (assessment.assessment_type === "pcos") return "PCOS Awareness Assessment";
  if (assessment.assessment_type === "parent_heart") return "Parent Heart Check";
  if (assessment.assessment_type === "heart_detailed") return "Detailed Heart Check";
  if (assessment.assessment_type === "heart_quick") return "Quick Heart Check";
  return "Heart Assessment";
};

const historyColor = (assessment) => {
  if (assessment.category === "body") return "teal";
  if (assessment.category === "pcos") return "teal";
  if (assessment.result === "low") return "green";
  if (assessment.result === "higher") return "red";
  return "amber";
};

const formatHistoryResult = (assessment) => {
  if (assessment.category === "body") {
    return assessment.result ? assessment.result + "% estimate" : "Saved result";
  }

  return assessment.result ? assessment.result.charAt(0).toUpperCase() + assessment.result.slice(1) + " risk" : "Saved result";
};

export const AssessmentHistory = ({ navigate }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoadingHistory(true);
      setHistoryError("");

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const sessionUserId = sessionData.session?.user?.id;
        const query = sessionUserId
          ? "user_id=" + encodeURIComponent(sessionUserId)
          : "anonymous_id=" + encodeURIComponent(getAnonymousId());
        const response = await fetch("/api/assessments/history?" + query);
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load assessment history right now.");
        }

        const historyData = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.history)
            ? payload.data.history
            : [];

        if (active) setHistory(historyData);
      } catch (error) {
        if (active) setHistoryError(error instanceof Error ? error.message : "Unable to load assessment history right now.");
      } finally {
        if (active) setLoadingHistory(false);
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <h1 className="text-3xl font-bold text-charcoal mb-2">Assessment History</h1>
      <p className="text-gray-500 mb-8">All your past health assessments in one place</p>
      <div className="space-y-4">
        {loadingHistory ? (
          <Card className="text-center py-12">
            <Icon name="activity" size={32} className="text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-charcoal mb-2">Loading history</h3>
            <p className="text-sm text-gray-500">Fetching your saved assessments.</p>
          </Card>
        ) : historyError ? (
          <Card className="text-center py-12">
            <Icon name="alertTriangle" size={32} className="text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-charcoal mb-2">Could not load history</h3>
            <p className="text-sm text-gray-500 mb-4">{historyError}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
          </Card>
        ) : history.length === 0 ? (
          <Card className="text-center py-12">
            <Icon name="clock" size={32} className="text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-charcoal mb-2">No assessment history yet</h3>
            <p className="text-sm text-gray-500">Completed assessments will appear here.</p>
          </Card>
        ) : history.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.category === "heart" ? "bg-red-50" : a.category === "body" || a.category === "pcos" ? "bg-teal-soft" : "bg-blue-50"}`}>
                  <Icon name={a.category === "heart" ? "heart" : a.category === "body" ? "scale" : a.category === "pcos" ? "fileText" : "search"} size={22} className={a.category === "heart" ? "text-red-500" : a.category === "body" || a.category === "pcos" ? "text-teal-deep" : "text-blue-600"} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">{formatHistoryType(a)}</h3>
                  <p className="text-sm text-gray-400">{formatHistoryDate(a.created_at)} - ID: {a.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge color={historyColor(a)}>{formatHistoryResult(a)}</Badge>
                <Button variant="outline" size="sm" onClick={() => navigate("/results/" + a.id)}>View Result</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ===================== PARENT PROFILES =====================
