import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend';
import config from '@/config';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, website, budget, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safeCompany = company ? escapeHtml(String(company)) : '';
    const safeWebsite = website ? escapeHtml(String(website)) : '';
    const safeBudget = budget ? escapeHtml(String(budget)) : '';
    const safeMessage = escapeHtml(String(message));

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

    await sendEmail({
      to: config.resend.supportEmail,
      subject: `[MichiKanji] Advertising inquiry from ${safeName}`,
      html,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling advertise inquiry:', error);
    return NextResponse.json({ error: 'Failed to send inquiry. Please try again.' }, { status: 500 });
  }
}
