/**
 * Walk the whole signup path against production, with a real address, and clean
 * up after itself.
 *
 * Run: pnpm check-subscribe-e2e [origin]
 *
 * ---------------------------------------------------------------------------
 * What this is for
 * ---------------------------------------------------------------------------
 *
 * `pnpm check-subscribe-live` asks one endpoint whether it is configured. That
 * catches the failure that actually happened (a missing env var) and needs no
 * secrets, which is why it can run unattended every Friday. It cannot tell you
 * that a contact is really created, that the segment add really works, or that
 * Resend really accepts our mail — for that you have to do the thing.
 *
 * Doing the thing used to mean a person subscribing by hand and reading an
 * inbox: eight manual steps in docs/runbooks/newsletter.md, which is exactly
 * the kind of check that gets skipped in the week it would have mattered. This
 * script is that walk, automated.
 *
 * ---------------------------------------------------------------------------
 * Why `delivered@resend.dev`
 * ---------------------------------------------------------------------------
 *
 * A real end-to-end test has to send real mail somewhere, and the obvious
 * choices are both bad: a made-up address at our own domain hard-bounces, and
 * bounces are the fastest way to wreck a young sending reputation; a personal
 * inbox cannot be asserted on from CI.
 *
 * Resend reserves `delivered@resend.dev` as a sink that simulates successful
 * delivery without touching domain reputation, and it supports `+` labelling.
 * So each run uses a unique `delivered+mk-e2e-<stamp>@resend.dev`, which makes
 * the contact create unambiguous and leaves nothing shared between runs. Note
 * these sends do count against the account's monthly quota — two emails a run,
 * which against 50k/month is noise.
 *
 * ---------------------------------------------------------------------------
 * Why the token is minted rather than read out of the email
 * ---------------------------------------------------------------------------
 *
 * The sink cannot be read back, so this mints the confirm token locally with
 * the same `EMAIL_TOKEN_SECRET` the server signs with — byte-for-byte what
 * `POST /api/subscribe` just put in the email it sent.
 *
 * Be honest about what that does and does not prove. It DOES prove the confirm
 * route accepts a genuine token, creates the contact, adds it to the segment
 * and redirects. It does NOT prove the link inside the email body is
 * well-formed — `pnpm validate:subscribe` covers the mint/verify contract, and
 * the email's rendering is a human judgement (episode-spec.md §A7 items 4–9).
 *
 * ---------------------------------------------------------------------------
 * Why there is no separate segment-membership assertion
 * ---------------------------------------------------------------------------
 *
 * `GET /contacts/{email}` does not report segment membership. It does not need
 * to: `app/api/subscribe/confirm/route.ts` answers 502 if the segment add
 * fails, so a 303 redirect is itself proof that both the contact create and the
 * segment add succeeded. Asserting the redirect is the stronger check.
 */
import { config as loadEnv } from 'dotenv';

import { mintConfirmToken } from '../lib/email/subscribe-token';
import type { EmailSignupSource } from '../lib/analytics/email-signup-sources';

// The application loads .env.local through Next. This standalone operator
// command runs under tsx, so load it explicitly without ever printing values.
loadEnv({ path: '.env.local' });
loadEnv();

const DEFAULT_ORIGIN = 'https://www.michikanji.com';
const RESEND_API = 'https://api.resend.com';

// `story-hub` deliberately, not `story-episode-quiz`: the hub source carries no
// episode, so the welcome card falls back to the latest episode and the test
// exercises the same path every week regardless of what has been published.
const TEST_SOURCE: EmailSignupSource = 'story-hub';

function testAddress(): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  return `delivered+mk-e2e-${stamp}@resend.dev`;
}

const steps: string[] = [];
function pass(message: string): void {
  steps.push(`  ok   ${message}`);
  console.log(`  ok   ${message}`);
}
function fail(message: string): never {
  console.error(`  FAIL ${message}`);
  throw new Error(message);
}

