# Product Requirements Document: Phase 0 — Growth & Monetization Validation

## Document Info
- **Version**: 1.0
- **Created**: 2026-06-14
- **Status**: Planning
- **Owner**: Ari Nakos
- **Source brief**: "Michikanji — Phase 0 Implementation Brief" (14 Jun 2026)

---

## Executive Summary

Phase 0 captures the search demand MichiKanji already earns, starts building an owned audience (email), and **validates willingness to pay** for a paid "Pro" tier — all without building a real paid product or gating any free reference page.

The plan resequences the original four-workstream brief around three realities found in the codebase:

1. **Email capture is the keystone, not a peer workstream.** The site is 100% localStorage with no accounts (`app/kanji/review/`, `app/kanji/progress/`). "Own the audience," "cross-device sync" (the Pro pitch), and "pre-seed the waitlist" all collapse onto one primitive: capturing an email. Partial infra already exists — `lib/resend.ts` has a dormant `sendSubConfirmEmail` (double opt-in) with no UI wired to it. Build the capture component **once**, deploy it in three places.

2. **The Pro fake-door must not advertise a free feature.** `app/kanji/review/` already ships working spaced-repetition. The real Pro wedge, given the no-auth architecture, is **cross-device sync + all-levels unlock + AI writing feedback** — lead with sync, demote SRS.

3. **Measurement plumbing exists but fires nowhere.** `app/api/datafast/route.ts` supports `goal` and `payment` events, but no UI calls them. Wiring events is a prerequisite to all validation, not part of a later task. Separately, `/advertise` already pulls the learner count dynamically (`getMonthlyVisitors`), so the original "fix the 2,707 number" task is largely already done.

---

## Guardrails (apply to every task)

- **Never gate or slow** the free kanji lookup / stroke-order pages — they are the acquisition + AI-search engine.
- No keyword stuffing; keep copy natural. Keep pages fast (they are SEO assets).
- Everything additive and reversible; ship behind small, measurable changes.
- No real checkout, no charge in Phase 0 — instrument intent only.

---

## Goals & Success Metrics

### Primary Goals
- **Capture earned demand**: lift CTR on pages already ranking (12-mo GSC: 293K impressions, 2.55K clicks, 0.9% CTR, avg position 7.6).
- **Own the audience**: a working, source-tagged, double-opt-in email list.
- **Validate willingness to pay**: instrumented Pro fake-door measuring intent + price sensitivity, no product built.

### Success Metrics (review at 2–4 weeks)
- GSC CTR + position deltas on the target page set (CTR < 1.5%, position 4–15).
- `email_signup` count and source-tag distribution.
- `pro_cta_click` and `pro_waitlist_signup` counts; survey answers captured.
- Revenue visible (non-$0) in DataFast.

### Decision Gate into Phase 1
- **Greenlight Pro build** if `pro_cta_click` ≥ 2–3% of review-page visitors **AND** ≥30% of clickers leave an email. Survey answers dictate what to build first.
- **Lean lead-magnet / affiliate** if `email_signup` is strong but Pro intent is weak.
- **Sync is the tell**: if milestone prompts convert better than the nav CTA, retention anxiety is the buying trigger.

---

## Task Tracker

Status legend: ⬜ Not started · 🟡 In progress · ✅ Done · ⏸️ Blocked

### Foundations (front-loaded — unblock all measurement & ownership)

#### F1 — Wire DataFast goal events `✅`
- **Goal**: Make Phase 0 validatable; nothing else means anything without it.
- **Why**: `app/api/datafast/route.ts` already supports `goal`/`payment` events, but no UI fires them.
- **Do**:
  - [x] Client helper already existed (`lib/analytics/index.ts` `trackConversion` + `getDataFastVisitorId`); added named wrappers `trackGoal`, `trackEmailSignup(source)`, `trackProCtaClick`, `trackProWaitlistSignup`.
  - [x] `email_signup` wired and firing from `EmailCapture` (F2). `pro_cta_click` / `pro_waitlist_signup` wrappers ready for SG2.
  - [ ] **Manual follow-up**: confirm events land in the DataFast dashboard after deploy.
- **Acceptance**: ✅ Goal wrappers exist and fire from real UI (`email_signup` live; pro_* ready for SG2). Dashboard confirmation pending live deploy.
- **Depends on**: —
- **Files**: `lib/analytics/index.ts` (wrappers appended), `app/api/datafast/route.ts` (existing).

