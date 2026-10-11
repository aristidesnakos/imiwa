/**
 * Validator for the double-opt-in consent model.
 *
 * Run: pnpm validate:subscribe
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * This repo has no unit test runner; correctness is enforced by targeted
 * validators, each guarding one subsystem's contract. `validate:announcements`
 * is the precedent — it replays the acknowledgement model against synthetic
 * visitors and dates, asserting user-facing promises that are asserted nowhere
 * else. This does the same for consent.
 *
 * The promises being asserted here are the ones that matter legally, not just
 * functionally:
 *
 *   - a contact is NEVER created without a valid, unexpired, authenticated
 *     token — the contact record is our only consent record;
 *   - both tokens are sealed (AES-256-GCM, lib/email/sealed-token.ts): the
 *     address inside is unreadable without the key, in the token, in the link
 *     that carries it, or in any decoding of either, and a changed byte
 *     anywhere in a sealed token makes it invalid;
 *   - a forged token cannot subscribe anyone, including via the `alg: none`
 *     algorithm-confusion hole that `jsonwebtoken` opens if `algorithms` is
 *     not pinned on the legacy JWT verify;
 *   - an expired token is still authenticated (so the re-subscribe form stays
 *     attributed) but is refused as consent, in both formats;
 *   - a confirm token never unsubscribes and an unsubscribe token never
 *     confirms, sealed or legacy;
 *   - links already in inboxes keep working: a legacy confirm JWT for the 48h
 *     it promised, a legacy unsubscribe JWT forever;
 *   - a `source` outside EMAIL_SIGNUP_SOURCES never reaches an email we send;
 *   - only the Tan Dash form's source joins the app waitlist, and that list's
 *     consent email promises one email and never offers the weekly story;
 *   - the episode email's campaign tags are identical for every recipient, and
 *     never reach the unsubscribe link or the pre-consent confirmation email.
 *
 * The migration this guards replaced a Kit proxy that had a fallback minting
 * `state: active` subscribers with no confirmation step at all. That bug is
 * exactly the kind that survives a migration silently, so it gets a gate.
 */
import jwt from 'jsonwebtoken';
import {
  CONFIRM_TOKEN_TTL_SECONDS,
  LEGACY_CONFIRM_JWT_REMOVABLE_FROM,
  mintConfirmToken,
  verifyConfirmToken,
} from '../lib/email/subscribe-token';
import { mintUnsubscribeToken, verifyUnsubscribeToken } from '../lib/email/unsubscribe-token';
import {
  SEALED_TOKEN_PREFIX,
  isSealedToken,
  openSealedToken,
  sealToken,
} from '../lib/email/sealed-token';
import {
  EMAIL_SIGNUP_SOURCES,
  isEmailSignupSource,
} from '../lib/analytics/email-signup-sources';
import config from '../config';
import type { PostalAddress } from '../types/config';
import { postalAddressLine, postalAddressProblems } from '../lib/business/postal-address';
import { quizEmailHtml, quizEmailText } from '../lib/email/quiz-email';
import { withNewsletterUtm } from '../lib/email/utm';
import {
  confirmUrl,
  confirmationEmailHtml,
  confirmationEmailSubject,
  confirmationEmailText,
} from '../lib/email/confirmation-email';
import {
  EMAIL_LISTS,
  emailListForSource,
  segmentIdForList,
  type EmailList,
} from '../lib/email/lists';
import { EPISODES, episodesNewestFirst } from '../lib/stories';
import { panelRomaji } from '../lib/stories/romaji-lines';
import { SITE_URL } from '../lib/seo/site';
import { CONFIRM_TOKEN_SCRUB_SCRIPT } from '../lib/email/confirm-token-scrub';
import nextConfig from '../next.config.js';

const SECRET = 'test-secret-not-used-anywhere-real';
const OTHER_SECRET = 'a-different-secret-entirely';
const EMAIL = 'learner@example.com';
const SOURCE = 'homepage-weekly-story';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(name);
  }
}

// --- Token helpers ----------------------------------------------------------

/** Seconds since the epoch, `offsetSeconds` from now: the unit of a token's `exp` claim. */
function epochIn(offsetSeconds: number): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

/**
 * The same confirm claims as a sealed token and as a legacy JWT, each with an
 * expiry `expiresIn` seconds from now. Every payload check is asserted on both:
 * the sealed format every new link carries, and the legacy JWT that links
 * already in inboxes carry, whose branch has its own verify and so must keep
 * its own guarantees for as long as it exists.
 */
function inBothFormats(
  claims: Record<string, unknown>,
  { expiresIn = 3600, secret = SECRET }: { expiresIn?: number; secret?: string } = {}
): [format: string, token: string][] {
  return [
    ['sealed', sealToken('confirm', { ...claims, exp: epochIn(expiresIn) }, secret)],
    ['legacy JWT', jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn })],
  ];
}

// The documented layout of a sealed token: `s1.` + base64url(IV | ciphertext | tag).
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** IV | ciphertext | tag: the bytes after a sealed token's prefix. */
function sealedBytes(token: string): Buffer {
  return Buffer.from(token.slice(SEALED_TOKEN_PREFIX.length), 'base64url');
}

function asSealedToken(raw: Buffer): string {
  return SEALED_TOKEN_PREFIX + raw.toString('base64url');
}

/** A token in the sealed shape that nobody encrypted: the claims in the clear between a zero IV and a zero tag. */
function unencrypted(claims: Record<string, unknown>): string {
  return asSealedToken(
    Buffer.concat([Buffer.alloc(IV_BYTES), Buffer.from(JSON.stringify(claims)), Buffer.alloc(TAG_BYTES)])
  );
}

// --- The happy path -------------------------------------------------------

const good = mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET);
const goodResult = verifyConfirmToken(good, SECRET);

check('a freshly minted token verifies', goodResult.status === 'valid');
check(
  'the address survives the round trip',
  goodResult.status === 'valid' && goodResult.payload.email === EMAIL
);
check(
  'the source survives the round trip',
  goodResult.status === 'valid' && goodResult.payload.source === SOURCE
);
check(
  `a freshly minted confirm token is sealed (${SEALED_TOKEN_PREFIX}…), not a JWT`,
  isSealedToken(good) && !good.startsWith('eyJ')
);
// The expiry used to be readable in the JWT. It is now a claim inside the
// sealed payload, so it is read from the inside.
const goodExp = openSealedToken('confirm', good, SECRET)?.exp;
check(
  'a minted confirm token expires CONFIRM_TOKEN_TTL_SECONDS after it was minted',
  typeof goodExp === 'number' && Math.abs(goodExp - epochIn(CONFIRM_TOKEN_TTL_SECONDS)) <= 2
);

// --- Links already in inboxes: the legacy JWT format ------------------------
//
// Until 2026-10-11 both tokens were HS256 JWTs, and emails carrying them are
// still in inboxes. A confirm JWT must keep confirming for the 48h it promised,
// until its branch is deleted (the NOTE after the report says from when), and
// an unsubscribe JWT for as long as anyone keeps the email (the unsubscribe
// section below). These are minted exactly as the old code minted them.

