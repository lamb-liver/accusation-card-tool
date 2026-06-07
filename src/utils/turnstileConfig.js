export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export function isTurnstileEnabled() {
  return Boolean(TURNSTILE_SITE_KEY);
}
