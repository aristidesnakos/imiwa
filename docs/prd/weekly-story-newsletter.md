# Weekly Story Newsletter — Roadmap

**Version 1.5** · Created 2026-08-20 · Updated 2026-09-16 · Owner: Ari Nakos

**Status: this is the pilot plan, and every operational instruction in it that names Kit is
superseded.** The newsletter is sent from Resend, from our own authenticated domain. Kit is not part
of the pipeline in any form and the account is being cancelled (migration task M9, still open).
[`story-delivery-resend.md`](./story-delivery-resend.md) is the live design and wins wherever the two
disagree; its "Sections this supersedes" table names exactly which parts of this document it
replaces. The procedure for an actual send is [`../runbooks/newsletter.md`](../runbooks/newsletter.md)
— follow that, not the send instructions below.

**Still live here:** the placement research, the content and editorial plan, and the decision gate.
The Kit sections are kept rather than deleted because they record why the pilot was shaped the way it
was — read them as history, not as instructions.

**Status as it stood on 2026-08-23, kept as the record of where the pilot got to:** Kit form
configured; capture copy fixed (committed `f30f50c`); `/api/subscribe` rate-limited; `EmailCapture`
mounted on the homepage — all on branch `feat/weekly-story-capture`, not yet merged or deployed.
Open decisions 1 and 2 were settled; the content pilot had not started. What shipped instead is
`story-delivery-resend.md` §4.

**Related:** [`story-delivery-resend.md`](./story-delivery-resend.md) (the live design — read this first) · [`phase-0-growth-monetization.md`](./phase-0-growth-monetization.md) (SG1 — the capture pipeline this reuses) · [`../runbooks/newsletter.md`](../runbooks/newsletter.md) (how a send is actually done) · [`../3rdVersion/seo-operations-review.md`](../3rdVersion/seo-operations-review.md) (the CTR finding placement rests on)

## What this is

A free weekly email: a short story built from kanji a beginner already knows, plus 3–5 new
target-vocab words with a memory hook, linking back to the relevant `/kanji/<char>` pages.
**Audience: N5–N4 only**, to keep the return signal clean.

The pilot answers one question — do people read it and come back? If they do, the payoff is
**collaborations with Japanese language teachers**, pitched on the pilot's own numbers. Everything
stays free through the pilot. `engagement-log.csv` (repo root, header row only, untracked) is the
ledger for that outreach: commit it or delete it.

## Non-goals

- No paywall, no quiz gate, no billing, no accounts, no new backend.
- No second domain (a `jlptmanga.com`-style comic site was considered and killed — see memory).
- No multi-level tracks, no cron job, no modal or exit-intent signup.

## Where the signup appears

**The detail pages are not where the visitors are.** Page-dimension, 28 days to 2026-07-30: 1,771
clicks across 903 pages. The `kanjiPages` aggregate in `query-history.json` gives `/kanji/<char>`
**97 clicks against 38,670 impressions** — 0.25% CTR at position 10.5, against 3.85% site-wide. So
~1,890 detail pages take 58% of impressions and 5.5% of clicks
(`../3rdVersion/seo-operations-review.md:283`).

The other ~94% lands on the homepage and `/kanji`, via the stroke-order cluster (`kanji stroke
order`: 353 clicks at position 3.3; ~426 across variants) and the brand query `michikanji` (81
clicks, position 1.0). Both pages are titled around stroke order and no repo data separates them —
**check DataFast's landing-page report before building**; it decides the order of 1 and 2.

Compare clicks only within one Search Console dimension. The query dimension drops anonymised
low-volume queries (1,028 vs 1,771 clicks, same window).

| # | Surface | `source` | Notes |
|---|---|---|---|
| 1 | `/kanji` (index) | `kanji-index-weekly-story` | Largest likely click destination. Already a client route (`KanjiSearchClient`). Tightest byte budget of the three — see below. |
| 2 | Homepage | `homepage-weekly-story` | Brand traffic plus a share of the stroke-order cluster. Between Popular Kanji (`app/page.tsx:203`) and the Closing CTA (`app/page.tsx:246`). |
| 3 | `/kanji/[character]` | `kanji-detail-weekly-story` | **97 clicks/month.** Build it, don't stake the pilot on it; it only becomes the biggest surface if the CTR work lands. Slot: between `RelatedKanjiSection` and `CTASection` (`page.tsx:478` reserves it as "last content section, before the commercial blocks"). Needs a wrapper `<section>` + `<h2>` carrying `SECTION_HEADING`, with `title={undefined}` — `EmailCapture` renders its own `<h3>` card. Card-bodied sections skip the band's rule. Update `section.ts:27`'s "five headings" note. |
| 4 | `/kanji/progress`, `/kanji/review` | `progress-sync` | Low volume, highest intent — returning users already in a "what next" frame (`announcement-banner-roadmap.md:477`). Phase-0 SG1's designated surface, so building here discharges part of SG1. |
| 5 | Announcement bar | — | Not before episode 1 exists, and not before **2026-08-31** — `MAX_RUN_DAYS` is 14, runs may not overlap, queue is occupied through 2026-08-30. `MESSAGE_MAX_LENGTH` 110, `CTA_MAX_LENGTH` 28. |

