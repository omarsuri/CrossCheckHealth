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

export const PCOSReflectionPage = ({ navigate }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<any>(null);
  const current = PCOS_STEPS[step];
  const setAnswer = (id, value) => setAnswers(prev => ({ ...prev, [id]: value }));
  const canProceed = current.type === "intro" || (current.questions || []).every(q => q.type === "check" ? answers[q.id] === true : answers[q.id]);
  const flagged = [answers.pregnancy === "Yes" && "Pregnancy or breastfeeding makes this reflection uninformative; speak with a clinician directly.", answers.age === "15-17 years" && "Under-18 pathway: current guidance treats adolescent PCOS differently and avoids PCOM/AMH for diagnosis.", ["Often longer than 35 days or fewer than 8 per year", "Mostly absent or over 90 days apart"].includes(answers.cycles) && "Cycle pattern is worth discussing with a healthcare provider.", ["Persistent moderate", "Severe or scarring"].includes(answers.acne) && "Persistent acne may be worth raising in a PCOS or dermatology conversation.", answers.hairLoss === "Noticeable or progressing" && "Progressive hair thinning deserves clinical assessment.", answers.acanthosis === "Yes" && "Dark velvety skin patches can be associated with insulin resistance.", (["More than half the days", "Nearly every day"].includes(answers.lowMood) || ["More than half the days", "Nearly every day"].includes(answers.worry)) && "Mental wellbeing concerns deserve support; consider speaking with a trusted clinician or counsellor."].filter(Boolean);
  const completeAssessment = async () => {
    setSubmitError("");
    setSubmitting(true);

    try {
      const submittedAnswers = Object.fromEntries(
        Object.entries(answers).map(([key, value]) => [key, String(value)])
      );
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const sessionUser = sessionData.session?.user;
      const body = sessionUser?.id
        ? { user_id: sessionUser.id, anonymous: false, answers: submittedAnswers }
        : { anonymous_id: getAnonymousId(), anonymous: true, answers: submittedAnswers };
      const response = await fetch("/api/assessments/pcos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to save your PCOS reflection right now.");
      }

      setResult(payload?.data ?? null);
      setDone(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save your PCOS reflection right now.");
    } finally {
      setSubmitting(false);
    }
  };
  const resultFactors = result?.riskFactors?.length ? result.riskFactors : flagged;
  if (done) return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 slide-up"><Card hover={false} className="bg-cream-warm"><Badge color="teal">Educational summary</Badge><h1 className="serif text-4xl font-medium text-ink mt-4 mb-4">Your PCOS reflection summary</h1><p className="text-ink/65 leading-relaxed mb-6">{result?.summary || "This is not a diagnosis, risk score, or medical advice. It is a structured note you can use when speaking with a healthcare provider."}</p><div className="space-y-3 mb-6">{resultFactors.length > 0 ? resultFactors.map(f => <div key={f} className="bg-white border border-ink/5 rounded-xl p-4 flex gap-3"><Icon name="info" size={18} className="text-aqua-deep shrink-0 mt-0.5" /><p className="text-sm text-ink/70">{f}</p></div>) : <div className="bg-white border border-ink/5 rounded-xl p-4"><p className="text-sm text-ink/70">No major reflection flags were selected. If symptoms bother you, it is still reasonable to discuss them with a clinician.</p></div>}{(result?.recommendations || []).map(rec => <div key={rec.title} className="bg-white border border-ink/5 rounded-xl p-4 flex gap-3"><Icon name="check" size={18} className="text-aqua-deep shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-ink">{rec.title}</p><p className="text-sm text-ink/70 mt-1">{rec.description}</p></div></div>)}</div><div className="grid sm:grid-cols-2 gap-3 mb-6"><Button variant="outline" fullWidth icon="download" onClick={() => window.print()}>Print summary</Button><Button variant="primary" fullWidth icon="activity" onClick={() => navigate("/tools/raktasetu")}>View related bloodwork</Button></div><Disclaimer type="general" /></Card></div>;
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 slide-up"><div className="mb-8"><button onClick={() => navigate("/tools")} className="text-sm text-ink/50 hover:text-aqua-deep transition-colors flex items-center gap-1 mb-5"><Icon name="chevronLeft" size={14} />Back to tools</button><div className="flex items-center justify-between gap-4 mb-3"><p className="text-xs uppercase tracking-widest text-ink/40 font-medium">{current.eyebrow}</p><p className="text-sm text-ink/50">{step + 1} / {PCOS_STEPS.length}</p></div><div className="h-2 bg-ink/10 rounded-full overflow-hidden"><div className="h-full bg-aqua-deep rounded-full transition-all" style={{ width: ((step + 1) / PCOS_STEPS.length) * 100 + "%" }} /></div></div><Card hover={false}><h1 className="serif text-3xl sm:text-4xl font-medium text-ink mb-4">{current.title}</h1><p className="text-ink/65 leading-relaxed mb-6">{current.intro}</p>{current.points && <ul className="space-y-3 mb-6">{current.points.map(p => <li key={p} className="flex gap-3 text-sm text-ink/70"><Icon name="check" size={16} className="text-aqua-deep shrink-0 mt-0.5" />{p}</li>)}</ul>}<div className="space-y-6">{(current.questions || []).map(q => <div key={q.id} className="border-t border-ink/5 pt-5 first:border-t-0 first:pt-0"><p className="font-semibold text-ink mb-3">{q.q}</p>{q.type === "check" ? <label className="flex items-start gap-3 bg-cream-warm rounded-xl p-4 cursor-pointer"><input type="checkbox" checked={!!answers[q.id]} onChange={e => setAnswer(q.id, e.target.checked)} className="mt-1" /><span className="text-sm text-ink/70">Yes, I understand.</span></label> : <div className="grid gap-2">{q.options.map(opt => <button key={opt} onClick={() => setAnswer(q.id, opt)} className={(answers[q.id] === opt ? "border-aqua-deep bg-aqua-light text-ink" : "border-ink/10 bg-white hover:bg-cream-warm text-ink/70") + " text-left rounded-xl border px-4 py-3 text-sm transition-colors"}>{opt}</button>)}</div>}</div>)}</div>{submitError && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-4 mt-6">{submitError}</div>}<div className="flex flex-col sm:flex-row gap-3 mt-8"><Button variant="outline" fullWidth disabled={step === 0 || submitting} onClick={() => setStep(Math.max(0, step - 1))}>Back</Button><Button variant="primary" fullWidth disabled={!canProceed || submitting} onClick={() => step === PCOS_STEPS.length - 1 ? completeAssessment() : setStep(step + 1)}>{submitting ? "Creating summary..." : step === PCOS_STEPS.length - 1 ? "Create summary" : "Continue"}</Button></div></Card></div>;
};

