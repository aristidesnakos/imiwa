# Phase 0 — Growth & Monetization Validation

**Version 2.0** · Updated 2026-06-14 · Owner: Ari Nakos
**Status:** PR #1 shipped (foundations + SEO). Next: activate Kit → email capture → Pro fake-door.
**Source:** "Michikanji — Phase 0 Implementation Brief" (14 Jun 2026)

## Goal
Capture the search traffic we already earn, start an email list we own, and validate willingness to pay for a "Pro" tier — without gating any free page or taking a real payment.

## Guardrails
- Never gate or slow the free kanji / stroke-order pages — they are the acquisition engine.
- Additive, reversible, measurable changes only.
- No checkout, no charge — instrument intent only.

---

## Stack
Three backends, one job each. **We own all UI in-repo; these are only destinations** (no Kit-hosted/embedded forms → no lock-in).

- **Kit** — the email list: opt-in, magnet delivery, referrer-based segments, broadcasts, future nurture.
- **Resend** — transactional mail only (contact form, feedback). Kept separate to protect its sending reputation.
- **DataFast** — analytics + conversion goals.

**One capture pipeline, reused everywhere:**

```
<EmailCapture source="…"/>  →  POST /api/subscribe  →  Kit   (+ fires DataFast email_signup)
```

Every surface (free resources, progress, Pro waitlist, ad slot) uses the same component with a different `source`. `source` is sent to Kit as the subscriber **`referrer`** — segment audiences in Kit by filtering on `referrer` (e.g. `referrer = pro-waitlist`). **The code applies no tags;** `referrer` ≠ tag. If you later want true tags for automations, create a Kit rule that tags subscribers by their `referrer` value — don't expect tags to appear from the API call.

---

## Kit activation
The code is done; this is dashboard + env config to turn the list on.

**Double opt-in (DOI):** single opt-in adds the typed email instantly; DOI emails a "confirm" link first and only adds them after they click — then auto-sends the pack. DOI = cleaner list, real consent (GDPR), better deliverability; ~20–30% never confirm. **Use DOI on.**

**Segmentation = `referrer`, not tags.** The code sends `source` as the subscriber's `referrer` and applies no tags. Build Kit segments by filtering on `referrer` (e.g. `referrer = pro-waitlist`); optionally add a Kit rule that tags by `referrer` if an automation needs a tag trigger.

