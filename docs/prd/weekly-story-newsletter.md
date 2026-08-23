# Weekly Story Newsletter — Roadmap

**Version 1.0** · Created 2026-08-20 · Owner: Ari Nakos
**Status:** Kit activated, list + form live, homepage signup box drafted (pending deploy). Content pilot not started.
**Related:** [`phase-0-growth-monetization.md`](./phase-0-growth-monetization.md) (SG1 — email capture, the pipeline this reuses) · project memory `weekly_email_strategy.md`, `creator_collab_strategy.md`

## What this is

A weekly email: a short story built from kanji a beginner already knows, plus 3–5 new target-vocab words with a memory hook, linking back to the relevant `/kanji/<char>` pages. Modeled on Upwordo's format. It is **not a new product line** — it's the delivery vehicle for two bets already on the roadmap: starting an owned email list, and a free, low-cost MVP for "graded reading tied to learned kanji" before that becomes a built site feature.

**Audience for the pilot: Beginner, N5–N4.** Not all five JLPT levels — one segment, to keep the first read/return signal clean. Broader levels are a Phase 1 decision, gated on this pilot actually working.

## Non-goals for this phase

- No paywall, no quiz gate, no billing.
- No new backend, no user accounts — the site's no-server-side-user-state architecture (`CLAUDE.md`) doesn't change.
- No second domain (a `jlptmanga.com`-style comic-strip site was considered and killed — see memory).
- No multi-level story tracks yet — N5–N4 only, one track.
- No cron job yet — see [Sending mechanism](#sending-mechanism-phase-0-manual-no-cron) below.

---

## Current state (as of 2026-08-20)

| Piece | Status |
|---|---|
| Kit account | ✅ Created (`aristides.nakos@gmail.com`), free 14-day trial — **check before it lapses into a paid plan; downgrade to Free if not converting to paid features** |
| Kit form | ✅ `MichiKanji Weekly - Beginner (N5-N4)`, form ID `9824359`. Double opt-in **on**. Post-confirmation redirect → `https://michikanji.com/subscribed` |
| `KIT_API_KEY` / `KIT_FORM_ID` | ✅ Set in Vercel (production) |
| `/api/subscribe` → Kit proxy | ✅ Already existed in the codebase (`app/api/subscribe/route.ts`), unchanged |
| `EmailCapture` on the homepage | ⚠️ Drafted (new "Weekly Story Email" section between "Popular Kanji" and the closing CTA), **not yet committed/deployed** — pending Ari's go-ahead |
| First story episode | ☐ Not started |
| Kit incentive/lead magnet | ☐ None attached — the form has no downloadable "pack"; the weekly story itself is the offer |
| Abuse protection on `/api/subscribe` | ☐ Still open per `phase-0-growth-monetization.md` risk #9 — public, unauthenticated endpoint. Low priority at current traffic, but note it before wider promotion |

---

## Soft steps — content & editorial

These produce the thing that actually gets sent; nothing technical below matters if this queue is empty.

1. **Lock the format.** One story (150–300 words, N5–N4 vocabulary and grammar only) + 3–5 target words with a one-line memory hook each + 2–3 links back to the relevant `/kanji/<char>` pages. No audio, no quiz, no illustration for the pilot — those are Phase 1+ per the memory decision.
2. **Pick the story spine.** A recurring light narrative (e.g., one continuing character/setting learners follow week to week) reads better than disconnected vignettes and gives a reason to open episode 2. Decide once, keep it for all 4–6 pilot episodes.
3. **Build a content calendar for the pilot** — 4 to 6 episodes, one per week:

   | Episode | Theme / kanji focus | Target vocab (3–5) | Write-by | Send date |
   |---|---|---|---|---|
   | 1 | — | — | — | — |
   | 2 | — | — | — | — |
   | 3 | — | — | — | — |
   | 4 | — | — | — | — |
   | 5 (optional) | — | — | — | — |
   | 6 (optional) | — | — | — | — |

   Fill this in before writing episode 1 — deciding the kanji/theme per week up front avoids scrambling on send day and makes it easy to check episodes don't repeat the same characters.
4. **Write episode 1 end-to-end** (story + vocab + hooks + links), and treat it as the template for tone/length/structure for the rest of the pilot.
5. **Decide the byline/voice** — written as Ari, or as "MichiKanji"? Matters for the sign-off and for any future creator-collab byline (see `creator_collab_strategy.md` — that idea is explicitly sequenced *after* this pilot, using its numbers as the pitch).
6. **Define the read signal you're watching** before episode 1 sends, not after: opens, click-through to the linked `/kanji/<char>` pages, and — the one that actually matters — whether episode 2's open rate holds up against episode 1's (the return-open is the real "did they want more" signal, not the first open).
7. **Weekly editorial loop, once live:** write → self-review against episode 1's template → schedule in Kit (see below) → the following week, check episode N-1's opens/clicks before finalizing episode N (lets you kill or pivot mid-pilot instead of only at the end).

## Technical steps — infrastructure

The email-capture pipeline already exists and is now wired end to end:

```
<EmailCapture source="homepage-weekly-story" />  →  POST /api/subscribe  →  Kit form 9824359 (DOI)
                                                                              → /subscribed on confirm
```

1. ~~Create Kit account~~ ✅ done
2. ~~Create + configure the form (DOI, redirect)~~ ✅ done
3. ~~Set `KIT_API_KEY` / `KIT_FORM_ID` in Vercel~~ ✅ done
4. **Deploy the homepage signup section** (drafted, needs Ari's sign-off — see the diff shared in chat) so `/api/subscribe` actually has a visitor-facing entry point. Nothing above matters to a real visitor until this ships.
5. **Live test after deploy:** submit a real email, confirm the DOI email arrives, click it, land on `/subscribed`, and check the contact in Kit shows as **confirmed**, not stuck pending. This is the same gate `phase-0-growth-monetization.md` already calls out for other capture surfaces — do it here too before promoting the signup box anywhere.
6. **(Optional, cheap) A second `source` value** if the signup box ever appears on more than one page (e.g. also on `/kanji/[character]` pages later) — costs nothing since `source` is already a prop, just pick distinct values per surface so Kit's `referrer` field stays meaningful.
7. **Decide the honeypot/throttle question** on `/api/subscribe` (phase-0 risk #9) before actively promoting this — not urgent at current traffic, but a newsletter CTA getting real traffic raises the abuse surface slightly.

### Sending mechanism (Phase 0): manual, no cron

For the pilot, **do not build a cron job.** Kit's own Broadcasts feature already does everything Phase 0 needs:

- Write the episode in Kit's broadcast composer (or paste in prepared copy).
- Use Kit's native **"Schedule for later"** to set the weekly send time — Kit handles the actual delivery at that timestamp. No code on our side triggers anything.
- Target the audience by filtering on `referrer = homepage-weekly-story` (or whichever `source` was used), matching the segmentation approach already established in `phase-0-growth-monetization.md` — **referrer, not tags**, unless a tag-triggered automation is specifically needed later.

This keeps the entire pilot at zero net-new code, which matches the "not overengineered" instruction — the goal right now is proving people read and return, not building send infrastructure for a format that might not work.

### If this validates: what automation would look like (Phase 1+, not now)

Documenting this now so it doesn't need re-deriving later, but **do not build any of it until the pilot's 4–6 episodes show real read-through and return-opens.**

- **A content queue, not hand-scheduling forever.** A simple `data/newsletter/episodes/<n>.md` (or similar, mirroring the existing `data/sentences/` pipeline pattern already in the repo) holding queued episodes with front-matter (send date, target segment, vocab list).
- **A Vercel Cron Job** (`vercel.json` → `crons`, same deployment platform the site already runs on) hitting a new `app/api/cron/weekly-newsletter/route.ts` on a weekly schedule. Its job: read the next queued episode, and call Kit's **v4 Broadcasts API** (`POST /v4/broadcasts`) to create and schedule the send — not send raw SMTP, Kit still owns delivery/deliverability.
- **Segment-aware sending** at that point would mean multiple queued tracks (N5–N4 vs N3–N2, etc.) and the cron job picking the right broadcast + audience filter per track — this is exactly the point multi-level segmentation (deferred in the 20 Aug decision) would actually get built, once there's more than one track to justify it.
- **Personalization** (stories assembled from a specific reader's own learned-kanji progress, the long-term differentiator vs. Satori Reader) is a further step past that — it needs a way to read a subscriber's `kanji-progress` data server-side, which the current no-server-side-user-state architecture doesn't support yet. Out of scope until Phase 1 paid tier is being built.

**Why not build the cron now:** every piece of automation above is code that has to be maintained whether or not anyone reads the newsletter. Four to six manually-scheduled Kit broadcasts cost a few minutes each and answer the only question that matters right now — do people want this — before spending engineering time on delivery infrastructure for content that might not work.

---

## Sequence

1. **Now:** fill in the content calendar (soft step 3), write episode 1, get the homepage signup section deployed and live-tested.
2. **Weeks 1–4/6:** run the pilot — one episode/week, manually scheduled in Kit, checking opens/clicks weekly.
3. **After the pilot:** decision gate below.

## Decision gate (into Phase 1)

Mirrors the phase-0 doc's gate style — gate on signal, not a fixed date.

- **Continue + expand** if episode-to-episode open rate holds (return-opens don't collapse) and click-through to `/kanji/<char>` pages is meaningfully non-zero. Next steps then: consider a second level track, and start the Phase 1 monetization design (Satori Reader-anchored $9/mo or $89/yr tier — see `weekly_email_strategy.md` memory) — still content/ops work before any paywall code.
- **Pause and rethink the format** if opens crater after episode 1 (a curiosity-driven first open, then no return) — the story format itself may not be the hook, regardless of segmentation.
- **Kill** if the list barely grows past the homepage box's existing traffic and opens are low from episode 1 — signals the format, not the targeting, is the problem, and no amount of level-segmentation fixes that.

## Open questions

- Byline/voice for the pilot (Ari vs. "MichiKanji" as a brand voice) — decide before episode 1.
- Whether to attach any incentive to the signup form at all, or let "the weekly story" be the entire offer (current setup: no incentive attached).
- Kit trial: confirm before day 14 whether to let it lapse to Free or intentionally keep a paid tier — Free covers everything Phase 0 needs (10k subscribers, unlimited sends); automations/tags aren't needed until a tag-triggered flow is actually built.
