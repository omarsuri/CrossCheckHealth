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

type BodyFatApiResult = {
  bmr: number;
  tdee: number;
  estimated_body_fat: number;
  calorie_target: number;
  projected_weight: number;
  adherence_score: number;
  summary: string;
  recommendations: string[];
};

type BodyFatApiResponse = {
  success: boolean;
  data?: {
    assessment_id: string;
    result: BodyFatApiResult;
  };
  error?: {
    message?: string;
  };
};

export const getBodyFitnessInputs = (answers: Record<string, any>): Record<string, any> => BODY_FITNESS_STEPS.reduce((acc, step) => {
  if (step.type === "number") acc[step.id] = Number(answers[step.id] ?? step.default);
  else acc[step.id] = answers[step.id] ?? step.options[0].value;
  return acc;
}, {} as Record<string, any>);

export const calculateAuraLite = (inputs: Record<string, any>) => {
  const { sex, age, height, weight, waist, activity, goal, workout_freq, sleep, timeline } = inputs;
  let bmr = sex === "male"
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const tdee = bmr * activity;
  let bodyFat = sex === "male"
    ? 86.01 * Math.log10(waist * 0.3937) - 70.041 * Math.log10(height * 0.3937) + 36.76
    : 163.205 * Math.log10(waist * 0.3937) - 97.684 * Math.log10(height * 0.3937) - 78.387;
  if (!isFinite(bodyFat) || bodyFat < 5 || bodyFat > 50) bodyFat = sex === "male" ? 18 : 25;
  const lbm = weight * (1 - bodyFat / 100);
  let targetCalories = tdee;
  let weeklyChange = 0;
  if (goal === "lose_fat") { targetCalories = tdee - 500; weeklyChange = -0.5; }
  else if (goal === "gain_muscle") { targetCalories = tdee + 300; weeklyChange = 0.25; }
  else if (goal === "recomp") { targetCalories = tdee - 200; weeklyChange = -0.2; }
  const weeks = timeline;
  const timelineData = [];
  const optimistic = [];
  const conservative = [];
  for (let w = 0; w <= weeks; w++) {
    const progress = weeks === 0 ? 0 : w / weeks;
    const eased = 1 - Math.pow(1 - progress, 1.5);
    const baseWeight = weight + (weeklyChange * weeks) * eased;
    const variance = 0.3 * Math.sin(progress * Math.PI) * Math.abs(weeklyChange * weeks);
    timelineData.push({ week: w, weight: Math.round(baseWeight * 10) / 10 });
    optimistic.push({ week: w, weight: Math.round((baseWeight - variance) * 10) / 10 });
    conservative.push({ week: w, weight: Math.round((baseWeight + variance) * 10) / 10 });
  }
  const projectedWeight = timelineData[timelineData.length - 1].weight;
  const projectedFat = Math.max(5, bodyFat + (weeklyChange < 0 ? -0.3 * weeks : weeklyChange > 0 ? 0.1 * weeks : 0));
  const sleepScore = sleep >= 7 ? 25 : sleep >= 6 ? 18 : 10;
  const workoutScore = workout_freq >= 3 ? 25 : workout_freq >= 1 ? 18 : 10;
  const adherenceScore = Math.min(98, sleepScore + workoutScore + 20 + (activity >= 1.55 ? 20 : 15) + 8);
  const metabolicAge = Math.round(age + (bodyFat - 15) * 0.3 - (activity - 1.2) * 5);
  return {
    bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories: Math.round(targetCalories),
    bodyFat: Math.round(bodyFat * 10) / 10, lbm: Math.round(lbm * 10) / 10,
    projectedWeight, projectedFat: Math.round(projectedFat * 10) / 10,
    weightChange: Math.round((projectedWeight - weight) * 10) / 10,
    weeks, adherenceScore, metabolicAge, timeline: timelineData, optimistic, conservative,
  };
};