**This runs against a phase-0 guardrail** (`phase-0-growth-monetization.md:11`): *"Never gate or slow
the free kanji / stroke-order pages — they are the acquisition engine."* Surfaces 1–3 are those
pages. Nothing here gates anything, but it does add weight — which is why the budget gets measured
before merge, and why the surface stays a static card.

**Budget — measured 2026-08-23, it fits.** Lighthouse transferred script bytes, clean `main` against
the same build with `EmailCapture` mounted. Every route is gated at `error` severity.

| Route | Now | With capture | Budget | Headroom after |
|---|---|---|---|---|
| `/` | 223.1 kB | 224.5 kB | 250 kB | 25.5 kB |
| `/kanji/日` | 228.3 kB | 231.1 kB | 260 kB | 28.9 kB |
| `/kanji` | 372.1 kB | 375.0 kB | 384 kB | **9.0 kB** |

Two things that are not obvious:

- **Mounting on two routes raises the measured figure on three.** Lighthouse counts Next `<Link>`
  prefetches, so `/kanji` picks up +2.9 kB for the homepage and detail-page chunks it prefetches
  without receiving an edit.
- **`/kanji` has already drifted ~32 kB past the 340 kB baseline `lighthouserc.js` records** — 372.1
  kB measured on unmodified `main`, eating 73% of that route's headroom. Unrelated to this work; `/`
  and `/kanji/日` still match their documented baselines. `/kanji` is the assertion that trips first,
  and it needs its own fix or a re-baseline.

Run the gate on a free port. 3000 is often taken, and LHCI will silently profile whatever else is
listening instead of failing — use `pnpm exec next start -p 3111`, not `pnpm start -- -p 3111`
(pnpm passes `--` through literally and `next start` reads it as a directory).

**Announcement bar** is mounted site-wide (`app/layout.tsx:124`) with dismissal, impression caps and
`LearnerSignals` targeting — the only behavioural trigger the site has. `AnnouncementCta.href` is an
internal path only, so the bar can't hold a form and needs a destination page. Per
`announcement-banner-roadmap.md`, "a banner that leads to a page with no visible change is the most
expensive mistake available here."

**Always-on static sections. No modal, exit-intent or scroll trigger** — no such mechanism exists,
building one adds client JS against `error`-level budgets, and it would compete with the announcement
bar's acknowledgement model. Revisit only if static placement gives a signal too small to read.
**Everyone sees it**; no targeting outside the bar.

The newsletter links readers straight into `/kanji/<char>` pages — the traffic those pages can't win
from the SERP. The list is a direct channel at the 0.25% CTR problem.

## Current state

**Rows 1 and 6 are superseded by `story-delivery-resend.md` §4** — they describe a Kit pipeline that
no longer exists. The rest of the table still holds.

| Piece | Status |
|---|---|
| ~~`/api/subscribe` → Kit proxy~~ | **Superseded.** `app/api/subscribe/route.ts` is no longer a proxy to anything: it mints a signed 48h token and sends a consent email through Resend, and creates no contact at all. `app/api/subscribe/confirm/route.ts` creates the contact when the token comes back. See `story-delivery-resend.md` §5. |
| `EmailCapture` component | ✅ exists — imported by no page |
| Capture copy | ✅ Committed `f30f50c`. Copy is props; defaults assert neither an incentive nor a confirmation email — both are false for a returning address. Plus a11y and a stuck-`sending` fix. |
| Capture sections | ⏳ Homepage section built on `feat/weekly-story-capture` (`app/page.tsx`, between Popular Kanji and the Closing CTA). Surfaces 1, 3 and 4 not built. |
| Abuse protection on `/api/subscribe` | ✅ `rateLimit(2, 10 * 60 * 1000)` per IP, same shape as `/api/feedback`. In-memory `Map`, so per-instance — stops a naive script, not a distributed attack. |
| ~~Kit account / form `9824359` / DOI / redirect / Vercel env vars~~ | **Superseded.** Kit is out of the pipeline entirely and the account is being cancelled — migration task M9, still open. `KIT_API_KEY` and `KIT_FORM_ID` are still set in Vercel and are referenced by no code. Double opt-in is now ours: `story-delivery-resend.md` §5. |

## Open decisions