const legacyConfirm = jwt.sign({ email: EMAIL, source: SOURCE }, SECRET, {
  algorithm: 'HS256',
  expiresIn: CONFIRM_TOKEN_TTL_SECONDS,
});
const legacyConfirmResult = verifyConfirmToken(legacyConfirm, SECRET);
check(
  'a legacy confirm JWT minted the old way still confirms, so links already sent keep their 48h',
  legacyConfirmResult.status === 'valid' &&
    legacyConfirmResult.payload.email === EMAIL &&
    legacyConfirmResult.payload.source === SOURCE
);
check(
  'a legacy JWT is not mistaken for a sealed token, and the sealed opener refuses it',
  !isSealedToken(legacyConfirm) && openSealedToken('confirm', legacyConfirm, SECRET) === null
);

// --- Forgery --------------------------------------------------------------

check(
  'a token sealed with a different secret is rejected',
  verifyConfirmToken(mintConfirmToken({ email: EMAIL, source: SOURCE }, OTHER_SECRET), SECRET)
    .status === 'invalid'
);
check(
  'a legacy JWT signed with a different secret is rejected',
  verifyConfirmToken(
    jwt.sign({ email: EMAIL, source: SOURCE }, OTHER_SECRET, { algorithm: 'HS256', expiresIn: 3600 }),
    SECRET
  ).status === 'invalid'
);