| # | Step | Objective |
|---|------|-----------|
| 1 | Create a Kit account | The list exists |
| 2 | Create one **Form** for the lead magnet → enable **double opt-in** → attach the practice-pack PDF as the **incentive** | Confirmed signups auto-receive the pack, no code |
| 3 | (Optional) Add a Kit automation that tags subscribers by their `referrer` value (`free-resources-pack`, `progress-sync`, `pro-waitlist`) | Tag-triggered automations, if needed later |
| 4 | Copy the **v4 API key** (Settings → Advanced → API) + the **Form ID** (in the form URL); set `KIT_API_KEY` + `KIT_FORM_ID` in Vercel | `/api/subscribe` can reach Kit |
| 5 | **Live test (gates SG1 launch):** submit a real email; confirm you get the DOI email + pack **and** that the contact lands in Kit as **unconfirmed/pending**, not `active`. If it lands `active`, the API created a single opt-in subscriber — DOI is being bypassed (see Measurement validity #6) and the on-page "check your email to confirm" copy is wrong | Verifies opt-in mode before any capture form ships |

*Pro waitlist (SG2) later: either a second Form with no incentive, or just the `pro-waitlist` tag — its "you're on the list" message is on-page, not a magnet.*

---

## Tasks

### Done — PR #1
- **F1 — DataFast goals.** *Why: nothing is validatable without event tracking.* Added named wrappers (`trackEmailSignup`, `trackProCtaClick`, `trackProWaitlistSignup`) over existing `trackConversion`. → *Left: confirm events in the dashboard after deploy.*
- **F2 — Email capture → Kit.** *Why: the keystone — start owning the audience.* `<EmailCapture>` + `/api/subscribe` proxy to Kit; fires `email_signup`. → *Left: Kit activation (above) + mounting (SG1).*
- **S1 — Meaning-bearing H1 / title / meta.** *Why: rank + click for "kanji for [meaning]".* Template-wide in `lib/seo/kanji-optimization.ts`.
- **S2 — FAQ + Breadcrumb JSON-LD.** *Why: rich results + zero-click defense.* → *Left: validate live in Google Rich Results Test.*
- **S3 — Internal linking + sitemap.** *Why: ranking lift is the real CTR fix at position 8–12.* Crawlable kanji index, related-kanji backfill, `/free-resources` → kanji links. → *Left: resubmit sitemap + GSC 2–4 wk check.*

### To do
- **SG1 — Mount email capture** on free-resources + progress pages. *Why: capture high-intent visitors we already have.* Drop `<EmailCapture>` with sources `free-resources-pack` / `progress-sync`; keep the direct download visible. **Needs Kit active.** *Done when: both live, segmentable by `referrer`, `email_signup` fires, nothing gated.*
- **SG2 — Pro fake-door.** *Why: measure willingness to pay before building anything.* "Go Pro" entry points (nav, review page, "you've learned 50 kanji" milestone) → Pro page/modal with a **sync-first** value prop (sync + all-levels + AI feedback — *not* SRS, which is already free), price probe **$6.99/mo · $49/yr · 7-day trial** → `<EmailCapture source="pro-waitlist">` (no checkout) → "you're on the list" + 1-tap survey (price reason · what they study). Fire `trackProCtaClick(location)` + `trackProWaitlistSignup(location)` — **`location` (`nav`/`review`/`milestone`/`pro_page`) is required** so the gate can compare CTA placements; survey answers → DataFast metadata. *Done when: goals fire with location, price shown, waitlist emails captured, no payment taken.*
- **SG3 — Revenue attribution.** *Why: stop reading $0.* Connect Gumroad + Stripe/Llanai payment attribution in DataFast. *Done when: non-$0 revenue visible.*
- **SG4 — Retire the ad slot.** *Why: at ~2k visits/mo the inventory isn't worth selling, and third-party ads conflict with the clean, fast free pages.* Remove the `AdBanner` "Your Ad Here" slot entirely for now (fully reversible) rather than repurposing it — an owned offer can fill the space later once SG1/SG2 land or the affiliate test (below) proves out. *Done when: the slot no longer renders.*
- **SG5 — Retire the `/advertise` page.** *Why: we're not selling ads at this scale, and a dead sales page is clutter.* 301-redirect `/advertise` → `/free-resources` and drop it from the sitemap; keep the dynamic learner-count helper (`getMonthlyVisitors`) — it's reusable as social proof elsewhere. *Done when: `/advertise` redirects, no 404s, sitemap updated.*

---

## Affiliate exploration — "supply the means to write" (research, 2026-06-20)
**Framing:** the site's core value is *learn to write kanji the right way*. The natural extension is supplying what people write *with* — genkō-yōshi practice notebooks, pens, kanji workbooks, calligraphy/shodō kits, calendars, stickers — via affiliate links. **This is an exploration track to validate, not a committed plan.** Three parallel research passes (Amazon viability · alternative programs · demand & fit) converged on one picture.

**Verdict: demand is real, but our specific traffic is the wrong-intent end of the funnel.** Genkō-yōshi notebooks, Tuttle workbooks, and $20–50 shodō kits genuinely sell, and Japan's stationery market is growing ~5%/yr. But a visitor searching one kanji's stroke order has *reference* intent, not *shopping* intent — and the category is half-cannibalized by free printables. At ~2k visits/mo this is a **minor trickle at best**, not a business. The precedent that actually pays at this scale is an *owned product* (WaniKani's SaaS model) — i.e. the Pro track (SG2) — not third-party affiliate.

**Don't lead with Amazon Associates.** It stacks its three worst penalties on us at once: lowest commission band (stationery/books ~3–4.5%), a 24h cookie, and per-country payout fragmentation that bleeds a global, Japan-leaning audience (amazon.co.jp needs a *separate* account) — plus a 3-sales-in-180-days rule that can auto-close the account. Keep Amazon only as a OneLink fallback for one-off items the specialists don't carry.

**Better-fit programs (verify exact terms in-dashboard before signup — figures are reported, not yet confirmed):**

| Program | Commission | Cookie | Why |
|---|---|---|---|
| JapanesePod101 | 25% | non-expiring | Best Japanese-learning fit; evergreen earnings |
| OMG Japan | 8–12% | 180 days | Real JP stationery retailer — our exact category; ships worldwide |
| Preply / italki | ~$70 / $10–18 per student | 30 days | Maps to "learn to write Japanese" intent; italki has no payout minimum |
| Jackson's Art | 5–10% | ~30 days | Best calligraphy/shodō option; international (Awin) |
| Etsy | 4% | 30d web / 7d app | On-brand for stickers/genkō-yōshi; modest rate, mid network-migration |
| Skillshare / Domestika | 40% | 30 days | Only if we publish calligraphy-class content |

*Note: JetPens — the obvious first guess — has **no** affiliate program (confirmed). Don't spend time chasing it.*

**The cheapest experiment (do this before committing to anything):** build **one** guide page — *"What you need to start writing kanji by hand"* (paper types, pen tip sizes, beginner vs. hobbyist) ending in a 3–5 link "starter kit." Drive it with a single contextual call-out on stroke-order pages ("Practicing by hand? Here's what you need →") so the dictionary pages stay clean. Track call-out CTR (kanji page → guide), affiliate-link CTR, and actual orders over 60–90 days.
- **Kill** if kanji-page → guide CTR is <1–2% and conversions are negligible — that confirms the intent mismatch, and we stop.
- **Scale** (more roundups: calligraphy kits, JLPT workbook bundles; lean into the "starting to write" segment, not the dictionary) only if the guide page converts even modestly.

**Sequencing:** parallel to and *lower-priority* than the Pro fake-door (SG2). SG2 tests willingness to pay for the owned product the research says is the real lever; the affiliate page is a cheap, reversible side-bet on the writing-supplies cluster. Run SG2 first; slot this in whenever, after SG1.

---

## Sequence
1. **Done — Foundations + SEO:** F1, F2, S1, S2, S3 (merged).
2. **Now — Activate Kit** (ops, no code — section above), then **SG1** so the list starts filling.
3. **Then — SG2 Pro fake-door:** the core willingness-to-pay test.
4. **Parallel / anytime — SG3, SG4, SG5:** attribution + retirement. SG4 (remove slot) and SG5 (retire `/advertise`) are pure removals — they can ship now. The affiliate experiment (below) is a separate, lower-priority side-bet: slot it in after SG1, behind SG2.
5. **After 2–4 weeks — Decision gate** (below).

## Decision gate (into Phase 1)
**Gate on counts reached, not weeks elapsed** (see Measurement validity #1). Open the gate once **≥150 visitors have actually seen a Pro CTA** (not 150 site visitors) — review at that point, or at 4 weeks, whichever is *later*. Metrics: `email_signup` volume + sources, `pro_cta_click` / `pro_waitlist_signup` **broken out by `location`**, survey answers, revenue.
- **Build Pro** if `pro_cta_click` ≥ 2–3% of *visitors who saw a Pro CTA* **and** ≥30% of clickers leave an email. Treat the percentages as directional — at this sample size the confidence interval is wide; a strong absolute signal (e.g. dozens of waitlist emails) matters more than hitting 2.0% vs 3.0%.
- **`email_signup` = submits, not confirmed subscribers.** With DOI on, ~20–30% never confirm, so the goal count runs ~25% above the Kit list. Read confirmed growth from the Kit dashboard; use `email_signup` only for funnel/CTR.
- **Lean lead-magnet / affiliate** if email is strong but Pro is weak.
- **Sync is the tell:** if milestone CTAs out-convert the nav CTA (compare by `location`), retention anxiety is the buying trigger.

---

## Measurement validity & risks
Phase 0 is a *measurement* exercise, so threats to the numbers are first-class risks. Each item: the threat, then the mitigation (✅ done in code / ⚠️ ops or judgement / ☐ to decide).

1. **Underpowered sample.** At ~2k visits/mo, a 2–4 week window yields single/low-double-digit conversions on the review page — too few to distinguish a 2% rate from 4%. *Mitigation:* ⚠️ gate on **counts reached** (≥150 CTA views), not elapsed time; read percentages as directional, weight absolute volume.
2. **Silent goal drops (timing).** DataFast loads `defer`, so its visitor cookie is set after parse; early conversions read an empty cookie and were dropped, biasing every rate down. *Mitigation:* ✅ `trackConversion` now polls for the cookie (`waitForVisitorId`) before sending.
3. **Silent goal drops (blocked).** Ad-blockers / privacy browsers never set the cookie, so those conversions can't be attributed at all — a residual downward bias we can't fully remove. *Mitigation:* ✅ genuine drops now log a distinct `console.warn` so they're countable; ⚠️ sanity-check goal totals against Kit signups to estimate the gap.
4. **Denominator mismatch.** `pro_cta_click` fires from the nav (every page) and the review page; comparing nav-inclusive clicks to a review-only denominator is meaningless. *Mitigation:* ✅ every Pro event now carries a required `location`; gate denominator = "visitors who saw a Pro CTA," compared per location.
5. **Submit vs confirmed conflation.** `email_signup` counts typed emails; DOI means ~20–30% never confirm, so the goal overstates the list. *Mitigation:* ⚠️ gate defines `email_signup` as submits and reads confirmed growth from Kit; ☐ optionally wire a Kit confirm webhook for a true confirmed-signup goal.
6. **DOI may be silently bypassed.** The `/api/subscribe` fallback (`POST /v4/subscribers`) creates `state: active` (single opt-in); once active, the form add won't re-trigger confirmation, so that subscriber skips consent and may not get the pack — and the on-page "check your email to confirm" copy becomes a lie. *Mitigation:* ⚠️ **Kit live-test (activation step 5) gates SG1 launch** — verify contacts land *unconfirmed*. ☐ If the plain form-subscribe works without the fallback, delete the fallback; if not, fix the success copy to match single opt-in.
7. **SEO timeline vs gate window.** Capture depends on traffic S1–S3 are still growing (GSC lift takes weeks–months); a time-boxed gate could fire at the lowest-traffic moment. *Mitigation:* ⚠️ count-based gate (#1) absorbs this.
8. **PII in logs.** `/api/datafast` logs full request bodies; the `payment` path includes `email`/`name`, and goals attach `user_agent` + full URL. *Mitigation:* ☐ trim payment-body logging before SG3; revisit consent-banner copy given the GDPR framing.
9. **No abuse protection.** `/api/subscribe` is public and unauthenticated — it can be used to subscription-bomb arbitrary emails via your domain, hurting Kit deliverability. *Mitigation:* ☐ add a honeypot field or per-IP throttle before/with SG1.
