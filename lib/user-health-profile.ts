import { supabase } from "@/lib/supabase";

export type UserHealthProfile = {
  id?: string;
  user_id?: string;
  age?: number | null;
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  waist_cm?: number | null;
  smoking_status?: string | null;
  physical_activity_level?: string | null;
  has_heart_disease?: boolean | null;
  has_stroke?: boolean | null;
  has_high_blood_pressure?: boolean | null;
  has_diabetes?: boolean | null;
  has_lung_disease?: boolean | null;
  has_kidney_disease?: boolean | null;
  family_heart_history?: string | null;
  cholesterol_status?: string | null;
  blood_sugar_status?: string | null;
  consent_to_autofill?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

type HealthProfileResponse = {
  success: boolean;
  data?: UserHealthProfile | null;
  error?: {
    message?: string;
  };
};

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Login required to use health profile.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const readProfileResponse = async (response: Response) => {
  const payload = (await response.json().catch(() => null)) as HealthProfileResponse | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error?.message || "Unable to update health profile right now.");
  }

  return payload?.data ?? null;
};

export async function getUserHealthProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/users/health-profile", { headers });
  return readProfileResponse(response);
}

export async function upsertUserHealthProfile(profile: UserHealthProfile) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/users/health-profile", {
    method: "POST",
    headers,
    body: JSON.stringify(profile),
  });
  return readProfileResponse(response);
}

export async function updateUserHealthProfile(profile: UserHealthProfile) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/users/health-profile", {
    method: "PATCH",
    headers,
    body: JSON.stringify(profile),
  });
  return readProfileResponse(response);
}

export async function deleteUserHealthProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/users/health-profile", {
    method: "DELETE",
    headers,
  });
  return readProfileResponse(response);
}

