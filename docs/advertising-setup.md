# Advertising System — Owner Setup Checklist

This document lists every task you need to complete before the advertising
system is fully live. Work through them in order.

---

## Part 0 — Fix the MX record conflict (Resend DNS)

When setting up Resend you may have received a warning:
> "Conflicting MX records: These records may prevent receiving."

**You do not need the MX record.** The MX record
(`inbound-smtp.us-east-1.amazonaws.com`, priority 9) is for receiving email
at `@michikanji.com`. You only need to *send* from `@michikanji.com`, which
requires only three **TXT** records — not an MX record.

**Action:**
1. Open your domain registrar's DNS panel.
2. Delete the MX record pointing to `inbound-smtp.us-east-1.amazonaws.com`.
3. Keep only the three TXT records Resend asked you to add (SPF, DKIM, DMARC).
4. Return to Resend → Domains → click **Verify**. The warning will clear.

If you later want to receive email at `ads@michikanji.com` (so advertisers
can reply directly), set up **Cloudflare Email Routing** (free):

1. Add your domain to Cloudflare (or just enable Email Routing if it's
   already there).
2. Go to **Email → Email Routing → Routing Rules**.
3. Add a rule: `ads@michikanji.com` → forwards to `ari@llanai.com`.
4. Cloudflare will add the correct MX records without conflicting with Resend.

---

## Part 1 — Email / notification (do this first)

You need at least **one** of the two options below. Option A is simpler since
you already own the domain and have partially set up Resend.

### Option A — Resend (recommended, free tier available)

After fixing the DNS conflict above, complete the setup:

1. Sign up at <https://resend.com> (free account) if you have not already.
2. Go to **Domains → Add Domain** → enter `michikanji.com`.
3. Resend will give you three DNS records (SPF TXT, DKIM TXT/CNAME, DMARC TXT).
   Add them in your DNS panel. (The MX record is **not** in this list.)
4. Click **Verify** in Resend. Usually takes 2–10 minutes.
5. Go to **API Keys → Create API Key**. Copy the key — it starts with `re_`.
6. In Vercel → your project → **Settings → Environment Variables**, add:
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx
   ```
7. Resend notification emails are already configured to send to `ari@llanai.com`
   (your existing inbox). No changes to `config.ts` are needed unless you want
   to use a different address.
8. Redeploy on Vercel.

**How it works after setup:**
When someone submits the `/advertise` inquiry form, you will receive a
formatted email at `ari@llanai.com` with all their details and a Reply-To set
to the advertiser's email so you can respond directly.

---

### Option B — Webhook (no Resend needed)

A webhook is an HTTP endpoint that receives a JSON payload. You can use any
free service — no email setup needed.

**Easiest: Slack DM to yourself**

1. Go to <https://api.slack.com/apps> → **Create New App → From scratch**.
2. Name it "MichiKanji Ads", pick your Slack workspace.
3. **Incoming Webhooks → Activate** → add a new webhook → pick a channel or
   your own DM. Copy the webhook URL (starts with `https://hooks.slack.com/…`).
4. In Vercel environment variables, add:
   ```
   INQUIRY_WEBHOOK_URL = https://hooks.slack.com/services/T.../B.../xxx
   ```
5. Redeploy on Vercel.

**Alternative: Discord DM to yourself**

1. Server Settings → Integrations → Webhooks → New Webhook. Copy the URL.
2. Add `INQUIRY_WEBHOOK_URL` in Vercel with that URL.

**Alternative: Make.com → forward to your existing email**

1. Create a free account at <https://make.com>.
2. New Scenario: **Webhooks → Custom Webhook → Email**.
3. Copy the webhook URL Make gives you → set as `INQUIRY_WEBHOOK_URL`.
4. Make will forward every inquiry to any address you configure.

> You can set **both** `RESEND_API_KEY` and `INQUIRY_WEBHOOK_URL` at the same
> time. Both notifications will fire on every inquiry.

---

## Part 2 — Create Stripe payment products

Payment is collected manually before activating any slot. Create these three
Payment Links in your Stripe dashboard:

| Package | Price | Stripe product to create |
|---------|-------|--------------------------|
| **Starter** | $29 one-time | "MichiKanji Starter Banner – 30 days" |
| **Growth** | $177 one-time | "MichiKanji Growth Banner – 90 days" ($59/mo × 3) |
| **Brand Partner** | $99 one-time | "MichiKanji Brand Partner – 30 days" |

**Pricing rationale:** Market rate for direct sponsored banners on niche sites
with 500–5,000 monthly visitors is $10–$50/month (flat rate, no ad network
cut). MichiKanji earns a premium for its intent-driven audience (US-dominant,
4m+ session, arriving from Google/Bing/ChatGPT) — currently positioned at
$29–$99 to attract first advertisers and build a track record. Raise prices
every time a slot sells out.