// The algorithm-confusion hole, which only the legacy format has. `jsonwebtoken`
// will honour whatever `alg` the header claims unless `algorithms` is pinned on
// verify, which turns an attacker-authored payload into a valid confirmation
// for any address.
const noneToken =
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
  '.' +
  Buffer.from(
    JSON.stringify({
      email: 'attacker@example.com',
      source: SOURCE,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url') +
  '.';
check(
  'an alg:none legacy JWT cannot subscribe anyone',
  verifyConfirmToken(noneToken, SECRET).status === 'invalid'
);
// The sealed format has no header to lie about its algorithm. Its nearest
// equivalent is a token in the right shape that nobody encrypted, and the
// sealed prefix must not smuggle the alg:none JWT anywhere either.
check(
  'a sealed-shaped token carrying its claims unencrypted cannot subscribe anyone',
  verifyConfirmToken(
    unencrypted({ email: 'attacker@example.com', source: SOURCE, exp: epochIn(3600) }),
    SECRET
  ).status === 'invalid'
);
check(
  'an alg:none JWT behind the sealed prefix cannot subscribe anyone',
  verifyConfirmToken(SEALED_TOKEN_PREFIX + noneToken, SECRET).status === 'invalid'
);

check('garbage is rejected', verifyConfirmToken('not-a-token', SECRET).status === 'invalid');
check('an empty token is rejected', verifyConfirmToken('', SECRET).status === 'invalid');

// A correctly-authenticated token carrying a source we do not recognise. This
// is the case a bare type union could not catch, because a type is erased at
// runtime.
for (const [format, token] of inBothFormats({ email: EMAIL, source: 'not-a-real-surface' })) {
  check(
    `a correctly-authenticated ${format} token with an unknown source is rejected`,
    verifyConfirmToken(token, SECRET).status === 'invalid'
  );
}
for (const [format, token] of inBothFormats({ source: SOURCE })) {
  check(
    `a correctly-authenticated ${format} token with no email is rejected`,
    verifyConfirmToken(token, SECRET).status === 'invalid'
  );
}
for (const [format, token] of inBothFormats({ email: '', source: SOURCE })) {
  check(
    `a correctly-authenticated ${format} token with an empty email is rejected`,
    verifyConfirmToken(token, SECRET).status === 'invalid'
  );
}

// A token with no usable expiry would be consent that never goes stale. The
// sealed format has no library enforcing `exp`, so the verifier has to.
check(
  'a correctly-sealed token with no exp claim is rejected',
  verifyConfirmToken(sealToken('confirm', { email: EMAIL, source: SOURCE }, SECRET), SECRET)
    .status === 'invalid'
);
check(
  'a correctly-sealed token whose exp is not a number is rejected',
  verifyConfirmToken(
    sealToken('confirm', { email: EMAIL, source: SOURCE, exp: String(epochIn(3600)) }, SECRET),
    SECRET
  ).status === 'invalid'
);
check(
  'a correctly-signed legacy JWT with no exp claim is rejected',
  verifyConfirmToken(jwt.sign({ email: EMAIL, source: SOURCE }, SECRET, { algorithm: 'HS256' }), SECRET)
    .status === 'invalid'
);

// --- Expiry ---------------------------------------------------------------

for (const [format, expiredToken] of inBothFormats({ email: EMAIL, source: SOURCE }, { expiresIn: -60 })) {
  const expiredResult = verifyConfirmToken(expiredToken, SECRET);

  check(`an expired ${format} token is reported as expired, not valid`, expiredResult.status === 'expired');
  check(`an expired ${format} token is NOT treated as consent`, expiredResult.status !== 'valid');
  // This is what keeps the re-subscribe form attributed: the GCM tag (or the
  // signature) was still checked, so the source is trustworthy even though the
  // token is stale.
  check(
    `an expired ${format} token still yields an authenticated source`,
    expiredResult.status === 'expired' && expiredResult.payload.source === SOURCE
  );
}
// ...but an expired token forged with the wrong secret must not.
for (const [format, token] of inBothFormats(
  { email: EMAIL, source: SOURCE },
  { expiresIn: -60, secret: OTHER_SECRET }
)) {
  check(
    `an expired ${format} token made with the wrong secret is invalid, not expired`,
    verifyConfirmToken(token, SECRET).status === 'invalid'
  );
}

check('the TTL is the documented 48 hours', CONFIRM_TOKEN_TTL_SECONDS === 48 * 60 * 60);

// --- The episode claim ----------------------------------------------------
//
// `episode` decides which quiz card a new subscriber is sent. It is the one
// field a caller supplies that is neither the address nor the surface, so it
// gets the same treatment: shape-checked on the way out of the token, and never
// able to break consent on the way in.

const EPISODE = 'tan-climbs-the-mountain';

const withEpisode = verifyConfirmToken(
  mintConfirmToken({ email: EMAIL, source: SOURCE, episode: EPISODE }, SECRET),
  SECRET
);
check(
  'an episode survives the round trip',
  withEpisode.status === 'valid' && withEpisode.payload.episode === EPISODE
);
const legacyWithEpisode = verifyConfirmToken(
  jwt.sign({ email: EMAIL, source: SOURCE, episode: EPISODE }, SECRET, {
    algorithm: 'HS256',
    expiresIn: CONFIRM_TOKEN_TTL_SECONDS,
  }),
  SECRET
);
check(
  'an episode in a legacy confirm JWT survives the round trip',
  legacyWithEpisode.status === 'valid' && legacyWithEpisode.payload.episode === EPISODE
);

const withoutEpisode = verifyConfirmToken(
  mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET),
  SECRET
);
check(
  'a signup with no episode carries none, rather than an empty string',
  withoutEpisode.status === 'valid' && withoutEpisode.payload.episode === undefined
);

// A malformed episode must DROP the field, not refuse the token. The address
// and the source are both intact and authenticated; refusing consent over
// a cosmetic claim would lose a real subscriber to a typo, and the fallback
// (the newest episode that has gone out) is already correct for every source that has none.
for (const bad of ['../../etc/passwd', 'Tan Climbs', 'ep 01', '', 'UPPER-CASE', 42]) {
  for (const [format, token] of inBothFormats({ email: EMAIL, source: SOURCE, episode: bad })) {
    const forged = verifyConfirmToken(token, SECRET);
    check(
      typeof bad === 'string'
        ? `a malformed episode (${JSON.stringify(bad)}) in a ${format} token is dropped, and consent still stands`
        : `a non-string episode in a ${format} token is dropped, and consent still stands`,
      forged.status === 'valid' && forged.payload.episode === undefined
    );
  }
}

// --- The unsubscribe token --------------------------------------------------
//
// A separate token from the confirm one, from the same secret, authorizing the
// opposite action on the same address. A sealed one is sealed under its own key
// (the kind is in the HKDF label and in the AAD); a legacy JWT shares the
// confirm JWT's HMAC key, so its `typ` claim is all that separates the two.
// That separation is the only thing standing between "this link confirms a
// signup" and "this link removes someone from the list", so it is checked in
// all four directions.

const unsubGood = mintUnsubscribeToken(EMAIL, SECRET);
const unsubResult = verifyUnsubscribeToken(unsubGood, SECRET);

check('a freshly minted unsubscribe token verifies', unsubResult.status === 'valid');
check(
  'the address survives the unsubscribe round trip',
  unsubResult.status === 'valid' && unsubResult.payload.email === EMAIL
);
check(
  `a freshly minted unsubscribe token is sealed (${SEALED_TOKEN_PREFIX}…), not a JWT`,
  isSealedToken(unsubGood) && !unsubGood.startsWith('eyJ')
);
check(
  'an unsubscribe token sealed with a different secret is rejected',
  verifyUnsubscribeToken(mintUnsubscribeToken(EMAIL, OTHER_SECRET), SECRET).status === 'invalid'
);
// Read from inside the seal: `jwt.decode` cannot see into a sealed token.
const unsubClaims = openSealedToken('unsubscribe', unsubGood, SECRET);
check(
  'an unsubscribe token has no expiry claim',
  unsubClaims !== null && unsubClaims.email === EMAIL && !('exp' in unsubClaims)
);
check(
  'a correctly-sealed unsubscribe token with no email, or an empty one, is rejected',
  verifyUnsubscribeToken(sealToken('unsubscribe', {}, SECRET), SECRET).status === 'invalid' &&
    verifyUnsubscribeToken(sealToken('unsubscribe', { email: '' }, SECRET), SECRET).status === 'invalid'
);

// The forever promise. Welcome emails sent before 2026-10-11 carry a JWT, and
// RFC 8058 and the bulk-sender rules assume the link in a kept email still works.
const legacyUnsub = jwt.sign({ email: EMAIL, typ: 'unsub' }, SECRET, { algorithm: 'HS256' });
const legacyUnsubResult = verifyUnsubscribeToken(legacyUnsub, SECRET);
check(
  'a legacy unsubscribe JWT minted the old way still unsubscribes, forever',
  legacyUnsubResult.status === 'valid' && legacyUnsubResult.payload.email === EMAIL
);
check(
  'a legacy unsubscribe JWT signed with a different secret is rejected',
  verifyUnsubscribeToken(
    jwt.sign({ email: EMAIL, typ: 'unsub' }, OTHER_SECRET, { algorithm: 'HS256' }),
    SECRET
  ).status === 'invalid'
);
check(
  "a legacy JWT whose typ is not 'unsub' is rejected by the unsubscribe verifier",
  [{ email: EMAIL }, { email: EMAIL, typ: 'confirm' }, { email: EMAIL, typ: 'UNSUB' }].every(
    claims =>
      verifyUnsubscribeToken(jwt.sign(claims, SECRET, { algorithm: 'HS256' }), SECRET).status === 'invalid'
  )
);

const unsubNoneToken =
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
  '.' +
  Buffer.from(JSON.stringify({ email: 'attacker@example.com', typ: 'unsub' })).toString(
    'base64url'
  ) +
  '.';
check(
  'an alg:none legacy unsubscribe JWT cannot unsubscribe anyone',
  verifyUnsubscribeToken(unsubNoneToken, SECRET).status === 'invalid'
);
check(
  'a sealed-shaped unsubscribe token carrying its claims unencrypted cannot unsubscribe anyone',
  verifyUnsubscribeToken(unencrypted({ email: 'attacker@example.com' }), SECRET).status === 'invalid' &&
    verifyUnsubscribeToken(SEALED_TOKEN_PREFIX + unsubNoneToken, SECRET).status === 'invalid'
);

// A confirm token and an unsubscribe token both carry `email`. Without the
// separation, a leaked confirm link could double as an unsubscribe link for the
// same address, or vice versa.
check(
  'a sealed confirm token cannot be replayed as an unsubscribe token',
  verifyUnsubscribeToken(mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET), SECRET)
    .status === 'invalid'
);
check(
  'a sealed unsubscribe token cannot be replayed as a confirm token',
  verifyConfirmToken(mintUnsubscribeToken(EMAIL, SECRET), SECRET).status === 'invalid'
);
check(
  'a legacy confirm JWT cannot be replayed as an unsubscribe token',
  verifyUnsubscribeToken(legacyConfirm, SECRET).status === 'invalid'
);
check(
  'a legacy unsubscribe JWT cannot be replayed as a confirm token',
  verifyConfirmToken(legacyUnsub, SECRET).status === 'invalid'
);
// For sealed tokens the separation is the key, not the payload: give each kind
// every claim the other verifier asks for, and it still does not open there.
check(
  "a token sealed as 'unsubscribe' carrying source and exp still does not confirm",
  verifyConfirmToken(
    sealToken('unsubscribe', { email: EMAIL, source: SOURCE, exp: epochIn(3600) }, SECRET),
    SECRET
  ).status === 'invalid'
);
check(
  "a token sealed as 'confirm' carrying only an address still does not unsubscribe",
  verifyUnsubscribeToken(sealToken('confirm', { email: EMAIL }, SECRET), SECRET).status === 'invalid'
);

check('garbage is rejected by the unsubscribe verifier', verifyUnsubscribeToken('not-a-token', SECRET).status === 'invalid');
check('an empty token is rejected by the unsubscribe verifier', verifyUnsubscribeToken('', SECRET).status === 'invalid');

// --- The sealed format ------------------------------------------------------
//
// The GCM tag replaced the JWT signature, so it must cover every byte. Change
// one anywhere, in the IV, the ciphertext or the tag, and the token is refused.
// So is one cut short or lengthened, one whose body strays outside the
// base64url alphabet (Node's decoder would skip the stray character and open
// it), and one whose prefix changes. Tried at every byte position, both kinds.

check(
  'an unsubscribe token is a 12-byte IV, ciphertext as long as its JSON, and a 16-byte tag',
  sealedBytes(unsubGood).length === IV_BYTES + Buffer.byteLength(JSON.stringify({ email: EMAIL })) + TAG_BYTES
);

const sealedCases = [
  {
    kind: 'confirm',
    name: 'a confirm token',
    token: mintConfirmToken({ email: EMAIL, source: SOURCE, episode: EPISODE }, SECRET),
    opens: (token: string) => verifyConfirmToken(token, SECRET).status !== 'invalid',
  },
  {
    kind: 'unsubscribe',
    name: 'an unsubscribe token',
    token: mintUnsubscribeToken(EMAIL, SECRET),
    opens: (token: string) => verifyUnsubscribeToken(token, SECRET).status !== 'invalid',
  },
] as const;

for (const { kind, name, token, opens } of sealedCases) {
  const raw = sealedBytes(token);
  const body = token.slice(SEALED_TOKEN_PREFIX.length);

  check(
    `the untouched ${kind} token opens, so every refusal below is the tampering's doing`,
    opens(token) && asSealedToken(raw) === token
  );

  for (const [region, from, to] of [
    ['IV', 0, IV_BYTES],
    ['ciphertext', IV_BYTES, raw.length - TAG_BYTES],
    ['tag', raw.length - TAG_BYTES, raw.length],
  ] as const) {
    const opened: string[] = [];
    for (let i = from; i < to; i += 1) {
      // One bit, and the whole byte.
      for (const mask of [0x01, 0xff]) {
        const changed = Buffer.from(raw);
        changed[i] ^= mask;
        if (opens(asSealedToken(changed))) opened.push(`byte ${i} ^ ${mask}`);
      }
    }
    check(
      `changing any one byte in the ${region} of ${name} makes it invalid` +
        (opened.length > 0 ? ` (still opened: ${opened.join(', ')})` : ''),
      to > from && opened.length === 0
    );
  }

  check(
    `a truncated ${kind} token is invalid`,
    [
      token.slice(0, -1),
      token.slice(0, -4),
      token.slice(0, SEALED_TOKEN_PREFIX.length + Math.floor(body.length / 2)),
      asSealedToken(raw.subarray(0, raw.length - 1)),
      asSealedToken(raw.subarray(0, IV_BYTES + TAG_BYTES)),
    ].every(cut => !opens(cut))
  );
  check(
    `${name} with a byte appended is invalid`,
    !opens(asSealedToken(Buffer.concat([raw, Buffer.alloc(1)])))
  );
  check(`the ${SEALED_TOKEN_PREFIX} prefix alone is not ${name}`, !opens(SEALED_TOKEN_PREFIX));

  const middle = Math.floor(body.length / 2);
  check(
    `${name} with a character outside base64url in its body is invalid`,
    ['!', '=', '.', ' ', '%', '+', '/', '\n'].every(
      stray =>
        !opens(SEALED_TOKEN_PREFIX + body.slice(0, middle) + stray + body.slice(middle)) &&
        !opens(token + stray)
    )
  );
  check(
    `${name} with its ${SEALED_TOKEN_PREFIX} prefix swapped or dropped is invalid`,
    ['', 's2.', 'S1.', 's1', 's1-', 'eyJ', SEALED_TOKEN_PREFIX + SEALED_TOKEN_PREFIX].every(
      prefix => !opens(prefix + body)
    )
  );
  check(
    `${name} does not open under another secret`,
    openSealedToken(kind, token, OTHER_SECRET) === null
  );
}

// A fresh random IV per token, so two mints of one payload share nothing a
// reader could line up, and no key ever sees a GCM nonce twice.
check(
  'two mints of the identical payload differ, down to the IV',
  [
    [mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET), mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET)],
    [mintUnsubscribeToken(EMAIL, SECRET), mintUnsubscribeToken(EMAIL, SECRET)],
  ].every(
    ([a, b]) =>
      a !== b && !sealedBytes(a).subarray(0, IV_BYTES).equals(sealedBytes(b).subarray(0, IV_BYTES))
  )
);

