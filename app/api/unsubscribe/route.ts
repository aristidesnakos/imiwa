import { NextRequest, NextResponse } from 'next/server';
import { getTokenSecret } from '@/lib/email/subscribe-token';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import config from '@/config';

export const runtime = 'nodejs';

const RESEND_API = 'https://api.resend.com';

/**
 * GET/POST /api/unsubscribe?token=…
 *
 * The interim unsubscribe mechanism from `docs/prd/story-delivery-resend.md`
 * M7/M8's reopened decision: Topics are the proper fix once there is a reason
 * to send to a subset, but there is exactly one list today, so a signed link
 * that flips `unsubscribed` on the global contact is the whole feature.
 *
 * Both verbs are unauthenticated beyond the signed token:
 *
 *  - GET is what a person clicks from their mail client. It returns a small
 *    confirmation page so an image/link scanner cannot silently unsubscribe a
 *    reader merely by fetching the visible link.
 *  - POST is RFC 8058 one-click: Gmail/Yahoo/Outlook fetch a `List-Unsubscribe`
 *    URL with `List-Unsubscribe-Post: List-Unsubscribe=One-Click` as the body,
 *    with no human present, and expect a bare 2xx — this is also the shape the
 *    Gmail/Yahoo bulk-sender rules require. It must not redirect or render a
 *    confirmation page that a mail host's fetcher will never see.
 *
 * The confirmation page does not apply to RFC 8058 POST: mail hosts require a
 * bare success response for their explicit one-click unsubscribe request.
 */
async function unsubscribe(request: NextRequest): Promise<'ok' | 'invalid' | 'unconfigured' | 'upstream-error'> {
  const secret = getTokenSecret();
  if (!process.env.RESEND_API_KEY || !secret) return 'unconfigured';

  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!token) return 'invalid';

  const result = verifyUnsubscribeToken(token, secret);
  if (result.status === 'invalid') return 'invalid';

  const res = await fetch(`${RESEND_API}/contacts/${encodeURIComponent(result.payload.email)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ unsubscribed: true }),
  });

  // A contact that does not exist (already removed, or the token outlived a
  // contact that was never created) is not an error worth surfacing — the
  // outcome the sender wants, "this address gets nothing further", already
  // holds either way.
  if (!res.ok && res.status !== 404) {
    const detail = await res.text();
    console.error('[api/unsubscribe] Resend contact update failed:', res.status, detail);
    return 'upstream-error';
  }

  return 'ok';
}

function page(title: string, body: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${title} — ${config.appName}</title></head>` +
      `<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;">` +
      `<h1 style="font-size:20px;">${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!token || verifyUnsubscribeToken(token, getTokenSecret()).status === 'invalid') {
    return page('Invalid link', 'This unsubscribe link is invalid or malformed.', 400);
  }
  const action = `${request.nextUrl.pathname}?token=${encodeURIComponent(token)}`;
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Unsubscribe — ${config.appName}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;"><h1 style="font-size:20px;">Unsubscribe from weekly stories?</h1><p>You will no longer receive story emails from us.</p><form method="post" action="${action}"><button type="submit">Unsubscribe</button></form></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

// RFC 8058 one-click: mail hosts expect a bare 2xx/4xx, never HTML.
export async function POST(request: NextRequest) {
  const outcome = await unsubscribe(request);
  if (outcome === 'ok') return new NextResponse(null, { status: 200 });
  if (outcome === 'invalid') return new NextResponse(null, { status: 400 });
  if (outcome === 'unconfigured') return new NextResponse(null, { status: 503 });
  return new NextResponse(null, { status: 502 });
}
