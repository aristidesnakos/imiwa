import jwt from 'jsonwebtoken';

/**
 * The signed link behind `List-Unsubscribe` — the interim mechanism until
 * Resend Topics are wired up (see `docs/prd/story-delivery-resend.md` M7/M8).
 *
 * ---------------------------------------------------------------------------
 * Why a separate token, not `subscribe-token.ts` reused as-is
 * ---------------------------------------------------------------------------
 *
 * Both tokens are HMAC'd with `EMAIL_TOKEN_SECRET`, but they authorize opposite
 * actions on the same address. A `typ` claim keeps a confirm token from being
 * replayed at `/api/unsubscribe` and vice versa — without it, the two token
 * shapes are structurally similar enough (both carry `email`) that a change to
 * either `verify*` function could silently start accepting the other.
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
  return jwt.sign({ email, typ: 'unsub' }, secret, { algorithm: 'HS256' });
}

export function verifyUnsubscribeToken(token: string, secret: string): VerifyUnsubscribeResult {
  let decoded: unknown;
  try {
    // Pinned algorithm, same reasoning as subscribe-token.ts: without it,
    // `jsonwebtoken` honours whatever `alg` the token claims, including `none`.
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    return { status: 'invalid' };
  }

  if (typeof decoded !== 'object' || decoded === null) return { status: 'invalid' };

  const { email, typ } = decoded as Record<string, unknown>;
  if (typ !== 'unsub') return { status: 'invalid' };
  if (typeof email !== 'string' || email.length === 0) return { status: 'invalid' };

  return { status: 'valid', payload: { email } };
}
