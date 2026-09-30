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
 *   - a `source` outside EMAIL_SIGNUP_SOURCES never reaches an email we send;
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
  mintConfirmToken,
  verifyConfirmToken,
} from '../lib/email/subscribe-token';
import { mintUnsubscribeToken, verifyUnsubscribeToken } from '../lib/email/unsubscribe-token';
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
  confirmationEmailText,
} from '../lib/email/confirmation-email';
import { EPISODES, episodesNewestFirst } from '../lib/stories';
import { panelRomaji } from '../lib/stories/romaji-lines';
import { SITE_URL } from '../lib/seo/site';

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

const withoutEpisode = verifyConfirmToken(
  mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET),
  SECRET
);
check(
  'a signup with no episode carries none, rather than an empty string',
  withoutEpisode.status === 'valid' && withoutEpisode.payload.episode === undefined
);

// A malformed episode must DROP the field, not refuse the token. The address
// and the source are both intact and signature-verified; refusing consent over
// a cosmetic claim would lose a real subscriber to a typo, and the fallback
// (send the latest episode) is already correct for every source that has none.
for (const bad of ['../../etc/passwd', 'Tan Climbs', 'ep 01', '', 'UPPER-CASE']) {
  const forged = verifyConfirmToken(
    jwt.sign({ email: EMAIL, source: SOURCE, episode: bad }, SECRET, {
      algorithm: 'HS256',
      expiresIn: 3600,
    }),
    SECRET
  );
  check(
    `a malformed episode (${JSON.stringify(bad)}) is dropped, and consent still stands`,
    forged.status === 'valid' && forged.payload.episode === undefined
  );
}

const nonString = verifyConfirmToken(
  jwt.sign({ email: EMAIL, source: SOURCE, episode: 42 }, SECRET, {
    algorithm: 'HS256',
    expiresIn: 3600,
  }),
  SECRET
);
check(
  'a non-string episode is dropped, and consent still stands',
  nonString.status === 'valid' && nonString.payload.episode === undefined
);

// --- The unsubscribe token --------------------------------------------------
//
// A separate token from the confirm one, signed with the same secret, so the
// `typ` claim is the only thing standing between "this link confirms a signup"
// and "this link removes someone from the list" — worth checking explicitly.

const unsubGood = mintUnsubscribeToken(EMAIL, SECRET);
const unsubResult = verifyUnsubscribeToken(unsubGood, SECRET);

check('a freshly minted unsubscribe token verifies', unsubResult.status === 'valid');
check(
  'the address survives the unsubscribe round trip',
  unsubResult.status === 'valid' && unsubResult.payload.email === EMAIL
);
check(
  'an unsubscribe token signed with a different secret is rejected',
  verifyUnsubscribeToken(mintUnsubscribeToken(EMAIL, OTHER_SECRET), SECRET).status === 'invalid'
);
check(
  'an unsubscribe token has no expiry claim',
  (jwt.decode(unsubGood) as Record<string, unknown> | null)?.exp === undefined
);

const unsubNoneToken =
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
  '.' +
  Buffer.from(JSON.stringify({ email: 'attacker@example.com', typ: 'unsub' })).toString(
    'base64url'
  ) +
  '.';
check(
  'an alg:none unsubscribe token cannot unsubscribe anyone',
  verifyUnsubscribeToken(unsubNoneToken, SECRET).status === 'invalid'
);

// A confirm token and an unsubscribe token both carry `email`. Without the
// `typ` claim being checked on both sides, a leaked confirm link could double
// as an unsubscribe link for the same address, or vice versa.
check(
  'a confirm token cannot be replayed as an unsubscribe token',
  verifyUnsubscribeToken(mintConfirmToken({ email: EMAIL, source: SOURCE }, SECRET), SECRET)
    .status === 'invalid'
);
check(
  'an unsubscribe token cannot be replayed as a confirm token',
  verifyConfirmToken(mintUnsubscribeToken(EMAIL, SECRET), SECRET).status === 'invalid'
);

check('garbage is rejected by the unsubscribe verifier', verifyUnsubscribeToken('not-a-token', SECRET).status === 'invalid');
check('an empty token is rejected by the unsubscribe verifier', verifyUnsubscribeToken('', SECRET).status === 'invalid');

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
    const contentLinks = [tagged(`/stories/${slug}`, slug, kind), tagged('/stories', slug, kind)];
    const links = hrefsIn(html);

    check(
      `the ${send} HTML tags both content links, the episode and every episode`,
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
  · a malformed episode claim is dropped rather than refusing a real consent
  · an unsubscribe token is a separate, non-expiring token that cannot be
    replayed as a confirm token, and vice versa
  · the published postal address is never a PO Box, and both the broadcast and
    the welcome card carry it, with an unsubscribe link, in HTML and plain text
  · the episode email's content links carry exact UTM tags, identical for every
    recipient; the unsubscribe link, the Resend placeholder, mailto: links,
    images and the confirmation email never carry one

PASS — ${passed}/${total} checks passed
`);

if (!configuredAddress) {
  console.log(
    'NOTE — config.business.postalAddress is not set, so `pnpm stories:create-broadcast` will refuse to\n' +
      'run and the welcome card goes out without a postal address. See docs/runbooks/newsletter.md.\n'
  );
}
