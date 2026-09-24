# Phase 0 — Growth & Monetization Validation

**Version 2.1** · Updated 2026-09-16 · Owner: Ari Nakos
**Status:** PR #1 shipped (foundations + SEO). Next: mount email capture (SG1) → Pro fake-door.
**Source:** "Michikanji — Phase 0 Implementation Brief" (14 Jun 2026)

> **The email vendor in this document is wrong everywhere it appears.** Phase 0 was written around
> Kit (ConvertKit). Kit is no longer part of the pipeline in any form: the list is owned on Resend and
> sends from our own authenticated domain, and the Kit account is being cancelled (migration task M9
> in [`story-delivery-resend.md`](./story-delivery-resend.md), still open). `KIT_API_KEY` and
> `KIT_FORM_ID` are still set in Vercel and are referenced by no code. That document's "Sections this
> supersedes" table also **voids the "second Kit form + env var" carry-over obligation** recorded
> below — SG1 gets a `source` value, not a second form.
>
> The Kit passages are marked in place rather than deleted. Everything Phase 0 says about *why* — why
> double opt-in, why submits are not subscribers, why an unauthenticated subscribe endpoint is a
> deliverability risk — survived the vendor change and is still the reasoning to work from.

## Goal
Capture the search traffic we already earn, start an email list we own, and validate willingness to pay for a "Pro" tier — without gating any free page or taking a real payment.

## Guardrails
- Never gate or slow the free kanji / stroke-order pages — they are the acquisition engine.
- Additive, reversible, measurable changes only.
- No checkout, no charge — instrument intent only.

---

## Stack
Two backends, one job each. **We own all UI in-repo; these are only destinations** (no vendor-hosted or embedded forms → no lock-in). That rule is why the vendor swap below cost no UI work.

- **Resend** — the email list *and* transactional mail (contact form, feedback). One vendor for both is a deliberate, accepted trade: reputations are kept independent by sending the newsletter from `stories.michikanji.com` rather than by using a second vendor. Sends as `Ari at MichiKanji <ari@michikanji.com>`, reply-to `ari@llanai.com`.
- **DataFast** — analytics + conversion goals, and the **only** place the signup surface is recorded.

*Superseded, kept because it is why the pipeline is shaped this way:* the original split was **Kit** for the list (opt-in, magnet delivery, referrer-based segments, broadcasts, future nurture) and **Resend** for transactional only, kept separate to protect Resend's sending reputation. See `story-delivery-resend.md` §1 and §3 for why that stopped being worth a second vendor.

**One capture pipeline, reused everywhere:**

```
<EmailCapture source="…"/>  →  POST /api/subscribe  →  signed 48h token  →  consent email (Resend)
                                                   (+ fires DataFast email_signup)
                        GET /api/subscribe/confirm  →  contact created in Resend
```

Every surface (free resources, progress, Pro waitlist, ad slot) uses the same component with a different `source`, and `source` is validated against `EmailSignupSource` before it travels anywhere.

**Segmentation does not come from the contact.** Resend contacts are global and sit in Segments; there is no audience id, no `referrer` field and no `source` property on a contact. Per-surface signup rate is read from DataFast's `email_signup(source)` at capture time, not from the list. *Superseded, for the record:* Phase 0 sent `source` to Kit as the subscriber `referrer` and told you to build Kit segments by filtering on it, applying no tags — `referrer` ≠ tag. None of that mechanism exists now.

---

## ~~Kit activation~~ — superseded; the list is live on Resend

**Do not work this section.** There is no Kit account to activate and no dashboard step left: the
capture path is code we own end to end, described in `story-delivery-resend.md` §5, and the operator
procedure for a send is [`../runbooks/newsletter.md`](../runbooks/newsletter.md). The whole section is
kept below because the double-opt-in argument and the live-test design outlived the vendor.

**Double opt-in (DOI) — still the design, now built rather than configured.** Single opt-in adds the
typed email instantly; DOI emails a "confirm" link first and only adds them after they click. DOI =
cleaner list, real consent (GDPR), better deliverability; ~20–30% never confirm. **DOI is on**, and it
is ours: `POST /api/subscribe` creates no contact at all, it mints a signed 48h token and mails it,
and `GET /api/subscribe/confirm` is the only thing that creates a contact. The list holds confirmed
addresses by construction rather than by a vendor setting.

**Step 5's live test still gates any new capture surface**, in its Resend form: submit a fresh
address and check that **no contact exists before the click** — checking only the end state cannot
detect an accidental single-opt-in path. Full procedure at `story-delivery-resend.md` §5 Phase 2
step 9.

*The Kit-era activation steps, kept as the record of what Phase 0 planned:*

