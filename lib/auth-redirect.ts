export const POST_AUTH_REDIRECT_KEY = "ckh_post_auth_redirect";

export function getSafeRedirect(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getRedirectFromSearch(search: string) {
  return getSafeRedirect(new URLSearchParams(search).get("redirect"));
}

export function storePostAuthRedirect(value: string | null | undefined) {
  if (typeof window === "undefined") return;

  const redirect = getSafeRedirect(value);
  window.localStorage.setItem(POST_AUTH_REDIRECT_KEY, redirect);
}

export function consumePostAuthRedirect(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;

  const redirect = getSafeRedirect(window.localStorage.getItem(POST_AUTH_REDIRECT_KEY), fallback);
  window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);

  return redirect;
}

export function clearPostAuthRedirect() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}