// --- The address is unreadable without the key ------------------------------
//
// The point of sealing. A confirm link lands in Vercel's request log and in
// whatever a mail link scanner fetches; a mail host POSTs the unsubscribe link
// and that request is logged the same way. Whoever reads those must not be able
// to read the address back out. `recoverable` is every string a reader without
// the key gets from a token with the obvious decoders: the token and both URLs
// that carry it, percent-decoded; and the whole token and each '.'-separated
// segment as base64url, standard base64 and hex, starting at each of the first
// four characters so an address at any alignment is caught, read as UTF-8 and
// as Latin-1.

const OPAQUE_EMAIL = 'opaque.check+sealed@example.com';

function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function recoverable(token: string): string[] {
  const strings: string[] = [];
  for (const text of [token, confirmUrl(token), unsubscribeUrl(token)]) {
    strings.push(text);
    try {
      strings.push(decodeURIComponent(text));
    } catch {
      // Not percent-decodable, so there is nothing more to read from it this way.
    }
  }
  for (const part of [token, ...token.split('.')]) {
    for (let offset = 0; offset < 4; offset += 1) {
      for (const encoding of ['base64url', 'base64', 'hex'] as const) {
        const bytes = Buffer.from(part.slice(offset), encoding);
        strings.push(bytes.toString('utf8'), bytes.toString('latin1'));
      }
    }
  }
  return strings;
}

/** Which recognisable forms of `address` (whole, local part, percent-encoded) a reader recovers from `token`. */
function addressFormsIn(token: string, address: string): string[] {
  const local = address.slice(0, address.indexOf('@'));
  const forms = [address, local, encodeURIComponent(address), encodeURIComponent(local)].map(form =>
    form.toLowerCase()
  );
  const found = new Set<string>();
  for (const text of recoverable(token)) {
    const lower = text.toLowerCase();
    for (const form of forms) if (lower.includes(form)) found.add(form);
  }
  return [...found];
}

// The control: the reader must find the address where it IS readable, or the
// opacity checks below pass because the reader is blind, and prove nothing.
// First the format this replaced, then every decoder at every alignment.
check(
  'the reader finds the address in a legacy confirm JWT; if not, the opacity checks prove nothing',
  addressFormsIn(
    jwt.sign({ email: OPAQUE_EMAIL, source: SOURCE }, SECRET, {
      algorithm: 'HS256',
      expiresIn: CONFIRM_TOKEN_TTL_SECONDS,
    }),
    OPAQUE_EMAIL
  ).includes(OPAQUE_EMAIL)
);
check(
  'the reader finds the address in a legacy unsubscribe JWT; if not, the opacity checks prove nothing',
  addressFormsIn(jwt.sign({ email: OPAQUE_EMAIL, typ: 'unsub' }, SECRET, { algorithm: 'HS256' }), OPAQUE_EMAIL).includes(
    OPAQUE_EMAIL
  )
);
const blindSpots: string[] = [];
for (let lead = 0; lead < 4; lead += 1) {
  for (const encoding of ['base64url', 'base64', 'hex'] as const) {
    // 'a' is valid in all three alphabets, so the decoder only lines up from `lead`.
    const planted = 'a'.repeat(lead) + Buffer.from(OPAQUE_EMAIL, 'utf8').toString(encoding);
    if (!addressFormsIn(planted, OPAQUE_EMAIL).includes(OPAQUE_EMAIL)) blindSpots.push(`${encoding} after ${lead}`);
  }
}
if (!addressFormsIn(unencrypted({ email: OPAQUE_EMAIL }), OPAQUE_EMAIL).includes(OPAQUE_EMAIL)) {
  blindSpots.push('a sealed-shaped token left unencrypted');
}
if (!addressFormsIn(encodeURIComponent(OPAQUE_EMAIL), OPAQUE_EMAIL).includes(OPAQUE_EMAIL)) {
  blindSpots.push('the address percent-encoded');
}
check(
  'the reader finds the address through every decoder at every alignment; if not, the opacity checks prove nothing' +
    (blindSpots.length > 0 ? ` (blind to: ${blindSpots.join('; ')})` : ''),
  blindSpots.length === 0
);

