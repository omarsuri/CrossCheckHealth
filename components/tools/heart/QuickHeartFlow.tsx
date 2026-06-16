"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ShareButtons } from "@/components/shared/prototype";
import { QUICK_HEART_QUESTIONS } from "@/data/heartQuestions";
import { getAnonymousId } from "@/lib/anonymous-id";
import { supabase } from "@/lib/supabase";
import { getUserHealthProfile, upsertUserHealthProfile, UserHealthProfile } from "@/lib/user-health-profile";

type QuickHeartResult = {
  assessment_id?: string;
  riskLevel: "low" | "moderate" | "high";
  riskScore: number;
  riskFactors: string[];
  automaticHighRisk?: boolean;
  riskFactorCount?: number;
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

const DETAILED_HEART_PATH = "/tools/heart-health/detailed";
const NONE_OPTION = "None of these";
const SAFETY_DISCLAIMER = "This quick assessment is for general health awareness only and is not a diagnosis. If you have chest pain, severe shortness of breath, fainting, or symptoms that feel urgent, seek medical help immediately.";

const roundBmi = (heightCm?: number, weightKg?: number) => {
  if (!heightCm || !weightKg) return null;
  const heightMeters = heightCm / 100;
  return Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10;
};

const toHeartSex = (sex?: string | null) => {
  if (!sex) return undefined;
  if (sex.toLowerCase() === "male") return "Male";
  if (sex.toLowerCase() === "female") return "Female";
  return sex;
};

const toProfileSex = (sex?: string) => {
  if (sex === "Male") return "male";
  if (sex === "Female") return "female";
  return sex || null;
};

const knownConditionsFromProfile = (profile: UserHealthProfile) => {
  const conditions: string[] = [];
  if (profile.has_heart_disease) conditions.push("Heart disease or previous heart attack");
  if (profile.has_stroke) conditions.push("Stroke");
  if (profile.has_high_blood_pressure) conditions.push("High blood pressure");
  if (profile.has_diabetes) conditions.push("Diabetes");
  if (profile.has_lung_disease) conditions.push("Lung disease such as asthma or COPD");
  if (profile.has_kidney_disease) conditions.push("Kidney disease");
  return conditions;
};

const buildHeartPrefill = (profile: UserHealthProfile) => {
  const prefill: Record<string, any> = {};
  const conditions = knownConditionsFromProfile(profile);
  const activity = profile.physical_activity_level;

  if (conditions.length > 0) prefill.known_conditions = conditions;
  if (profile.age) prefill.age = String(profile.age);
  if (profile.sex) prefill.sex = toHeartSex(profile.sex);
  if (profile.family_heart_history) prefill.family_history = profile.family_heart_history;
  if (profile.smoking_status) prefill.nicotine = profile.smoking_status;
  if (activity === "Yes" || activity === "No" || activity === "Not sure") prefill.physical_activity = activity;
  else if (activity === "sedentary") prefill.physical_activity = "No";
  else if (activity) prefill.physical_activity = "Yes";
  if (profile.height_cm) prefill.height_cm = String(profile.height_cm);
  if (profile.weight_kg) prefill.weight_kg = String(profile.weight_kg);
  if (profile.waist_cm) {
    prefill.waist_known = "Yes";
    prefill.waist_size = String(profile.waist_cm);
    prefill.waist_unit = "cm";
  }
  if (profile.cholesterol_status) prefill.cholesterol = profile.cholesterol_status;
  if (profile.blood_sugar_status) prefill.blood_sugar = profile.blood_sugar_status;

  return prefill;
};

const buildHeartProfilePayload = (answers: Record<string, any>): UserHealthProfile => {
  const knownConditions = Array.isArray(answers.known_conditions) ? answers.known_conditions : [];
  const waistSize = Number(answers.waist_size);
  const waistCm = answers.waist_known === "Yes" && Number.isFinite(waistSize)
    ? answers.waist_unit === "in" ? Math.round(waistSize * 2.54 * 10) / 10 : waistSize
    : null;

  return {
    age: answers.age ? Number(answers.age) : null,
    sex: toProfileSex(answers.sex),
    height_cm: answers.height_cm ? Number(answers.height_cm) : null,
    weight_kg: answers.weight_kg ? Number(answers.weight_kg) : null,
    waist_cm: waistCm,
    smoking_status: answers.nicotine || null,
    physical_activity_level: answers.physical_activity || null,
    has_heart_disease: knownConditions.includes("Heart disease or previous heart attack"),
    has_stroke: knownConditions.includes("Stroke"),
    has_high_blood_pressure: knownConditions.includes("High blood pressure"),
    has_diabetes: knownConditions.includes("Diabetes") || answers.blood_sugar === "Diabetes",
    has_lung_disease: knownConditions.includes("Lung disease such as asthma or COPD"),
    has_kidney_disease: knownConditions.includes("Kidney disease"),
    family_heart_history: answers.family_history || null,
    cholesterol_status: answers.cholesterol || null,
    blood_sugar_status: answers.blood_sugar || null,
    consent_to_autofill: true,
  };
};

export const QuickHeartFlow = ({ navigate, onLoginRequired }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({ waist_unit: "cm" });
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<QuickHeartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const questions = QUICK_HEART_QUESTIONS;
  const q = questions[step];

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (!sessionUser?.id) {
          if (active) setIsLoggedIn(false);
          return;
        }

        if (active) setIsLoggedIn(true);

        const profile = await getUserHealthProfile();

        if (!active || !profile?.consent_to_autofill) return;

        setAnswers(current => ({ ...current, ...buildHeartPrefill(profile) }));
      } catch (error) {
        if (active) setIsLoggedIn(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const saveAnswersToProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      await upsertUserHealthProfile(buildHeartProfilePayload(answers));
      setProfileMessage("Saved to your health profile. Autofill is now on.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save health profile right now.");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitAssessment = async (nextAnswers: Record<string, any>) => {
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

  const goNext = (nextAnswers = answers) => {
    if (loading) return;
    if (step < questions.length - 1) setStep(step + 1);
    else submitAssessment(nextAnswers);
  };

  const updateAnswer = (key: string, value: any) => {
    setAnswers(current => ({ ...current, [key]: value }));
  };

  const handleSingle = (option: string) => {
    const nextAnswers = { ...answers, [q.id]: option };
    setAnswers(nextAnswers);
    setTimeout(() => goNext(nextAnswers), 250);
  };

  const handleMulti = (option: string) => {
    const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
    let updated: string[];

    if (option === NONE_OPTION) {
      updated = current.includes(option) ? current.filter(item => item !== option) : [option];
    } else {
      updated = current.includes(option)
        ? current.filter(item => item !== option)
        : [...current.filter(item => item !== NONE_OPTION), option];
    }

    setAnswers({ ...answers, [q.id]: updated });
  };

  const canProceed = () => {
    if (q.type === "multi") return Array.isArray(answers[q.id]) && answers[q.id].length > 0;
    if (q.type === "single") return Boolean(answers[q.id]);
    if (q.type === "ageSex") return Boolean(answers.age) && Boolean(answers.sex);
    if (q.type === "heightWeight") return Boolean(answers.height_cm) && Boolean(answers.weight_kg);
    if (q.type === "waist") return Boolean(answers.waist_known);
    return false;
  };

  const handleTakeDetailedAssessment = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) {
      onLoginRequired?.(DETAILED_HEART_PATH);
      return;
    }

    navigate(DETAILED_HEART_PATH);
  };

  if (showResult && result) {
    const riskFactors = result.riskFactors ?? [];
    const riskFactorCount = result.riskFactorCount ?? riskFactors.length;
    const riskLevel = result.riskLevel === "high" ? "High" : result.riskLevel === "moderate" ? "Moderate" : "Low";
    const riskColor = riskLevel === "High" ? "red" : riskLevel === "Moderate" ? "amber" : "green";
    const riskText = `${riskLevel} Risk`;

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
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{result.summary}</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-teal-soft/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-teal-deep">{riskFactorCount}</p>
              <p className="text-xs text-gray-500">Risk factors</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-charcoal">{result.automaticHighRisk ? "Yes" : "No"}</p>
              <p className="text-xs text-gray-500">High-risk answer</p>
            </div>
          </div>

          {riskFactors.length > 0 ? (
            <>
              <h4 className="font-medium text-charcoal mb-2 text-sm">Counted risk factors:</h4>
              <ul className="space-y-1 mb-4">
                {riskFactors.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon name="alertTriangle" size={14} className="text-amber-500" />{f}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-500 mb-4">No counted risk factors from this quick check.</p>
          )}

          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-700 leading-relaxed">{SAFETY_DISCLAIMER}</p>
          </div>

          <h4 className="font-medium text-charcoal mb-2 text-sm">Next steps:</h4>
          <ul className="space-y-1">
            {result.recommendations.map(rec => (
              <li key={rec.title} className="flex items-start gap-2 text-sm text-gray-600">
                <Icon name="check" size={14} className="text-teal-deep mt-0.5 flex-shrink-0" />
                <span><span className="font-medium text-charcoal">{rec.title}</span> - {rec.description}</span>
              </li>
            ))}
          </ul>
        </Card>

        {isLoggedIn && (
          <Card className="mb-6">
            <h3 className="font-semibold text-charcoal mb-2">Health profile</h3>
            <p className="text-sm text-gray-500 mb-4">Save or update these common details for faster future BMI, heart, and fitness assessments.</p>
            <Button variant="secondary" fullWidth onClick={saveAnswersToProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save / Update Health Profile"}
            </Button>
            {profileMessage && <p className="text-sm text-green-700 mt-3">{profileMessage}</p>}
            {profileError && <p className="text-sm text-red-600 mt-3">{profileError}</p>}
          </Card>
        )}

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Share your result</h3>
          <ShareButtons />
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button variant="primary" fullWidth onClick={handleTakeDetailedAssessment}>Take Detailed Assessment</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/tools/body-fat")}>Try Body Fat Assessment</Button>
        </div>
      </div>
    );
  }

  const selected = answers[q.id] || [];
  const bmi = roundBmi(Number(answers.height_cm), Number(answers.weight_kg));

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
        {q.type === "multi" && <p className="text-sm text-gray-500 mt-1">Select all that apply</p>}
      </div>

      {q.type === "multi" && (
        <div className="space-y-3">
          {q.options.map((opt: string) => {
            const isSelected = selected.includes(opt);
            return (
              <button key={opt} onClick={() => handleMulti(opt)} disabled={loading}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isSelected ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                  {isSelected && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {q.type === "single" && (
        <div className="space-y-3">
          {q.options.map((opt: string) => {
            const isSelected = answers[q.id] === opt;
            return (
              <button key={opt} onClick={() => handleSingle(opt)} disabled={loading}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isSelected ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                  {isSelected && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {q.type === "ageSex" && (
        <div className="space-y-4">
          <input type="number" min={1} max={120} value={answers.age || ""} onChange={e => updateAnswer("age", e.target.value)}
            className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            placeholder="Age" />
          <div className="space-y-3">
            {q.sexOptions.map((opt: string) => (
              <button key={opt} onClick={() => updateAnswer("sex", opt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${answers.sex === opt ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${answers.sex === opt ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                  {answers.sex === opt && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {q.type === "heightWeight" && (
        <div className="space-y-4">
          <input type="number" min={80} max={250} value={answers.height_cm || ""} onChange={e => updateAnswer("height_cm", e.target.value)}
            className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            placeholder="Height in cm" />
          <input type="number" min={20} max={250} value={answers.weight_kg || ""} onChange={e => updateAnswer("weight_kg", e.target.value)}
            className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            placeholder="Weight in kg" />
          {bmi !== null && (
            <div className="bg-teal-soft/30 rounded-xl p-3 text-center">
              <p className="text-sm text-gray-500">Estimated BMI</p>
              <p className="text-2xl font-bold text-teal-deep">{bmi}</p>
            </div>
          )}
        </div>
      )}

      {q.type === "waist" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {q.options.map((opt: string) => (
              <button key={opt} onClick={() => updateAnswer("waist_known", opt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${answers.waist_known === opt ? "border-teal-deep bg-teal-soft/30" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${answers.waist_known === opt ? "text-teal-deep" : "text-charcoal"}`}>{opt}</span>
                  {answers.waist_known === opt && <Icon name="check" size={18} className="text-teal-deep" />}
                </div>
              </button>
            ))}
          </div>
          {answers.waist_known === "Yes" && (
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input type="number" min={20} value={answers.waist_size || ""} onChange={e => updateAnswer("waist_size", e.target.value)}
                className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                placeholder="Waist size" />
              <select value={answers.waist_unit || "cm"} onChange={e => updateAnswer("waist_unit", e.target.value)}
                className="px-3 py-4 rounded-xl border-2 border-gray-200 focus:border-teal-deep outline-none bg-white">
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          )}
          <p className="text-xs text-gray-400">Waist size is optional and will not stop you from completing this check.</p>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500 mt-4 text-center">Saving your assessment...</p>}
      {error && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}

      {q.type !== "single" && (
        <div className="mt-6">
          <Button variant="primary" fullWidth onClick={() => goNext()} disabled={!canProceed() || loading}>{loading ? "Saving..." : "Continue"}</Button>
        </div>
      )}
    </div>
  );
};
