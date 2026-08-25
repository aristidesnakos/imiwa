import { NextRequest, NextResponse } from 'next/server';
import {
  createContact,
  isAlreadySubscribed,
  setContactSource,
} from '@/lib/email/audience';
import { getTokenSecret, verifyConfirmToken } from '@/lib/email/subscribe-token';

export const runtime = 'nodejs';

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
 * The Resend calls live in `lib/email/audience.ts`, which also explains why
 * they are raw fetch rather than the SDK, and why there is no audience id in
 * them any more.
 */
export async function POST(request: NextRequest) {
  const secret = getTokenSecret();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !secret) {
    console.error(
      '[api/subscribe/confirm] Not configured (RESEND_API_KEY / EMAIL_TOKEN_SECRET missing)'
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

  const { email, source } = result.payload;

  // Creation is idempotent from our side: a replayed token inside the 48h
  // window re-adds an address that is already there, which Resend treats as a
  // no-op. That is the accepted trade for not storing a used-token list.
  const created = await createContact(email, apiKey);

  if (!created.ok && !isAlreadySubscribed(created.status, created.detail)) {
    console.error(
      '[api/subscribe/confirm] Resend contact create failed:',
      created.status,
      created.detail
    );
    return NextResponse.json({ error: 'Failed to confirm subscription.' }, { status: 502 });
  }

  // Enrichment, not consent. This runs AFTER the contact exists and its failure
  // is logged rather than surfaced: the property has to be declared in the
  // Resend dashboard to be settable, and a dashboard edit by someone else must
  // never be able to turn a valid confirmation into "Failed to confirm".
  const tagged = await setContactSource(email, source, apiKey);
  if (!tagged.ok) {
    console.warn(
      '[api/subscribe/confirm] Contact created but source property not set:',
      tagged.status,
      tagged.detail
    );
  }

  return NextResponse.redirect(new URL('/subscribed', request.url), { status: 303 });
}