const OPAQUE_MINTS = 8;
const mintedTokens: string[] = [];
for (const { what, mint, opensTo } of [
  {
    what: 'a confirm token',
    mint: () => mintConfirmToken({ email: OPAQUE_EMAIL, source: SOURCE }, SECRET),
    opensTo: (token: string) => {
      const result = verifyConfirmToken(token, SECRET);
      return result.status === 'valid' ? result.payload.email : null;
    },
  },
  {
    what: 'a confirm token with an episode',
    mint: () => mintConfirmToken({ email: OPAQUE_EMAIL, source: SOURCE, episode: EPISODE }, SECRET),
    opensTo: (token: string) => {
      const result = verifyConfirmToken(token, SECRET);
      return result.status === 'valid' && result.payload.episode === EPISODE ? result.payload.email : null;
    },
  },
  {
    what: 'an unsubscribe token',
    mint: () => mintUnsubscribeToken(OPAQUE_EMAIL, SECRET),
    opensTo: (token: string) => {
      const result = verifyUnsubscribeToken(token, SECRET);
      return result.status === 'valid' ? result.payload.email : null;
    },
  },
]) {
  const tokens = Array.from({ length: OPAQUE_MINTS }, mint);
  mintedTokens.push(...tokens);
  const leaked = [...new Set(tokens.flatMap(token => addressFormsIn(token, OPAQUE_EMAIL)))];
  check(
    `${what} shows the address in no form a reader without the key can decode, over ${OPAQUE_MINTS} mints` +
      (leaked.length > 0 ? ` (found: ${leaked.join(', ')})` : ''),
    leaked.length === 0
  );
  // The other half of the control: the address IS in there, for the key holder.
  check(
    `${what} still opens to the address with the key, so it is hidden, not missing`,
    tokens.every(token => opensTo(token) === OPAQUE_EMAIL)
  );
}

// --- Every token travels in a URL untouched ---------------------------------
//
// The confirm link and the unsubscribe link carry the token in a query string.
// A token inside the URL-safe alphabet comes through encodeURIComponent
// unchanged, so the server receives byte for byte what it minted, and a
// percent-decoding proxy or log has nothing to rewrite.

mintedTokens.push(good, unsubGood, ...sealedCases.map(({ token }) => token));
const notUrlSafe = mintedTokens.filter(
  token => !/^[A-Za-z0-9._-]+$/.test(token) || encodeURIComponent(token) !== token
);
check(
  `every minted token is [A-Za-z0-9._-] only, so encodeURIComponent leaves it as it is (${mintedTokens.length} tokens)` +
    (notUrlSafe.length > 0 ? ` (not: ${notUrlSafe.join(', ')})` : ''),
  notUrlSafe.length === 0
);
check(
  'the confirm URL and the unsubscribe URL carry each minted token verbatim',
  mintedTokens.every(
    token =>
      confirmUrl(token) === `${SITE_URL}/confirm?token=${token}` &&
      unsubscribeUrl(token) === `${SITE_URL}/api/unsubscribe?token=${token}`
  )
);

// --- The source list ------------------------------------------------------

check('there is at least one signup source', EMAIL_SIGNUP_SOURCES.length > 0);
check(
  'the source list has no duplicates',
  new Set(EMAIL_SIGNUP_SOURCES).size === EMAIL_SIGNUP_SOURCES.length
);
check('every declared source validates', EMAIL_SIGNUP_SOURCES.every(isEmailSignupSource));
check('an unknown source does not validate', !isEmailSignupSource('pro-waitlist'));
check('an empty string does not validate', !isEmailSignupSource(''));
check('a non-string does not validate', !isEmailSignupSource(42));
check('null does not validate', !isEmailSignupSource(null));

// --- The commercial email footer ------------------------------------------
//
// CAN-SPAM requires a valid physical postal address in every commercial email,
// and the same address is the privacy policy's postal contact point for
// erasure requests. The rules: never a PO Box (it must name a physical place),
// nothing missing. Then both sends that carry an episode — the welcome card
// and the weekly broadcast — must render it, in HTML and in plain text. The
// renderer is exercised with a sample address so this holds even while
// config.business.postalAddress is still null.

const SAMPLE_ADDRESS: PostalAddress = {
  street: '10 Example Street',
  unit: 'Suite 100 #1234',
  locality: 'Boston',
  region: 'MA',
  postalCode: '02110',
  country: 'United States',
};

check('the sender has a legal name', config.business.legalName.trim().length > 0);
check('a complete street address has no problems', postalAddressProblems(SAMPLE_ADDRESS).length === 0);
check('a missing address is refused', postalAddressProblems(null).length > 0);
for (const poBox of ['PO Box 12', 'P.O. Box 12', 'p o box 12', 'Post Office Box 12', 'POB 12']) {
  check(
    `a PO Box (${JSON.stringify(poBox)}) is refused`,
    postalAddressProblems({ ...SAMPLE_ADDRESS, street: poBox }).length > 0
  );
}
check(
  'a PO Box hidden in the unit line is refused',
  postalAddressProblems({ ...SAMPLE_ADDRESS, unit: 'PO Box 12' }).length > 0
);
check(
  'a PMB, the designation USPS requires on an agency mailbox, is not mistaken for a PO Box',
  postalAddressProblems({ ...SAMPLE_ADDRESS, unit: 'PMB 1234' }).length === 0
);
check(
  'a blank required field is refused',
  postalAddressProblems({ ...SAMPLE_ADDRESS, postalCode: ' ' }).length > 0
);

const configuredAddress = config.business.postalAddress;
if (configuredAddress) {
  check('the configured postal address is publishable', postalAddressProblems(configuredAddress).length === 0);
}