#### F2 — Reusable email-capture component + ESP `✅`
- **Goal**: One capture primitive serving free-resources, progress, and the Pro waitlist.
- **Why**: Keystone of Phase 0; no accounts exist, so email is how we start owning identity.
- **Do**:
  - [x] ESP decision: **extended Resend** (no new dependency). Subscribers stored via Resend Audiences/Contacts when `RESEND_AUDIENCE_ID` set; admin notification email as durable fallback record.
  - [x] Built `<EmailCapture source="..." />` (`components/EmailCapture.tsx`) with required `source` prop, status machine, consent microcopy.
  - [x] Stateless double opt-in (no DB): HMAC-signed token (`lib/subscribe/token.ts`, 24h expiry) → `POST /api/subscribe` sends branded confirm email → `GET /api/subscribe/confirm` verifies + redirects to `/subscribed`.
  - [x] Source tag carried through token → contact/admin record; consent + privacy copy on the form.
  - [x] Fires F1's `email_signup` (with source) on successful submit.
- **Acceptance**: ✅ Signup → double opt-in → confirm email; source tags recorded; `email_signup` fires; consent copy present. *Note: needs `EMAIL_TOKEN_SECRET` (and optional `RESEND_AUDIENCE_ID`) set in env; component not yet mounted on pages — that's SG1.*
- **Depends on**: F1.
- **Files**: `components/EmailCapture.tsx`, `lib/subscribe/token.ts`, `app/api/subscribe/route.ts`, `app/api/subscribe/confirm/route.ts`, `app/subscribed/page.tsx`, `lib/emails/templates/michikanji-confirm.html`, `.env.example`.

### SEO / CTR capture (fully parallel — no dependency on F1/F2)

#### S1 — Meaning-bearing H1 + reverse-intent intro + title/meta templates `✅`
- **Goal**: Rank for and click through on "kanji for [meaning]" / "[meaning] in Japanese".
- **Why**: H1 is today a bare character (`app/kanji/[character]/page.tsx:150`); reverse-intent phrasing is untargeted.
- **Do** (all via templates — repo-wide, not per-file):
  - [x] H1 → `{kanji} — "{meaning}" Kanji` (big character kept as visual `<span>`; primary meaning now real text in the `<h1>`).
  - [x] Added one-sentence above-the-fold intro targeting reverse intent ("The Japanese kanji for '{meaning}' is {kanji}…").
  - [x] Title template — chose **A** site-wide: `{kanji} — "{meaning}" Kanji: Stroke Order & Readings (JLPT {level})` (`lib/seo/kanji-optimization.ts`).
  - [x] Meta description template pulls onyomi/kunyomi + ends with a free-practice CTA; empty readings skipped.
- **Acceptance**: ✅ Unique meaning-bearing H1, title, and meta on every kanji page, generated from templates.
- **Depends on**: —
- **Files**: `app/kanji/[character]/page.tsx`, `lib/seo/kanji-optimization.ts`.

#### S2 — FAQPage + Breadcrumb JSON-LD `✅`
- **Goal**: Win expandable rich results + zero-click defense while still earning the animation click.
- **Why**: Article JSON-LD exists (`app/kanji/[character]/page.tsx:110-127`); FAQPage + Breadcrumb do not.
- **Do**:
  - [x] Added FAQPage JSON-LD with 3 Q&As (meaning / how-to-write + stroke order / readings) from existing data. *Note: kanji dataset has no stroke-count field, so Q2 covers stroke order via the on-page animation rather than an exact count.*
  - [x] Added BreadcrumbList JSON-LD (Home → Kanji Dictionary → kanji) and upgraded the visible breadcrumb to match.
  - [x] Kept Article JSON-LD; all three emitted as one JSON-LD array.
  - [ ] **Manual follow-up**: validate the live page in Google Rich Results Test after deploy.
- **Acceptance**: ✅ FAQ + Article + Breadcrumb JSON-LD present (Rich Results Test pending live deploy).
- **Depends on**: —
- **Files**: `app/kanji/[character]/page.tsx`.

#### S3 — Internal linking + sitemap resubmit `✅`
- **Goal**: Ranking lift (the real fix for position 8–12 CTR) by passing authority to target pages.
- **Why**: `RelatedKanjiSection` exists but link footprint is thin; `/free-resources` doesn't link to kanji pages.
- **Do**:
  - [x] Target set lives in `lib/linking/priority-kanji.ts`, seeded from the known top-impression chars (`docs/marketing/immediate-optimization-opportunities.md`) + fundamental beginner kanji. *Documented to be regenerated from the real GSC export — no on-disk export exists yet.*
  - [x] Added `PopularKanjiLinks` (crawlable links to priority kanji) to `/free-resources` and `/free-resources/kanji-sheets`.
  - [x] Extended `getRelatedKanji` with same-level backfill so **every** kanji page links out (~8); added a server-rendered "Complete kanji index" to `/kanji` so all 1000+ detail pages are linked in initial HTML (crawlable).
  - [x] Regenerated dynamic sitemap (`app/sitemap.xml/route.ts`) to include `/free-resources/*` + `/advertise`. *(`public/sitemap.xml` refreshes via the `next-sitemap` postbuild on next deploy.)*
  - [ ] **Manual follow-up**: resubmit sitemap + request indexing for top updated pages in GSC; schedule the 2–4 week CTR/position check.
