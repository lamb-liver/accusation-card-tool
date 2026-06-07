const URL_SAFE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function generateShareId() {
  const length = 12 + (crypto.getRandomValues(new Uint8Array(1))[0] % 5);
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => URL_SAFE_CHARS[b % URL_SAFE_CHARS.length]).join('');
}

export function isUniqueConstraintError(error) {
  const message = String(error?.message ?? error ?? '');
  return message.includes('UNIQUE constraint failed');
}
