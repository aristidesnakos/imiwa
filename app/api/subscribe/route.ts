import { NextResponse } from 'next/server';
import config from '@/config';
import { signToken } from '@/lib/subscribe/token';
import { sendSubConfirmEmail } from '@/lib/resend';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const token = signToken({ email, source });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.michikanji.com';
    const confirmUrl = `${baseUrl}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;

    await sendSubConfirmEmail({
      to: email,
      subject: 'Confirm your email — MichiKanji',
      htmlTemplate: 'michikanji-confirm',
      replyTo: config.resend.supportEmail,
      emailVariables: {
        confirmation_url: confirmUrl,
        source,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/subscribe] Error handling subscription:', error);
    return NextResponse.json({ error: 'Failed to process subscription.' }, { status: 500 });
  }
}