const newestEpisode = episodesNewestFirst()[0];
check('there is an episode to render', newestEpisode !== undefined);
if (newestEpisode) {
  const line = `${config.business.legalName} · ${postalAddressLine(SAMPLE_ADDRESS)}`;
  const broadcastUnsubscribe = '{{{RESEND_UNSUBSCRIBE_URL}}}';
  const welcomeUnsubscribe = 'https://www.michikanji.com/api/unsubscribe?token=sample';

  config.business.postalAddress = SAMPLE_ADDRESS;
  try {
    for (const [send, unsubscribeUrl] of [
      ['broadcast', broadcastUnsubscribe],
      ['welcome card', welcomeUnsubscribe],
    ] as const) {
      const html = quizEmailHtml(newestEpisode, unsubscribeUrl);
      const text = quizEmailText(newestEpisode, unsubscribeUrl);
      check(`the ${send} HTML carries the sender and postal address`, html.includes(line));
      check(`the ${send} plain text carries the sender and postal address`, text.includes(line));
      check(`the ${send} HTML carries its unsubscribe link`, html.includes(`href="${unsubscribeUrl}"`));
      check(`the ${send} plain text carries its unsubscribe link`, text.includes(unsubscribeUrl));
    }
  } finally {
    config.business.postalAddress = configuredAddress;
  }

  check(
    'with no address configured, the footer omits the line rather than printing a blank one',
    configuredAddress !== null ||
      !quizEmailText(newestEpisode, broadcastUnsubscribe).includes(`${config.business.legalName} · `)
  );
}

// --- Campaign tags on the episode email -------------------------------------
//
// The episode email's content links carry UTM tags so DataFast can say which
// email a visit came from (lib/email/utm.ts). What makes that safe is asserted
// here rather than described: the tags are exact, they are identical for every
// recipient, and none reaches the unsubscribe link, the Resend placeholder, a
// mailto: link, an image, or the confirmation email, which is transactional
// and reaches someone who has not consented to anything yet.

type EmailKind = 'welcome' | 'weekly';

/** Every href in an HTML part, with `&amp;` decoded back to the URL it stands for. */
function hrefsIn(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map(match => match[1].replace(/&amp;/g, '&'));
}

/** The tagged URL the spec asks for, written out rather than derived from the helper. */
function tagged(path: string, slug: string, kind: EmailKind): string {
  return `${SITE_URL}${path}?utm_source=newsletter&utm_medium=email&utm_campaign=${slug}&utm_content=${kind}`;
}

const SAMPLE_UNSUBSCRIBE = 'https://www.michikanji.com/api/unsubscribe?token=sample';
const RESEND_PLACEHOLDER = '{{{RESEND_UNSUBSCRIBE_URL}}}';

for (const episode of EPISODES) {
  check(
    `${episode.slug}: the campaign is the slug, and reads the same in DataFast without encoding`,
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episode.slug)
  );
  for (const kind of ['welcome', 'weekly'] as const) {
    const primary = tagged(`/stories/${episode.slug}`, episode.slug, kind);
    check(
      `${episode.slug} (${kind}): the HTML links the episode page with exactly the four tags`,
      hrefsIn(quizEmailHtml(episode, SAMPLE_UNSUBSCRIBE, kind)).includes(primary)
    );
    check(
      `${episode.slug} (${kind}): the plain text links the episode page with exactly the four tags`,
      quizEmailText(episode, SAMPLE_UNSUBSCRIBE, kind).split('\n').includes(primary)
    );
  }
}

// --- Bubbled panels in the episode email ------------------------------------
//
// Each panel is `stories/<slug>/e<N>.jpg`: the art with its speech bubbles baked
// in (scripts/stories/render-email-panels.ts), because a mail client cannot lay
// text over an image. `validate:stories` asserts the files exist; this asserts
// the email actually points at them, and that the alt text carries the whole
// story for a client that blocks images.

/** Attribute values as written in the HTML, unescaped. */
function attrsIn(html: string, tag: string, attr: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'g'))].map(match =>
    match[1].replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
  );
}

for (const episode of EPISODES) {
  const html = quizEmailHtml(episode, SAMPLE_UNSUBSCRIBE);
  const srcs = attrsIn(html, 'img', 'src');
  check(
    `${episode.slug}: the HTML shows exactly its bubbled panels, e1..e${episode.panels.length}`,
    JSON.stringify(srcs) ===
      JSON.stringify(episode.panels.map((_, i) => `${SITE_URL}/stories/${episode.slug}/e${i + 1}.jpg`))
  );
  check(
    `${episode.slug}: no email image is the bare, bubble-less art`,
    !srcs.some(src => /\/p\d\.(jpg|webp)$/.test(src))
  );
  const alts = attrsIn(html, 'img', 'alt');
  check(
    `${episode.slug}: each panel's alt text carries its beat and every line, Japanese and English`,
    alts.length === episode.panels.length &&
      episode.panels.every(
        (panel, i) =>
          alts[i].includes(panel.beat) &&
          panel.lines.every(line => alts[i].includes(line.ja) && alts[i].includes(line.en))
      )
  );
  const text = quizEmailText(episode, SAMPLE_UNSUBSCRIBE);
  check(
    `${episode.slug}: the plain text still carries every Japanese line`,
    episode.panels.every(panel => panel.lines.every(line => text.includes(line.ja)))
  );
  // The romaji line: between the image and the English, for every line, in both
  // parts. Its source is authored readings, which validate:stories checks.
  const romajiOrder = episode.panels.every(panel => {
    const romaji = panelRomaji(episode.slug, panel.id);
    return (
      romaji !== null &&
      romaji.length === panel.lines.length &&
      panel.lines.every((line, i) => {
        const inHtml = html.indexOf(`>${romaji[i]}</td>`);
        return (
          romaji[i].length > 0 &&
          inHtml > -1 &&
          html.indexOf(`>${line.en.replace(/&/g, '&amp;')}</td>`, inHtml) > inHtml &&
          text.includes(`${line.ja}\n${romaji[i]}\n${line.en}`)
        );
      })
    );
  });
  check(`${episode.slug}: every line's romaji is in the HTML and the plain text, before its English`, romajiOrder);
}

