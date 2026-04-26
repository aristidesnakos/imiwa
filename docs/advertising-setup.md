# Advertising System — Owner Setup Checklist

This document lists every task you need to complete before the advertising
system is fully live. Work through them in order.

---

## Part 0 — Fix the MX record conflict (Resend DNS)

When setting up Resend you may have received a warning:
> "Conflicting MX records: These records may prevent receiving."

**You do not need the MX record.** The MX record
(`inbound-smtp.us-east-1.amazonaws.com`, priority 9) is for *receiving*
email at `@michikanji.com` via Amazon SES. Resend only needs to *send* from
your domain, which requires three **TXT** records (SPF, DKIM, DMARC) — no MX
record is necessary for sending.

**Action:**
1. Open your domain registrar's DNS panel.
2. Delete the MX record pointing to `inbound-smtp.us-east-1.amazonaws.com`.
3. Keep only the three TXT records Resend asked you to add (SPF, DKIM, DMARC).
4. Return to Resend → Domains → click **Verify**. The warning will clear.

**If you want to receive replies at `ads@michikanji.com` later** (optional —
not required for the inquiry notifications):
Set up **Cloudflare Email Routing** (free) to forward
`ads@michikanji.com` → `ari@llanai.com`. Cloudflare manages its own MX
records automatically and doesn't conflict with Resend's sending setup.

---

## Part 1 — Email notifications via Resend

All notifications (inquiry form submissions and daily cron alerts) go by email
through Resend. No Slack, Discord, or webhook setup is needed.

After fixing the DNS conflict above:

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
7. Notification emails are already configured to send to `ari@llanai.com`
   (your existing inbox). No changes to `config.ts` are needed unless you want
   to change that address.
8. Redeploy on Vercel.

**How it works:**
When someone submits the `/advertise` inquiry form, you receive a formatted
email at `ari@llanai.com` with all their details and a Reply-To set to the
advertiser's email so you can respond directly.

---

## Part 2 — Understand what you are selling (read before creating Stripe products)

### The ad inventory

MichiKanji currently has **one ad slot**: a sponsored banner that appears on
every individual kanji detail page (e.g. `/kanji/日`, `/kanji/月`, etc.).
There are **2,000+ such pages** — one per kanji in the N5–N1 database — and
all receive organic traffic from Google, Bing, and ChatGPT.

**Only one advertiser can occupy the slot at a time.** The `getActiveAd()`
function returns the first ad whose `startDate ≤ today ≤ endDate` and
`active: true`. Future bookings can be queued up in the `ADS` array with
non-overlapping date ranges.

**What the banner shows:**
- An optional category pill (e.g. "Travel", "Language")
- Your headline (bold)
- Your description (1–2 sentences)
- A CTA button linking to your site
- "Ad by [Advertiser Name]" attribution line

**What it does NOT include yet** (will require additional code):
- A homepage placement (there is no banner on `/` currently)
- Category-filtered placement (e.g. only N5 pages)
- Multiple simultaneous slots

Planned future inventory as traffic grows:
- Slot 2: footer banner on all kanji pages
- Slot 3: inline card on the `/kanji` listing page
- Slot 4: homepage sidebar

Be honest with advertisers: right now you are selling **one banner on
all kanji detail pages**.

---

## Part 3 — Create Stripe payment products

Create three one-time Payment Links in your Stripe dashboard. Use the exact
Names and Descriptions below — they appear at checkout and on the customer's
receipt.

---

### Product 1 — Starter (30 days)

**Price:** $29 (one-time)

**Name:**
```
MichiKanji – Sponsored Banner, 30 Days
```

**Description:**
```
Your brand featured in the exclusive sponsored banner on every kanji study
page across MichiKanji.com for 30 consecutive days.

Placement details:
• Appears on 2,000+ individual kanji pages (N5–N4–N3–N2–N1)
• Includes your custom headline, 1–2 sentence description, and CTA button
  linking to your website
• "Ad by [Your Brand]" attribution line
• One advertiser at a time — your brand has the slot to itself

Audience: active Japanese language learners arriving from Google, Bing, and
ChatGPT — primarily based in the US, UK, and Singapore.

After payment, email ads@michikanji.com with your headline, description, CTA
text, destination URL, and campaign start date.
```

---

### Product 2 — Growth (90 days)

**Price:** $177 (one-time, equivalent to $59/month)

**Name:**
```
MichiKanji – Sponsored Banner, 90 Days
```

**Description:**
```
Your brand featured in the exclusive sponsored banner on every kanji study
page across MichiKanji.com for 90 consecutive days (3 months).

Placement details:
• Appears on 2,000+ individual kanji pages (N5–N4–N3–N2–N1)
• Includes your custom headline, 1–2 sentence description, and CTA button
  linking to your website
• "Ad by [Your Brand]" attribution line
• One advertiser at a time — your brand has the slot to itself
• Best value: 3 months of continuous exposure

Audience: active Japanese language learners arriving from Google, Bing, and
ChatGPT — primarily based in the US, UK, and Singapore.

After payment, email ads@michikanji.com with your headline, description, CTA
text, destination URL, and campaign start date.
```

---

### Product 3 — Brand Partner (30 days)

**Price:** $99 (one-time)

**Name:**
```
MichiKanji – Brand Partner Placement, 30 Days
```

**Description:**
```
Premium sponsorship on MichiKanji.com for 30 consecutive days.

Placement details:
• Exclusive sponsored banner on 2,000+ individual kanji pages
• Prominent "Sponsored by [Your Brand]" label throughout the campaign
• Custom headline, description, and CTA button
• Priority scheduling — your dates take precedence over future bookings
• Co-created content option: we can write a dedicated study resource,
  vocabulary list, or tip article that features your brand naturally

Audience: active Japanese language learners arriving from Google, Bing, and
ChatGPT — primarily based in the US, UK, and Singapore.

After payment, email ads@michikanji.com with your brand assets and preferred
start date. We will reach out within 1 business day to coordinate.
```