1. ~~**Form identity.**~~ **Void — there are no Kit forms.** Per `story-delivery-resend.md`'s
   supersession table, this decision and the carry-over obligation it created are both void: the
   capture path is ours end to end, so there is no form to point at and no second form for SG1 to
   create. What replaces it is `source`, validated against `EmailSignupSource` and carried inside the
   signed token. Kept because the reasoning below is why the two surfaces were ever separated, and
   that question survives the vendor change.

   *The decision as recorded on 2026-08-23, now history:* option (a) — the single `KIT_FORM_ID` that
   `route.ts` read for every `source` stayed pointed at the no-incentive newsletter form. SG1 was to
   get its own Kit form and its own env var when SG1 shipped, not before, because nothing then read a
   second form. `referrer` separated audiences for broadcasts; the confirmation email and redirect
   were per-form, which is exactly why SG1 could not share the slot. The carry-over obligation this
   created for `phase-0-growth-monetization.md` — add a second form, an env var and a `source`→form
   map, or pack-seekers receive the newsletter's confirmation email — is void with the forms.
2. ~~**Byline.**~~ **Settled 2026-08-23 — a person, not the brand.** Episodes are written by Ari and
   sent from **"Ari at MichiKanji"**. Rationale: the pilot's only readable signal at this list size
   is replies (see Decision gate), and people do not reply to a brand. Teacher-collaboration
   outreach inherits the same byline — a named person is also what makes that pitch answerable.
3. **SG1's free-resources surface** — still ships on phase-0's schedule, or waits behind this pilot?
   Surface 4 above is SG1's `progress-sync` under its own name; free-resources is untouched. Phase-0's
   SG2 (Pro fake-door, $6.99/mo · $49/yr) is a separate willingness-to-pay test and nothing here
   sequences the two.

## Content & editorial

Nothing technical matters if this queue is empty.

1. **Lock the format.** One story (150–300 words, N5–N4 vocabulary and grammar only) + 3–5 target words with a one-line memory hook each + 2–3 links back to `/kanji/<char>` pages. No audio, quiz or illustration in the pilot.
2. **Pick the story spine.** A recurring character/setting followed week to week gives a reason to open episode 2. Decide once, keep it for all pilot episodes.
3. **Fill the calendar before writing episode 1** — deciding kanji/theme up front avoids scrambling on send day and stops episodes repeating characters.

   | Episode | Theme / kanji focus | Target vocab (3–5) | Write-by | Send date |
   |---|---|---|---|---|
   | 1 | — | — | — | — |
   | 2 | — | — | — | — |
   | 3 | — | — | — | — |
   | 4 | — | — | — | — |
   | 5–6 (optional) | — | — | — | — |

4. **Write episode 1 end-to-end** and treat it as the template for tone, length and structure.
5. **Define the read signal before episode 1 sends.** Opens, click-through to the linked kanji pages, and — the one that matters — whether episode 2's open rate holds against episode 1's. The return-open is the "did they want more" signal; the first open is curiosity.
6. **Weekly loop once live:** write → self-review against the episode 1 template → create the Resend
   draft with `pnpm stories:create-broadcast <slug>`, review it, test it and schedule it by hand
   (`../runbooks/newsletter.md`) → next week, check episode N-1's numbers before finalizing episode N.
   The send day is Saturday and the write-by is the Wednesday before, both derived from
   `config.newsletter` by `lib/email/send-schedule.ts`.

## Technical steps

**The pipeline below is the Kit-era shape and is superseded by `story-delivery-resend.md` §5.** The
capture surfaces and their `source` values survived the migration; the destination did not. Today
`POST /api/subscribe` mints a signed 48h token and sends a consent email through Resend, and
`GET /api/subscribe/confirm` creates the contact. Kept as drawn because steps 3, 5 and 6 explain
constraints that still bind.

```
<EmailCapture source="kanji-index-weekly-story" />   ┐
<EmailCapture source="homepage-weekly-story" />      ┼→ POST /api/subscribe → Kit form (DOI)
<EmailCapture source="kanji-detail-weekly-story" />  ┘   └ fires DataFast   → /subscribed on confirm
                                                           email_signup(source)
```

1. ~~Kit account, form (DOI + redirect), `KIT_API_KEY` / `KIT_FORM_ID` in Vercel~~ ✅
2. ~~Fix the capture copy~~ ✅ 2026-08-23
3. ~~**Rate-limit `/api/subscribe`.**~~ ✅ 2026-08-23. `rateLimit(2, 10 * 60 * 1000)` per IP,
   matching `/api/feedback` and `/api/advertise`. The `Request` vs `NextRequest` wrinkle was
   resolved by typing the handler `NextRequest` — the App Router passes one at runtime regardless,
   so it is a type correction, not a behaviour change. Note the limiter runs *before* payload
   validation, so a rejected 400 also consumes quota; that is intended.
   (`components/CaptchaVerification.tsx` is a build-time mock imported by nothing.)
