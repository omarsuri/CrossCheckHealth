"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreRing, ShareButtons } from "@/components/shared/prototype";
import { DETAILED_HEART_QUESTIONS } from "@/data/heartQuestions";

type ParentInvitePageProps = {
  navigate: (path: string) => void;
  token: string;
};

type InviteDetails = {
  invite?: {
    id: string;
    status?: string;
    expires_at?: string;
  };
  parent?: {
    name?: string;
    relation?: string;
  } | null;
  status?: string;
  message?: string;
};

type ParentAssessmentResult = {
  assessment_id: string;
  result: {
    riskLevel: "low" | "moderate" | "higher";
    riskScore: number;
    riskFactors: string[];
    summary: string;
    recommendations: Array<{
      title: string;
      description: string;
      priority: string;
      recommendation_type: string;
    }>;
  };
};

type InviteState = "loading" | "valid" | "invalid" | "expired" | "error";
type FlowState = "intro" | "questions" | "result";

export const ParentInvitePage = ({ navigate, token }: ParentInvitePageProps) => {
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [flowState, setFlowState] = useState<FlowState>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ParentAssessmentResult | null>(null);
  const [error, setError] = useState("");
  const questions = DETAILED_HEART_QUESTIONS;

  useEffect(() => {
    let active = true;

    const loadInvite = async () => {
      if (process.env.NODE_ENV === "development") {
        console.log("ParentInvitePage token:", token);
      }

      if (!token) {
        setInviteState("invalid");
        setError("This invite link is missing a token.");
        return;
      }

      setInviteState("loading");
      setError("");

      try {
        const response = await fetch(`/api/parents/invite/${encodeURIComponent(token)}`);
        const payload = await response.json().catch(() => null);

        if (response.status === 404) {
          if (active) {
            setInviteState("invalid");
            setError(payload?.error?.message || "This invite link is not valid.");
          }
          return;
        }

        if (response.status === 410) {
          if (active) {
            setInviteState("expired");
            setError(payload?.error?.message || "This invite link has expired.");
          }
          return;
        }

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load this invite.");
        }

        if (active) {
          setInviteDetails(payload?.data || null);
          setInviteState("valid");
        }
      } catch (loadError) {
        if (active) {
          setInviteState("error");
          setError(loadError instanceof Error ? loadError.message : "Unable to load this invite.");
        }
      }
    };

    loadInvite();

    return () => {
      active = false;
    };
  }, [token]);

  const parentName = inviteDetails?.parent?.name;
  const parentRelation = inviteDetails?.parent?.relation;
  const inviteStatus = inviteDetails?.status || inviteDetails?.invite?.status;
  const isOpenInvite = inviteStatus === "pending" || inviteStatus === "created" || !inviteStatus;

  const submitAssessment = async (completedAnswers: Record<string, string>) => {
    setSubmitting(true);
    setError("");

    try {
      if (!consent) {
        throw new Error("Please confirm consent before submitting this assessment.");
      }

      const response = await fetch(`/api/parents/invite/${encodeURIComponent(token)}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          answers: completedAnswers,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (response.status === 404) {
        setInviteState("invalid");
        throw new Error(payload?.error?.message || "This invite link is not valid.");
      }

      if (response.status === 410) {
        setInviteState("expired");
        throw new Error(payload?.error?.message || "This invite link has expired.");
      }

      if (!response.ok || payload?.success === false || !payload?.data) {
        throw new Error(payload?.error?.message || "Unable to submit this assessment.");
      }

      setResult(payload.data);
      setFlowState("result");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit this assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (value: string) => {
    if (submitting) return;

    const question = questions[step];
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);

    if (step < questions.length - 1) {
      setTimeout(() => setStep((current) => Math.min(current + 1, questions.length - 1)), 300);
    } else {
      submitAssessment(nextAnswers);
    }
  };

  const handleBack = () => {
    if (submitting) return;
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    setFlowState("intro");
  };

  if (inviteState === "loading") {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
        <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="users" size={32} className="text-teal-deep" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-2">Checking Invite</h1>
        <p className="text-gray-500 mb-2">We are checking this health assessment invite.</p>
        <Card className="mb-6">
          <p className="text-sm text-gray-600">Loading invite details...</p>
        </Card>
      </div>
    );
  }

  if (inviteState === "invalid" || inviteState === "expired" || inviteState === "error") {
    const title = inviteState === "expired" ? "Invite Expired" : inviteState === "invalid" ? "Invalid Invite" : "Invite Unavailable";

    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
        <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="alertTriangle" size={32} className="text-teal-deep" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-2">{title}</h1>
        <p className="text-gray-500 mb-2">{error || "This assessment invite cannot be opened."}</p>
        <Card className="mb-6">
          <p className="text-sm text-gray-600 mb-4">Ask the person who invited you to create a fresh health awareness check link.</p>
          <Button variant="primary" fullWidth onClick={() => navigate("/")}>Back Home</Button>
        </Card>
      </div>
    );
  }

  if (flowState === "result" && result) {
    const heartResult = result.result;
    const riskLevel = heartResult.riskLevel === "higher" ? "Higher" : heartResult.riskLevel === "moderate" ? "Moderate" : "Low";
    const riskText = riskLevel === "Higher" ? "Higher Heart Health Awareness Risk" : riskLevel === "Moderate" ? "Moderate Heart Health Awareness Risk" : "Low Heart Health Awareness Risk";
    const scoreColor = riskLevel === "Higher" ? "red" : riskLevel === "Moderate" ? "amber" : "teal";

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <div className="text-center mb-8">
          <ScoreRing score={heartResult.riskScore} label="Heart Health Score" color={scoreColor} />
          <h2 className="text-2xl font-bold text-charcoal mt-4 mb-2">{riskText}</h2>
          <p className="text-gray-500">Your invited assessment is complete</p>
        </div>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Detailed Insights</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {heartResult.summary} This is a health awareness tool, not a diagnosis.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-teal-soft/30 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-teal-deep">{heartResult.riskScore}</p><p className="text-xs text-gray-500">Risk Score</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-600">{heartResult.riskFactors.length}</p><p className="text-xs text-gray-500">Risk Factors</p></div>
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{riskLevel}</p><p className="text-xs text-gray-500">Awareness Level</p></div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-600">{heartResult.recommendations.length}</p><p className="text-xs text-gray-500">Next Steps</p></div>
          </div>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Recommendations</h3>
          <div className="space-y-3">
            {heartResult.recommendations.map((rec) => (
              <div key={rec.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0"><Icon name={rec.recommendation_type === "doctor" ? "mapPin" : "activity"} size={16} className="text-teal-deep" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><h4 className="font-medium text-sm text-charcoal">{rec.title}</h4><Badge color={rec.priority === "important" ? "red" : "amber"}>{rec.priority}</Badge></div>
                  <p className="text-xs text-gray-500">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Share your result</h3>
          <ShareButtons />
        </Card>
        <Disclaimer type="general" />
        <div className="flex gap-3 mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate("/")}>Done</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/tools")}>Explore Tools</Button>
        </div>
      </div>
    );
  }

  if (flowState === "questions") {
    const question = questions[step];
    const selectedAnswer = answers[question.id];

    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
          <Icon name="chevronLeft" size={16} />{step === 0 ? "Back" : "Previous"}
        </button>
        <ProgressBar current={step + 1} total={questions.length} className="mb-8" />
        <div className="mb-8">
          <span className="text-sm text-gray-400">Question {step + 1} of {questions.length}</span>
          <h2 className="text-2xl font-bold text-charcoal mt-2">{question.question}</h2>
          {question.subtitle && <p className="text-sm text-gray-500 mt-2">{question.subtitle}</p>}
        </div>
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option;
            return (
              <button key={option} disabled={submitting} onClick={() => handleAnswer(option)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isSelected ? "text-teal-deep" : "text-charcoal"}`}>{option}</span>
                  {isSelected && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            );
          })}
          {submitting && <p className="text-sm text-gray-500 text-center">Submitting your assessment...</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
      <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon name="users" size={32} className="text-teal-deep" />
      </div>
      <h1 className="text-2xl font-bold text-charcoal mb-2">Heart Health Assessment Invite</h1>
      <p className="text-gray-500 mb-2">
        {parentName
          ? `${parentName}${parentRelation ? ` (${parentRelation})` : ""} has been invited to complete a health awareness check.`
          : "You have been invited to complete a health awareness check."}
      </p>
      {inviteStatus === "accepted" || inviteStatus === "completed" ? (
        <p className="text-sm text-gray-500 mb-2">{inviteDetails?.message || `This invite is already ${inviteStatus}.`}</p>
      ) : null}
      <Card className="mb-6">
        <p className="text-sm text-gray-600 mb-4">This assessment helps track your heart health risk factors. It takes about 1 minute and is not a medical diagnosis.</p>
        <Disclaimer type="consent" />
        <div className="flex gap-3">
          <Button variant="primary" fullWidth disabled={!isOpenInvite} onClick={() => { setConsent(true); setFlowState("questions"); }}>I Agree, Start Assessment</Button>
          <Button variant="ghost" fullWidth onClick={() => navigate("/")}>Decline</Button>
        </div>
      </Card>
    </div>
  );
};
