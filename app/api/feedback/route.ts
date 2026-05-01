import { NextRequest, NextResponse } from 'next/server';
import config from '@/config';
import rateLimit from '@/middlewares/rateLimiter';

// 5 submissions per 10 minutes per IP
const limiter = rateLimit(5, 10 * 60 * 1000);

// Maximum field lengths to prevent large-payload abuse
const MAX_MESSAGE_LEN = 2000;
const MAX_FEATURES_LEN = 1000;
const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254; // RFC 5321 limit

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface FeedbackPayload {
  rating: number;
  message: string;
  features?: string;
  name?: string;
  email?: string;
}

/**
 * Send a notification via Resend (email) when RESEND_API_KEY is configured.
 */
async function notifyViaResend(payload: FeedbackPayload, html: string): Promise<void> {
  const { sendEmail } = await import('@/lib/resend');
  await sendEmail({
    to: config.resend.supportEmail,
    subject: `[MichiKanji] New feedback – ${payload.rating}/5 stars`,
    html,
    replyTo: payload.email,
  });
}

/**
 * Send a notification via a generic webhook URL when FEEDBACK_WEBHOOK_URL is set.
 */
async function notifyViaWebhook(payload: FeedbackPayload): Promise<void> {
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const stars = '⭐'.repeat(payload.rating);
  const text =
    `💬 *New feedback on MichiKanji* ${stars}\n` +
    `*Rating:* ${payload.rating}/5\n` +
    (payload.name ? `*Name:* ${payload.name}\n` : '') +
    (payload.email ? `*Email:* ${payload.email}\n` : '') +
    (payload.features ? `*Requested features:* ${payload.features}\n` : '') +
    `*Message:* ${payload.message}`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      content: text,
      event: 'feedback',
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await limiter.check(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    const { rating, message, features, name, email } = body;

    if (!rating || !message) {
      return NextResponse.json(
        { error: 'Rating and message are required.' },
        { status: 400 }
      );
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    // Field length caps to prevent large-payload abuse
    if (String(message).length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LEN} characters or fewer.` }, { status: 400 });
    }
    if (features && String(features).length > MAX_FEATURES_LEN) {
      return NextResponse.json({ error: `Feature request must be ${MAX_FEATURES_LEN} characters or fewer.` }, { status: 400 });
    }
    if (name && String(name).length > MAX_NAME_LEN) {
      return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer.` }, { status: 400 });
    }
    if (email && String(email).length > MAX_EMAIL_LEN) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Validate email if provided — simple structural check.
    if (email) {
      const emailStr = String(email);
      const atIndex = emailStr.indexOf('@');
      const isValidEmail =
        atIndex > 0 &&
        atIndex < emailStr.length - 1 &&
        emailStr.lastIndexOf('@') === atIndex &&
        emailStr.indexOf('.', atIndex) > atIndex + 1;
      if (!isValidEmail) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
      }
    }

    const payload: FeedbackPayload = {
      rating: ratingNum,
      message: String(message),
      features: features ? String(features) : undefined,
      name: name ? String(name) : undefined,
      email: email ? String(email) : undefined,
    };

    const stars = '⭐'.repeat(payload.rating);
    const safeName = payload.name ? escapeHtml(payload.name) : '';
    const safeEmail = payload.email ? escapeHtml(payload.email) : '';
    const safeFeatures = payload.features ? escapeHtml(payload.features) : '';
    const safeMessage = escapeHtml(payload.message);

    const html = `
      <h2>New Feedback – MichiKanji</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%;max-width:600px">
        <tr><td style="font-weight:bold;width:140px">Rating</td><td>${stars} ${payload.rating}/5</td></tr>
        ${safeName ? `<tr><td style="font-weight:bold">Name</td><td>${safeName}</td></tr>` : ''}
        ${safeEmail ? `<tr><td style="font-weight:bold">Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>` : ''}
        ${safeFeatures ? `<tr><td style="font-weight:bold;vertical-align:top">Feature requests</td><td style="white-space:pre-wrap">${safeFeatures}</td></tr>` : ''}
        <tr><td style="font-weight:bold;vertical-align:top">Message</td><td style="white-space:pre-wrap">${safeMessage}</td></tr>
      </table>
    `;

    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasWebhook = Boolean(process.env.FEEDBACK_WEBHOOK_URL);

    if (!hasResend && !hasWebhook) {
      console.warn('[feedback] No notification channel configured. Set RESEND_API_KEY or FEEDBACK_WEBHOOK_URL.');
    }

    const notifications: Promise<void>[] = [];
    if (hasResend) notifications.push(notifyViaResend(payload, html));
    if (hasWebhook) notifications.push(notifyViaWebhook(payload));

    await Promise.all(notifications);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling feedback submission:', error);
    return NextResponse.json({ error: 'Failed to send feedback. Please try again.' }, { status: 500 });
  }
}