if (newestEpisode) {
  const slug = newestEpisode.slug;
  const sends = [
    { send: 'broadcast', kind: 'weekly', unsubscribe: RESEND_PLACEHOLDER },
    { send: 'welcome card', kind: 'welcome', unsubscribe: SAMPLE_UNSUBSCRIBE },
  ] as const;

  for (const { send, kind, unsubscribe } of sends) {
    const html = quizEmailHtml(newestEpisode, unsubscribe, kind);
    const text = quizEmailText(newestEpisode, unsubscribe, kind);
    const contentLinks = [
      tagged(`/stories/${slug}`, slug, kind),
      tagged('/stories', slug, kind),
      // The Tan Dash line (lib/email/quiz-email.ts, playLine).
      tagged('/play', slug, kind),
    ];
    const links = hrefsIn(html);

    check(
      `the ${send} HTML tags every content link: the episode, every episode and Tan Dash`,
      contentLinks.every(link => links.includes(link))
    );
    check(
      `every link in the ${send} HTML is a tagged content link or the unsubscribe link exactly as given`,
      links.includes(unsubscribe) && links.every(link => contentLinks.includes(link) || link === unsubscribe)
    );
    check(
      `no image in the ${send} carries a tag`,
      [...html.matchAll(/src="([^"]*)"/g)].every(match => !match[1].includes('utm_'))
    );
    const textUrls: string[] = text.match(/https?:\/\/\S+/g) ?? [];
    check(
      `the ${send} plain text tags its primary link and no other`,
      textUrls.includes(contentLinks[0]) && textUrls.filter(url => url.includes('utm_')).length === 1
    );
    check(
      `the ${send} plain text links Tan Dash bare`,
      text.split('\n').includes(`${SITE_URL}/play`)
    );
    check(
      `the ${send} plain text keeps its unsubscribe link bare`,
      text.split('\n').includes(`Unsubscribe: ${unsubscribe}`)
    );
  }

  check(
    'an episode email with no kind is the welcome card, so the confirm route needs no change',
    quizEmailHtml(newestEpisode, SAMPLE_UNSUBSCRIBE) === quizEmailHtml(newestEpisode, SAMPLE_UNSUBSCRIBE, 'welcome') &&
      quizEmailText(newestEpisode, SAMPLE_UNSUBSCRIBE) === quizEmailText(newestEpisode, SAMPLE_UNSUBSCRIBE, 'welcome')
  );

  const asWelcome = (rendered: string) => rendered.replaceAll('utm_content=weekly', 'utm_content=welcome');
  check(
    'the welcome card and the broadcast differ in utm_content and nothing else',
    asWelcome(quizEmailHtml(newestEpisode, SAMPLE_UNSUBSCRIBE, 'weekly')) ===
      quizEmailHtml(newestEpisode, SAMPLE_UNSUBSCRIBE, 'welcome') &&
      asWelcome(quizEmailText(newestEpisode, SAMPLE_UNSUBSCRIBE, 'weekly')) ===
        quizEmailText(newestEpisode, SAMPLE_UNSUBSCRIBE, 'welcome')
  );

  // The only per-recipient input a renderer receives is the signed unsubscribe
  // link. If any of it leaked into a content link, the tag would identify the
  // reader, which is exactly what it must never do.
  const readerOne = 'https://www.michikanji.com/api/unsubscribe?token=reader-one';
  const readerTwo = 'https://www.michikanji.com/api/unsubscribe?token=reader-two';
  const contentOnly = (unsubscribe: string) =>
    JSON.stringify(hrefsIn(quizEmailHtml(newestEpisode, unsubscribe, 'weekly')).filter(link => link !== unsubscribe));
  check(
    'the content links are identical for every recipient, so no tag carries anything personal',
    contentOnly(readerOne) === contentOnly(readerTwo)
  );
}

for (const [what, url] of [
  ['the Resend unsubscribe placeholder', RESEND_PLACEHOLDER],
  ['a signed unsubscribe link', SAMPLE_UNSUBSCRIBE],
  ['a mailto: link', 'mailto:reply@example.com'],
  ['a link to another site', 'https://example.com/stories'],
] as const) {
  check(
    `${what} comes back untagged even when handed to the tagger`,
    withNewsletterUtm(url, 'any-campaign', 'weekly') === url
  );
}

const confirmToken = mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET);
const confirmationHtml = confirmationEmailHtml(confirmToken);
check(
  'the confirmation email carries no campaign tag: it is transactional and pre-consent',
  !confirmationHtml.includes('utm_') && !confirmationEmailText(confirmToken).includes('utm_')
);
check(
  'every link in the confirmation email is the bare confirm link',
  hrefsIn(confirmationHtml).length > 0 &&
    hrefsIn(confirmationHtml).every(link => link === confirmUrl(confirmToken))
);

// --- The confirm page keeps the token from DataFast ------------------------
//
// That link's token is a bearer credential even sealed: whoever holds it can
// confirm the address. A legacy one, valid for 48h after the switch, is the
// address in base64url. DataFast's page-view script reports the URL it finds,
// so /confirm removes the token from the address bar before that script runs
// (lib/email/confirm-token-scrub.ts, which explains the ordering). This runs
// the exact string the page inlines, on both formats.

/** The address bar after the scrub script runs on `href`, and whether it rewrote it. */
function afterScrub(href: string): { href: string; rewritten: boolean } {
  let current = href;
  let rewritten = false;
  const fakeWindow = {
    location: {
      get href() {
        return current;
      },
    },
    history: {
      state: null as unknown,
      replaceState(_state: unknown, _unused: string, url: string) {
        rewritten = true;
        current = new URL(url, current).toString();
      },
    },
  };
  new Function('window', CONFIRM_TOKEN_SCRUB_SCRIPT)(fakeWindow);
  return { href: current, rewritten };
}

const emailedLink = afterScrub(confirmUrl(confirmToken));
check(
  'the emailed confirm link leaves the address bar as bare /confirm, token gone',
  emailedLink.href === `${SITE_URL}/confirm` && !emailedLink.href.includes(confirmToken)
);
const legacyEmailedLink = afterScrub(confirmUrl(legacyConfirm));
check(
  'a legacy confirm link, the one with a readable address, leaves the address bar as bare /confirm too',
  legacyEmailedLink.href === `${SITE_URL}/confirm` && !legacyEmailedLink.href.includes(legacyConfirm)
);
check(
  'the scrub removes only the token: other parameters and the fragment stay',
  afterScrub(`${SITE_URL}/confirm?utm_source=newsletter&token=abc#top`).href ===
    `${SITE_URL}/confirm?utm_source=newsletter#top`
);
check(
  'a percent-encoded name the page would still read as `token` is scrubbed too',
  afterScrub(`${SITE_URL}/confirm?%74oken=abc`).href === `${SITE_URL}/confirm`
);
check(
  'a confirm URL with no token is left alone',
  !afterScrub(`${SITE_URL}/confirm`).rewritten
);

// The same page's Referer. Next applies every header rule that matches a path,
// and the last one setting a key wins, so the site-wide strict-origin-when-
// cross-origin must be overridden by a later /confirm rule that sends no path.
interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}
const confirmReferrerChecked = (nextConfig.headers() as Promise<HeaderRule[]>).then(rules => {
  const policy = rules
    .filter(rule => rule.source === '/:path*' || rule.source === '/confirm')
    .flatMap(rule => rule.headers)
    .filter(header => header.key.toLowerCase() === 'referrer-policy')
    .at(-1)?.value;
  check(
    `/confirm's Referrer-Policy sends no path (got ${policy ?? 'none'})`,
    policy === 'strict-origin' || policy === 'origin'
  );
});

// --- Which list a signup joins ---------------------------------------------
//
// Two lists since 2026-10-11 (lib/email/lists.ts): the weekly story, and the
// Tan Dash app waitlist, promised one email if an app ships and nothing else.
// The list follows from the token's authenticated source, so the mapping is
// the contract, along with what each list's consent email says: a waitlist
// signup confirmed by an email offering the weekly story would be consent to
// the wrong thing, and a player put on the weekly list would get a broadcast
// they never asked for.

const LIST_NAMES = Object.keys(EMAIL_LISTS) as EmailList[];
const WAITLIST_SOURCE = 'play-app-waitlist';

