import { NextRequest, NextResponse } from 'next/server';
import rateLimit from '@/middlewares/rateLimiter';
import { isEmailSignupSource } from '@/lib/analytics/email-signup-sources';
import { getTokenSecret, mintConfirmToken } from '@/lib/email/subscribe-token';
import {
  confirmationEmailHtml,
  confirmationEmailSubject,
  confirmationEmailText,
} from '@/lib/email/confirmation-email';
import { sendEmail } from '@/lib/resend';
import config from '@/config';

export const runtime = 'nodejs';

// 2 submissions per 10 minutes per IP — the same shape as /api/feedback and
// /api/advertise. This endpoint is public and unauthenticated, so without it
// the form can be used to subscription-bomb arbitrary addresses through our
// domain — which now burns OUR sending reputation rather than a vendor's.
//
// Caveat, so nobody mistakes this for real protection: the store is an
// in-memory Map, so the window is per serverless instance and resets on cold
// start. It stops a naive script from one IP. It does not stop a distributed
// attack. It is the established pattern in this repo; upgrade to a shared
// store only if the logs show it is actually being worked around.
const limiter = rateLimit(2, 10 * 60 * 1000);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/subscribe
 *
 * Step one of a double opt-in we own end to end. It does NOT create a contact.
 * It mints a signed, 48h token carrying the address and the surface, and sends
 * that token to the address in a transactional email. The contact is created
 * only by `POST /api/subscribe/confirm`, when the token comes back.
 *
 * That ordering is the whole design: the list contains confirmed addresses by
 * construction rather than by policy, and no pending signup is stored anywhere.
 * See docs/prd/story-delivery-resend.md §5 and lib/email/subscribe-token.ts.
 *
 * What used to be here: a thin proxy to Kit, plus a fallback that upserted a
 * `state: active` subscriber when a form-add failed. That fallback minted
 * subscribers who never saw a consent step (phase-0 risk #6). It existed only
 * to work around a Kit quirk and is deliberately not reimplemented — carrying a
 * consent bug across a migration is how it becomes permanent.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await limiter.check(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const source = typeof body?.source === 'string' ? body.source.trim() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Validated against the real list, not just "non-empty". This value travels
    // into a token we sign and, before this change, any string a caller sent
    // was accepted and forwarded to the ESP.
    if (!isEmailSignupSource(source)) {
      return NextResponse.json({ error: 'Missing source.' }, { status: 400 });
    }

    // Keep this guard. It matters MORE here than it did with Kit, because
    // `sendEmail` returns a mock success when RESEND_API_KEY is unset
    // (lib/resend.ts:41-44). Without it a preview deployment or a key-rotation
    // window answers 200, tells the subscriber to check their inbox, sends
    // nothing, and logs one console.warn. The key being set in production is
    // exactly why that failure would go unnoticed.
    const secret = getTokenSecret();
    if (!process.env.RESEND_API_KEY || !secret) {
      console.error(
        '[api/subscribe] Not configured (RESEND_API_KEY / EMAIL_TOKEN_SECRET missing)'
      );
      return NextResponse.json({ error: 'Subscriptions are not configured.' }, { status: 503 });
    }

    const token = mintConfirmToken({ email, source }, secret);

    await sendEmail({
      to: email,
      subject: confirmationEmailSubject(),
      text: confirmationEmailText(token),
      html: confirmationEmailHtml(token),
      // Replies to a consent email are real people asking real questions, and
      // they must reach a human. config.resend.supportEmail is a live inbox.
      replyTo: config.resend.supportEmail,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/subscribe] Error handling subscription:', error);
    return NextResponse.json({ error: 'Failed to process subscription.' }, { status: 500 });
  }
}
