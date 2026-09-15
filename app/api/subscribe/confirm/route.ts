import { NextRequest, NextResponse } from 'next/server';
import { getTokenSecret, verifyConfirmToken } from '@/lib/email/subscribe-token';
import { mintUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { episodeBySlug, episodesNewestFirst } from '@/lib/stories';
import { quizEmailHtml, quizEmailSubject, quizEmailText } from '@/lib/email/quiz-email';
import { sendEmail } from '@/lib/resend';
import { SITE_URL } from '@/lib/seo/site';
import config from '@/config';

export const runtime = 'nodejs';

const RESEND_API = 'https://api.resend.com';
const NEWSLETTER_SEGMENT_ID = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID;

/**
 * POST /api/subscribe/confirm
 *
 * Step two: the only place a contact is ever created.
 *
 * ---------------------------------------------------------------------------
 * Why POST, reached from a page with a button
 * ---------------------------------------------------------------------------
 *
 * The obvious design is a bare `GET /confirm?token=…` straight from the email.
 * It is also auto-confirmable: Outlook Safe Links, Gmail and corporate mail
 * gateways fetch URLs they find in email, and a scanner fetching a GET link is
 * indistinguishable from a human clicking it. That turns "confirmed by
 * construction" into "confirmed, modulo prefetchers" — a caveat we would then
 * have to write into the privacy policy, because the contact record IS the
 * consent record and there is no other.
 *
 * So the email links to `/confirm`, which renders one button that POSTs here.
 * Scanners do not POST. Costs one page and no storage.
 *
 * ---------------------------------------------------------------------------
 * Why plain fetch and not the SDK, and why there is no audience id
 * ---------------------------------------------------------------------------
 *
 * `resend` is a caret range (^4.8.0), so an install can move it underneath us.
 * The block that used to live here — verified against the installed 4.8.0
 * types on 2026-08-24 — asserted contacts were audience-scoped with no custom
 * properties and no segments. That was accurate for the installed SDK's types
 * but not for the API: Resend migrated contacts to a global model (re-verified
 * against the live API docs on 2026-09-14):
 *
 *   - `POST /contacts` takes no `audience_id` — contacts are global, in 0..n
 *     segments;
 *   - `properties`, `segments` and `topics` now exist on a contact;
 *   - Audiences were renamed Segments.
 *
 * `RESEND_AUDIENCE_ID` and `lib/email/audience.ts` are gone as of this change.
 * There is exactly one list; `source` still lives in DataFast
 * (`trackEmailSignup(source)` at capture time), not on the contact — see the
 * reopened M7 in `docs/prd/story-delivery-resend.md` before adding it there.
 *
 * The wire format is snake_case even though the SDK's options are camelCase.
 * Re-verify against the live docs before changing anything here — Resend's
 * migration guide and changelog do not document how long the legacy
 * `/audiences/{id}/contacts` path keeps working, which is exactly why this
 * moved to the endpoint documented as current rather than staying on it.
 */
export async function POST(request: NextRequest) {
  const secret = getTokenSecret();

  if (!process.env.RESEND_API_KEY || !secret || !NEWSLETTER_SEGMENT_ID) {
    console.error(
      '[api/subscribe/confirm] Not configured (RESEND_API_KEY / EMAIL_TOKEN_SECRET / RESEND_WEEKLY_STORIES_SEGMENT_ID missing)'
    );
    return NextResponse.json({ error: 'Subscriptions are not configured.' }, { status: 503 });
  }

  let token = '';
  try {
    // The confirm page posts a plain HTML form, so this works with JavaScript
    // disabled — which some mail clients' in-app browsers effectively are.
    const form = await request.formData();
    const value = form.get('token');
    token = typeof value === 'string' ? value : '';
  } catch {
    token = '';
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
  }

  const result = verifyConfirmToken(token, secret);

  // Deliberately no detail in the response. A forged or tampered token learns
  // nothing about why it failed.
  if (result.status === 'invalid') {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }

  if (result.status === 'expired') {
    // The signature was still verified, so `source` is trustworthy and the
    // re-subscribe form stays attributed to the surface it came from.
    return NextResponse.redirect(
      new URL(`/subscribed?state=expired&source=${encodeURIComponent(result.payload.source)}`, request.url),
      // 303: after a POST the browser must follow with a GET.
      { status: 303 }
    );
  }

  const res = await fetch(`${RESEND_API}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      email: result.payload.email,
    }),
  });

  // A replayed token inside the 48h window must not overwrite an existing
  // contact's unsubscribe state. We deliberately do not store used-token state.
  if (!res.ok) {
    const detail = await res.text();
    console.error('[api/subscribe/confirm] Resend contact create failed:', res.status, detail);
    return NextResponse.json({ error: 'Failed to confirm subscription.' }, { status: 502 });
  }

  const segmentRes = await fetch(
    `${RESEND_API}/contacts/${encodeURIComponent(result.payload.email)}/segments/${encodeURIComponent(NEWSLETTER_SEGMENT_ID)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
  );
  if (!segmentRes.ok) {
    const detail = await segmentRes.text();
    console.error('[api/subscribe/confirm] Resend segment add failed:', segmentRes.status, detail);
    return NextResponse.json({ error: 'Failed to confirm subscription.' }, { status: 502 });
  }

  // The welcome email: the story, quiz and answers for the episode they signed
  // up from.
  //
  // AFTER contact creation and deliberately non-fatal. The consent record is the
  // contact, and it now exists; failing the confirmation because a welcome email
  // bounced would tell someone who just consented that it did not work, and a
  // retry would be a no-op create followed by the same failure. So this logs and
  // the redirect happens either way.
  //
  // `episode` is absent for the hub and every non-story surface, and can also be
  // a slug retired since the token was minted. Both fall back to the latest
  // episode rather than sending nothing: `/stories` promises a quiz card too,
  // the newest episode is the honest answer to "which one".
  const episode =
    (result.payload.episode ? episodeBySlug(result.payload.episode) : undefined) ??
    episodesNewestFirst()[0];

  if (episode) {
    // Signed, long-lived, and specific to this address — not the confirm
    // token. This is the ONLY email in the flow that carries it: the
    // confirmation email is transactional and pre-consent (the recipient
    // isn't a contact yet), and must never grow an unsubscribe link or a
    // `topic_id` for the same reason — either would let something suppress
    // the one send that establishes consent in the first place.
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(
      mintUnsubscribeToken(result.payload.email, secret)
    )}`;

    try {
      await sendEmail({
        to: result.payload.email,
        subject: quizEmailSubject(episode),
        text: quizEmailText(episode, unsubscribeUrl),
        html: quizEmailHtml(episode, unsubscribeUrl),
        idempotencyKey: `story-welcome/${result.payload.email}/${episode.slug}`,
        // Same reasoning as the consent email: a learner replying with a
        // question about a quiz answer is the single most valuable signal this
        // list produces, and it has to reach a person.
        replyTo: config.resend.supportEmail,
        // Interim unsubscribe mechanism ahead of Resend Topics — see
        // app/api/unsubscribe/route.ts. `List-Unsubscribe-Post` is what makes
        // Gmail/Yahoo/Outlook show a one-click "Unsubscribe" button (RFC 8058)
        // instead of just a mailto link.
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
    } catch (error) {
      console.error('[api/subscribe/confirm] Quiz email failed after subscribing:', error);
    }
  }

  return NextResponse.redirect(new URL('/subscribed', request.url), { status: 303 });
}
