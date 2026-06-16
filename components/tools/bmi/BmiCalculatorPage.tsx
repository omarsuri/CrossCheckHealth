"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getUserHealthProfile, upsertUserHealthProfile } from "@/lib/user-health-profile";
import { supabase } from "@/lib/supabase";

type BmiCategory = "Underweight" | "Healthy weight" | "Overweight" | "Obesity range";

type BmiResult = {
  bmi: number;
  category: BmiCategory;
  interpretation: string;
  nextSteps: string[];
  color: string;
};

const HEIGHT_MIN = 80;
const HEIGHT_MAX = 250;
const WEIGHT_MIN = 20;
const WEIGHT_MAX = 300;

const getBmiResult = (bmi: number): BmiResult => {
  if (bmi < 18.5) {
    return {
      bmi,
      category: "Underweight",
      interpretation: "Your BMI is below the healthy weight range. This may be normal for some people, but if you are losing weight unintentionally or feel weak, consider speaking with a healthcare professional.",
      nextSteps: [
        "Review recent weight changes and appetite.",
        "Prioritize balanced meals with enough protein and energy.",
        "Consider a basic health check if weight loss was not planned.",
      ],
      color: "text-amber-700 bg-amber-50 border-amber-100",
    };
  }

  if (bmi < 25) {
    return {
      bmi,
      category: "Healthy weight",
      interpretation: "Your BMI is within the healthy weight range. Keep maintaining balanced eating, regular activity, good sleep, and routine health checks.",
      nextSteps: [
        "Keep a consistent activity routine.",
        "Maintain balanced meals and regular sleep.",
        "Continue routine health checks over time.",
      ],
      color: "text-green-700 bg-green-50 border-green-100",
    };
  }

  if (bmi < 30) {
    return {
      bmi,
      category: "Overweight",
      interpretation: "Your BMI is above the healthy weight range. Small improvements in activity, food choices, sleep, and consistency can help reduce long-term health risk.",
      nextSteps: [
        "Start with small, repeatable activity goals.",
        "Look for simple food swaps you can sustain.",
        "Track waist size, blood pressure, or energy if helpful.",
      ],
      color: "text-orange-700 bg-orange-50 border-orange-100",
    };
  }

  return {
    bmi,
    category: "Obesity range",
    interpretation: "Your BMI is in the obesity range. BMI is not a diagnosis, but it can be useful as a general health marker. Consider checking blood pressure, cholesterol, and blood sugar, and speak with a healthcare professional if possible.",
    nextSteps: [
      "Consider checking blood pressure, cholesterol, and blood sugar.",
      "Focus on practical changes to activity, meals, sleep, and consistency.",
      "Speak with a healthcare professional for personal guidance if possible.",
    ],
    color: "text-red-700 bg-red-50 border-red-100",
  };
};

