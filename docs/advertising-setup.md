# Advertising System — Owner Setup Checklist

This document lists every task you need to complete before the advertising
system is fully live. Work through them in order.

---

## Part 1 — Email / notification (do this first)

You need at least **one** of the two options below. Option A is simpler if you
already own the domain. Option B requires no email setup at all.

### Option A — Resend (recommended, free tier available)

Resend lets you send and receive email from your own domain
(`@michikanji.com`) for free up to 3,000 emails/month.

**Steps:**

1. Sign up at <https://resend.com> (free account).
2. Go to **Domains → Add Domain** and enter `michikanji.com`.
3. Resend will give you three DNS records (SPF, DKIM, DMARC). Add them in
   your domain registrar's DNS panel (wherever you bought the domain).
4. Click **Verify** in Resend. This usually takes 2–10 minutes.
5. Go to **API Keys → Create API Key**. Copy the key — it starts with `re_`.
6. In Vercel → your project → **Settings → Environment Variables**, add:
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx
   ```
7. In `config.ts`, update:
   ```ts
   resend: {
     fromNoReply: 'MichiKanji <noreply@michikanji.com>',
     fromAdmin:   'MichiKanji <ads@michikanji.com>',
     supportEmail: 'ari@michikanji.com',   // ← your inbox
     forwardRepliesTo: 'ari@llanai.com',   // ← or wherever you actually read email
   }
   ```
8. Redeploy on Vercel.

**How it works after setup:**
When someone submits the `/advertise` inquiry form, you will receive a
formatted email at `supportEmail` with all their details and a Reply-To set
to the advertiser's email so you can respond directly.

---

### Option B — Webhook (no email account needed)

A webhook is an HTTP endpoint that receives a JSON payload. You can use any
of the free services below — no email setup needed.

**Easiest: Slack DM to yourself**

1. Go to <https://api.slack.com/apps> → **Create New App → From scratch**.
2. Name it "MichiKanji Ads", pick your Slack workspace.
3. Go to **Incoming Webhooks → Activate**, add a new webhook, pick a channel
   (or your own DM).  Copy the webhook URL (starts with `https://hooks.slack.com/…`).
4. In Vercel environment variables, add:
   ```
   INQUIRY_WEBHOOK_URL = https://hooks.slack.com/services/T.../B.../xxx
   ```
5. Redeploy on Vercel.

**Alternative: Discord DM to yourself**

1. Open Discord → Server Settings → Integrations → Webhooks → New Webhook.
2. Copy the webhook URL.
3. In Vercel environment variables, add:
   ```
   INQUIRY_WEBHOOK_URL = https://discord.com/api/webhooks/...
   ```

**Alternative: Make.com / Zapier (sends you an email)**

1. Create a free Make.com account at <https://make.com>.
2. Create a new Scenario: **Webhooks → Custom Webhook → Gmail / Email**.
3. Copy the webhook URL Make gives you.
4. Set `INQUIRY_WEBHOOK_URL` in Vercel to that URL.
5. Make will forward every inquiry to any email you configure — including your
   existing `@llanai.com` address.

> You can set **both** `RESEND_API_KEY` and `INQUIRY_WEBHOOK_URL` at the same
> time. Both notifications will fire simultaneously.

---

## Part 2 — Collect payment before activating a slot

There is no automated billing yet. Handle payment manually before activating
any ad:

**Recommended options (no extra code needed):**

| Option | How |
|--------|-----|
| **Stripe Payment Link** | In your Stripe dashboard → Payment Links → create a one-time link for each package price. Send the link to the advertiser. You get notified by Stripe when they pay. |
| **PayPal.me link** | Share `paypal.me/yourname/99` (Starter), `/249` (Growth), etc. |
| **Bank transfer / wire** | For Brand Partner or custom deals. |
| **Lemon Squeezy** | Like Stripe but simpler setup — lemon.squeezy.com |

Once payment clears, proceed to Part 3.

---

## Part 3 — Activating an ad slot

All ads are managed in a single file:
**`lib/constants/ads.ts`**

When you have a paying advertiser:

1. Open `lib/constants/ads.ts`.
2. Add a new entry to the `ADS` array:

```ts
export const ADS: AdConfig[] = [
  {
    id: 'acme-jun-2025',            // unique ID — use advertiser + month
    advertiser: 'Acme Japan Tours',  // shown in attribution line
    headline: 'Explore Japan with a local guide',
    description: 'Curated small-group tours for Japanese language learners.',
    ctaText: 'See tours',
    ctaUrl: 'https://acmejapantours.com',
    badge: 'Travel',                 // optional pill label
    startDate: '2025-06-01',         // campaign start (inclusive, UTC)
    endDate:   '2025-06-30',         // campaign end   (inclusive, UTC)
    active: true,
  },
];
```

3. Commit and deploy to Vercel.

**The banner will appear automatically on `startDate` and disappear
automatically the day after `endDate` — no further code changes needed.**

To pause an ad early (e.g. advertiser cancels):

```ts
active: false,
```

To stack future bookings, just append more entries. The system picks the
first one whose date window covers today.

---

## Part 4 — Verify everything is working

After completing Parts 1–3, run through this checklist:

- [ ] Go to `/advertise` — the page loads without errors.
- [ ] Fill in the inquiry form with your own email and submit.
  - [ ] If using Resend: check the `supportEmail` inbox. You should receive a
        formatted email with the advertiser's details.
  - [ ] If using a webhook: check your Slack DM / Discord / Make.com scenario
        run history. You should see the JSON payload.
- [ ] Add a test ad to `ADS` with today's date as both `startDate` and
      `endDate`, set `active: true`, and deploy.
  - [ ] Visit any kanji page (e.g. `/kanji/日`). The sponsored banner should
        appear below the Related Kanji section.
  - [ ] Change `endDate` to yesterday's date and deploy. The banner should
        disappear and the "Advertise here" fallback should show.
- [ ] Remove the test ad and deploy before going live.

---

## Part 5 — Ongoing operations

| Task | When |
|------|------|
| Reply to inquiry emails / Slack messages | Within 1–2 business days |
| Collect payment | Before activating any slot |
| Add entry to `ADS` array | After payment clears |
| Remove / set `active: false` | If advertiser cancels early |
| Check ad expired correctly | Day after `endDate` |
| Raise prices | Every time you sell out a slot; demand = pricing power |

---

## Quick-reference: Vercel environment variables

| Variable | Required for | Where to get it |
|----------|-------------|-----------------|
| `RESEND_API_KEY` | Email notifications (Option A) | resend.com → API Keys |
| `INQUIRY_WEBHOOK_URL` | Webhook notifications (Option B) | Slack / Discord / Make.com |

Both are optional individually, but **at least one must be set** for
inquiry notifications to work.
