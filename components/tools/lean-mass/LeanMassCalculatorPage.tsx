"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getUserHealthProfile, upsertUserHealthProfile } from "@/lib/user-health-profile";
import { supabase } from "@/lib/supabase";

type UnitSystem = "metric" | "imperial";
type Sex = "male" | "female";

type LeanMassResult = {
  formula: "boer";
  sex: Sex;
  heightCm: number;
  weightKg: number;
  leanMassKg: number;
  leanMassPercentage: number;
  estimatedRemainingMassKg: number;
};

type LeanMassErrors = {
  sex?: string;
  heightCm?: string;
  weightKg?: string;
  feet?: string;
  inches?: string;
  weightLb?: string;
  result?: string;
};

const HEIGHT_MIN = 120;
const HEIGHT_MAX = 230;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;

const formatOne = (value: number) => value.toFixed(1);

const calculateLeanMass = (sex: Sex, heightCm: number, weightKg: number): LeanMassResult => {
  const leanMassKg = sex === "male"
    ? 0.407 * weightKg + 0.267 * heightCm - 19.2
    : 0.252 * weightKg + 0.473 * heightCm - 48.3;

  return {
    formula: "boer",
    sex,
    heightCm,
    weightKg,
    leanMassKg,
    leanMassPercentage: (leanMassKg / weightKg) * 100,
    estimatedRemainingMassKg: weightKg - leanMassKg,
  };
};