export const BmiCalculatorPage = ({ navigate }: { navigate: (path: string) => void }) => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<{ heightCm?: string; weightKg?: string }>({});
  const [result, setResult] = useState<BmiResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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

        const form = formRef.current;
        const heightInput = form?.elements.namedItem("heightCm") as HTMLInputElement | null;
        const weightInput = form?.elements.namedItem("weightKg") as HTMLInputElement | null;

        if (heightInput && profile.height_cm) heightInput.value = String(profile.height_cm);
        if (weightInput && profile.weight_kg) weightInput.value = String(profile.weight_kg);
      } catch (error) {
        if (active) setIsLoggedIn(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const validate = () => {
    const nextErrors: { heightCm?: string; weightKg?: string } = {};
    const formData = formRef.current ? new FormData(formRef.current) : null;
    const heightValue = String(formData?.get("heightCm") ?? "").trim();
    const weightValue = String(formData?.get("weightKg") ?? "").trim();
    const height = Number(heightValue);
    const weight = Number(weightValue);

    if (!heightValue) {
      nextErrors.heightCm = "Enter your height in centimetres.";
    } else if (!Number.isFinite(height) || height < HEIGHT_MIN || height > HEIGHT_MAX) {
      nextErrors.heightCm = "Height should be a realistic value between 80 and 250 cm.";
    }

    if (!weightValue) {
      nextErrors.weightKg = "Enter your weight in kilograms.";
    } else if (!Number.isFinite(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
      nextErrors.weightKg = "Weight should be a realistic value between 20 and 300 kg.";
    }

    setErrors(nextErrors);
    return { isValid: Object.keys(nextErrors).length === 0, height, weight };
  };

  const calculate = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const { isValid, height, weight } = validate();
    if (!isValid) {
      setResult(null);
      return;
    }

    const heightMeters = height / 100;
    const bmi = Math.round((weight / (heightMeters * heightMeters)) * 10) / 10;
    setResult(getBmiResult(bmi));
    setProfileMessage("");
    setProfileError("");
  };

  const reset = () => {
    formRef.current?.reset();
    setErrors({});
    setResult(null);
    setProfileMessage("");
    setProfileError("");
  };

  const saveDetailsToProfile = async () => {
    const { isValid, height, weight } = validate();
    if (!isValid) return;

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      await upsertUserHealthProfile({
        height_cm: height,
        weight_kg: weight,
        consent_to_autofill: true,
      });
      setProfileMessage("Saved to your health profile. Autofill is now on.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save health profile right now.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-cream py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/tools/body-fat")}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors mb-6"
        >
          <Icon name="chevronLeft" size={16} />
          Back to Exercise Intelligence
        </button>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aqua-light text-aqua-deep text-sm font-semibold mb-4">
              <Icon name="activity" size={16} />
              Exercise Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-3">BMI Calculator</h1>
            <p className="text-base sm:text-lg text-ink/60 leading-relaxed max-w-xl">
              Estimate your Body Mass Index using your height and weight.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-1 gap-3 text-sm text-ink/65">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-ink/5">
                <Icon name="check" size={18} className="text-aqua-deep mt-0.5" />
                <span>No login required. Results stay on this page.</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-ink/5">
                <Icon name="info" size={18} className="text-aqua-deep mt-0.5" />
                <span>BMI is a quick screening marker, not a full health assessment.</span>
              </div>
            </div>
          </div>

          <Card hover={false} className="p-5 sm:p-7">
            <form ref={formRef} onSubmit={calculate} className="space-y-5">
              <div>
                <label htmlFor="heightCm" className="block text-sm font-semibold text-ink mb-2">
                  Height
                </label>
                <div className="relative">
                  <input
                    id="heightCm"
                    name="heightCm"
                    type="number"
                    inputMode="decimal"
                    min={HEIGHT_MIN}
                    max={HEIGHT_MAX}
                    onInput={() => {
                      setErrors((current) => ({ ...current, heightCm: undefined }));
                    }}
                    className={`w-full rounded-2xl border bg-white px-4 py-3 pr-14 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                      errors.heightCm ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                    }`}
                    placeholder="170"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/45">cm</span>
                </div>
                {errors.heightCm && <p className="mt-2 text-sm text-red-600">{errors.heightCm}</p>}
              </div>

              <div>
                <label htmlFor="weightKg" className="block text-sm font-semibold text-ink mb-2">
                  Weight
                </label>
                <div className="relative">
                  <input
                    id="weightKg"
                    name="weightKg"
                    type="number"
                    inputMode="decimal"
                    min={WEIGHT_MIN}
                    max={WEIGHT_MAX}
                    onInput={() => {
                      setErrors((current) => ({ ...current, weightKg: undefined }));
                    }}
                    className={`w-full rounded-2xl border bg-white px-4 py-3 pr-14 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                      errors.weightKg ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                    }`}
                    placeholder="70"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/45">kg</span>
                </div>
                {errors.weightKg && <p className="mt-2 text-sm text-red-600">{errors.weightKg}</p>}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button type="submit" fullWidth icon="activity">
                  Calculate
                </Button>
                <Button onClick={reset} variant="secondary" fullWidth icon="refreshCw">
                  Reset
                </Button>
              </div>

              {result && (
                <div className={`rounded-3xl border p-5 ${result.color}`}>
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm font-semibold opacity-80">Your BMI</p>
                      <p className="text-5xl font-bold tracking-tight text-ink mt-1">{result.bmi.toFixed(1)}</p>
                    </div>
                    <div className="inline-flex self-start sm:self-auto px-3 py-1.5 rounded-full bg-white/80 border border-white text-sm font-semibold text-ink">
                      {result.category}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-ink/75">{result.interpretation}</p>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-ink mb-2">Simple next steps</p>
                    <div className="space-y-2">
                      {result.nextSteps.map((step) => (
                        <div key={step} className="flex items-start gap-2 text-sm text-ink/70">
                          <Icon name="check" size={16} className="text-aqua-deep mt-0.5 shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result && isLoggedIn && (
                <div className="rounded-2xl border border-aqua-deep/15 bg-aqua-light/40 p-4">
                  <div className="flex items-start gap-3">
                    <Icon name="check" size={18} className="text-aqua-deep mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink">Save these details to your health profile for faster future assessments?</p>
                      <p className="text-sm text-ink/60 mt-1">This will save height and weight only, and turn on autofill for your account.</p>
                      <Button onClick={saveDetailsToProfile} disabled={savingProfile} size="sm" className="mt-3">
                        {savingProfile ? "Saving..." : "Save to Health Profile"}
                      </Button>
                      {profileMessage && <p className="text-sm text-green-700 mt-2">{profileMessage}</p>}
                      {profileError && <p className="text-sm text-red-600 mt-2">{profileError}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-ink/10 bg-cream-warm/60 p-4">
                <div className="flex items-start gap-3">
                  <Icon name="info" size={18} className="text-ink/45 mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed text-ink/60">
                    BMI is a general screening tool and does not directly measure body fat, muscle mass, or overall health. It should not be used as a diagnosis.
                  </p>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BmiCalculatorPage;
