import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

/**
 * Sealed email tokens: the payload encrypted as well as authenticated, so a
 * link can carry a subscriber's address without anyone who sees the link being
 * able to read it.
 *
 * ---------------------------------------------------------------------------
 * Why sealed, not signed
 * ---------------------------------------------------------------------------
 *
 * Until 2026-10-11 both email tokens were HS256 JWTs. A JWT is signed, not
 * encrypted: its payload is base64url JSON that anyone holding the URL can
 * read, and the payload was the address. More hands hold the URL than the
 * subscriber's. Vercel's request log (and any log drain) keeps the GET that
 * opens /confirm and the POST a mail host makes to /api/unsubscribe, query
 * included, and mail link scanners fetch whatever they find in an email.
 *
 * A sealed token is the same JSON under AES-256-GCM. The GCM tag authenticates
 * it, so what the signature guaranteed still holds: nobody can forge or alter
 * one without the key, and a payload that opens is trustworthy even once it has
 * expired. Without the key, the token is random bytes.
 *
 * ---------------------------------------------------------------------------
 * The keys
 * ---------------------------------------------------------------------------
 *
 * Derived from EMAIL_TOKEN_SECRET with HKDF-SHA256, under an `info` label that
 * names the token's kind. So the encryption key is not the HMAC key the legacy
 * JWTs were signed with (that is the raw secret), and each kind has its own: a
 * confirm token does not open as an unsubscribe token, or the reverse, whatever
 * its payload says. That is the `typ` separation, enforced by the key rather
 * than by a claim. The kind is also the AAD, so it is bound twice. There is no
 * new secret, so there is no new environment variable to forget, and rotating
 * EMAIL_TOKEN_SECRET still breaks every link ever sent, exactly as before
 * (docs/runbooks/newsletter.md).
 *
 * ---------------------------------------------------------------------------
 * The format
 * ---------------------------------------------------------------------------
 *
 * `s1.` + base64url(12-byte random IV | ciphertext | 16-byte tag). The prefix
 * tells a sealed token apart from a legacy JWT (which starts `eyJ`). Every
 * character is URL-safe, so `encodeURIComponent` leaves the token as it is.
 *
 * Accepted: the ciphertext is as long as the JSON, so a token's length gives
 * away roughly how long the address is. A fresh random IV per token is safe
 * for vastly more tokens than this list will ever mint.
 *
 * `pnpm validate:subscribe` asserts that no minted token contains the address
 * in any form it can decode, and that the same decoder does find it in a JWT.
 */

export type SealedTokenKind = 'confirm' | 'unsubscribe';

export const SEALED_TOKEN_PREFIX = 's1.';

const IV_BYTES = 12;
const TAG_BYTES = 16;
// `Buffer.from(…, 'base64url')` skips characters it does not recognise instead
// of failing, so the alphabet is checked before decoding.
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function sealingKey(kind: SealedTokenKind, secret: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', secret, '', `michikanji email token ${SEALED_TOKEN_PREFIX}${kind} aes-256-gcm`, 32)
  );
}

function associatedData(kind: SealedTokenKind): Buffer {
  return Buffer.from(`${SEALED_TOKEN_PREFIX}${kind}`, 'utf8');
}

/** Whether `token` is in the sealed format. Says nothing about whether it opens. */
export function isSealedToken(token: string): boolean {
  return token.startsWith(SEALED_TOKEN_PREFIX);
}

export function sealToken(
  kind: SealedTokenKind,
  claims: Record<string, unknown>,
  secret: string
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(kind, secret), iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(associatedData(kind));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(claims), 'utf8'), cipher.final()]);
  return SEALED_TOKEN_PREFIX + Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url');
}

/**
 * The claims, or `null` for anything this kind of token sealed with this secret
 * would not produce: another kind, another secret, a changed byte, a JWT,
 * garbage. Never throws. Expiry is the caller's business, so an expired token
 * still opens.
 */
export function openSealedToken(
  kind: SealedTokenKind,
  token: string,
  secret: string
): Record<string, unknown> | null {
  if (typeof token !== 'string' || !isSealedToken(token)) return null;
  const encoded = token.slice(SEALED_TOKEN_PREFIX.length);
  if (!BASE64URL_RE.test(encoded)) return null;

  const raw = Buffer.from(encoded, 'base64url');
  if (raw.length <= IV_BYTES + TAG_BYTES) return null;

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      sealingKey(kind, secret),
      raw.subarray(0, IV_BYTES),
      { authTagLength: TAG_BYTES }
    );
    decipher.setAAD(associatedData(kind));
    decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
    const plaintext = Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)),
      // Throws when the tag does not match, which is every case above.
      decipher.final(),
    ]);
    const claims: unknown = JSON.parse(plaintext.toString('utf8'));
    return typeof claims === 'object' && claims !== null && !Array.isArray(claims)
      ? (claims as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
