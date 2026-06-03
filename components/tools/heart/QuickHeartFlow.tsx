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
import { getAnonymousId } from "@/lib/anonymous-id";
import { supabase } from "@/lib/supabase";

type QuickHeartResult = {
  assessment_id?: string;
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

type QuickHeartResponse = {
  success: boolean;
  data?: QuickHeartResult;
  error?: {
    message?: string;
  };
};

export const QuickHeartFlow = ({ navigate }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<QuickHeartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const questions = QUICK_HEART_QUESTIONS;

  const submitAssessment = async (nextAnswers: Record<string, string>) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      const response = await fetch("/api/assessments/heart/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionUser?.id
          ? {
            user_id: sessionUser.id,
            anonymous: false,
            answers: nextAnswers,
          }
          : {
            anonymous: true,
            anonymous_id: getAnonymousId(),
            answers: nextAnswers,
          }),
      });

      const payload = (await response.json()) as QuickHeartResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message || "Unable to save assessment");
      }

      setResult(payload.data);
      setShowResult(true);
    } catch (err) {
      console.error("Quick heart assessment submit failed:", err);
      setError(err instanceof Error ? err.message : "Unable to save assessment");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option) => {
    if (loading) return;

    const q = questions[step];
    if (q.multi) {
      const current = answers[q.id] || [];
      const updated = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
      setAnswers({ ...answers, [q.id]: updated });
    } else {
      const nextAnswers = { ...answers, [q.id]: option };
      setAnswers(nextAnswers);
      if (step < questions.length - 1) { setStep(step + 1); }
      else { submitAssessment(nextAnswers); }
    }
  };

  const handleNext = () => {
    if (loading) return;

    if (step < questions.length - 1) setStep(step + 1);
    else submitAssessment(answers);
  };

  if (showResult && result) {
    const riskFactors = result.riskFactors;
    const riskLevel = result.riskLevel === "higher" ? "Higher" : result.riskLevel === "moderate" ? "Moderate" : "Low";
    const riskColor = riskLevel === "Higher" ? "red" : riskLevel === "Moderate" ? "amber" : "green";
    const riskText = riskLevel === "Higher" ? "Higher Awareness Risk" : riskLevel === "Moderate" ? "Moderate Awareness Risk" : "Low Awareness Risk";

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 bg-${riskColor}-50 rounded-full flex items-center justify-center mx-auto mb-4 pulse-ring`} style={{ animationIterationCount: 1 }}>
            <Icon name="heart" size={40} className={`text-${riskColor}-500`} />
          </div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">{riskText}</h2>
          <p className="text-gray-500">Based on your quick heart health check</p>
        </div>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">What this means</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {result.summary} This is a health awareness tool, not a diagnosis.
          </p>
          {riskFactors.length > 0 && (
            <>
              <h4 className="font-medium text-charcoal mb-2 text-sm">Key contributing factors:</h4>
              <ul className="space-y-1 mb-4">
                {riskFactors.map(f => <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Icon name="alertTriangle" size={14} className="text-amber-500" />{f}</li>)}
              </ul>
            </>
          )}
          <h4 className="font-medium text-charcoal mb-2 text-sm">Recommended next steps:</h4>
          <ul className="space-y-1 mb-4">
            {result.recommendations.map(rec => (
              <li key={rec.title} className="flex items-center gap-2 text-sm text-gray-600"><Icon name="check" size={14} className="text-teal-deep" />{rec.title}</li>
            ))}
          </ul>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Suggested products</h3>
          <div className="grid grid-cols-2 gap-3">
            {MOCK_PRODUCTS.slice(0, 4).map(p => (
              <div key={p.id} className="border border-gray-100 rounded-xl p-3 hover:border-teal-200 transition-colors cursor-pointer" onClick={() => navigate("/tools/products")}>
                <p className="font-medium text-sm text-charcoal">{p.name}</p>
                <p className="text-xs text-gray-400">{p.brand}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Health partners near you</h3>
          <div className="space-y-3">
            {MOCK_DOCTORS.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-charcoal">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.specialty} · {d.distance}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500 text-sm"><Icon name="star" size={14} />{d.rating}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Share your result</h3>
          <ShareButtons />
        </Card>
        <Disclaimer type="general" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate("/tools/heart-health/detailed")}>Take Detailed Assessment</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/tools/body-fat")}>Try Body Fat Assessment</Button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  const selected = answers[q.id] || (q.multi ? [] : null);
  const canProceed = q.multi ? selected.length > 0 : selected !== null;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/tools/heart-health")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
        <Icon name="chevronLeft" size={16} />{step === 0 ? "Back" : "Previous"}
      </button>
      <ProgressBar current={step + 1} total={questions.length} className="mb-8" />
      <div className="mb-8">
        <span className="text-sm text-gray-400">Question {step + 1} of {questions.length}</span>
        <h2 className="text-2xl font-bold text-charcoal mt-2">{q.question}</h2>
        {q.subtitle && <p className="text-sm text-gray-500 mt-2">{q.subtitle}</p>}
        {q.multi && <p className="text-sm text-gray-500 mt-1">Select all that apply</p>}
      </div>
      <div className="space-y-3">
        {q.options.map(opt => {
          const isSelected = q.multi ? selected.includes(opt) : selected === opt;
          return (
            <button key={opt} onClick={() => handleSelect(opt)} disabled={loading}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isSelected ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                {isSelected && <Icon name="check" size={18} className="text-teal-deep" />}
              </div>
            </button>
          );
        })}
      </div>
      {loading && <p className="text-sm text-gray-500 mt-4 text-center">Saving your assessment...</p>}
      {error && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}
      {q.multi && (
        <div className="mt-6">
          <Button variant="primary" fullWidth onClick={handleNext} disabled={!canProceed || loading}>Continue</Button>
        </div>
      )}
    </div>
  );
};
