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

- **Kit** — the email list: opt-in, magnet delivery, tags, broadcasts, future nurture.
- **Resend** — transactional mail only (contact form, feedback). Kept separate to protect its sending reputation.
- **DataFast** — analytics + conversion goals.

**One capture pipeline, reused everywhere:**

```
<EmailCapture source="…"/>  →  POST /api/subscribe  →  Kit   (+ fires DataFast email_signup)
```

Every surface (free resources, progress, Pro waitlist, ad slot) uses the same component with a different `source`. `source` is sent to Kit as the subscriber `referrer`; promote important ones to **tags** for segmentation.

---

## Kit activation
The code is done; this is dashboard + env config to turn the list on.

**Double opt-in (DOI):** single opt-in adds the typed email instantly; DOI emails a "confirm" link first and only adds them after they click — then auto-sends the pack. DOI = cleaner list, real consent (GDPR), better deliverability; ~20–30% never confirm. **Use DOI on.**

**Segmentation = tags:** a tag is a label on a subscriber (`free-resources-pack`, `pro-waitlist`). Broadcast/automate per tag so each audience gets the right message.

| # | Step | Objective |
|---|------|-----------|
| 1 | Create a Kit account | The list exists |
| 2 | Create one **Form** for the lead magnet → enable **double opt-in** → attach the practice-pack PDF as the **incentive** | Confirmed signups auto-receive the pack, no code |
| 3 | Create tags: `free-resources-pack`, `progress-sync`, `pro-waitlist` | Segmentable audiences |
| 4 | Copy the **v4 API key** (Settings → Advanced → API) + the **Form ID** (in the form URL); set `KIT_API_KEY` + `KIT_FORM_ID` in Vercel | `/api/subscribe` can reach Kit |
| 5 | **Live test:** submit a real email; confirm you get the DOI email + pack and the contact appears in Kit | Verifies opt-in mode — Kit's API can create contacts as `active` (single opt-in) depending on account settings; this catches it |

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
- **SG1 — Mount email capture** on free-resources + progress pages. *Why: capture high-intent visitors we already have.* Drop `<EmailCapture>` with sources `free-resources-pack` / `progress-sync`; keep the direct download visible. **Needs Kit active.** *Done when: both live, tagged, `email_signup` fires, nothing gated.*
- **SG2 — Pro fake-door.** *Why: measure willingness to pay before building anything.* "Go Pro" entry points (nav, review page, "you've learned 50 kanji" milestone) → Pro page/modal with a **sync-first** value prop (sync + all-levels + AI feedback — *not* SRS, which is already free), price probe **$6.99/mo · $49/yr · 7-day trial** → `<EmailCapture source="pro-waitlist">` (no checkout) → "you're on the list" + 1-tap survey (price reason · what they study). Fire `pro_cta_click` + `pro_waitlist_signup`; survey answers → DataFast metadata. *Done when: goals fire, price shown, waitlist emails captured, no payment taken.*
- **SG3 — Revenue attribution.** *Why: stop reading $0.* Connect Gumroad + Stripe/Llanai payment attribution in DataFast. *Done when: non-$0 revenue visible.*
- **SG4 — Repurpose ad slot.** *Why: stop wasting inventory until ~10× traffic.* Replace AdBanner "Your Ad Here" with an owned offer (Pro waitlist / email capture). *Done when: slot promotes an owned offer.*
- **SG5 — Verify learner count.** *Why: advertiser trust.* `/advertise` already pulls a live count; confirm no inflated hardcoded number remains. *Done when: count is accurate/dynamic.*

---

## Sequence
1. **Done — Foundations + SEO:** F1, F2, S1, S2, S3 (merged).
2. **Now — Activate Kit** (ops, no code — section above), then **SG1** so the list starts filling.
3. **Then — SG2 Pro fake-door:** the core willingness-to-pay test.
4. **Parallel / anytime — SG3, SG4, SG5:** attribution + cleanup. (SG4 best after SG2 — it needs the offer to point at.)
5. **After 2–4 weeks — Decision gate** (below).

## Decision gate (into Phase 1)
Review at 2–4 weeks: `email_signup` volume + sources, `pro_cta_click` / `pro_waitlist_signup`, survey answers, revenue.
- **Build Pro** if `pro_cta_click` ≥ 2–3% of review-page visitors **and** ≥30% of clickers leave an email. Survey answers say what to build first.
- **Lean lead-magnet / affiliate** if email is strong but Pro is weak.
- **Sync is the tell:** if milestone prompts out-convert the nav CTA, retention anxiety is the buying trigger.
