import jwt from 'jsonwebtoken';
import { isSealedToken, openSealedToken, sealToken } from '@/lib/email/sealed-token';

/**
 * The signed link behind `List-Unsubscribe` — the interim mechanism until
 * Resend Topics are wired up (see `docs/prd/story-delivery-resend.md` M7/M8).
 *
 * ---------------------------------------------------------------------------
 * Why a separate token, not `subscribe-token.ts` reused as-is
 * ---------------------------------------------------------------------------
 *
 * Both tokens come from `EMAIL_TOKEN_SECRET`, but they authorize opposite
 * actions on the same address, so neither may ever be accepted as the other.
 * Sealed tokens get that from the key: each kind is sealed under its own key
 * derived from the secret (lib/email/sealed-token.ts), so a confirm token does
 * not even decrypt here. The legacy JWTs share one HMAC key, so for them a
 * `typ` claim does the job — without it, the two shapes are structurally
 * similar enough (both carry `email`) that a change to either `verify*`
 * function could silently start accepting the other.
 *
 * ---------------------------------------------------------------------------
 * Why sealed, and why the JWT branch is permanent
 * ---------------------------------------------------------------------------
 *
 * The link carries the address, and it is used in ways that put its URL in
 * other people's hands: a mail host's RFC 8058 one-click unsubscribe POSTs to
 * it, query included, and that request lands in Vercel's request log; a mail
 * link scanner fetches the visible link. Since 2026-10-11 the token is sealed,
 * so only this server can read the address in it.
 *
 * Welcome emails sent before then carry a JWT, whose payload anyone can read,
 * and those links must keep working for as long as someone keeps the email
 * (the next section). So `verifyLegacyUnsubscribeJwt` is never deleted, and
 * nothing can make the address in an email already sent unreadable.
 *
 * ---------------------------------------------------------------------------
 * Why no expiry
 * ---------------------------------------------------------------------------
 *
 * A confirm token expires because an unconfirmed signup going stale is the
 * safe default. An unsubscribe link doing the same is not: RFC 8058 one-click
 * unsubscribe and the Gmail/Yahoo bulk-sender rules both assume the link in an
 * email a person kept in their archive still works. There is no downside to a
 * long-lived unsubscribe link — worst case is someone unsubscribes an address
 * that is already unsubscribed, which Resend treats as a no-op.
 */

export interface UnsubscribeTokenPayload {
  email: string;
}

export type VerifyUnsubscribeResult =
  | { status: 'valid'; payload: UnsubscribeTokenPayload }
  | { status: 'invalid' };

export function mintUnsubscribeToken(email: string, secret: string): string {
  return sealToken('unsubscribe', { email }, secret);
}

export function verifyUnsubscribeToken(token: string, secret: string): VerifyUnsubscribeResult {
  const claims = isSealedToken(token)
    ? openSealedToken('unsubscribe', token, secret)
    : verifyLegacyUnsubscribeJwt(token, secret);
  if (claims === null) return { status: 'invalid' };

  const { email } = claims;
  if (typeof email !== 'string' || email.length === 0) return { status: 'invalid' };

  return { status: 'valid', payload: { email } };
}

/**
 * PERMANENT: the claims of an unsubscribe JWT minted before 2026-10-11, or
 * `null`. Every welcome email sent before then carries one. Never delete this.
 */
function verifyLegacyUnsubscribeJwt(token: string, secret: string): Record<string, unknown> | null {
  let decoded: unknown;
  try {
    // Pinned algorithm, same reasoning as subscribe-token.ts: without it,
    // `jsonwebtoken` honours whatever `alg` the token claims, including `none`.
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }

  if (typeof decoded !== 'object' || decoded === null) return null;
  const claims = decoded as Record<string, unknown>;
  return claims.typ === 'unsub' ? claims : null;
}