4. ~~**Settle form identity**~~ ✅ 2026-08-23 — (a), see Open decisions.
5. **Build the capture sections in priority order — the homepage first, not `/kanji`.**
   This reverses v1.3. `/kanji` has **9.0 kB** of script headroom against an `error`-severity budget
   *and* has already drifted ~32 kB past the 340 kB baseline `lighthouserc.js` records, so it is the
   assertion that trips first — on unmodified `main`, before this work touches it. `/` has 25.5 kB
   and carries the brand query plus a share of the stroke-order cluster. `/kanji` waits for its own
   re-baseline, which is unrelated to this pilot. ✅ Homepage section built on
   `feat/weekly-story-capture`.
6. **Live test after deploy.** *The bug this step existed to catch is gone, and the shape of the test
   is not.* The Kit fallback (`POST /v4/subscribers`) created `state: active` — single opt-in. Once
   active, the form add would not re-trigger confirmation, so the subscriber skipped consent (phase-0
   risk #6). It fired only when the first form-add failed, so a clean first submit proved nothing
   about it. That fallback was deleted at the migration and is **deliberately not reimplemented** —
   the route's header comment says so, and carrying a consent bug across a migration is how it becomes
   permanent. Run the equivalent test against the Resend path (`story-delivery-resend.md` §5 Phase 2
   step 9): the pre-click check is the only one that can detect an accidental single-opt-in path.
   - Submit a fresh email. **Before clicking anything, check that no contact exists in Resend at all.** Checking only the end state cannot detect this.
   - Confirm the consent email arrives, click it, land on `/subscribed`, check the contact now exists.
   - Re-submit the *same* email and confirm no duplicate and no second confirmation storm.
   - ~~If plain form-subscribe works without the fallback, delete the fallback.~~ Done at the migration; the fallback no longer exists.

### Sending: manual, no cron

**The mechanics here are superseded by `story-delivery-resend.md` §5 Phase 4; the decision is not.**
The send is still deliberately manual and nothing on our side triggers one — that part is unchanged
and is the load-bearing half of this section.

What it is now: `pnpm stories:create-broadcast <slug>` creates a Resend **draft only**, addressed to
the Weekly Stories Segment. A person reviews it, sends a test and schedules it in the Resend
dashboard for the Saturday `lib/email/send-schedule.ts` names. There is no cron, no send route and no
contact loop. Procedure: [`../runbooks/newsletter.md`](../runbooks/newsletter.md).

*The Kit-era mechanics, for the record:* Kit Broadcasts covered Phase 0 — write the episode in Kit's
composer, use "Schedule for later", target by filtering on `referrer` (referrer, not tags). No Kit
form, composer or `referrer` filter exists any more; Resend contacts are global, sit in Segments, and
carry no `source` at all — the signup surface lives in DataFast.

Automation is code that must be maintained whether or not anyone reads the newsletter. That argument
is why there is still no cron, and it did not change with the vendor. If the pilot validates, design
automation then, against real numbers.

## Sequence

| When | What |
|---|---|
| **By 2026-08-30** | Settle form identity + byline. Fill the calendar. Write episode 1. |
| ~~**By ~2026-09-03**~~ | **Superseded by `story-delivery-resend.md` §4 task M9.** The question was whether to let the Kit trial lapse to Free or keep a paid tier; it was answered by leaving Kit altogether. M9 — cancel the account — is still open. |
| **Then** | Ship `/kanji` capture → Lighthouse gate → deploy → live test → homepage capture. |
| **Weeks 1–4/6** | One episode/week, manually scheduled on the Saturday, checking opens/clicks weekly. |

## Decision gate

Gate on signal, not date.

- **Continue** if episode-to-episode open rate holds and click-through to `/kanji/<char>` pages is
  meaningfully non-zero. The next move is not more engineering — it is taking those numbers to
  Japanese language teachers and opening collaborations. A second level track and send automation
  come after that, if the collaborations create demand for them.
- **Pause and rethink the format** if opens crater after episode 1 — a curiosity-driven first open
  with no return means the story format isn't the hook, regardless of segmentation.
- **Kill** if the list barely grows past the capture surfaces' traffic and opens are low from episode
  1 — that points at the format, not the targeting.

Read list growth from **the confirmed contacts in the Resend Weekly Stories Segment, not DataFast**
(it was Kit's confirmed count when this was written; the reason is the same). `email_signup` counts
submits, and with double opt-in ~20–30% never confirm, so the goal runs ~25% above the real list
(phase-0 risk #5). Use `email_signup` for funnel and per-surface CTR — that is what the distinct
`source` values are for, and it is the only place `source` is recorded, because a Resend contact does
not carry it.

**Paid is unresolved and not being designed during the pilot.** The plausible candidate is a paid
tier of this newsletter rather than a separate product. Teacher collaborations come first.
