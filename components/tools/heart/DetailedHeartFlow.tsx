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

type DetailedHeartResult = {
  assessment_id: string;
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

type DetailedHeartResponse = {
  success: boolean;
  data?: DetailedHeartResult;
  error?: {
    message?: string;
  };
};

export const DetailedHeartFlow = ({ navigate }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<DetailedHeartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const questions = DETAILED_HEART_QUESTIONS;


  const handleInput = (val) => { setAnswers({ ...answers, [questions[step].id]: val }); };
  const submitAssessment = async (completedAnswers: Record<string, any>) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (!sessionUser?.id) {
        setError("Please sign in to save and view your detailed heart assessment.");
        return;
      }

      const normalizedAnswers = Object.fromEntries(
        Object.entries(completedAnswers).map(([questionId, answer]) => [
          questionId,
          Array.isArray(answer) ? answer.join(", ") : String(answer),
        ])
      );

      const response = await fetch("/api/assessments/heart/detailed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: sessionUser.id,
          answers: normalizedAnswers,
        }),
      });

      const payload = (await response.json()) as DetailedHeartResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message || "Unable to save detailed assessment");
      }

      setResult(payload.data);
      setShowResult(true);
    } catch (err) {
      console.error("Detailed heart assessment submit failed:", err);
      setError(err instanceof Error ? err.message : "Unable to save detailed assessment");
    } finally {
      setLoading(false);
    }
  };
  const handleNext = () => { if (loading) return; if (step < questions.length - 1) setStep(step + 1); else submitAssessment(answers); };
  const handleBack = () => { if (step > 0) setStep(step - 1); else navigate("/tools/heart-health"); };

  if (showResult && result) {
    const riskLevel = result.riskLevel === "higher" ? "Higher" : result.riskLevel === "moderate" ? "Moderate" : "Low";
    const riskText = riskLevel === "Higher" ? "Higher Heart Health Awareness Risk" : riskLevel === "Moderate" ? "Moderate Heart Health Awareness Risk" : "Low Heart Health Awareness Risk";
    const scoreColor = riskLevel === "Higher" ? "red" : riskLevel === "Moderate" ? "amber" : "teal";

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <div className="text-center mb-8">
          <ScoreRing score={result.riskScore} label="Heart Health Score" color={scoreColor} />
          <h2 className="text-2xl font-bold text-charcoal mt-4 mb-2">{riskText}</h2>
          <p className="text-gray-500">Your detailed assessment is complete</p>
        </div>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Detailed Insights</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {result.summary} This is a health awareness tool, not a diagnosis.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-teal-soft/30 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-teal-deep">{result.riskScore}</p><p className="text-xs text-gray-500">Risk Score</p></div>
            <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-600">{result.riskFactors.length}</p><p className="text-xs text-gray-500">Risk Factors</p></div>
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{riskLevel}</p><p className="text-xs text-gray-500">Awareness Level</p></div>
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-600">{result.recommendations.length}</p><p className="text-xs text-gray-500">Next Steps</p></div>
          </div>
        </Card>
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Your personalized recommendations</h3>
          <div className="space-y-3">
            {result.recommendations.map((rec) => (
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
          <Button variant="primary" fullWidth onClick={() => navigate("/dashboard")}>Save to Dashboard</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/tools/body-fat")}>Body Fat Assessment</Button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  const canProceed = answers[q.id] !== undefined && answers[q.id] !== "";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
        <Icon name="chevronLeft" size={16} />{step === 0 ? "Back" : "Previous"}
      </button>
      <ProgressBar current={step + 1} total={questions.length} className="mb-8" />
      <div className="mb-8">
        <span className="text-sm text-gray-400">Question {step + 1} of {questions.length}</span>
        <h2 className="text-2xl font-bold text-charcoal mt-2">{q.question}</h2>
        {q.subtitle && <p className="text-sm text-gray-500 mt-2">{q.subtitle}</p>}
        {q.id === "symptoms" && <Disclaimer type="emergency" className="mt-4" />}
      </div>
      {q.type === "number" ? (
        <div className="space-y-4">
          <input type="number" value={answers[q.id] || ""} onChange={e => handleInput(e.target.value)}
            className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            placeholder={q.placeholder} />
          <Button variant="primary" fullWidth onClick={handleNext} disabled={!canProceed || loading}>{loading ? "Saving..." : "Continue"}</Button>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {q.options.map(opt => {
            const isSelected = q.multi ? (answers[q.id] || []).includes(opt) : answers[q.id] === opt;
            return (
              <button key={opt} disabled={loading} onClick={() => {
                if (q.multi) {
                  const current = answers[q.id] || [];
                  const updated = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt];
                  handleInput(updated);
                } else { handleInput(opt); setTimeout(handleNext, 300); }
              }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isSelected ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                  {isSelected && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            );
          })}
          {loading && <p className="text-sm text-gray-500 text-center">Saving your detailed assessment...</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {q.multi && <Button variant="primary" fullWidth onClick={handleNext} disabled={!canProceed || loading} className="mt-4">{loading ? "Saving..." : "Continue"}</Button>}
        </div>
      )}
    </div>
  );
};

