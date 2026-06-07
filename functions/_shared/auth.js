import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SEC } from './constants.js';
import { errorResponse } from './response.js';

function base64UrlEncode(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signBytes(bytes, secret) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, bytes);
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifyBytes(bytes, signature, secret) {
  const key = await importHmacKey(secret);
  const signatureBytes = base64UrlDecode(signature);
  return crypto.subtle.verify('HMAC', key, signatureBytes, bytes);
}

export async function createAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SEC,
    role: 'admin',
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadPart = base64UrlEncode(payloadBytes);
  const signaturePart = await signBytes(payloadBytes, env.ADMIN_SESSION_SECRET);
  return `${payloadPart}.${signaturePart}`;
}

export async function verifyAdminToken(token, env) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let payload;
  let payloadBytes;
  try {
    payloadBytes = base64UrlDecode(parts[0]);
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }

  if (payload?.role !== 'admin') return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;

  const valid = await verifyBytes(payloadBytes, parts[1], env.ADMIN_SESSION_SECRET);
  return valid ? payload : null;
}

export function getAdminCookie(request) {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ADMIN_COOKIE_NAME) return rest.join('=');
  }
  return null;
}

export function buildAdminCookie(token, { secure }) {
  const flags = [
    `${ADMIN_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SEC}`,
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function clearAdminCookie({ secure }) {
  const flags = [
    `${ADMIN_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) {
    return { error: errorResponse('Server misconfigured', 500) };
  }
  const token = getAdminCookie(request);
  const session = await verifyAdminToken(token, env);
  if (!session) {
    return { error: errorResponse('Unauthorized', 401) };
  }
  return { session };
}

export function shouldSetSecureCookie(env) {
  return env.ENVIRONMENT === 'production';
}
