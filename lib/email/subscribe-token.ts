import jwt from 'jsonwebtoken';
import {
  isEmailSignupSource,
  type EmailSignupSource,
} from '@/lib/analytics/email-signup-sources';

/**
 * The signed token IS the pending-subscriber record.
 *
 * ---------------------------------------------------------------------------
 * Why there is no table behind this
 * ---------------------------------------------------------------------------
 *
 * A pending, unconfirmed subscriber is state, and CLAUDE.md's "no server-side
 * user state" rule means we do not deploy anywhere to put it. So we do not
 * store it: the address and the surface it came from are carried inside an
 * HMAC-signed token that expires, and a contact exists in Resend only after
 * that token comes back. The list therefore contains confirmed addresses by
 * construction rather than by policy.
 *
 * Known and accepted: a token can be replayed inside its 48h window. Contact
 * creation is idempotent, so a replay is a no-op. Single-use enforcement needs
 * storage, which needs the backend this project has repeatedly killed.
 *
 * ---------------------------------------------------------------------------
 * Two things that must not be relaxed
 * ---------------------------------------------------------------------------
 *
 * 1. `algorithms` is pinned on verify. Without it, `jsonwebtoken` will honour
 *    whatever `alg` the token header claims — including `none`, which turns an
 *    attacker-authored payload into a valid confirmation for any address.
 *    Signing with HS256 and verifying "whatever it says" is the classic
 *    algorithm-confusion hole and it is one option away at all times.
 * 2. An EXPIRED token still has a verified signature, and we use that. The
 *    `/subscribed?state=expired` branch needs the original `source` to keep
 *    the re-subscribe form attributed, and reading it off a signature-checked
 *    payload is safe. Reading it off an unverified one would not be.
 */

/** 48 hours, in seconds. Long enough for an inbox checked once a weekend. */
export const CONFIRM_TOKEN_TTL_SECONDS = 48 * 60 * 60;

export interface SubscribeTokenPayload {
  email: string;
  source: EmailSignupSource;
}

export type VerifyResult =
  /** Signature good, not expired. Safe to create the contact. */
  | { status: 'valid'; payload: SubscribeTokenPayload }
  /** Signature good, past its TTL. Payload is trustworthy; do NOT subscribe. */
  | { status: 'expired'; payload: SubscribeTokenPayload }
  /** Bad signature, wrong algorithm, malformed, or a payload we do not recognise. */
  | { status: 'invalid' };

/**
 * The signing secret, or `null` when it is unset.
 *
 * Returned rather than thrown so the route handlers can answer 503 and say
 * "not configured" instead of 500-ing — the same shape the Kit route used.
 */
export function getTokenSecret(): string | null {
  const secret = process.env.EMAIL_TOKEN_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : null;
}

export function mintConfirmToken(
  payload: SubscribeTokenPayload,
  secret: string
): string {
  return jwt.sign(
    { email: payload.email, source: payload.source },
    secret,
    { algorithm: 'HS256', expiresIn: CONFIRM_TOKEN_TTL_SECONDS }
  );
}

export function verifyConfirmToken(token: string, secret: string): VerifyResult {
  // Verify the signature FIRST while ignoring expiry, so an expired-but-genuine
  // token can be told apart from a forged one. `jsonwebtoken` throws
  // TokenExpiredError before handing back a payload otherwise, which would
  // leave the expired branch with nothing trustworthy to read.
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    });
  } catch {
    return { status: 'invalid' };
  }

  if (typeof decoded !== 'object' || decoded === null) return { status: 'invalid' };

  const { email, source, exp } = decoded as Record<string, unknown>;

  // Re-validate the payload rather than trusting our own past self. A source
  // retired from EMAIL_SIGNUP_SOURCES must not confirm just because a token
  // minted before the retirement is still in flight.
  if (typeof email !== 'string' || email.length === 0) return { status: 'invalid' };
  if (!isEmailSignupSource(source)) return { status: 'invalid' };
  if (typeof exp !== 'number') return { status: 'invalid' };

  const payload: SubscribeTokenPayload = { email, source };
  const expired = exp * 1000 <= Date.now();

  return expired ? { status: 'expired', payload } : { status: 'valid', payload };
}
