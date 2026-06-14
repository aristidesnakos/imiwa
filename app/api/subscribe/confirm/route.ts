import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import config from '@/config';
import { verifyToken } from '@/lib/subscribe/token';
import { sendEmail } from '@/lib/resend';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.michikanji.com';

  const result = verifyToken(token);
  if (!result.valid || !result.payload) {
    return NextResponse.redirect(`${baseUrl}/subscribed?status=invalid`);
  }

  const { email, source } = result.payload;

  // (a) Store the subscriber in Resend Audiences when configured.
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.contacts.create({
        email,
        audienceId: process.env.RESEND_AUDIENCE_ID,
        unsubscribed: false,
      });
    } catch (error) {
      console.error('[api/subscribe/confirm] Failed to add Resend contact:', error);
    }
  }

  // (b) Durable record: notify the admin of the new confirmed subscriber.
  try {
    await sendEmail({
      to: config.resend.supportEmail,
      subject: 'New MichiKanji subscriber',
      text: 'Email: ' + email + '\nSource: ' + source,
    });
  } catch (error) {
    console.error('[api/subscribe/confirm] Failed to send admin notification:', error);
  }

  return NextResponse.redirect(
    `${baseUrl}/subscribed?status=confirmed&source=${encodeURIComponent(source)}`
  );
}