export const LeanMassCalculatorPage = ({ navigate }: { navigate: (path: string) => void }) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [sex, setSex] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [errors, setErrors] = useState<LeanMassErrors>({});
  const [result, setResult] = useState<LeanMassResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usedProfile, setUsedProfile] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(true);
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

        const nextSex = profile.sex === "male" || profile.sex === "female" ? profile.sex : "";
        if (nextSex) setSex(nextSex);
        if (profile.height_cm) setHeightCm(String(profile.height_cm));
        if (profile.weight_kg) setWeightKg(String(profile.weight_kg));
        if (nextSex || profile.height_cm || profile.weight_kg) setUsedProfile(true);
      } catch (error) {
        if (active) setIsLoggedIn(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const clearCalculationState = () => {
    setResult(null);
    setProfileMessage("");
    setProfileError("");
    setShowSavePrompt(true);
  };

  const setUnit = (nextUnit: UnitSystem) => {
    setUnitSystem(nextUnit);
    setErrors({});
    clearCalculationState();
  };

  const validate = () => {
    const nextErrors: LeanMassErrors = {};
    const selectedSex = sex as Sex;
    let finalHeightCm = 0;
    let finalWeightKg = 0;

    if (selectedSex !== "male" && selectedSex !== "female") {
      nextErrors.sex = "Choose male or female so the correct formula can be used.";
    }

    if (unitSystem === "metric") {
      finalHeightCm = Number(heightCm);
      finalWeightKg = Number(weightKg);

      if (!heightCm.trim()) {
        nextErrors.heightCm = "Enter your height in centimetres.";
      } else if (!Number.isFinite(finalHeightCm) || finalHeightCm <= 0 || finalHeightCm < HEIGHT_MIN || finalHeightCm > HEIGHT_MAX) {
        nextErrors.heightCm = "Height should be between 120 and 230 cm.";
      }

      if (!weightKg.trim()) {
        nextErrors.weightKg = "Enter your weight in kilograms.";
      } else if (!Number.isFinite(finalWeightKg) || finalWeightKg <= 0 || finalWeightKg < WEIGHT_MIN || finalWeightKg > WEIGHT_MAX) {
        nextErrors.weightKg = "Weight should be between 30 and 300 kg.";
      }
    } else {
      const feetValue = Number(feet);
      const inchesValue = Number(inches);
      const poundsValue = Number(weightLb);

      if (!feet.trim()) {
        nextErrors.feet = "Enter feet.";
      } else if (!Number.isFinite(feetValue) || feetValue <= 0) {
        nextErrors.feet = "Feet must be a positive number.";
      }

      if (!inches.trim()) {
        nextErrors.inches = "Enter inches, or 0 if none.";
      } else if (!Number.isFinite(inchesValue) || inchesValue < 0 || inchesValue > 11) {
        nextErrors.inches = "Inches must be between 0 and 11.";
      }

      if (!weightLb.trim()) {
        nextErrors.weightLb = "Enter your weight in pounds.";
      } else if (!Number.isFinite(poundsValue) || poundsValue <= 0) {
        nextErrors.weightLb = "Pounds must be a positive number.";
      }

      if (!nextErrors.feet && !nextErrors.inches) {
        const totalInches = feetValue * 12 + inchesValue;
        finalHeightCm = totalInches * 2.54;

        if (finalHeightCm < HEIGHT_MIN || finalHeightCm > HEIGHT_MAX) {
          nextErrors.feet = "Height should convert to between 120 and 230 cm.";
        }
      }

      if (!nextErrors.weightLb) {
        finalWeightKg = poundsValue * 0.45359237;

        if (finalWeightKg < WEIGHT_MIN || finalWeightKg > WEIGHT_MAX) {
          nextErrors.weightLb = "Weight should convert to between 30 and 300 kg.";
        }
      }
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      sex: selectedSex,
      heightCm: finalHeightCm,
      weightKg: finalWeightKg,
    };
  };

  const handleCalculate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");

    const validated = validate();
    if (!validated.isValid) {
      setResult(null);
      return;
    }

    const nextResult = calculateLeanMass(validated.sex, validated.heightCm, validated.weightKg);
    const reliable =
      nextResult.leanMassKg > 0 &&
      nextResult.leanMassKg < nextResult.weightKg &&
      nextResult.leanMassPercentage > 0 &&
      nextResult.leanMassPercentage < 100;

    if (!reliable) {
      setResult(null);
      setErrors({ result: "We could not produce a reliable estimate from these measurements. Please check your entries." });
      return;
    }

    setErrors({});
    setResult(nextResult);
    setShowSavePrompt(true);
  };

  const reset = () => {
    setUnitSystem("metric");
    setSex("");
    setHeightCm("");
    setWeightKg("");
    setFeet("");
    setInches("");
    setWeightLb("");
    setErrors({});
    setResult(null);
    setUsedProfile(false);
    setShowSavePrompt(true);
    setProfileMessage("");
    setProfileError("");
  };

  const saveToProfile = async () => {
    const validated = validate();
    if (!validated.isValid) return;

    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      await upsertUserHealthProfile({
        sex: validated.sex,
        height_cm: validated.heightCm,
        weight_kg: validated.weightKg,
        consent_to_autofill: true,
      });
      setProfileMessage("Saved to your health profile. Autofill is now on.");
      setShowSavePrompt(false);
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
              <Icon name="trendingUp" size={16} />
              Exercise Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-3">Lean Mass Calculator</h1>
            <p className="text-base sm:text-lg text-ink/60 leading-relaxed max-w-xl">
              Estimate how much of your body weight is made up of muscles, bones, organs, connective tissue, and body water.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-1 gap-3 text-sm text-ink/65">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-ink/5">
                <Icon name="info" size={18} className="text-aqua-deep mt-0.5" />
                <span>This estimate is intended for adults aged 18 and over.</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/70 border border-ink/5">
                <Icon name="check" size={18} className="text-aqua-deep mt-0.5" />
                <span>No login required. Results stay on this page.</span>
              </div>
            </div>
          </div>

          <Card hover={false} className="p-5 sm:p-7">
            <form onSubmit={handleCalculate} className="space-y-5">
              {usedProfile && (
                <div className="rounded-2xl border border-aqua-deep/15 bg-aqua-light/40 p-4 text-sm text-ink/70">
                  We used your saved profile details. You can edit them before calculating.
                </div>
              )}

              <div>
                <span className="block text-sm font-semibold text-ink mb-2">Sex</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["male", "female"] as Sex[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSex(option);
                        setErrors((current) => ({ ...current, sex: undefined }));
                        clearCalculationState();
                      }}
                      className={`min-h-[48px] rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                        sex === option ? "border-aqua-deep bg-aqua-light text-aqua-deep" : "border-ink/10 bg-white text-ink/70 hover:border-aqua-deep/40"
                      }`}
                    >
                      {option === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-ink/55">This calculator uses different estimation formulas for males and females.</p>
                {errors.sex && <p className="mt-2 text-sm text-red-600">{errors.sex}</p>}
              </div>

              <div>
                <span className="block text-sm font-semibold text-ink mb-2">Units</span>
                <div className="grid grid-cols-2 rounded-2xl border border-ink/10 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setUnit("metric")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${unitSystem === "metric" ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"}`}
                  >
                    Metric
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit("imperial")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${unitSystem === "imperial" ? "bg-ink text-cream" : "text-ink/60 hover:text-ink"}`}
                  >
                    Imperial
                  </button>
                </div>
              </div>

              {unitSystem === "metric" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-ink mb-2">Height</span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={heightCm}
                        onChange={(event) => {
                          setHeightCm(event.target.value);
                          setErrors((current) => ({ ...current, heightCm: undefined, result: undefined }));
                          clearCalculationState();
                        }}
                        className={`w-full rounded-2xl border bg-white px-4 py-3 pr-14 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                          errors.heightCm ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                        }`}
                        placeholder="180"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/45">cm</span>
                    </div>
                    {errors.heightCm && <p className="mt-2 text-sm text-red-600">{errors.heightCm}</p>}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-ink mb-2">Weight</span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weightKg}
                        onChange={(event) => {
                          setWeightKg(event.target.value);
                          setErrors((current) => ({ ...current, weightKg: undefined, result: undefined }));
                          clearCalculationState();
                        }}
                        className={`w-full rounded-2xl border bg-white px-4 py-3 pr-14 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                          errors.weightKg ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                        }`}
                        placeholder="80"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/45">kg</span>
                    </div>
                    {errors.weightKg && <p className="mt-2 text-sm text-red-600">{errors.weightKg}</p>}
                  </label>
                </div>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-ink mb-2">Feet</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={feet}
                      onChange={(event) => {
                        setFeet(event.target.value);
                        setErrors((current) => ({ ...current, feet: undefined, result: undefined }));
                        clearCalculationState();
                      }}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                        errors.feet ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                      }`}
                      placeholder="5"
                    />
                    {errors.feet && <p className="mt-2 text-sm text-red-600">{errors.feet}</p>}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-ink mb-2">Inches</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={inches}
                      onChange={(event) => {
                        setInches(event.target.value);
                        setErrors((current) => ({ ...current, inches: undefined, result: undefined }));
                        clearCalculationState();
                      }}
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                        errors.inches ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                      }`}
                      placeholder="11"
                    />
                    {errors.inches && <p className="mt-2 text-sm text-red-600">{errors.inches}</p>}
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-ink mb-2">Weight</span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weightLb}
                        onChange={(event) => {
                          setWeightLb(event.target.value);
                          setErrors((current) => ({ ...current, weightLb: undefined, result: undefined }));
                          clearCalculationState();
                        }}
                        className={`w-full rounded-2xl border bg-white px-4 py-3 pr-12 text-base text-ink outline-none transition-colors focus:ring-2 focus:ring-aqua/40 ${
                          errors.weightLb ? "border-red-300" : "border-ink/10 focus:border-aqua-deep"
                        }`}
                        placeholder="176"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/45">lb</span>
                    </div>
                    {errors.weightLb && <p className="mt-2 text-sm text-red-600">{errors.weightLb}</p>}
                  </label>
                </div>
              )}

              {errors.result && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {errors.result}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button type="submit" fullWidth icon="trendingUp">
                  Calculate Lean Mass
                </Button>
                <Button onClick={reset} variant="secondary" fullWidth icon="refreshCw">
                  Reset
                </Button>
              </div>

              {result && (
                <div className="rounded-3xl border border-aqua-deep/15 bg-aqua-light/40 p-5">
                  <p className="text-sm font-semibold text-aqua-deep mb-1">Estimated lean body mass</p>
                  <p className="text-5xl font-bold tracking-tight text-ink">{formatOne(result.leanMassKg)} kg</p>
                  <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink/75">
                    Your estimated lean body mass is {formatOne(result.leanMassKg)} kg, which is approximately {formatOne(result.leanMassPercentage)}% of your total body weight.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3 mt-5">
                    <div className="rounded-2xl bg-white/75 border border-white p-4">
                      <p className="text-xs text-ink/45 mb-1">Lean mass percentage</p>
                      <p className="text-xl font-bold text-ink">{formatOne(result.leanMassPercentage)}%</p>
                    </div>
                    <div className="rounded-2xl bg-white/75 border border-white p-4">
                      <p className="text-xs text-ink/45 mb-1">Estimated remaining body mass</p>
                      <p className="text-xl font-bold text-ink">{formatOne(result.estimatedRemainingMassKg)} kg</p>
                    </div>
                    <div className="rounded-2xl bg-white/75 border border-white p-4">
                      <p className="text-xs text-ink/45 mb-1">Entered measurements</p>
                      <p className="text-sm font-bold text-ink">{formatOne(result.heightCm)} cm / {formatOne(result.weightKg)} kg</p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-relaxed text-ink/65">
                    Lean body mass includes muscles, bones, organs, connective tissue, and body water. It is not the same as muscle mass.
                  </p>
                </div>
              )}

              {result && isLoggedIn && showSavePrompt && (
                <div className="rounded-2xl border border-aqua-deep/15 bg-white p-4">
                  <p className="text-sm font-semibold text-ink">Save these details to your health profile for faster future assessments?</p>
                  <p className="text-sm text-ink/60 mt-1">This saves sex, height, and weight only. The lean mass estimate is not saved.</p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Button onClick={saveToProfile} disabled={savingProfile} size="sm">
                      {savingProfile ? "Saving..." : "Save to profile"}
                    </Button>
                    <Button type="button" onClick={() => setShowSavePrompt(false)} variant="secondary" size="sm">
                      Not now
                    </Button>
                  </div>
                  {profileMessage && <p className="text-sm text-green-700 mt-2">{profileMessage}</p>}
                  {profileError && <p className="text-sm text-red-600 mt-2">{profileError}</p>}
                </div>
              )}

              {profileMessage && !showSavePrompt && <p className="text-sm text-green-700">{profileMessage}</p>}
              {profileError && !showSavePrompt && <p className="text-sm text-red-600">{profileError}</p>}

              <div className="rounded-2xl border border-ink/10 bg-cream-warm/60 p-4">
                <div className="flex items-start gap-3">
                  <Icon name="info" size={18} className="text-ink/45 mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed text-ink/60">
                    This calculator provides a general estimate and does not directly measure muscle or body fat. Results may be less accurate for athletes, older adults, pregnant people, people with significant fluid retention, or people whose body composition differs from the population used to create the formula. For a more accurate measurement, consult a qualified healthcare or fitness professional.
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

export default LeanMassCalculatorPage;