check(
  'every signup source maps to a declared list',
  EMAIL_SIGNUP_SOURCES.every(source => LIST_NAMES.includes(emailListForSource(source)))
);
check(
  `${WAITLIST_SOURCE} joins the app waitlist`,
  emailListForSource(WAITLIST_SOURCE) === 'play-app-waitlist'
);
// Retired sources included: a link minted under one confirms onto the list
// its copy promised, and none of them promised the waitlist.
for (const source of EMAIL_SIGNUP_SOURCES.filter(source => source !== WAITLIST_SOURCE)) {
  check(`${source} joins the weekly story list`, emailListForSource(source) === 'weekly-stories');
}
check(
  'the lists read distinct segment variables',
  new Set(LIST_NAMES.map(list => EMAIL_LISTS[list].segmentEnv)).size === LIST_NAMES.length
);
// Read by name in the confirm route's top-level guard, the live probe and the
// broadcast scripts, so a rename here would split the weekly list in two.
check(
  'the weekly list is still RESEND_WEEKLY_STORIES_SEGMENT_ID',
  EMAIL_LISTS['weekly-stories'].segmentEnv === 'RESEND_WEEKLY_STORIES_SEGMENT_ID'
);

for (const list of LIST_NAMES) {
  const name = EMAIL_LISTS[list].segmentEnv;
  const saved = process.env[name];
  try {
    delete process.env[name];
    const unset = segmentIdForList(list);
    process.env[name] = '';
    const empty = segmentIdForList(list);
    process.env[name] = 'segment-under-test';
    const set = segmentIdForList(list);
    check(`${list}: no segment id when ${name} is unset`, unset === null);
    check(`${list}: no segment id when ${name} is empty`, empty === null);
    check(`${list}: the segment id is ${name}'s value when set`, set === 'segment-under-test');
  } finally {
    if (saved === undefined) delete process.env[name];
    else process.env[name] = saved;
  }
}

check(
  'the weekly confirmation email is the default, byte for byte',
  confirmationEmailSubject('weekly-stories') === confirmationEmailSubject() &&
    confirmationEmailText(confirmToken, 'weekly-stories') === confirmationEmailText(confirmToken) &&
    confirmationEmailHtml(confirmToken, 'weekly-stories') === confirmationEmailHtml(confirmToken)
);

{
  const token = mintConfirmToken({ email: EMAIL, source: WAITLIST_SOURCE }, SECRET);
  const url = confirmUrl(token);
  const subject = confirmationEmailSubject('play-app-waitlist');
  const text = confirmationEmailText(token, 'play-app-waitlist');
  const html = confirmationEmailHtml(token, 'play-app-waitlist');
  const textLinks = text.match(/https?:\/\/\S+/g) ?? [];
  // The words are checked with the link cut out: a random sealed token can
  // spell "quiz" by chance, and that would be a flaky failure, not a finding.
  const words = [subject, text, html].map(part => part.split(url).join('')).join('\n');

  check(
    'the waitlist confirmation email is its own, not the weekly one',
    subject !== confirmationEmailSubject() && text !== confirmationEmailText(token)
  );
  check(
    'every link in the waitlist confirmation email is the bare confirm link',
    hrefsIn(html).length > 0 &&
      hrefsIn(html).every(link => link === url) &&
      textLinks.length > 0 &&
      textLinks.every(link => link === url)
  );
  check(
    'the waitlist confirmation email carries no campaign tag, no unsubscribe link and no image',
    !words.includes('utm_') && !/unsubscribe/i.test(words) && !/<img/i.test(html)
  );
  check(
    'the waitlist confirmation email keeps the 48h line in both parts',
    text.includes('The link works for 48 hours.') && html.includes('The link works for 48 hours.')
  );
  check(
    'the waitlist confirmation email states its whole promise: one email, nothing else',
    [subject, text, html].every(part => part.includes('one email')) &&
      text.includes('nothing else') &&
      html.includes('nothing else')
  );
  for (const word of ['weekly', 'story', 'stories', 'Travels', 'quiz']) {
    check(
      `the waitlist confirmation email never mentions "${word}"`,
      !words.toLowerCase().includes(word.toLowerCase())
    );
  }
}

// --- Report ---------------------------------------------------------------

confirmReferrerChecked.then(report, (error: unknown) => {
  failures.push(`next.config.js headers() could not be read: ${String(error)}`);
  report();
});

function report() {
  const total = passed + failures.length;

  if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length}/${total} checks failed:\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error('');
    process.exit(1);
  }

  console.log(`
Consent model verified against ${EMAIL_SIGNUP_SOURCES.length} signup source(s).
  · a contact is creatable only from a valid, unexpired, authenticated token
  · both tokens are sealed: no decoding of a token or of the link carrying it
    yields the address (the same reader does find it in a legacy JWT), a
    changed, cut, extended or re-prefixed token is refused, every token is
    URL-safe as minted, and two mints of one payload share nothing
  · forged, wrong-secret, malformed, unencrypted and alg:none tokens are all
    refused, in the sealed and the legacy JWT format alike
  · an expired token keeps a trustworthy source but is never treated as consent
  · a source outside EMAIL_SIGNUP_SOURCES cannot reach an email we send
  · only ${WAITLIST_SOURCE} joins the app waitlist and every other source
    (retired ones included) the weekly list, each list with its own segment
    variable; the waitlist's consent email promises one email, links only to
    the confirm link, carries no tag, unsubscribe link or image, and never
    offers the weekly story, while the weekly one is unchanged
  · a malformed episode claim is dropped rather than refusing a real consent
  · an unsubscribe token is a separate, non-expiring token that cannot be
    replayed as a confirm token, and vice versa, sealed or legacy
  · links already in inboxes keep working: a legacy confirm JWT for its 48h,
    a legacy unsubscribe JWT forever
  · the published postal address is never a PO Box, and both the broadcast and
    the welcome card carry it, with an unsubscribe link, in HTML and plain text
  · the episode email's content links carry exact UTM tags, identical for every
    recipient; the unsubscribe link, the Resend placeholder, mailto: links,
    images and the confirmation email never carry one
  · /confirm drops the token from the address bar, and only the token, before
    DataFast's script can read it, and sends its Referer without the path

PASS — ${passed}/${total} checks passed
`);

  if (!configuredAddress) {
    console.log(
      'NOTE — config.business.postalAddress is not set, so `pnpm stories:create-broadcast` will refuse to\n' +
        'run and the welcome card goes out without a postal address. See docs/runbooks/newsletter.md.\n'
    );
  }

  // ISO dates compare correctly as strings.
  if (new Date().toISOString().slice(0, 10) >= LEGACY_CONFIRM_JWT_REMOVABLE_FROM) {
    console.log(
      `NOTE — it is ${LEGACY_CONFIRM_JWT_REMOVABLE_FROM} or later (UTC), so the legacy confirm-JWT fallback in\n` +
        'lib/email/subscribe-token.ts (verifyLegacyConfirmJwt) can now be deleted, as long as the sealed format\n' +
        'reached production at least 48h before; check the deploy date first. That file\'s header lists what goes\n' +
        'with it, including the legacy-confirm checks here. The unsubscribe JWT fallback stays forever.\n'
    );
  }
}