- **Acceptance**: ✅ `/free-resources` links to kanji pages; hub links crawlable; sitemap regenerated (resubmit + GSC check are manual external steps).
- **Depends on**: —
- **Files**: `app/free-resources/`, `lib/linking/kanji-links.ts`, `lib/linking/priority-kanji.ts`, `components/kanji/PopularKanjiLinks.tsx`, `app/kanji/page.tsx`, `app/sitemap.xml/route.ts`.

### Audience & monetization validation

#### SG1 — Email capture on free-resources + progress page `⬜`
- **Goal**: Capture high-intent visitors at the moments we already have them.
- **Why**: ~2,000 visitors/mo, no list. Free downloads + progress are natural capture points.
- **Do**:
  - [ ] Free-resources: keep direct download visible (don't hurt SEO/UX); add soft "get the complete N5 pack + future sheets by email" → deliver full pack.
  - [ ] Progress page: "save your progress across devices & get review reminders — add your email" (pre-seeds Pro waitlist).
  - [ ] Use F2 component with distinct source tags per placement.
- **Acceptance**: Both placements live; source-tagged; `email_signup` fires; free download never gated.
- **Depends on**: F2.
- **Files**: `app/free-resources/`, `app/kanji/progress/`.

#### SG2 — Pro fake-door `⬜`
- **Goal**: Measure real demand + price sensitivity for a paid study tier. No product, no charge.
- **Why**: Two prior monetization attempts shipped before validating; test first this time.
- **Do**:
  - [ ] Add "Go Pro" entry points: nav, review page, milestone prompt ("you've learned 50 kanji — unlock cross-device review with Pro").
  - [ ] Pro page/modal with **sharpened, sync-first value prop** (sync + all-levels + AI feedback lead; SRS demoted since it's already free).
  - [ ] Price probe: **$6.99/mo or $49/yr · 7-day free trial** (deliberately below Llanai's $10; movable).
  - [ ] CTA captures email for waitlist (F2), **not** checkout → "you're on the list" confirmation.
  - [ ] Optional 1-tap survey: "#1 thing that would make it worth paying for?" + "what are you studying for?" [JLPT · travel · work · anime/manga · curiosity].
  - [ ] Fire `pro_cta_click` and `pro_waitlist_signup` (F1).
- **Acceptance**: Goals fire; price shown; emails captured with source + survey answers; **no payment taken.**
- **Depends on**: F1, F2.
- **Files**: new `app/pro/` or modal component, nav, `app/kanji/review/`, milestone logic.

### Attribution & cleanup

#### SG3 — Revenue attribution in DataFast `⬜`
- **Goal**: Stop reading $0; see MichiKanji → paid conversion.
- **Do**:
  - [ ] Connect Gumroad + Llanai/Stripe revenue attribution (the unchecked "Attribute payments" setup step).
- **Acceptance**: Revenue visible (non-$0) in DataFast.
- **Depends on**: —
- **Files**: config + `app/api/datafast/route.ts` (payment events).

#### SG4 — Repurpose the open ad slot `⬜`
- **Goal**: Stop wasting inventory until external ads make sense (~10x traffic).
- **Why**: `components/AdBanner.tsx` fallback renders generic "Your Ad Here".
- **Do**:
  - [ ] Replace fallback with an owned-offer CTA (Pro waitlist / email capture / Llanai).
- **Acceptance**: Open slot promotes an owned offer.
- **Depends on**: F2, SG2.
- **Files**: `components/AdBanner.tsx`.

#### SG5 — Verify public learner count (downgraded) `⬜`
- **Goal**: Advertiser trust — number must be accurate.
- **Why**: `/advertise` already pulls live count via `getMonthlyVisitors` (fallback "2,000+"); original "2,707" task appears mostly solved.
- **Do**:
  - [ ] Verify no inflated hardcoded count remains anywhere; confirm fallback copy is conservative.
- **Acceptance**: Public learner count matches reality or is dynamic.
- **Depends on**: —
- **Files**: `app/advertise/page.tsx`, `lib/datafast/getMonthlyVisitors.ts`.

---

## Sequencing

- **PR #1 (compounding + keystone, low-risk):** F1 + F2 + S1 + S2.
- **PR #2 (validation surfaces, once capture is proven):** S3 + SG1 + SG2 + SG3 + SG4 (+ SG5 verification).
- SEO tasks (S1–S3) can proceed fully in parallel — they share no dependency with F1/F2.

## Dependency graph

```
F1 ──┬─> SG2
     └─> F2 (event on signup)
F2 ──┬─> SG1
     ├─> SG2
     └─> SG4
S1, S2, S3  (independent, parallel)
SG3, SG5    (independent)
```

## One-line PR description
> Phase 0 — capture existing search demand (SEO/CTR + structured data), start the email list, and validate a paid "Pro" tier via an instrumented fake-door; no gating of free pages, no real checkout yet.
