/**
 * Is the signup path actually alive in production?
 *
 * Run: pnpm check-subscribe-live [origin]
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * On 2026-09-16 the capture path was dead in production and nothing said so.
 * `RESEND_WEEKLY_STORIES_SEGMENT_ID` was never added to Vercel, so
 * `POST /api/subscribe` happily answered 200 and sent the consent email, and
 * then `POST /api/subscribe/confirm` answered 503 when the subscriber pressed
 * the button. Three episodes shipped against a list nobody could join.
 *
 * Every existing guard missed it, and each for a good reason:
 * `pnpm validate:subscribe` proves the token model is correct, which it was;
 * the build proves the code compiles, which it did; a deploy proves the code
 * shipped, which it had. None of them can see a missing environment variable
 * in a project they do not hold credentials for. The only thing that could
 * have caught it is asking the running site.
 *
 * ---------------------------------------------------------------------------
 * Why the confirm endpoint, and why an empty token
 * ---------------------------------------------------------------------------
 *
 * `app/api/subscribe/confirm/route.ts` checks its configuration BEFORE it
 * parses the token, so a request carrying no token separates "misconfigured"
 * from "configured" without creating a contact, sending an email, or needing a
 * secret:
 *
 *   400 "Missing token."                  -> configured. The guard passed.
 *   503 "Subscriptions are not configured." -> one of the three env vars is missing.
 *
 * That makes this the cheapest possible probe, and it covers more than it
 * looks: confirm requires RESEND_API_KEY, EMAIL_TOKEN_SECRET *and*
 * RESEND_WEEKLY_STORIES_SEGMENT_ID, and `/api/subscribe` requires the first
 * two. So a passing confirm probe means the whole capture path's configuration
 * is present.
 *
 * It deliberately does NOT probe `/api/subscribe` itself. That endpoint checks
 * its config only after the email and source are validated, so the only way to
 * reach the check is to submit a real address — which sends a real consent
 * email. A scheduled job must not do that to anyone, including us.
 *
 * What this cannot tell you: whether the Resend key is valid, whether the
 * segment id points at a real segment, or whether mail is being delivered.
 * Those need the end-to-end subscribe in docs/runbooks/newsletter.md, which is
 * a human act. This is a configuration alarm, not a delivery monitor.
 */
const DEFAULT_ORIGIN = 'https://www.michikanji.com';

const CONFIGURED = 400;
const MISCONFIGURED = 503;

async function main(): Promise<void> {
  const origin = (process.argv[2] ?? DEFAULT_ORIGIN).replace(/\/$/, '');
  const url = `${origin}/api/subscribe/confirm`;

  // An empty `token` field, as a form post: the route reads formData, and the
  // confirm page posts a plain HTML form. Matching that shape means we are
  // exercising the real path rather than a JSON branch no browser takes.
  const body = new URLSearchParams({ token: '' });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    // Never follow a redirect here. A 303 to /subscribed would mean the probe
    // somehow confirmed something, which is a failure worth seeing as itself.
    redirect: 'manual',
  });

  const detail = (await response.text()).slice(0, 300);

  if (response.status === CONFIGURED) {
    console.log(`PASS — ${url} is configured (400, token guard reached).`);
    console.log('Subscribers can complete the double opt-in.');
    console.log('Not proven: key validity, segment existence, or deliverability.');
    return;
  }

  if (response.status === MISCONFIGURED) {
    console.error(`FAIL — ${url} answered 503: the signup path is dead.`);
    console.error('');
    console.error('A subscriber receives the consent email, presses the button, and hits');
    console.error('an error. No contact is created, so the list cannot grow.');
    console.error('');
    console.error('One of these is missing from the production environment:');
    console.error('  RESEND_API_KEY, EMAIL_TOKEN_SECRET, RESEND_WEEKLY_STORIES_SEGMENT_ID');
    console.error('');
    console.error('Fix and verification: docs/runbooks/newsletter.md');
    console.error(`Response: ${detail}`);
    process.exit(1);
  }

  console.error(`FAIL — ${url} answered an unexpected ${response.status}.`);
  console.error('Expected 400 (configured) or 503 (misconfigured).');
  console.error(`Response: ${detail}`);
  process.exit(1);
}

main().catch(error => {
  // A network fault is not a configuration verdict, and must not be reported as
  // one. Exit non-zero so the alarm still fires, but say which it was.
  console.error('FAIL — the probe could not reach the site.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