export const generateBodyInsight = (inputs, results) => {
  if (inputs.sleep < 7) return "Sleep is the biggest unlock in your forecast. Moving toward 7-8 hours could improve recovery, appetite control, and adherence.";
  if (inputs.workout_freq < 3 && inputs.goal !== "maintain") return "Your forecast improves most when training frequency rises toward 3-4 sessions per week.";
  if (inputs.goal === "lose_fat" && results.bodyFat > 20) return "Your current body-fat estimate supports a safe fat-loss phase. Prioritize protein and consistency to protect lean mass.";
  if (inputs.goal === "gain_muscle") return "For muscle gain, keep the calorie surplus controlled and make progressive training the anchor habit.";
  return "Your profile is well balanced. The main job now is consistency across sleep, training, and weekly movement.";
};

export const buildMilestones = (timeline, goal) => {
  const picks = [0.25, 0.5, 1].map(p => timeline[Math.min(timeline.length - 1, Math.round((timeline.length - 1) * p))]);
  const labels = goal === "gain_muscle" ? ["First strength bump", "Visible fullness", "Goal checkpoint"] : ["First waist change", "Visible momentum", "Goal checkpoint"];
  return picks.map((point, i) => ({ ...point, label: labels[i] }));
};

export const chartPoints = (series, min, max) => series.map((point, i) => {
  const x = series.length === 1 ? 0 : (i / (series.length - 1)) * 100;
  const y = 100 - ((point.weight - min) / Math.max(1, max - min)) * 80 - 10;
  return `${x},${y}`;
}).join(" ");

