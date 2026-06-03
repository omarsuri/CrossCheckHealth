const ANONYMOUS_ID_KEY = "ckh_anonymous_id";

export function getAnonymousId() {
  if (typeof window === "undefined") return "";

  const existingId = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existingId) return existingId;

  const anonymousId = window.crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);

  return anonymousId;
}
