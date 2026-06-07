import { errorResponse } from './response.js';

function isProduction(env) {
  return env.ENVIRONMENT === 'production';
}

export async function verifyTurnstileToken(token, env, request) {
  if (!env.TURNSTILE_SECRET_KEY) {
    if (isProduction(env)) {
      console.warn('TURNSTILE_SECRET_KEY missing in production — rejecting mutating request');
      return errorResponse('Server misconfigured', 500);
    }
    return null;
  }

  if (typeof token !== 'string' || !token.trim()) {
    return errorResponse('Turnstile verification required', 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token.trim());
  if (ip) formData.append('remoteip', ip);

  let result;
  try {
    result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('turnstile siteverify request failed', error);
    return errorResponse('Turnstile verification unavailable', 503);
  }

  let data;
  try {
    data = await result.json();
  } catch (error) {
    console.error('turnstile siteverify invalid JSON', error);
    return errorResponse('Turnstile verification unavailable', 503);
  }

  if (!data?.success) {
    return errorResponse('Turnstile verification failed', 403);
  }

  return null;
}
