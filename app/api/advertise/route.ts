import { NextRequest, NextResponse } from 'next/server';
import config from '@/config';
import rateLimit from '@/middlewares/rateLimiter';

// 5 submissions per 10 minutes per IP
const limiter = rateLimit(5, 10 * 60 * 1000);

// Maximum field lengths to prevent large-payload abuse
const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254; // RFC 5321 limit
const MAX_COMPANY_LEN = 100;
const MAX_WEBSITE_LEN = 255;
const MAX_MESSAGE_LEN = 2000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface InquiryPayload {
  name: string;
  email: string;
  company?: string;
  website?: string;
  budget?: string;
  message: string;
}

/**
 * Send a notification via Resend (email) when RESEND_API_KEY is configured.
 */
async function notifyViaResend(payload: InquiryPayload, html: string): Promise<void> {
  const { sendEmail } = await import('@/lib/resend');
  await sendEmail({
    to: config.resend.supportEmail,
    subject: `[MichiKanji] Advertising inquiry from ${escapeHtml(payload.name)}`,
    html,
    replyTo: payload.email,
  });
}

/**
 * Send a notification via a generic webhook URL when INQUIRY_WEBHOOK_URL is
 * set. The payload is a plain JSON object — compatible with Zapier, Make.com,
 * n8n, Slack Incoming Webhooks, Discord webhooks, etc.
 *
 * For Slack / Discord: set INQUIRY_WEBHOOK_URL to the webhook URL provided by
 * the integration. The JSON keys below map directly to Slack's "text" field and
 * Discord's "content" field, so both work out of the box.
 */
async function notifyViaWebhook(payload: InquiryPayload): Promise<void> {
  const webhookUrl = process.env.INQUIRY_WEBHOOK_URL;
  if (!webhookUrl) return;

  const text =
    `📬 *New ad inquiry on MichiKanji*\n` +
    `*Name:* ${payload.name}\n` +
    `*Email:* ${payload.email}\n` +
    (payload.company ? `*Company:* ${payload.company}\n` : '') +
    (payload.website ? `*Website:* ${payload.website}\n` : '') +
    (payload.budget ? `*Budget:* ${payload.budget}\n` : '') +
    `*Message:* ${payload.message}`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Slack / Discord compatible
      text,
      content: text,
      // Generic fallback — readable by Zapier, Make, n8n, etc.
      event: 'ad_inquiry',
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
    const { name, email, company, website, budget, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    // Field length caps to prevent large-payload abuse
    if (String(name).length > MAX_NAME_LEN) {
      return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer.` }, { status: 400 });
    }
    if (String(email).length > MAX_EMAIL_LEN) {
      return NextResponse.json({ error: `Email address must be ${MAX_EMAIL_LEN} characters or fewer.` }, { status: 400 });
    }
    if (company && String(company).length > MAX_COMPANY_LEN) {
      return NextResponse.json({ error: `Company must be ${MAX_COMPANY_LEN} characters or fewer.` }, { status: 400 });
    }
    if (website && String(website).length > MAX_WEBSITE_LEN) {
      return NextResponse.json({ error: `Website URL must be ${MAX_WEBSITE_LEN} characters or fewer.` }, { status: 400 });
    }
    if (String(message).length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LEN} characters or fewer.` }, { status: 400 });
    }

    // Validate email — simple structural check without catastrophic backtracking.
    // We check: non-empty local part, @, non-empty domain with at least one dot.
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

    const payload: InquiryPayload = {
      name: String(name),
      email: String(email),
      company: company ? String(company) : undefined,
      website: website ? String(website) : undefined,
      budget: budget ? String(budget) : undefined,
      message: String(message),
    };

    const safeName = escapeHtml(payload.name);
    const safeEmail = escapeHtml(payload.email);
    const safeCompany = payload.company ? escapeHtml(payload.company) : '';
    const safeWebsite = payload.website ? escapeHtml(payload.website) : '';
    const safeBudget = payload.budget ? escapeHtml(payload.budget) : '';
    const safeMessage = escapeHtml(payload.message);

    const html = `
      <h2>New Advertising Inquiry – MichiKanji</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%;max-width:600px">
        <tr><td style="font-weight:bold;width:120px">Name</td><td>${safeName}</td></tr>
        <tr><td style="font-weight:bold">Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        ${safeCompany ? `<tr><td style="font-weight:bold">Company</td><td>${safeCompany}</td></tr>` : ''}
        ${safeWebsite ? `<tr><td style="font-weight:bold">Website</td><td>${safeWebsite}</td></tr>` : ''}
        ${safeBudget ? `<tr><td style="font-weight:bold">Budget</td><td>${safeBudget}</td></tr>` : ''}
        <tr><td style="font-weight:bold;vertical-align:top">Message</td><td style="white-space:pre-wrap">${safeMessage}</td></tr>
      </table>
    `;

    // Notify via whichever channel(s) are configured.
    // At least one of RESEND_API_KEY or INQUIRY_WEBHOOK_URL must be set in
    // your Vercel environment variables — see docs/advertising-setup.md.
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    const hasWebhook = Boolean(process.env.INQUIRY_WEBHOOK_URL);

    if (!hasResend && !hasWebhook) {
      console.warn('[advertise] No notification channel configured. Set RESEND_API_KEY or INQUIRY_WEBHOOK_URL.');
    }

    const notifications: Promise<void>[] = [];
    if (hasResend) notifications.push(notifyViaResend(payload, html));
    if (hasWebhook) notifications.push(notifyViaWebhook(payload));

    await Promise.all(notifications);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling advertise inquiry:', error);
    return NextResponse.json({ error: 'Failed to send inquiry. Please try again.' }, { status: 500 });
  }
}