---

### Steps to create each Payment Link in Stripe

1. Go to <https://dashboard.stripe.com/payment-links>.
2. Click **New Payment Link**.
3. Under **Products**, click **Add a product → Create a new product**.
4. Fill in the Name and Description exactly as shown above.
5. Set the price (one-time, no trial).
6. Save. Stripe gives you a `https://buy.stripe.com/xxxx` link.
7. Keep each link handy — send it directly to the advertiser once they confirm interest.

When they pay, Stripe sends you a receipt by email. That is your trigger to
activate the slot (Part 4).

**Pricing rationale:** Market rate for direct sponsored banners on niche sites
with 500–5,000 monthly visitors is $10–$50/month (flat rate, no ad network
cut). MichiKanji earns a modest premium for its intent-driven audience —
raise prices every time a slot sells out.

---

## Part 4 — Activating a slot (after payment clears)

All ads are managed in a single file: **`lib/constants/ads.ts`**

The banner activates and deactivates automatically based on `startDate` and
`endDate` — you do not need to remember to turn it off. The daily GitHub
Actions cron job (Part 5) will also alert you when campaigns are about to end.

**When payment clears (Stripe receipt in your inbox):**

1. Open `lib/constants/ads.ts`.
2. Append a new entry to the `ADS` array:

```ts
export const ADS: AdConfig[] = [
  {
    id: 'acme-jun-2025',            // unique — use advertiser + month
    advertiser: 'Acme Japan Tours',  // shown in "Ad by" attribution line
    headline: 'Explore Japan with a local guide',
    description: 'Curated small-group tours for Japanese language learners.',
    ctaText: 'See tours',
    ctaUrl: 'https://acmejapantours.com',
    badge: 'Travel',                 // optional pill label (keep it short)
    startDate: '2025-06-01',         // campaign start (inclusive, UTC)
    endDate:   '2025-06-30',         // campaign end   (inclusive, UTC)
    active: true,
  },
];
```

3. Commit and push. Vercel deploys automatically.

**The banner will appear on `startDate` and vanish after `endDate`.**

To pause an ad early (advertiser cancels):
```ts
active: false,   // set this field and deploy
```

To stack future bookings, append more entries with non-overlapping date ranges.
The system picks the first one whose window covers today.

---

## Part 5 — Daily GitHub Actions cron job

The workflow file `.github/workflows/ad-slot-check.yml` is already in the
repository. It runs every day at **08:00 UTC** automatically once the branch
is merged to the default branch.

**What the cron job does (via `scripts/check-ads.ts`):**

- Reads every entry in `ADS` and compares it to today's date.
- **Creates a GitHub Issue** (triggers a GitHub notification email to you) when:
  - A campaign starts today → reminder that the slot is now live
  - A campaign ends today → prompt to follow up for renewal
  - A campaign expires in ≤ 7 days → early renewal warning
  - A campaign starts within 3 days → reminder to verify ad copy
- **Silent on quiet days** — no issue is created when nothing needs attention.
- Does **not** require any secrets beyond the built-in `GITHUB_TOKEN`.

**To receive the GitHub Issue notifications by email:**
1. Go to github.com → profile picture → **Settings → Notifications**.
2. Under "Participating, @mentions and custom routing", make sure Issues are
   checked and routed to `ari@llanai.com`.

**To test it manually:**
1. Go to your repo → **Actions → Ad Slot Daily Check**.
2. Click **Run workflow** → **Run workflow**.
3. Check the run logs and your GitHub Issues tab for the result.

**Note on the `advertising` label:**
The script tags issues with the label `advertising`. Create this label once in
your repo (Issues → Labels → New label: name `advertising`, any colour) so
it renders with a colour-coded badge.

---

## Part 6 — Verify everything end-to-end

Run through this checklist after completing Parts 0–5:

- [ ] Go to `/advertise` — page loads without errors.
- [ ] Submit the inquiry form with your own email → check `ari@llanai.com` for
      a formatted inquiry email with your submitted details.
- [ ] Add a test ad to `ADS` with today's date as both `startDate` and
      `endDate`, set `active: true`, and deploy.
  - [ ] Visit any kanji page (e.g. `/kanji/日`). The sponsored banner should
        appear below the Related Kanji section.
  - [ ] Change `endDate` to yesterday and deploy. The banner should disappear
        and the "Advertise here" fallback should reappear.
- [ ] Remove the test ad and deploy before going live.
- [ ] Manually trigger the GitHub Actions workflow (**Actions → Ad Slot Daily
      Check → Run workflow**) and confirm it completes without errors.

---

## Part 7 — Ongoing operations

| Task | When |
|------|------|
| Reply to inquiry emails | Within 1–2 business days |
| Send Stripe Payment Link | After agreeing on package |
| Activate slot in `lib/constants/ads.ts` | After Stripe receipt arrives |
| Set `active: false` | If advertiser cancels early |
| Raise prices | Every time a slot sells out |

The daily cron job handles all expiry notifications automatically.

---

## Quick-reference: Environment variables

| Variable | Set in | Required for |
|----------|--------|-------------|
| `RESEND_API_KEY` | Vercel | Email notifications (inquiry form) |
| `GITHUB_TOKEN` | Auto (GitHub Actions) | GitHub Issue creation from cron job |

`RESEND_API_KEY` must be set in Vercel for inquiry form emails to work.
`GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.


