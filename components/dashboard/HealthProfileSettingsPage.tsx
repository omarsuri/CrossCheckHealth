"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import {
  getUserHealthProfile,
  updateUserHealthProfile,
  UserHealthProfile,
} from "@/lib/user-health-profile";
import { supabase } from "@/lib/supabase";

const emptyProfile: UserHealthProfile = {
  age: null,
  sex: "",
  height_cm: null,
  weight_kg: null,
  waist_cm: null,
  smoking_status: "",
  physical_activity_level: "",
  has_heart_disease: null,
  has_stroke: null,
  has_high_blood_pressure: null,
  has_diabetes: null,
  has_lung_disease: null,
  has_kidney_disease: null,
  family_heart_history: "",
  cholesterol_status: "",
  blood_sugar_status: "",
  consent_to_autofill: false,
};

const numberOrNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const boolOrNull = (value: unknown) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-ink mb-2">{label}</span>
    {children}
  </label>
);

const inputClass = "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-aqua-deep focus:ring-2 focus:ring-aqua/30";

export const HealthProfileSettingsPage = ({ navigate, user }) => {
  const [sessionReady, setSessionReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(user));
  const [profile, setProfile] = useState<UserHealthProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (!sessionUser?.id) {
          if (active) {
            setIsLoggedIn(false);
            setProfile(emptyProfile);
          }
          return;
        }

        if (active) setIsLoggedIn(true);

        const savedProfile = await getUserHealthProfile();

        if (active) setProfile({ ...emptyProfile, ...(savedProfile ?? {}) });
      } catch (profileError) {
        if (active) setError(profileError instanceof Error ? profileError.message : "Unable to load health profile.");
      } finally {
        if (active) {
          setLoading(false);
          setSessionReady(true);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const updateField = (key: keyof UserHealthProfile, value: unknown) => {
    setProfile(current => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const savedProfile = await updateUserHealthProfile({
        age: numberOrNull(profile.age),
        sex: profile.sex || null,
        height_cm: numberOrNull(profile.height_cm),
        weight_kg: numberOrNull(profile.weight_kg),
        waist_cm: numberOrNull(profile.waist_cm),
        smoking_status: profile.smoking_status || null,
        physical_activity_level: profile.physical_activity_level || null,
        has_heart_disease: profile.has_heart_disease ?? null,
        has_stroke: profile.has_stroke ?? null,
        has_high_blood_pressure: profile.has_high_blood_pressure ?? null,
        has_diabetes: profile.has_diabetes ?? null,
        has_lung_disease: profile.has_lung_disease ?? null,
        has_kidney_disease: profile.has_kidney_disease ?? null,
        family_heart_history: profile.family_heart_history || null,
        cholesterol_status: profile.cholesterol_status || null,
        blood_sugar_status: profile.blood_sugar_status || null,
        consent_to_autofill: Boolean(profile.consent_to_autofill),
      });
      setProfile({ ...emptyProfile, ...(savedProfile ?? {}) });
      setMessage("Health profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save health profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!sessionReady || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Card className="text-center py-12">
          <Icon name="activity" size={32} className="text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-charcoal">Loading health profile</h1>
        </Card>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-16 h-16 bg-teal-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon name="lock" size={32} className="text-teal-deep" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal mb-3">Login Required</h1>
        <p className="text-gray-500 mb-6">Sign in to save reusable health details for autofill.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal mb-6">
        <Icon name="chevronLeft" size={16} />Back to dashboard
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal mb-2">Health Profile</h1>
        <p className="text-gray-500">Save common details once and choose whether CrossCheckHealth can use them to autofill assessments.</p>
      </div>

      <Card hover={false}>
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-aqua-light/40 border border-aqua-deep/10 mb-6">
          <input
            id="autofill"
            type="checkbox"
            checked={Boolean(profile.consent_to_autofill)}
            onChange={(event) => updateField("consent_to_autofill", event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-ink/20 text-aqua-deep focus:ring-aqua"
          />
          <label htmlFor="autofill" className="text-sm text-ink/70">
            <span className="block font-semibold text-ink">Allow autofill from my health profile</span>
            BMI, Heart Quick, and Body Fitness can prefill matching fields. Nothing is saved unless you click Save.
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Age">
            <input className={inputClass} type="number" min={0} max={130} value={profile.age ?? ""} onChange={(event) => updateField("age", event.target.value)} />
          </Field>
          <Field label="Sex">
            <select className={inputClass} value={profile.sex ?? ""} onChange={(event) => updateField("sex", event.target.value)}>
              <option value="">Not saved</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </Field>
          <Field label="Height">
            <input className={inputClass} type="number" min={80} max={250} value={profile.height_cm ?? ""} onChange={(event) => updateField("height_cm", event.target.value)} placeholder="cm" />
          </Field>
          <Field label="Weight">
            <input className={inputClass} type="number" min={20} max={300} value={profile.weight_kg ?? ""} onChange={(event) => updateField("weight_kg", event.target.value)} placeholder="kg" />
          </Field>
          <Field label="Waist">
            <input className={inputClass} type="number" min={20} max={250} value={profile.waist_cm ?? ""} onChange={(event) => updateField("waist_cm", event.target.value)} placeholder="cm" />
          </Field>
          <Field label="Physical activity">
            <select className={inputClass} value={profile.physical_activity_level ?? ""} onChange={(event) => updateField("physical_activity_level", event.target.value)}>
              <option value="">Not saved</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Not sure">Not sure</option>
              <option value="sedentary">Sedentary</option>
              <option value="lightly_active">Lightly active</option>
              <option value="moderately_active">Moderately active</option>
              <option value="very_active">Very active</option>
            </select>
          </Field>
          <Field label="Smoking or nicotine">
            <select className={inputClass} value={profile.smoking_status ?? ""} onChange={(event) => updateField("smoking_status", event.target.value)}>
              <option value="">Not saved</option>
              <option value="Yes, I currently smoke">Yes, I currently smoke</option>
              <option value="Yes, I vape nicotine">Yes, I vape nicotine</option>
              <option value="I stopped within the last 6 months">I stopped within the last 6 months</option>
              <option value="I stopped more than 6 months ago">I stopped more than 6 months ago</option>
              <option value="No, I do not smoke or vape">No, I do not smoke or vape</option>
            </select>
          </Field>
          <Field label="Family heart history">
            <select className={inputClass} value={profile.family_heart_history ?? ""} onChange={(event) => updateField("family_heart_history", event.target.value)}>
              <option value="">Not saved</option>
              <option value="Yes, my father, brother, or male relative before age 55">Yes, male relative before age 55</option>
              <option value="Yes, my mother, sister, or female relative before age 65">Yes, female relative before age 65</option>
              <option value="Yes, but I am not sure about their age">Yes, not sure about age</option>
              <option value="No">No</option>
              <option value="Not sure">Not sure</option>
            </select>
          </Field>
          <Field label="Cholesterol">
            <select className={inputClass} value={profile.cholesterol_status ?? ""} onChange={(event) => updateField("cholesterol_status", event.target.value)}>
              <option value="">Not saved</option>
              <option value="Yes, I have high cholesterol">Yes, I have high cholesterol</option>
              <option value="Yes, I take cholesterol medicine">Yes, I take cholesterol medicine</option>
              <option value="No">No</option>
              <option value="Not sure">Not sure</option>
            </select>
          </Field>
          <Field label="Blood sugar">
            <select className={inputClass} value={profile.blood_sugar_status ?? ""} onChange={(event) => updateField("blood_sugar_status", event.target.value)}>
              <option value="">Not saved</option>
              <option value="Yes, I have prediabetes">Yes, I have prediabetes</option>
              <option value="Yes, I have high blood sugar">Yes, I have high blood sugar</option>
              <option value="Yes, I have diabetes">Yes, I have diabetes</option>
              <option value="No">No</option>
              <option value="Not sure">Not sure</option>
            </select>
          </Field>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Doctor-told conditions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["has_heart_disease", "Heart disease or previous heart attack"],
              ["has_stroke", "Stroke"],
              ["has_high_blood_pressure", "High blood pressure"],
              ["has_diabetes", "Diabetes"],
              ["has_lung_disease", "Lung disease such as asthma or COPD"],
              ["has_kidney_disease", "Kidney disease"],
            ].map(([key, label]) => {
              const conditionValue = profile[key as keyof UserHealthProfile];

              return (
              <Field key={key} label={label}>
                <select className={inputClass} value={conditionValue === true ? "true" : conditionValue === false ? "false" : ""} onChange={(event) => updateField(key as keyof UserHealthProfile, boolOrNull(event.target.value))}>
                  <option value="">Not saved</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </Field>
            );
            })}
          </div>
        </div>

        {message && <p className="text-sm text-green-700 mt-5">{message}</p>}
        {error && <p className="text-sm text-red-600 mt-5">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button onClick={saveProfile} disabled={saving} icon="check">
            {saving ? "Saving..." : "Save Health Profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HealthProfileSettingsPage;
