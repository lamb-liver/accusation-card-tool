/**
 * 剝離 Turnstile token，避免進入業務 validation / 持久化路徑。
 * @param {Record<string, unknown> | null | undefined} data
 */
export function stripTurnstileToken(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const rest = { ...data };
  delete rest.turnstile_token;
  return rest;
}
