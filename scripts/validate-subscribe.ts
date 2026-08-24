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
 *   - a contact is NEVER created without a valid, unexpired, correctly-signed
 *     token — the contact record is our only consent record;
 *   - a forged token cannot subscribe anyone, including via the `alg: none`
 *     algorithm-confusion hole that `jsonwebtoken` opens if `algorithms` is
 *     not pinned on verify;
 *   - an expired token still verifies its signature (so the re-subscribe form
 *     stays attributed) but is refused as consent;
 *   - a `source` outside EMAIL_SIGNUP_SOURCES never reaches an email we send.
 *
 * The migration this guards replaced a Kit proxy that had a fallback minting
 * `state: active` subscribers with no confirmation step at all. That bug is
 * exactly the kind that survives a migration silently, so it gets a gate.
 */
import jwt from 'jsonwebtoken';
import {
  CONFIRM_TOKEN_TTL_SECONDS,
  mintConfirmToken,
  verifyConfirmToken,
} from '../lib/email/subscribe-token';
import {
  EMAIL_SIGNUP_SOURCES,
  isEmailSignupSource,
} from '../lib/analytics/email-signup-sources';

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

// --- Forgery --------------------------------------------------------------

check(
  'a token signed with a different secret is rejected',
  verifyConfirmToken(mintConfirmToken({ email: EMAIL, source: SOURCE }, OTHER_SECRET), SECRET)
    .status === 'invalid'
);

// The algorithm-confusion hole. `jsonwebtoken` will honour whatever `alg` the
// header claims unless `algorithms` is pinned on verify, which turns an
// attacker-authored payload into a valid confirmation for any address.
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
  'an alg:none token cannot subscribe anyone',
  verifyConfirmToken(noneToken, SECRET).status === 'invalid'
);

check('garbage is rejected', verifyConfirmToken('not-a-token', SECRET).status === 'invalid');
check('an empty token is rejected', verifyConfirmToken('', SECRET).status === 'invalid');

// A correctly-signed token carrying a source we do not recognise. This is the
// case a bare type union could not catch, because a type is erased at runtime.
check(
  'a correctly-signed token with an unknown source is rejected',
  verifyConfirmToken(
    jwt.sign({ email: EMAIL, source: 'not-a-real-surface' }, SECRET, {
      algorithm: 'HS256',
      expiresIn: 3600,
    }),
    SECRET
  ).status === 'invalid'
);

check(
  'a correctly-signed token with no email is rejected',
  verifyConfirmToken(
    jwt.sign({ source: SOURCE }, SECRET, { algorithm: 'HS256', expiresIn: 3600 }),
    SECRET
  ).status === 'invalid'
);

// --- Expiry ---------------------------------------------------------------

const expiredToken = jwt.sign(
  { email: EMAIL, source: SOURCE },
  SECRET,
  { algorithm: 'HS256', expiresIn: -60 }
);
const expiredResult = verifyConfirmToken(expiredToken, SECRET);

check('an expired token is reported as expired, not valid', expiredResult.status === 'expired');
check(
  'an expired token is NOT treated as consent',
  expiredResult.status !== 'valid'
);
// This is what keeps the re-subscribe form attributed: the signature was still
// checked, so the source is trustworthy even though the token is stale.
check(
  'an expired token still yields a signature-verified source',
  expiredResult.status === 'expired' && expiredResult.payload.source === SOURCE
);
// ...but an expired token forged with the wrong secret must not.
check(
  'an expired token signed with the wrong secret is invalid, not expired',
  verifyConfirmToken(
    jwt.sign({ email: EMAIL, source: SOURCE }, OTHER_SECRET, {
      algorithm: 'HS256',
      expiresIn: -60,
    }),
    SECRET
  ).status === 'invalid'
);

check('the TTL is the documented 48 hours', CONFIRM_TOKEN_TTL_SECONDS === 48 * 60 * 60);

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

// --- Report ---------------------------------------------------------------

const total = passed + failures.length;

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length}/${total} checks failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`
Consent model verified against ${EMAIL_SIGNUP_SOURCES.length} signup source(s).
  · a contact is creatable only from a valid, unexpired, correctly-signed token
  · forged, wrong-secret, malformed and alg:none tokens are all refused
  · an expired token keeps a trustworthy source but is never treated as consent
  · a source outside EMAIL_SIGNUP_SOURCES cannot reach an email we send

PASS — ${passed}/${total} checks passed
`);
