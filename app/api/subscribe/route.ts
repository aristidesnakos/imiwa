import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_API = 'https://api.kit.com/v4';

/**
 * POST /api/subscribe
 *
 * Thin proxy to Kit (formerly ConvertKit). The Kit form owns the opt-in flow:
 * double opt-in (confirmation email) and incentive delivery (the practice pack)
 * are configured on the form in the Kit dashboard, not here. We just hand Kit the
 * email + a `source` tag (sent as the Kit `referrer` so it's segmentable).
 *
 * Resend stays for transactional mail only (contact form, feedback). Keeping the
 * marketing list on Kit protects the transactional sender's deliverability.
 */
function kitPost(path: string, body: Record<string, unknown>) {
  return fetch(`${KIT_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': process.env.KIT_API_KEY as string,
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const source = typeof body?.source === 'string' ? body.source.trim() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }
    if (!source) {
      return NextResponse.json({ error: 'Missing source.' }, { status: 400 });
    }

    const formId = process.env.KIT_FORM_ID;
    if (!process.env.KIT_API_KEY || !formId) {
      console.error('[api/subscribe] Kit not configured (KIT_API_KEY / KIT_FORM_ID missing)');
      return NextResponse.json({ error: 'Subscriptions are not configured.' }, { status: 503 });
    }

    // Adding to the form runs the form's opt-in flow (DOI + incentive email).
    // `referrer` carries the source tag for segmentation in Kit.
    let res = await kitPost(`/forms/${formId}/subscribers`, {
      email_address: email,
      referrer: source,
    });

    // Some Kit accounts require the subscriber to exist before a form add.
    // If the first call fails, upsert the subscriber, then retry the form add.
    if (!res.ok) {
      const createRes = await kitPost('/subscribers', { email_address: email });
      // 422 == already exists; that's fine for our upsert intent.
      if (!createRes.ok && createRes.status !== 422) {
        const detail = await createRes.text();
        console.error('[api/subscribe] Kit create-subscriber failed:', createRes.status, detail);
        throw new Error('Kit create-subscriber failed');
      }
      res = await kitPost(`/forms/${formId}/subscribers`, {
        email_address: email,
        referrer: source,
      });
    }

    if (!res.ok) {
      const detail = await res.text();
      console.error('[api/subscribe] Kit form-subscribe failed:', res.status, detail);
      throw new Error('Kit form-subscribe failed');
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/subscribe] Error handling subscription:', error);
    return NextResponse.json({ error: 'Failed to process subscription.' }, { status: 500 });
  }
}
