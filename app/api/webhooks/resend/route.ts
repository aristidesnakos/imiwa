import {
  addressOf,
  forwardReceivedEmail,
  recipientsOf,
  splitList,
  verifyWebhookSignature,
  type ReceivedEmailEvent,
} from "@/lib/email/inbound-forward";

// Resend `email.received` webhook: forwards mail addressed to FORWARD_ADDRESSES
// to FORWARD_TO, so it can be read on the phone. Nothing is stored here.
//
// Status codes: 400 for an unverifiable request, 200 for anything skipped on
// purpose, 500 for everything Resend should retry. Retries are safe because
// each forward carries an idempotency key.
export async function POST(request: Request) {
  const env = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    FORWARD_ADDRESSES: process.env.FORWARD_ADDRESSES,
    FORWARD_TO: process.env.FORWARD_TO,
    FORWARD_FROM: process.env.FORWARD_FROM,
  };
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    console.error("[inbound] Missing environment variables", missing);
    return new Response("Not configured", { status: 500 });
  }
  const {
    RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET,
    FORWARD_ADDRESSES,
    FORWARD_TO,
    FORWARD_FROM,
  } = env as Record<keyof typeof env, string>;

  const body = await request.text();
  const signed = verifyWebhookSignature({
    id: request.headers.get("svix-id") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
    body,
    secret: RESEND_WEBHOOK_SECRET,
  });
  if (!signed) {
    console.warn("[inbound] Rejected webhook with invalid signature");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: ReceivedEmailEvent;
  try {
    event = JSON.parse(body) as ReceivedEmailEvent;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return new Response("Ignored event type", { status: 200 });
  }
  const { data } = event;
  const recipients = recipientsOf(data);
  const sender = addressOf(data.from ?? "");

  // Loop guard: never forward our own forwards, or replies sent back to the
  // forwarding address.
  const forwardFrom = addressOf(FORWARD_FROM);
  if (sender === forwardFrom || recipients.includes(forwardFrom)) {
    return new Response("Skipped: loop guard", { status: 200 });
  }

  const watched = splitList(FORWARD_ADDRESSES);
  if (!recipients.some((address) => watched.includes(address))) {
    return new Response("Skipped: not addressed to a forwarded address", {
      status: 200,
    });
  }

  const result = await forwardReceivedEmail({
    apiKey: RESEND_API_KEY,
    emailId: data.email_id,
    from: data.from ?? "",
    to: FORWARD_TO,
    forwardFrom: FORWARD_FROM,
  });
  if (result.ok === false) {
    // A 401 or 403 means the key is not Full access, which receiving needs.
    console.error("[inbound] Forward failed, webhook will be retried", {
      emailId: data.email_id,
      status: result.status,
      message: result.message,
    });
    return new Response("Forward failed", { status: 500 });
  }

  return new Response("Forwarded", { status: 200 });
}
