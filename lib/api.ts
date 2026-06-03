const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type ApiErrorResponse = {
  success: false;
  error?: {
    message?: string;
    details?: unknown;
  };
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export function getAnonymousId() {
  const key = "ckh_anonymous_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  localStorage.setItem(key, id);
  return id;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok || (typeof payload === "object" && payload !== null && "success" in payload && payload.success === false)) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error?.message
        : undefined;
    throw new Error(message || `API request failed: ${response.status} ${response.statusText}`);
  }

  return payload as T;
}

export function submitQuickHeartAssessment(answers: Record<string, string>) {
  return apiRequest<ApiSuccessResponse<unknown>>("/assessments/heart/quick", {
    method: "POST",
    body: JSON.stringify({
      anonymous: true,
      anonymous_id: getAnonymousId(),
      answers,
    }),
  });
}

export const api = {
  getProducts: <T>() => apiRequest<T>("/products"),
  submitQuickHeartAssessment,
  submitBodyFatPrediction: <T>(payload: unknown) =>
    apiRequest<T>("/assessments/body-fat", { method: "POST", body: JSON.stringify(payload) }),
  getDashboardSummary: <T>() => apiRequest<T>("/dashboard"),
  getParentProfiles: <T>() => apiRequest<T>("/parents"),
  sendParentInvite: <T>(payload: unknown) =>
    apiRequest<T>("/parents/invite", { method: "POST", body: JSON.stringify(payload) }),
};
