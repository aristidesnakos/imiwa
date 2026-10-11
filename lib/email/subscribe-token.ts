import jwt from 'jsonwebtoken';
import {
  isEmailSignupSource,
  type EmailSignupSource,
} from '@/lib/analytics/email-signup-sources';
import { isSealedToken, openSealedToken, sealToken } from '@/lib/email/sealed-token';

/**
 * The sealed token IS the pending-subscriber record.
 *
 * ---------------------------------------------------------------------------
 * Why there is no table behind this
 * ---------------------------------------------------------------------------
 *
 * A pending, unconfirmed subscriber is state, and CLAUDE.md's "no server-side
 * user state" rule means we do not deploy anywhere to put it. So we do not
 * store it: the address and the surface it came from are carried inside an
 * encrypted, authenticated token that expires (lib/email/sealed-token.ts), and
 * a contact exists in Resend only after that token comes back. The list
 * therefore contains confirmed addresses by construction rather than by policy.
 * Encrypted, not just signed, because the token rides in the confirmation
 * link, /confirm?token=…, and that URL reaches Vercel's request log and mail
 * link scanners: only the server can read the address in it.
 *
 * Known and accepted: a token can be replayed inside its 48h window. Contact
 * creation is idempotent, so a replay is a no-op. Single-use enforcement needs
 * storage, which needs the backend this project has repeatedly killed.
 *
 * ---------------------------------------------------------------------------
 * Two things that must not be relaxed
 * ---------------------------------------------------------------------------
 *
 * 1. An EXPIRED token is still authenticated, and we use that. The
 *    `/subscribed?state=expired` branch needs the original `source` to keep
 *    the re-subscribe form attributed, and reading it off a payload whose GCM
 *    tag (or, for a legacy JWT, signature) checked out is safe. Reading it off
 *    an unauthenticated one would not be.
 * 2. While the legacy JWT branch exists, `algorithms` stays pinned on its
 *    verify. Without it, `jsonwebtoken` will honour whatever `alg` the token
 *    header claims — including `none`, which turns an attacker-authored
 *    payload into a valid confirmation for any address.
 *
 * ---------------------------------------------------------------------------
 * The legacy JWT branch: added 2026-10-11, to be deleted
 * ---------------------------------------------------------------------------
 *
 * Until 2026-10-11 the token was an HS256 JWT, whose payload anyone can read.
 * Confirmation emails sent before the sealed format reached production carry
 * one, and each stays valid for CONFIRM_TOKEN_TTL_SECONDS after it was sent,
 * so `verifyLegacyConfirmJwt` must outlive that deploy by 48 hours. It can go
 * on or after LEGACY_CONFIRM_JWT_REMOVABLE_FROM (2026-10-20), as long as the
 * sealed format reached production by 2026-10-18; check the deploy date
 * first. `pnpm validate:subscribe` prints a NOTE from that day. Deleting it
 * means deleting the function, the constant, the `jsonwebtoken` import here
 * and the validator's legacy-confirm checks.
 */

/** 48 hours, in seconds. Long enough for an inbox checked once a weekend. */
export const CONFIRM_TOKEN_TTL_SECONDS = 48 * 60 * 60;

/** The first day `verifyLegacyConfirmJwt` may be deleted. See the header. */
export const LEGACY_CONFIRM_JWT_REMOVABLE_FROM = '2026-10-20';

/**
 * A story slug, shape-checked. Deliberately NOT resolved against the episode
 * registry here: this module is imported by `/api/subscribe`, by
 * `/api/subscribe/confirm` and by `pnpm validate:subscribe`, and pulling
 * `lib/stories` in would drag every episode's data into all three to check one
 * string. Resolution belongs at the point of use, where an unknown slug has an
 * obvious answer (send the newest episode that has gone out instead) rather than being a token
 * validity question.
 *
 * The shape check still matters. It is the same rule `validate:stories` applies
 * to `slug`, and it is what stops an arbitrary caller-supplied string from
 * riding inside a token we sign.
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface SubscribeTokenPayload {
  email: string;
  source: EmailSignupSource;
  /**
   * Which episode the signup came from, when it came from one. Absent for the
   * hub and every non-story surface — those have no particular episode to send,
   * and `undefined` is the honest representation of that rather than a
   * sentinel.
   */
  episode?: string;
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
 * "not configured" instead of 500-ing — the same shape the route answered with before.
 */
export function getTokenSecret(): string | null {
  const secret = process.env.EMAIL_TOKEN_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : null;
}

export function mintConfirmToken(
  payload: SubscribeTokenPayload,
  secret: string
): string {
  return sealToken(
    'confirm',
    {
      email: payload.email,
      source: payload.source,
      // Omitted rather than sent as null when there is no episode: a claim that
      // is absent cannot be misread, and `verifyConfirmToken` treats an absent
      // and an unusable value identically anyway.
      ...(payload.episode ? { episode: payload.episode } : {}),
      // Seconds since the epoch, the same claim the JWTs carried.
      exp: Math.floor(Date.now() / 1000) + CONFIRM_TOKEN_TTL_SECONDS,
    },
    secret
  );
}

export function verifyConfirmToken(token: string, secret: string): VerifyResult {
  // Both branches authenticate and ignore expiry, so an expired-but-genuine
  // token can be told apart from a forged one below.
  const claims = isSealedToken(token)
    ? openSealedToken('confirm', token, secret)
    : verifyLegacyConfirmJwt(token, secret);
  if (claims === null) return { status: 'invalid' };

  const { email, source, episode, exp } = claims;

  // Re-validate the payload rather than trusting our own past self. A source
  // retired from EMAIL_SIGNUP_SOURCES must not confirm just because a token
  // minted before the retirement is still in flight.
  if (typeof email !== 'string' || email.length === 0) return { status: 'invalid' };
  if (!isEmailSignupSource(source)) return { status: 'invalid' };
  if (typeof exp !== 'number') return { status: 'invalid' };

  // A malformed `episode` drops the field rather than invalidating the token.
  // The alternative refuses consent over a cosmetic claim — the address and the
  // source are both intact, and the worst case of dropping it is that the
  // subscriber gets the newest broadcast episode's quiz instead of a specific one.
  const validEpisode = typeof episode === 'string' && SLUG_RE.test(episode) ? episode : undefined;

  const payload: SubscribeTokenPayload = { email, source, ...(validEpisode ? { episode: validEpisode } : {}) };
  const expired = exp * 1000 <= Date.now();

  return expired ? { status: 'expired', payload } : { status: 'valid', payload };
}

/**
 * LEGACY: the claims of a confirm JWT minted before 2026-10-11, or `null`.
 * Delete on or after LEGACY_CONFIRM_JWT_REMOVABLE_FROM (see the header).
 */
function verifyLegacyConfirmJwt(token: string, secret: string): Record<string, unknown> | null {
  // Verify the signature while ignoring expiry. `jsonwebtoken` throws
  // TokenExpiredError before handing back a payload otherwise, which would
  // leave the expired branch with nothing trustworthy to read.
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    });
  } catch {
    return null;
  }
  return typeof decoded === 'object' && decoded !== null ? (decoded as Record<string, unknown>) : null;
}