async function deleteContact(email: string, apiKey: string): Promise<void> {
  const res = await fetch(`${RESEND_API}/contacts/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    // Deliberately a warning, not a failure. A leaked test contact in a sink
    // domain is untidy; reporting a green path as red because the tidy-up
    // failed would be worse, and the address is unique per run so nothing
    // collides next week.
    console.warn(`  warn cleanup: could not delete ${email} (${res.status}). Remove it by hand.`);
    return;
  }
  pass(`cleaned up the test contact`);
}

async function main(): Promise<void> {
  const origin = (process.argv[2] ?? DEFAULT_ORIGIN).replace(/\/$/, '');

  const apiKey = process.env.RESEND_API_KEY;
  const secret = process.env.EMAIL_TOKEN_SECRET;
  if (!apiKey || !secret) {
    throw new Error(
      'RESEND_API_KEY and EMAIL_TOKEN_SECRET must be set. EMAIL_TOKEN_SECRET must be the SAME\n' +
        'value the target deployment signs with — the token is signed here and verified there —\n' +
        'and RESEND_API_KEY a Full access key, because this reads the contact back and deletes it.\n' +
        'Locally: put both in .env.local by hand; `vercel env pull` reads the key back empty.\n' +
        'In CI: repository secrets.'
    );
  }

  const email = testAddress();
  console.log(`Walking the signup path on ${origin}`);
  console.log(`Test address: ${email}\n`);

  let contactCreated = false;
  try {
    // ── 1. Capture ────────────────────────────────────────────────────────
    // Really sends a confirmation email. 200 here means Resend accepted it:
    // sendEmail throws on a Resend error and the route turns that into a 500.
    const subscribeRes = await fetch(`${origin}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: TEST_SOURCE }),
    });
    if (subscribeRes.status === 503) {
      fail('POST /api/subscribe -> 503. RESEND_API_KEY or EMAIL_TOKEN_SECRET is missing on the server.');
    }
    if (subscribeRes.status === 429) {
      fail('POST /api/subscribe -> 429. Rate limited (2 per 10 min per IP) — wait and re-run.');
    }
    if (!subscribeRes.ok) {
      fail(`POST /api/subscribe -> ${subscribeRes.status}: ${(await subscribeRes.text()).slice(0, 200)}`);
    }
    pass('POST /api/subscribe accepted the address and Resend accepted the consent email');

    // ── 2. Confirm ────────────────────────────────────────────────────────
    const token = mintConfirmToken({ email, source: TEST_SOURCE }, secret);
    const confirmRes = await fetch(`${origin}/api/subscribe/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      redirect: 'manual',
    });

    if (confirmRes.status === 503) {
      fail('POST /api/subscribe/confirm -> 503. RESEND_WEEKLY_STORIES_SEGMENT_ID is missing on the server.');
    }
    if (confirmRes.status === 400) {
      fail(
        'POST /api/subscribe/confirm -> 400. The token was rejected, which means the local\n' +
          '       EMAIL_TOKEN_SECRET does not match the deployment\'s. Pull the right env.'
      );
    }
    if (confirmRes.status === 502) {
      fail(`POST /api/subscribe/confirm -> 502. Resend refused the contact create or the segment add: ${(await confirmRes.text()).slice(0, 200)}`);
    }
    if (confirmRes.status !== 303) {
      fail(`POST /api/subscribe/confirm -> ${confirmRes.status}, expected 303.`);
    }

    const location = confirmRes.headers.get('location') ?? '';
    if (!location.includes('/subscribed') || location.includes('state=expired')) {
      fail(`Confirm redirected to "${location}", expected /subscribed without an error state.`);
    }
    contactCreated = true;
    // A 303 is only reachable past the contact create AND the segment add —
    // both answer 502 on failure. So this one assertion covers all three.
    pass('POST /api/subscribe/confirm created the contact, added it to the segment, and redirected');

    // ── 3. The contact really exists ──────────────────────────────────────
    const contactRes = await fetch(`${RESEND_API}/contacts/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!contactRes.ok) {
      fail(`GET /contacts -> ${contactRes.status}. The redirect said the contact was created, but Resend does not have it.`);
    }
    const contact = (await contactRes.json()) as { unsubscribed?: boolean };
    if (contact.unsubscribed) {
      fail('The contact exists but is already marked unsubscribed.');
    }
    pass('Resend holds the contact, subscribed');

    console.log('\nPASS — a real address can complete the double opt-in end to end.');
    console.log('Not proven: inbox placement, rendering, or the link inside the email body.');
    console.log('Those stay human — docs/prd/episode-spec.md §A7 items 4–9.');
  } finally {
    // Always, including on failure: a half-finished run must not leave a
    // contact sitting in the real segment, where the next broadcast would
    // cheerfully mail it.
    if (contactCreated) await deleteContact(email, apiKey);
  }
}

main().catch(error => {
  console.error('\nFAIL — the signup path did not complete.');
  console.error(error instanceof Error ? error.message : error);
  console.error('\nRunbook: docs/runbooks/newsletter.md');
  process.exit(1);
});