| # | Step | Objective |
|---|------|-----------|
| 1 | ~~Create a Kit account~~ | The list exists |
| 2 | ~~Create one **Form** for the lead magnet → enable **double opt-in** → attach the practice-pack PDF as the **incentive**~~ | Confirmed signups auto-receive the pack, no code |

> **⚠️ Void — no Kit forms exist.** This obligation was recorded on 2026-08-23 and is voided by
> `story-delivery-resend.md`'s supersession table: **SG1 gets a `source` value, not a second form.**
> What it said, and why: the single `KIT_FORM_ID` env var the table assumes had been claimed by the
> weekly-story newsletter (a no-incentive form), so SG1 would have had to create a *second* Kit form
> with the practice pack attached, add its own env var, and add a `source`→form map in
> `app/api/subscribe/route.ts` — because the confirmation email and redirect were per-form, and
> skipping it meant pack-seekers got the newsletter's confirmation email and never received the pack.
> The live constraint that replaces it: pack delivery is not a vendor feature any more, so whoever
> ships SG1 has to decide how the practice pack actually reaches a confirmed subscriber.
| 3 | ~~(Optional) Add a Kit automation that tags subscribers by their `referrer` value (`free-resources-pack`, `progress-sync`, `pro-waitlist`)~~ | Tag-triggered automations, if needed later |
| 4 | ~~Copy the **v4 API key** + the **Form ID**; set `KIT_API_KEY` + `KIT_FORM_ID` in Vercel~~ | Both vars are still set in Vercel and read by no code. Removing them is part of M9 |
| 5 | **Live test (gates SG1 launch)** — see above; the Resend form of this test is the live one. The Kit form of it was: confirm the contact lands **unconfirmed/pending**, not `active`, because `active` meant the API had created a single opt-in subscriber and the on-page "check your email to confirm" copy was a lie (Measurement validity #6) | Verifies opt-in before any capture form ships |

*Pro waitlist (SG2) later: it needs no separate list or form — its "you're on the list" message is on-page, not a magnet, and `source = pro-waitlist` is what distinguishes it in DataFast.*

---

## Tasks

### Done — PR #1
- **F1 — DataFast goals.** *Why: nothing is validatable without event tracking.* Added named wrappers (`trackEmailSignup`, `trackProCtaClick`, `trackProWaitlistSignup`) over existing `trackConversion`. → *Left: confirm events in the dashboard after deploy.*
- **F2 — Email capture.** *Why: the keystone — start owning the audience.* `<EmailCapture>` + `/api/subscribe`; fires `email_signup`. Shipped as a proxy to Kit and since rewritten: the route now owns double opt-in itself against Resend. → *Left: mounting (SG1).*
- **S1 — Meaning-bearing H1 / title / meta.** *Why: rank + click for "kanji for [meaning]".* Template-wide in `lib/seo/kanji-optimization.ts`.
- **S2 — FAQ + Breadcrumb JSON-LD.** *Why: rich results + zero-click defense.* → *Left: validate live in Google Rich Results Test.*
- **S3 — Internal linking + sitemap.** *Why: ranking lift is the real CTR fix at position 8–12.* Crawlable kanji index, related-kanji backfill, `/free-resources` → kanji links. → *Left: resubmit sitemap + GSC 2–4 wk check.*

### To do
- **SG1 — Mount email capture** on free-resources + progress pages. *Why: capture high-intent visitors we already have.* Drop `<EmailCapture>` with sources `free-resources-pack` / `progress-sync`; keep the direct download visible. **Needs the Resend capture path working end to end in production** — it was not until 2026-09-16, when `RESEND_WEEKLY_STORIES_SEGMENT_ID` was finally set in Production and the deployment rebuilt; before that, confirm returned 503 and no contact was ever created. Verify with `pnpm check-subscribe-live` rather than assuming, and note Preview still lacks the variable (`docs/runbooks/newsletter.md`). *Done when: both live, each `source` distinguishable in DataFast, `email_signup` fires, nothing gated.*
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
2. **Now — SG1** so the list starts filling. (This step used to read "activate Kit, then SG1". There is nothing to activate: the list is on Resend and the capture path is code. What stands between here and a filling list is the production config in `story-delivery-resend.md`'s Status block, not a dashboard.)
3. **Then — SG2 Pro fake-door:** the core willingness-to-pay test.
4. **Parallel / anytime — SG3, SG4, SG5:** attribution + retirement. SG4 (remove slot) and SG5 (retire `/advertise`) are pure removals — they can ship now. The affiliate experiment (below) is a separate, lower-priority side-bet: slot it in after SG1, behind SG2.
5. **After 2–4 weeks — Decision gate** (below).

## Decision gate (into Phase 1)
**Gate on counts reached, not weeks elapsed** (see Measurement validity #1). Open the gate once **≥150 visitors have actually seen a Pro CTA** (not 150 site visitors) — review at that point, or at 4 weeks, whichever is *later*. Metrics: `email_signup` volume + sources, `pro_cta_click` / `pro_waitlist_signup` **broken out by `location`**, survey answers, revenue.
- **Build Pro** if `pro_cta_click` ≥ 2–3% of *visitors who saw a Pro CTA* **and** ≥30% of clickers leave an email. Treat the percentages as directional — at this sample size the confidence interval is wide; a strong absolute signal (e.g. dozens of waitlist emails) matters more than hitting 2.0% vs 3.0%.
- **`email_signup` = submits, not confirmed subscribers.** With DOI on, ~20–30% never confirm, so the goal count runs ~25% above the real list. Read confirmed growth from the Resend contact list (the Weekly Stories Segment); use `email_signup` only for funnel/CTR.
- **Lean lead-magnet / affiliate** if email is strong but Pro is weak.
- **Sync is the tell:** if milestone CTAs out-convert the nav CTA (compare by `location`), retention anxiety is the buying trigger.

---

## Measurement validity & risks
Phase 0 is a *measurement* exercise, so threats to the numbers are first-class risks. Each item: the threat, then the mitigation (✅ done in code / ⚠️ ops or judgement / ☐ to decide).

1. **Underpowered sample.** At ~2k visits/mo, a 2–4 week window yields single/low-double-digit conversions on the review page — too few to distinguish a 2% rate from 4%. *Mitigation:* ⚠️ gate on **counts reached** (≥150 CTA views), not elapsed time; read percentages as directional, weight absolute volume.
2. **Silent goal drops (timing).** DataFast loads `defer`, so its visitor cookie is set after parse; early conversions read an empty cookie and were dropped, biasing every rate down. *Mitigation:* ✅ `trackConversion` now polls for the cookie (`waitForVisitorId`) before sending.
3. **Silent goal drops (blocked).** Ad-blockers / privacy browsers never set the cookie, so those conversions can't be attributed at all — a residual downward bias we can't fully remove. *Mitigation:* ✅ genuine drops now log a distinct `console.warn` so they're countable; ⚠️ sanity-check goal totals against confirmed contacts in Resend to estimate the gap.
4. **Denominator mismatch.** `pro_cta_click` fires from the nav (every page) and the review page; comparing nav-inclusive clicks to a review-only denominator is meaningless. *Mitigation:* ✅ every Pro event now carries a required `location`; gate denominator = "visitors who saw a Pro CTA," compared per location.
5. **Submit vs confirmed conflation.** `email_signup` counts typed emails; DOI means ~20–30% never confirm, so the goal overstates the list. *Mitigation:* ⚠️ gate defines `email_signup` as submits and reads confirmed growth from the Resend contact list; ☐ optionally fire a distinct confirmed-signup goal from `app/api/subscribe/confirm/route.ts`, which is our own code — this no longer needs a vendor webhook.
6. **DOI may be silently bypassed.** *Resolved, and kept because it is the reason a whole class of code must not come back.* The `/api/subscribe` Kit fallback (`POST /v4/subscribers`) created `state: active` (single opt-in); once active, the form add would not re-trigger confirmation, so that subscriber skipped consent and might not get the pack — and the on-page "check your email to confirm" copy became a lie. *Mitigation:* ✅ the fallback was **deleted at the Resend migration and is deliberately not reimplemented** — `app/api/subscribe/route.ts`'s header comment records why. ⚠️ the live test still gates any new capture surface, now in the form "confirm no contact exists **before** the click".
7. **SEO timeline vs gate window.** Capture depends on traffic S1–S3 are still growing (GSC lift takes weeks–months); a time-boxed gate could fire at the lowest-traffic moment. *Mitigation:* ⚠️ count-based gate (#1) absorbs this.
8. **PII in logs.** `/api/datafast` logs full request bodies; the `payment` path includes `email`/`name`, and goals attach `user_agent` + full URL. *Mitigation:* ☐ trim payment-body logging before SG3; revisit consent-banner copy given the GDPR framing.
9. **No abuse protection.** `/api/subscribe` is public and unauthenticated — it can be used to subscription-bomb arbitrary emails via your domain. The stake is higher than when this was written: it now burns **our own** sending reputation, not a vendor's. *Mitigation:* ✅ per-IP throttle shipped (`rateLimit(2, 10 * 60 * 1000)`, the same shape as `/api/feedback`). Note what it is not: an in-memory `Map`, so the window is per serverless instance — it stops a naive script from one IP, not a distributed attack. ☐ a honeypot field is still open.