export const BodyFatFlow = ({ navigate, user, onLogin }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [scenario, setScenario] = useState<Record<string, any>>({});
  const [apiResult, setApiResult] = useState<BodyFatApiResult | null>(null);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  if (!user || authRequired) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
        <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="lock" size={32} className="text-teal-deep" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3">Login Required</h2>
        <p className="text-gray-500 mb-6">The Body Fat & Fitness Prediction tool requires an account to save your progress and generate forecasts.</p>
        <Button variant="primary" fullWidth onClick={onLogin}>Login / Create Free Account</Button>
        <Button variant="ghost" fullWidth onClick={() => navigate("/tools/heart-health/quick")} className="mt-2">Try Free Heart Check Instead</Button>
      </div>
    );
  }

  const currentQ = BODY_FITNESS_STEPS[step];
  const getActivityLevel = (activity: number) => {
    if (activity >= 1.725) return "very_active";
    if (activity >= 1.55) return "moderately_active";
    if (activity >= 1.375) return "lightly_active";
    return "sedentary";
  };
  const getWorkoutFrequency = (frequency: number) => {
    if (frequency >= 5) return "5+";
    if (frequency >= 3) return "3-4";
    if (frequency >= 1) return "1-2";
    return "none";
  };
  const submitBodyAssessment = async (nextAnswers: Record<string, any>) => {
    const inputs = getBodyFitnessInputs(nextAnswers);
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (!sessionUser?.id) {
        setAuthRequired(true);
        return;
      }

      const response = await fetch("/api/assessments/body-fat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: sessionUser.id,
          goal: inputs.goal,
          sex: inputs.sex,
          age: inputs.age,
          height_cm: inputs.height,
          weight_kg: inputs.weight,
          waist_cm: inputs.waist,
          activity_level: getActivityLevel(inputs.activity),
          workout_frequency: getWorkoutFrequency(inputs.workout_freq),
          sleep_hours: inputs.sleep,
          timeline_weeks: inputs.timeline,
        }),
      });

      const payload = (await response.json()) as BodyFatApiResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message || "Unable to save body assessment");
      }

      setApiResult(payload.data.result);
      setShowResult(true);
    } catch (err) {
      console.error("Body fat assessment submit failed:", err);
      setError(err instanceof Error ? err.message : "Unable to save body assessment");
    } finally {
      setLoading(false);
    }
  };
  const handleNext = () => {
    if (step < BODY_FITNESS_STEPS.length - 1) setStep(step + 1);
    else submitBodyAssessment(answers);
  };
  const handleChoice = (value) => {
    const nextAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(nextAnswers);
    setTimeout(() => {
      if (step < BODY_FITNESS_STEPS.length - 1) setStep(step + 1);
      else submitBodyAssessment(nextAnswers);
    }, 250);
  };
  const handleNumber = (value) => setAnswers(prev => ({ ...prev, [currentQ.id]: Number(value) }));

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center slide-up">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-teal-soft rounded-full" />
          <div className="absolute inset-0 border-4 border-teal-deep rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center"><Icon name="activity" size={28} className="text-teal-deep" /></div>
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-2">Building your forecast</h2>
        <p className="text-gray-500">AURA Lite is modeling your metabolism, timeline, and consistency signals.</p>
        <div className="mt-8 space-y-3 max-w-xs mx-auto text-left">
          {["Calculating body composition", "Estimating metabolic rate", "Forecasting progress", "Generating recommendations"].map(stage => (
            <div key={stage} className="flex items-center gap-3 text-sm text-teal-deep">
              <Icon name="check" size={14} />{stage}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showResult) {
    const inputs = getBodyFitnessInputs(answers);
    const localResults = calculateAuraLite(inputs);
    const results = apiResult ? {
      ...localResults,
      bmr: apiResult.bmr,
      tdee: apiResult.tdee,
      targetCalories: apiResult.calorie_target,
      bodyFat: apiResult.estimated_body_fat,
      projectedWeight: apiResult.projected_weight,
      weightChange: Math.round((apiResult.projected_weight - inputs.weight) * 10) / 10,
      adherenceScore: apiResult.adherence_score,
    } : localResults;
    const isLoss = results.weightChange < 0;
    const changeText = isLoss ? "lose" : results.weightChange > 0 ? "gain" : "maintain";
    const changeVal = Math.abs(results.weightChange);
    const allWeights = [...results.optimistic, ...results.timeline, ...results.conservative].map(p => p.weight);
    const minWeight = Math.min(...allWeights);
    const maxWeight = Math.max(...allWeights);
    const sleepScenario = scenario.sleep ?? inputs.sleep;
    const trainScenario = scenario.workout_freq ?? inputs.workout_freq;
    const scenarioBoost = (sleepScenario - inputs.sleep) * 0.15 + (trainScenario - inputs.workout_freq) * 0.1;
    const adjustedChange = Math.round((results.weightChange * (1 + scenarioBoost)) * 10) / 10;
    const ring = 2 * Math.PI * 36;
    const bodyShift = Math.max(-8, Math.min(8, results.weightChange));
    const milestones = buildMilestones(results.timeline, inputs.goal);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 slide-up">
        <button onClick={() => { setShowResult(false); setStep(BODY_FITNESS_STEPS.length - 1); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
          <Icon name="chevronLeft" size={16} />Back to assessment
        </button>

        <Card className="mb-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-soft/40 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-soft/40 border border-teal-100 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-deep animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-teal-deep">AI Prediction Ready</span>
            </div>
            <p className="text-xs uppercase tracking-[0.08em] text-gray-400 font-semibold mb-2">In {results.weeks} weeks, you could</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-teal-deep mb-2">{changeText} {changeVal} kg</h2>
            <p className="text-sm text-gray-500 mb-6">From {inputs.weight} kg to {results.projectedWeight} kg</p>
            <div className="flex justify-center gap-10">
              <div><p className="text-2xl font-bold text-charcoal">{results.targetCalories}</p><p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">Calories/day</p></div>
              <div><p className="text-2xl font-bold text-charcoal">{results.adherenceScore}%</p><p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">Adherence</p></div>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-4">Your Transformation</h3>
          <div className="flex items-center justify-center gap-6 sm:gap-10 py-4">
            <div className="text-center">
              <svg className="w-20 h-32 mx-auto" viewBox="0 0 100 160" aria-hidden="true">
                <ellipse cx="50" cy="30" rx="18" ry="20" fill="#E7E5E4" />
                <path d="M50 50 L50 90 M35 60 L65 60 M50 90 L35 130 M50 90 L65 130" stroke="#D6D3D1" strokeWidth="4" strokeLinecap="round" />
                <rect x="30" y="55" width="40" height="35" rx="8" fill="#F5F5F4" />
              </svg>
              <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold mt-2">Now</p>
              <p className="text-xs font-medium text-gray-600">{inputs.weight} kg</p>
            </div>
            <div className="flex flex-col items-center text-teal-deep">
              <Icon name="arrowRight" size={24} />
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold mt-2">{results.weeks}w</p>
            </div>
            <div className="text-center">
              <svg className="w-20 h-32 mx-auto" viewBox="0 0 100 160" aria-hidden="true">
                <ellipse cx="50" cy="30" rx={Math.max(12, 16 + bodyShift * 0.25)} ry="20" fill="#CCFBF1" />
                <path d={`M50 50 L50 90 M${35 - bodyShift * 0.35} 60 L${65 + bodyShift * 0.35} 60 M50 90 L${35 - bodyShift * 0.2} 130 M50 90 L${65 + bodyShift * 0.2} 130`} stroke="#5EEAD4" strokeWidth="4" strokeLinecap="round" />
                <rect x={Math.max(26, 32 - bodyShift * 0.25)} y="55" width={Math.max(28, 36 + bodyShift * 0.5)} height="35" rx="8" fill="#F0FDFA" />
              </svg>
              <p className="text-[10px] uppercase tracking-[0.08em] text-teal-deep font-semibold mt-2">Goal</p>
              <p className="text-xs font-medium text-gray-600">{results.projectedWeight} kg</p>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-4">Weight Trajectory</h3>
          <div className="h-52 bg-gray-50 rounded-xl p-3">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-label="Weight trajectory chart">
              <polyline points={chartPoints(results.conservative, minWeight, maxWeight)} fill="none" stroke="#D6D3D1" strokeWidth="1.5" strokeDasharray="3 3" />
              <polyline points={chartPoints(results.optimistic, minWeight, maxWeight)} fill="none" stroke="#5EEAD4" strokeWidth="1.5" strokeDasharray="3 3" />
              <polyline points={chartPoints(results.timeline, minWeight, maxWeight)} fill="none" stroke="#0A6C74" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-teal-300" />Optimistic</span>
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-teal-deep" />Realistic</span>
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-stone-300" />Conservative</span>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-1">What If Simulator</h3>
          <p className="text-sm text-gray-500 mb-5">See how sleep and training changes affect your forecast.</p>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-2"><span className="text-gray-500">Sleep Quality</span><span className="text-teal-deep font-medium">{sleepScenario >= 7.5 ? "Optimal" : sleepScenario >= 6.5 ? "Good" : "Poor"} ({sleepScenario}h)</span></div>
              <input type="range" min="5" max="9" step="0.5" value={sleepScenario} onChange={e => setScenario(s => ({ ...s, sleep: Number(e.target.value) }))} className="aura-slider" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2"><span className="text-gray-500">Training Frequency</span><span className="text-teal-deep font-medium">{trainScenario}x/week</span></div>
              <input type="range" min="0" max="6" step="2" value={trainScenario} onChange={e => setScenario(s => ({ ...s, workout_freq: Number(e.target.value) }))} className="aura-slider" />
            </div>
          </div>
          <div className="mt-5 p-3 rounded-xl bg-teal-soft/40 border border-teal-100">
            <p className="text-[10px] uppercase tracking-[0.08em] text-teal-deep font-semibold mb-1">Adjusted Forecast</p>
            <p className="text-sm text-gray-700">With these changes, you could {adjustedChange < 0 ? "lose" : adjustedChange > 0 ? "gain" : "maintain"} {Math.abs(adjustedChange)} kg instead of {changeVal} kg.</p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Body Fat", value: `${results.bodyFat}%`, detail: `to ${results.projectedFat}%` },
            { label: "Metabolic Age", value: results.metabolicAge, detail: results.metabolicAge < inputs.age ? "Younger than actual" : "Room to improve" },
            { label: "Lean Mass", value: `${results.lbm} kg`, detail: "Estimated" },
            { label: "Daily TDEE", value: results.tdee, detail: "kcal" },
          ].map(metric => (
            <Card key={metric.label} hover={false} className="p-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold mb-1">{metric.label}</p>
              <p className="text-xl font-bold text-charcoal">{metric.value}</p>
              <p className="text-[10px] text-teal-deep mt-1 font-medium">{metric.detail}</p>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-charcoal">Consistency Score</h3>
            <span className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">Based on inputs</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#E7E5E4" strokeWidth="6" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="#0A6C74" strokeWidth="6" strokeDasharray={ring} strokeDashoffset={ring * (1 - results.adherenceScore / 100)} strokeLinecap="round" className="progress-ring-circle" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold text-charcoal">{results.adherenceScore}</span></div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-400">Sleep</span><span className="text-teal-deep">{inputs.sleep >= 7 ? "Strong" : "Improve"}</span></div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-teal-deep rounded-full" style={{ width: `${Math.min(100, inputs.sleep / 9 * 100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-400">Training</span><span className="text-teal-deep">{inputs.workout_freq >= 3 ? "Strong" : "Build up"}</span></div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-teal-deep rounded-full" style={{ width: `${Math.min(100, inputs.workout_freq / 6 * 100)}%` }} /></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-4">Milestone Forecast</h3>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-soft flex items-center justify-center text-xs font-bold text-teal-deep">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal">{m.label}</p>
                  <p className="text-xs text-gray-500">Week {m.week}: about {m.weight} kg</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-6 border-teal-100 bg-teal-soft/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-deep flex items-center justify-center flex-shrink-0 mt-0.5"><Icon name="zap" size={16} className="text-white" /></div>
            <div>
              <p className="font-medium text-sm text-charcoal mb-1">Coach Insight</p>
              <p className="text-sm text-gray-600 leading-relaxed">{apiResult?.summary || generateBodyInsight(inputs, results)}</p>
            </div>
          </div>
        </Card>

        <Card className="mb-6 flex items-center gap-4 border-teal-100 shadow-md shadow-teal-700/5">
          <div className="w-12 h-12 rounded-full bg-teal-deep flex items-center justify-center text-xl shadow-lg shadow-teal-700/20">🏆</div>
          <div>
            <p className="text-sm font-semibold text-charcoal">First Forecast Unlocked</p>
            <p className="text-xs text-gray-400">You're in the top 20% of users who complete setup</p>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-3">Share your forecast</h3>
          <ShareButtons />
        </Card>
        <Disclaimer type="general" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate("/dashboard")}>Save to Dashboard</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/tools/products")}>Open SwasthyaSathi</Button>
        </div>
      </div>
    );
  }

  const currentValue = currentQ.type === "number" ? Number(answers[currentQ.id] ?? currentQ.default) : answers[currentQ.id];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <button onClick={() => step > 0 ? setStep(step - 1) : navigate("/tools/body-fat")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
        <Icon name="chevronLeft" size={16} />{step === 0 ? "Back" : "Previous"}
      </button>
      <ProgressBar current={step + 1} total={BODY_FITNESS_STEPS.length} className="mb-8" />
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold">Quick Setup - Step {step + 1}/{BODY_FITNESS_STEPS.length}</span>
        </div>
        <h2 className="text-2xl font-bold text-charcoal mt-2">{currentQ.title}</h2>
        <p className="text-sm text-gray-500 mt-2">{currentQ.subtitle}</p>
      </div>
      {currentQ.type === "number" ? (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="text-5xl font-extrabold text-teal-deep mb-2">{currentValue}</div>
            <div className="text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold mb-8">{currentQ.unit}</div>
            <input type="range" min={currentQ.min} max={currentQ.max} step={currentQ.step} value={currentValue} onChange={e => handleNumber(e.target.value)} className="aura-slider mb-6" aria-label={currentQ.title} />
            <div className="flex justify-between text-[10px] uppercase tracking-[0.08em] text-gray-400 font-semibold px-1">
              <span>{currentQ.min}</span><span>{currentQ.max}</span>
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={handleNext}>Continue</Button>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3" role="radiogroup" aria-label={currentQ.title}>
          {currentQ.options.map(opt => {
            const isSelected = currentValue === opt.value;
            return (
              <button key={opt.label} onClick={() => handleChoice(opt.value)}
                className={`w-full text-left rounded-2xl p-4 border-2 transition-all btn-press ${isSelected ? "border-teal-deep bg-teal-soft/40 shadow-[0_0_0_3px_rgba(10,108,116,0.08)]" : "border-transparent bg-white hover:border-gray-100 shadow-sm"}`}
                role="radio" aria-checked={isSelected}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-charcoal">{opt.label}</div>
                    {opt.desc && <div className="text-gray-400 text-xs mt-0.5 leading-relaxed">{opt.desc}</div>}
                  </div>
                  {isSelected && <Icon name="check" size={20} className="text-teal-deep flex-shrink-0" />}
                </div>
              </button>
            );
          })}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
};
