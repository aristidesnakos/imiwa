import crypto from 'crypto';

/**
 * Stateless double opt-in token utilities.
 *
 * A token is: base64url(JSON payload) + "." + HMAC-SHA256 hex of that base64url
 * part, keyed by EMAIL_TOKEN_SECRET. This lets us verify a subscriber's email
 * confirmation without any database — the signature proves we issued it and the
 * `iat` timestamp lets us expire stale links.
 *
 * These functions use Node's `crypto` module and therefore run server-side only.
 */

const DEV_SECRET = 'dev-insecure-email-token-secret-change-me';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TokenPayload {
  email: string;
  source: string;
  iat: number;
}

function getSecret(): string {
  const secret = process.env.EMAIL_TOKEN_SECRET;
  if (!secret) {
    console.warn(
      '[subscribe/token] EMAIL_TOKEN_SECRET is not set — falling back to an insecure dev default. Set EMAIL_TOKEN_SECRET in production.'
    );
    return DEV_SECRET;
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

/**
 * Signs an opt-in token for the given email + source.
 */
export function signToken(payload: { email: string; source: string }): string {
  const fullPayload: TokenPayload = {
    email: payload.email,
    source: payload.source,
    iat: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  reason?: string;
}

/**
 * Verifies an opt-in token: checks the HMAC signature (constant-time) and that
 * the token is not older than 24 hours.
 */
export function verifyToken(token: string): VerifyResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing_token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed_token' };
  }

  const [encoded, signature] = parts;
  const expected = sign(encoded);

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'invalid_payload' };
  }

  if (
    !payload ||
    typeof payload.email !== 'string' ||
    typeof payload.source !== 'string' ||
    typeof payload.iat !== 'number'
  ) {
    return { valid: false, reason: 'invalid_payload' };
  }

  if (Date.now() - payload.iat > MAX_AGE_MS) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}