**Steps to create a Stripe Payment Link:**
1. Go to <https://dashboard.stripe.com/payment-links>.
2. Click **New Payment Link**.
3. Add the product with the correct price.
4. Save the link (e.g. `https://buy.stripe.com/xxxx`).
5. Send that link directly to the advertiser once they confirm interest.

When they pay, Stripe emails you a receipt. That is your trigger to activate
the slot.

---

## Part 3 — Activating a slot (after payment clears)

All ads are managed in a single file: **`lib/constants/ads.ts`**

**Important:** You do not need to remember to deactivate ads. The system
checks `startDate` and `endDate` on every page render and shows or hides the
banner automatically. The daily GitHub Actions workflow (Part 4) will also
notify you when campaigns are about to end.

When payment clears:

1. Open `lib/constants/ads.ts`.
2. Append a new entry to the `ADS` array:

```ts
export const ADS: AdConfig[] = [
  {
    id: 'acme-jun-2025',            // unique — use advertiser + month
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

3. Commit and push. Vercel deploys automatically.

**The banner will appear on `startDate` and vanish after `endDate` — no
further code changes needed.**

To pause an ad early (advertiser cancels):
```ts
active: false,   // set this field and deploy
```

---

## Part 4 — Set up the daily GitHub Actions cron job

The workflow file `.github/workflows/ad-slot-check.yml` is already in the
repository. It runs every day at 08:00 UTC automatically once the code is
merged and pushed to the default branch.

**What the cron job does (via `scripts/check-ads.ts`):**
- Reads every entry in `ADS` and compares it to today's date.
- **Creates a GitHub Issue** (goes to your GitHub notification inbox) when:
  - A campaign starts today
  - A campaign ends today (prompt to follow up for renewal)
  - A campaign expires in ≤ 7 days (early-warning)
  - A campaign starts within 3 days (reminder to double-check ad copy)
- Posts the same summary to `INQUIRY_WEBHOOK_URL` if set.
- Does **not** create an issue on quiet days (no notable events).

**To enable GitHub Issue notifications:**
- The workflow uses the built-in `GITHUB_TOKEN` — no setup needed.
- Make sure you have GitHub notifications turned on for Issues in the repo
  (Settings → Notifications on github.com).

**To also get Slack / Discord pings from the cron job:**
- Add `INQUIRY_WEBHOOK_URL` as a repository secret (not just a Vercel env var):
  1. Go to your repo → **Settings → Secrets and variables → Actions**.
  2. Click **New repository secret**.
  3. Name: `INQUIRY_WEBHOOK_URL`, value: your webhook URL.

**To test it manually:**
1. Go to your repo → **Actions → Ad Slot Daily Check**.
2. Click **Run workflow** → **Run workflow**.
3. Check the run logs and your GitHub Issues / Slack for notifications.

**Note on the `advertising` label:**
The script creates issues with the label `advertising`. Create this label
once in your repo (Issues → Labels → New label) so it shows up correctly.

---

## Part 5 — Verify everything end-to-end

Run through this checklist after completing Parts 0–4:

- [ ] Go to `/advertise` — page loads without errors.
- [ ] Submit the inquiry form with your own email.
  - [ ] Resend: check `ari@llanai.com` for a formatted inquiry email.
  - [ ] Webhook: check Slack / Discord / Make.com run history for the payload.
- [ ] Add a test ad to `ADS` with today's date as both `startDate` and
      `endDate`, set `active: true`, and deploy.
  - [ ] Visit any kanji page (e.g. `/kanji/日`). The sponsored banner should
        appear below the Related Kanji section.
  - [ ] Change `endDate` to yesterday and deploy. The banner should disappear
        and the "Advertise here" fallback should reappear.
- [ ] Remove the test ad and deploy before going live.
- [ ] Manually trigger the GitHub Actions workflow (**Actions → Ad Slot Daily
      Check → Run workflow**) and confirm it runs without errors.

---

## Part 6 — Ongoing operations

| Task | When |
|------|------|
| Reply to inquiries (email / Slack) | Within 1–2 business days |
| Send Stripe Payment Link | After agreeing on package |
| Activate slot in `lib/constants/ads.ts` | After Stripe payment clears |
| Set `active: false` | If advertiser cancels early |
| Raise prices | Every time you sell out a slot |

The daily cron job handles all expiry notifications automatically.

---

## Quick-reference: Environment variables

| Variable | Set in | Required for |
|----------|--------|-------------|
| `RESEND_API_KEY` | Vercel | Email notifications via Resend |
| `INQUIRY_WEBHOOK_URL` | Vercel + GitHub Secrets | Webhook pings (inquiry form AND cron job) |
| `GITHUB_TOKEN` | Auto (GitHub Actions) | GitHub Issue creation from cron job |

At least one of `RESEND_API_KEY` or `INQUIRY_WEBHOOK_URL` must be set in
Vercel for inquiry form notifications to work.

