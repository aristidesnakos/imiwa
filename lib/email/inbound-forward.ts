import { createHmac, timingSafeEqual } from "node:crypto";

// Inbound forwarding for one address (ari@michikanji.com). Resend receives the
// mail, because the domain's MX points at Resend, and posts an `email.received`
// event to /api/webhooks/resend. That event carries metadata only, so the
// message is fetched through Resend's receiving API and re-sent to the personal
// inbox as a raw .eml attachment: the original bytes, nothing parsed or stored.

const RESEND_API = "https://api.resend.com";
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const FORWARDED_FILE_NAME = "forwarded_message.eml";

export interface ReceivedEmailEvent {
  type: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    received_for?: string[];
  };
}

export interface ForwardFailure {
  status: number | null;
  message: string;
}

// Svix / Standard Webhooks signing, which Resend uses: HMAC-SHA256 over
// `${id}.${timestamp}.${body}`, keyed with the base64 part of `whsec_...`. The
// header can carry several `v1,<sig>` entries, and any one matching is enough.
export function verifyWebhookSignature(input: {
  id: string;
  timestamp: string;
  signature: string;
  body: string;
  secret: string;
  now?: number;
}): boolean {
  const sentAt = Number(input.timestamp);
  const now = input.now ?? Math.floor(Date.now() / 1000);
  if (!input.id || !Number.isFinite(sentAt)) return false;
  if (Math.abs(now - sentAt) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = Buffer.from(input.secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest();

  return input.signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export function addressOf(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim().toLowerCase();
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

// Every address the message was delivered to, including Bcc and the envelope
// recipients (`received_for`), so a Bcc to the watched address still counts.
export function recipientsOf(data: NonNullable<ReceivedEmailEvent["data"]>): string[] {
  return [
    ...(data.to ?? []),
    ...(data.cc ?? []),
    ...(data.bcc ?? []),
    ...(data.received_for ?? []),
  ].map(addressOf);
}

interface ReceivedEmail {
  subject?: string | null;
  raw?: { download_url?: string } | null;
}

async function failureOf(response: Response): Promise<ForwardFailure> {
  const body = (await response.json().catch((): null => null)) as { message?: string } | null;
  return {
    status: response.status,
    message: body?.message || response.statusText || "request failed",
  };
}

// Fetches the message, then sends it on from `forwardFrom` to `to`. Reply-to is
// the original sender, so replying to the forward reaches them directly; a
// reply to `forwardFrom` itself is dropped by the loop guard.
export type ForwardResult = { ok: true } | { ok: false; status: number | null; message: string };

export async function forwardReceivedEmail(input: {
  apiKey: string;
  emailId: string;
  from: string;
  to: string;
  forwardFrom: string;
}): Promise<ForwardResult> {
  const auth = { Authorization: `Bearer ${input.apiKey}` };
  try {
    const received = await fetch(
      `${RESEND_API}/emails/receiving/${encodeURIComponent(input.emailId)}`,
      { headers: auth },
    );
    if (!received.ok) return { ok: false, ...(await failureOf(received)) };

    const email = (await received.json()) as ReceivedEmail;
    const downloadUrl = email.raw?.download_url;
    if (!downloadUrl) {
      return { ok: false, status: 400, message: "raw email not available" };
    }

    const raw = await fetch(downloadUrl);
    if (!raw.ok) return { ok: false, status: raw.status, message: "raw download failed" };
    const content = Buffer.from(await raw.arrayBuffer()).toString("base64");

    const originalSubject = email.subject || "(no subject)";
    const subject = originalSubject.startsWith("Fwd:")
      ? originalSubject
      : `Fwd: ${originalSubject}`;

    const sent = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Type": "application/json",
        "Idempotency-Key": `forward/${input.emailId}`,
      },
      body: JSON.stringify({
        from: input.forwardFrom,
        to: [input.to],
        ...(input.from ? { reply_to: [input.from] } : {}),
        subject,
        text: `Forwarded from ${input.from}. The original message is attached as ${FORWARDED_FILE_NAME}.`,
        attachments: [
          { filename: FORWARDED_FILE_NAME, content, content_type: "message/rfc822" },
        ],
      }),
    });
    if (!sent.ok) return { ok: false, ...(await failureOf(sent)) };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
