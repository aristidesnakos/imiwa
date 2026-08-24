import { NextRequest, NextResponse } from 'next/server';
import { getAudienceId } from '@/lib/email/audience';
import { getTokenSecret, verifyConfirmToken } from '@/lib/email/subscribe-token';

export const runtime = 'nodejs';

const RESEND_API = 'https://api.resend.com';

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
 * Why plain fetch and not the SDK
 * ---------------------------------------------------------------------------
 *
 * `resend` is a caret range (^4.8.0), so an install can move it underneath us,
 * and its contacts surface has been moving. Verified against the INSTALLED
 * types in node_modules/resend/dist/index.d.ts on 2026-08-24:
 *
 *   - a contact is exactly {created_at, id, email, first_name?, last_name?,
 *     unsubscribed} and is audience-scoped (`:507`, `:516`);
 *   - there is NO custom-property field, so `source` cannot be stored here —
 *     DataFast already has it from capture time;
 *   - the string "segment" appears ZERO times in the whole type surface;
 *   - a broadcast targets exactly one `audience_id` (`:397`).
 *
 * The wire format is snake_case even though the SDK's options are camelCase.
 * Re-verify both against the live docs and the installed .d.ts before changing
 * anything here.
 */
export async function POST(request: NextRequest) {
  const secret = getTokenSecret();
  const audienceId = getAudienceId();

  if (!process.env.RESEND_API_KEY || !secret || !audienceId) {
    console.error(
      '[api/subscribe/confirm] Not configured (RESEND_API_KEY / EMAIL_TOKEN_SECRET / RESEND_AUDIENCE_ID missing)'
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

  const res = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      email: result.payload.email,
      unsubscribed: false,
    }),
  });

  // Creation is idempotent from our side: a replayed token inside the 48h
  // window re-adds an address that is already there, which Resend treats as a
  // no-op. That is the accepted trade for not storing a used-token list.
  if (!res.ok) {
    const detail = await res.text();

    // ...but "treats as a no-op" is their behaviour, not our contract, and the
    // failure mode if it changes is nasty: someone who IS subscribed clicks a
    // link twice and is told "Failed to confirm", so they submit the form again
    // and get another confirmation email. Absorb exactly that case.
    if (isAlreadySubscribed(res.status, detail)) {
      console.info('[api/subscribe/confirm] Contact already on the list; treating replay as confirmed.');
      return NextResponse.redirect(new URL('/subscribed', request.url), { status: 303 });
    }

    console.error('[api/subscribe/confirm] Resend contact create failed:', res.status, detail);
    return NextResponse.json({ error: 'Failed to confirm subscription.' }, { status: 502 });
  }

  return NextResponse.redirect(new URL('/subscribed', request.url), { status: 303 });
}

/**
 * Is this non-2xx actually "the address is already on the list"?
 *
 * Deliberately narrow. A false positive here is worse than the bug it guards
 * against: it would redirect someone to /subscribed without a contact having
 * been created, and the contact record is the ONLY consent artefact this design
 * keeps (see docs/prd/story-delivery-resend.md §9.5). So this matches a plain
 * conflict, or an unprocessable-entity whose body says so in words, and lets
 * everything else fail loudly.
 */
function isAlreadySubscribed(status: number, detail: string): boolean {
  if (status === 409) return true;
  if (status !== 422) return false;
  return /already\s+(exists|registered|subscribed|in)/i.test(detail);
}
