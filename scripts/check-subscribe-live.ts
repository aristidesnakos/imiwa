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
 * two and the segment of the list it is signing someone up for. So a passing
 * confirm probe means the weekly list's configuration is present.
 *
 * ---------------------------------------------------------------------------
 * The second probe: the app waitlist, through `/api/subscribe` with no address
 * ---------------------------------------------------------------------------
 *
 * The Tan Dash app waitlist is a second list with its own segment,
 * RESEND_PLAY_WAITLIST_SEGMENT_ID (lib/email/lists.ts). The confirm route
 * checks that one only after a valid token, which a credential-free probe
 * cannot produce, so the probe above cannot see it.
 *
 * Until 2026-10-11 `/api/subscribe` was deliberately not probed: it checked
 * its config only after the address, so the only way to reach the check was
 * to submit a real address, which sends a real consent email. A scheduled job
 * must not do that to anyone, including us. It now checks the source, then
 * its config including that list's segment, and only then the address. A
 * POST with the waitlist source and no address therefore stops before the
 * send, whatever the answer:
 *
 *   400 "Missing email address."           -> configured. The guard passed.
 *   503 "Subscriptions are not configured." -> the waitlist segment id (or, if
 *                                             the confirm probe failed too,
 *                                             the key or secret) is missing.
 *   400 "Missing source."                  -> the deployment does not accept
 *                                             the waitlist source. A NOTE,
 *                                             not a failure.
 *   400 "Invalid email address."           -> a deployment from before
 *                                             2026-10-11, which checked the
 *                                             address first and so never
 *                                             reached any config. A NOTE: it
 *                                             has no waitlist form to break.
 *
 * One request, never more: the route allows 2 per 10 minutes per IP, and the
 * end-to-end job after this one posts there once too.
 *
 * The run triggered by the push that ships the waitlist usually reaches the
 * old deployment, because Vercel is still building, and gets that last NOTE.
 * The route answers an absent address "Missing email address." for exactly
 * this reason: so the two cannot be mistaken for each other.
 *
 * What neither probe can tell you: whether the Resend key is valid, whether a
 * segment id points at a real segment, or whether mail is being delivered.
 * Those need the end-to-end subscribe in docs/runbooks/newsletter.md, which is
 * a human act. This is a configuration alarm, not a delivery monitor.
 */
import { EMAIL_LISTS, emailListForSource } from '../lib/email/lists';

const DEFAULT_ORIGIN = 'https://www.michikanji.com';

const CONFIGURED = 400;
const MISCONFIGURED = 503;

const WAITLIST_SOURCE = 'play-app-waitlist';
const WAITLIST_SEGMENT_ENV = EMAIL_LISTS[emailListForSource(WAITLIST_SOURCE)].segmentEnv;

/** Probe the confirm route's guard. True when it passed. */
async function probeConfirm(origin: string): Promise<boolean> {
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
    return true;
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
    return false;
  }

  console.error(`FAIL — ${url} answered an unexpected ${response.status}.`);
  console.error('Expected 400 (configured) or 503 (misconfigured).');
  console.error(`Response: ${detail}`);
  return false;
}

/** Probe `/api/subscribe`'s guard for the app waitlist. True unless it failed. */
async function probeWaitlist(origin: string, confirmPassed: boolean): Promise<boolean> {
  const url = `${origin}/api/subscribe`;

  // JSON, as the form posts it, with a source and no `email`: the route answers
  // from its config guard or its address check, and both come before the send.
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: WAITLIST_SOURCE }),
    redirect: 'manual',
  });

  const detail = (await response.text()).slice(0, 300);
  let error: unknown;
  try {
    error = (JSON.parse(detail) as { error?: unknown }).error;
  } catch {
    error = undefined;
  }

  if (response.status === CONFIGURED && error === 'Missing email address.') {
    console.log(`PASS — ${url} is configured for the app waitlist (400, address check reached).`);
    console.log('Not proven: key validity, segment existence, or deliverability.');
    return true;
  }

  // A deployment from before 2026-10-11 checked the address before any config,
  // so this answer says nothing about configuration. It also has no waitlist
  // form to break, so it is a NOTE. Once that deployment is gone, this branch
  // only fires if someone moves the address check back above the guard.
  if (response.status === CONFIGURED && error === 'Invalid email address.') {
    console.log(`NOTE — ${url} checked the address before its config, so nothing was checked.`);
    console.log('This is a deployment from before the app waitlist (or the route\'s check order moved).');
    return true;
  }

  // Not a failure: a deployment that does not know the source has no waitlist
  // form to break. If the source was retired on purpose, retire this probe too.
  if (response.status === CONFIGURED && error === 'Missing source.') {
    console.log(`NOTE — ${url} does not accept the "${WAITLIST_SOURCE}" source.`);
    console.log('This deployment has no app waitlist, so there is no waitlist configuration to check.');
    return true;
  }

  if (response.status === MISCONFIGURED) {
    console.error(`FAIL — ${url} answered 503 for the app waitlist.`);
    console.error('');
    console.error('A player who asks for the Tan Dash app gets an error, and no consent email');
    console.error('is sent.');
    console.error('');
    console.error(
      confirmPassed
        ? `Missing from the production environment: ${WAITLIST_SEGMENT_ENV}`
        : `Missing from the production environment: ${WAITLIST_SEGMENT_ENV}, or RESEND_API_KEY /\n` +
            '  EMAIL_TOKEN_SECRET (the confirm probe above failed too).'
    );
    console.error('');
    console.error('Fix and verification: docs/runbooks/newsletter.md');
    console.error(`Response: ${detail}`);
    return false;
  }

  console.error(`FAIL — ${url} answered an unexpected ${response.status}.`);
  console.error('Expected 400 "Missing email address." (configured) or 503 (misconfigured).');
  if (response.status === 429) {
    console.error('429 is the rate limiter (2 per 10 minutes per IP), not a configuration verdict:');
    console.error('wait ten minutes and re-run.');
  }
  console.error(`Response: ${detail}`);
  return false;
}

async function main(): Promise<void> {
  const origin = (process.argv[2] ?? DEFAULT_ORIGIN).replace(/\/$/, '');

  // Both run whatever the first one says, so one red run names every missing
  // variable rather than the first.
  const confirmPassed = await probeConfirm(origin);
  console.log('');
  const waitlistPassed = await probeWaitlist(origin, confirmPassed);

  if (!confirmPassed || !waitlistPassed) process.exit(1);
}

main().catch(error => {
  // A network fault is not a configuration verdict, and must not be reported as
  // one. Exit non-zero so the alarm still fires, but say which it was.
  console.error('FAIL — the probe could not reach the site.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
