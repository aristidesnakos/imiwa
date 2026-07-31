# Feature Announcement Banner — Roadmap

**Status**: ✅ Built — Phases 0, 0b, 0c and 1 shipped July 31, 2026. Queue armed, first run Aug 4.
**Created**: July 31, 2026
**Audited**: July 31, 2026 — nav/link graph, feature health, integration constraints, feature completeness.
Every file:line reference below was verified against the working tree, not assumed.
**Website**: michikanji.com
**Related**: [`performance-and-seo-roadmap.md`](./performance-and-seo-roadmap.md)

> ### What shipped, July 31 2026
>
> Everything below is built and verified in a browser against a seeded returning-user
> profile, not just typechecked. The line-numbered findings in the body of this document
> describe the code **as it was before** this pass — they are kept as the record of why
> each change exists, not as a description of the current tree.
>
> | Phase | Landed |
> |---|---|
> | **0 — nav** | `components/nav/StudyNavLinks.tsx` (shared, gated on `totalLearned > 0`, due-count badge) rendered in `Header` and in the site-wide `Footer`; the plain `<p>` on the kanji page is now a `/kanji/review` link; every kanji page carries a "Print a practice sheet for 水" link |
> | **0b — SEO** | `/kanji/review` added to `STATIC_PAGES`; the four N4–N1 sheet pages the sitemap advertised are no longer dead ends |
> | **0c — pre-flight** | Review session capped at 20 with an honest "20 of 60 due" line; dead-end render branch given real copy and a way out; `getProgressOverTime` rebuilt on index-based buckets (24H and 12M both fixed) with a cumulative series; shape guard on stored progress; `kanji-sheets` API extended from N5-only to all five levels |
> | **1 — banner** | `lib/announcements/{types,config,signals,state,select}.ts` + `components/AnnouncementBanner.tsx`, mounted in flow above `{children}` in `app/layout.tsx` |
> | **CI** | `pnpm validate:announcements` (contract **and** a replay of the acknowledgement model) on every PR touching the banner; a daily `announcements-status` job that opens, updates and closes one tracking issue |
>
> **Verified in-browser:** no banner for a visitor with no learning history; no banner
> before consent is answered; shown to a seeded returning learner; the sticky header pins
> correctly once the bar scrolls away; X, Escape and CTA all acknowledge write-once and
> survive reload; the impression cap shows it exactly three times then retires it as
> `impression-cap`; a user with existing `kanji-srs` cards is `precondition`-acked at
> `impressions: 0`; Escape inside a text field does **not** dismiss.
>
> **Still open:** copy for slots 2–4 is written but unreviewed against live pages; no
> pre-Aug-4 analytics baseline has been pulled from DataFast, so the success criteria
> below remain unfalsifiable until it is; the sentences slot stays unscheduled.

> **Purpose** — We have shipped several features that returning users do not know exist.
> This document plans a *time-boxed, returning-user-only* banner that rotates through them
> over ~4 weeks, plus the permanent navigation fix that has to land alongside it.

---

## The actual problem

Before designing the banner, we audited what is reachable from the site chrome.

`components/sections/Header.tsx` links exactly four destinations:

| Nav link | Target |
|---|---|
| Home | `/` |
| Kanji | `/kanji` |
| Free Resources | `/free-resources` |
| Advertise | `/advertise` |

`components/sections/Footer.tsx` adds only `/tos` and `/privacy-policy`.

Neither file contains the substring `review`, `progress`, or `learned` in any `href`.

The full inbound link graph for the hidden routes, verified by exhaustive sweep:

| Route | Every inbound link | Gated? |
|---|---|---|
| `/kanji/review` | `app/kanji/KanjiSearchClient.tsx:243` | ⚠️ behind `{totalLearned > 0 && (` |
| | `app/kanji/progress/LearnedKanjiClient.tsx:169` | ⚠️ behind `{dueCount > 0 ? (` |
| | `app/kanji/progress/LearnedKanjiClient.tsx:201` | No |
| `/kanji/progress` | `app/kanji/KanjiSearchClient.tsx:235` — the "N learned" pill | No |
| `/learned-kanji` | **Zero. From anywhere.** | — |

So the whole review/progress subtree hangs off **one entry point** — the `/kanji` index — and the
only link into `/kanji/review` from a non-orphan page is invisible until you have already learned
a kanji. That is a chicken-and-egg: the feature that rewards returning is hidden from everyone who
has not already returned.

"People only know about the kanji" is not a marketing gap — it is an information-architecture gap.
A banner that expires in five days and leaves the nav unchanged sends users to a page they will
never find again.

**Therefore: the banner is Phase 1, but Phase 0 is the nav fix, and Phase 0 ships first.**
The banner's job is to tell existing users *"this exists now"*. The nav's job is to make sure
that is still true in September.

### Two corrections from the audit

**`/learned-kanji` is not a feature.** It is a four-line bare redirect to `/kanji/progress`:

```tsx
export default function LearnedKanjiRedirect() {
  redirect('/kanji/progress');
}
```

It has zero inbound links and nothing of its own to show. **Drop it from the nav plan and from the
announcement queue entirely** — there are two hidden features here, not three.

**The "Nice — one more kanji learned!" line is not a link.** `app/kanji/[character]/page.tsx:368`
is plain `<p>` text. Adding the link is net-new work, not a tweak.

---

## Phase 0 — Give the hidden features a permanent home

**Target: Mon Aug 3, 2026. Blocking for everything below.**

- Add a **Study** group to `Header.tsx` → Review, Progress. (Not Learned kanji — see above.)
- Add the same two to `Footer.tsx` under a "Study" column.
- Cross-link from the kanji detail page: turn the plain text at
  `app/kanji/[character]/page.tsx:368` into a link to `/kanji/review`.
- Show the Study group only when `kanji-progress` has entries — an empty review session is a
  worse first impression than no link at all. `/kanji/review` already handles the empty state
  (`SessionState = 'empty'`), but a dead-end nav item teaches people the nav is unreliable.
- Add a `/kanji/review` → `/kanji/progress` link. `ReviewClient.tsx` links out to `/kanji` in six
  places (124, 139, 153, 177, 225, 247) and never to the dashboard — finishing a session is the
  single best moment to show someone their curve.

### Phase 0b — SEO fallout (belongs in the SEO roadmap too)

Neither route is in `app/sitemap.xml/route.ts` — `STATIC_PAGES` lists only `/`, `/kanji`,
`/free-resources` + its five sheet pages, `/advertise`, `/privacy-policy`, `/tos`.

- `/kanji/progress` sets `robots: { index: false, follow: true }` (progress/page.tsx:9). Deliberate,
  leave it.
- `/kanji/review` is **indexable** and declares `canonicalUrlRelative: '/kanji/review'`
  (review/page.tsx:10) — but it is absent from the sitemap *and* both inbound links sit behind
  client-side `localStorage` gates a crawler never satisfies. It is effectively an orphan page.
  **Add it to `STATIC_PAGES`.**

---

## Phase 1 — The banner system

**Target: Mon Aug 3, 2026. One component, config-driven, no per-announcement code changes.**

### Component shape

```
components/AnnouncementBanner.tsx     // client component, renders the bar
lib/announcements/config.ts           // the queue — the only file you edit per announcement
lib/announcements/state.ts            // localStorage read/write + acknowledgement logic
```

Slim, dismissible bar at the top of the page. **Not** a modal, not an interstitial — see the
rationale in the decision note below. One sentence, one link, one X.

### Mount point and positioning — verified against the codebase

Mount as a direct child of `<ClientLayout>` in `app/layout.tsx`, **before `{children}`**
(layout.tsx:117) — the same slot pattern as `CookieConsent` and `FeedbackWidget` (layout.tsx:127-128).

Two constraints found in the audit that change the naive approach:

1. **`<Header />` is not in the layout.** It is imported per-page across ~15+ call sites
   (`app/page.tsx:61`, `app/advertise/page.tsx:69`, `app/free-resources/**`, `app/not-found.tsx:10`).
   There is no single place to offset.
2. **The header is `sticky top-0 z-50`** (`components/sections/Header.tsx:10`). A `fixed top-0
   z-50` banner would tie on stacking order and get permanently covered on scroll.

**Therefore: render the banner in normal document flow, not `fixed`.** The sticky header then
simply sticks below it once the user scrolls, and nothing needs to reserve top space. This is the
low-risk path — no z-index escalation, no per-page offset.

**Correction to an earlier assumption:** `CookieConsent` is anchored **bottom**
(`fixed bottom-0 left-0 right-0 z-50`, CookieConsent.tsx:187), not top. A top banner does not
collide with it. The consent-resolved gate below is therefore politeness, not collision avoidance —
and since consent persists 365 days, it is close to a no-op for our returning-user audience.

### Existing primitives — there are none to reuse

- `components/AdBanner.tsx` is not a banner in this sense: in-flow server component, not dismissible.
- `components/FeedbackWidget.tsx` dismisses via local `useState` only — **not persisted**, so it is
  not a precedent for dismissal state.
- `components/ui/toast.tsx` + `toaster.tsx` exist but `<Toaster />` is **never mounted anywhere** —
  dead code, cannot be leveraged.

The only persistence precedent to copy is `CookieConsent`'s localStorage key + `mounted` guard.

### Hydration

Use the `CookieConsent` pattern verbatim (Pattern A): `const [mounted, setMounted] = useState(false)`
(CookieConsent.tsx:30), one effect to set it (`:33-35`), all localStorage reads gated on it (`:38-63`),
and `if (!mounted) return null` in render (`:122`).

Server HTML then contains no banner at all, so already-acknowledged users never get a flash-then-remove.
The tradeoff is a one-frame delay before it appears — correct for this component.

Note the hooks use a *different* pattern (SSR-safe default state, hydrate in effect —
`useKanjiProgress.ts:29-47`, `useKanjiSRS.ts:15-24`). Do not mix them.

### Storage schema

Single key, versioned, separate from the learning data so a reset of one never wipes the other:

```ts
// localStorage: 'mk-announcements'
{
  v: 1,
  seen: {
    'reviews-2026-08': {
      impressions: 3,
      ackAt: 1754300000000,        // null until acknowledged
      ackVia: 'cta'                // 'dismiss' | 'cta' | 'impression-cap' | 'precondition'
    }
  }
}
```

Keyed **per announcement id**, never a global boolean. Dismissing the reviews banner must not
suppress the sentences banner three weeks later.

### Acknowledgement model

The requirement is "dismiss once and it's gone." We treat acknowledgement as broader than the X —
any signal that the user has *registered* the message counts, and the banner never returns:

| Signal | `ackVia` | Rationale |
|---|---|---|
| Clicks the X | `dismiss` | Explicit. Obvious. |
| Clicks the CTA link | `cta` | They went to the feature. Message delivered — re-showing it is nagging. |
| Presses `Esc` while it is focused | `dismiss` | Keyboard parity with the X. |
| 3rd impression with no interaction | `impression-cap` | Ignoring it three times is an answer. Auto-acknowledge rather than wait for a click that is not coming. |
| Already uses the feature | `precondition` | See below — never shown in the first place. |

**Precondition targeting is the intelligent part.** Every announcement carries a `shouldShow(state)`
predicate that reads localStorage before rendering. We do not announce reviews to someone who
already has `kanji-srs` cards. Announcing a feature to a user who already found it is the single
fastest way to make the banner feel like spam, and it costs one predicate to avoid.

Acknowledgement is **write-once**: once `ackAt` is set, that id is dead forever, regardless of
impressions. There is no re-engagement pass, no "maybe they forgot." Respecting the dismissal is
the whole reason this pattern is tolerable.

### Audience gate

Applied before any per-announcement logic — a visitor must clear all three:

1. `kanji-progress` contains at least one learned kanji. **Not** merely "has visited before" —
   we want evidence of actual use, and the progress store is that evidence.
2. Cookie consent has been resolved (`cookie-consent` key present). `components/CookieConsent.tsx`
   occupies the same screen real estate; the two must never stack. Consent bar first, always.
3. The announcement is within its `startsAt`/`expiresAt` window.

First-time visitors, and anyone arriving from search with no history, see nothing at all.

### Expiry

Every entry carries an `expiresAt` date. The banner self-removes when it passes — a run ends
because the config says so, never because someone remembered to delete it. A stale banner
advertising an August feature in October is worse than no banner.

### Instrumentation

Fire `impression`, `cta_click`, and `dismiss` through `lib/analytics` for every announcement.
Without this the whole exercise is unfalsifiable. The number that matters is **CTA click-rate
per unique viewer**; the number that matters second is what fraction of viewers dismiss within
the first impression, which is our annoyance signal.

---

## Phase 0c — Pre-flight fixes. Do not announce a feature until its row is green.

A feature-health audit found that two of the four queued features would embarrass us under
traffic. These are blocking, per-announcement.

### Blocking for announcement #1 (reviews)

**Cap the session queue.** `ReviewClient.tsx:72` queues *every* due card. A returning user who
checked off 400 kanji and has never reviewed gets a 400-card session with a "1/400" progress bar.
This is the single most likely bad first impression from the whole campaign, and it lands on
precisely the users we are targeting. `.slice(0, 20)` before `shuffle` fixes it.

### Blocking for announcement #2 (progress dashboard)

The stat cards are correct. **The chart is not**, and it fails worst for our exact audience:

- **The 30D default view shows a flat line at zero** for anyone who learned their kanji more than
  a month ago, plus "In Last 30 Days: 0". `ProgressChart.tsx:101-144` always renders the
  `AreaChart` — no empty state — and plots *daily deltas*, not a cumulative total. A returning
  user with 200 kanji learned in June sees what looks like a broken dashboard.
- **The 24H view is broken outright.** `useKanjiProgress.ts:15-16` keys buckets by hour *and
  minute*, while the initializer at `:129-146` steps hourly — so a kanji learned at 3:23 PM
  produces a key matching no pre-seeded bucket, and `:152` appends it at the end of insertion
  order. Real data renders as stray points bunched at the right edge, out of order, with the
  timeline flat at zero behind it.
- **The 12M view drops a month when today is the 29th–31st.** `:143` uses `setMonth(+1)`; from
  Jul 31 that goes Aug 31 → Oct 1, skipping September. **This misfires today.**

7D and 30D bucketing is correct — the bug is confined to 24H and 12M keys.

**Minimum fix before announcing:** a cumulative series (or an honest "no activity in this period"
message), plus the 24H key fix. Without it, announcement #2 actively damages trust.

### Non-blocking but worth doing

- **Dead-end render branch** — `ReviewClient.tsx:146-160`: if `sessionState === 'empty'` but
  `hasDue` is true at render, the ternary falls through to `null` — a green checkmark on an
  otherwise blank page, no heading, no link out. Rare, needs a state change mid-render, but has
  no fallback copy.
- **Timer-based hydration** — `ReviewClient.tsx:55-82` uses a 300 ms `setTimeout` to decide the
  localStorage hook has loaded. It works today because React batches both mount effects into one
  commit. Any future change that splits them flips real users into "No Kanji to Review".
- **No shape validation on progress data** — `useKanjiProgress.ts:41` does `setProgressData(parsed)`
  raw. A stored object lacking `learnedKanji` white-screens both the review and progress pages.
  Git history shows no legacy format in the wild, so this is latent, not active — but it is two
  lines, and we are about to drive traffic.

---

## Phase 2 — The announcement queue

Ordered by *(value to a returning learner)* × *(how undiscoverable it currently is)*.
Five-day runs with a 2-day gap between them, so there is never a week of uninterrupted banner.

| # | id | Feature | Message angle | Runs | Gate |
|---|---|---|---|---|---|
| 1 | `reviews-2026-08` | **SRS review sessions** (`/kanji/review`) | "The kanji you marked as learned are ready to review." Spaced repetition, built on the kanji they already have. | Tue Aug 4 → Sun Aug 9 | ⚠️ **session cap first**. Skip if `kanji-srs` already has cards |
| 2 | `search-2026-08` | **Search by meaning or kana reading** (`/kanji`) | "Search kanji by meaning or kana reading — not just the character." | Tue Aug 11 → Sun Aug 16 | ✅ Ready. Word it as *kana* reading — see caveat |
| 3 | `worksheet-2026-08` | **Per-kanji printable worksheet** (`/api/kanji-sheets?character=水`) | "Print a practice sheet for any kanji — stroke diagram plus an 80-square grid." | Tue Aug 18 → Sun Aug 23 | ⚠️ **Link it from kanji pages first** (Phase 0) |
| 4 | `progress-2026-08` | **Progress dashboard** (`/kanji/progress`) | "See how many kanji you've learned, and when." | Tue Aug 25 → Sun Aug 30 | 🔴 **Chart must be fixed first** — Phase 0c |
| — | `sentences-2026-08` | **Example sentences** on kanji pages | "Every kanji now has real example sentences." | Unscheduled | 🔴 **0 published — see below** |

**Reordered from the first draft.** Progress moved from slot 2 to slot 4 to buy three weeks for the
chart fix, and search was promoted into the gap — it is the only queue item that needs no work at
all. Sentences comes off the calendar entirely rather than holding a date it cannot meet.

**Slot 3 replaced.** The original "free printable sheets" entry has become the sharper *per-kanji*
worksheet — see below. The generic `/free-resources` link is already in the header, so announcing
it was the weakest item on the list anyway.

### Announcement #3 — the best-hidden thing we own

`app/api/kanji-sheets/route.ts:4` generates a complete A4 print-ready practice sheet for a single
character: the kanji, meaning, onyomi/kunyomi, stroke count, the KanjiVG stroke diagram, and an
80-square (10×8) practice grid with crosshair guides and a guided first column.

It works. It is reachable **only** from `/free-resources/kanji-sheets/n5-sheets`. A user sitting on
`/kanji/水` has no way to discover that a printable worksheet for that exact kanji exists, one
click away.

**Phase 0 addition:** add a "Print practice sheet" link to the kanji detail page template. That is
a one-line link to an endpoint that already exists, and it converts the announcement from "go to a
resources page and hunt" into "the page you are already on can do this."

### 🔴 Blocking bug on the N4–N1 sheet pages — fix regardless of the campaign

Independent of any announcement, this is live and costing us:

- `app/free-resources/kanji-sheets/n1-sheets/` through `n4-sheets/` are complete pages rendering
  their full level's character grid, each character linking to `/api/kanji-sheets?character=…`.
- **Every one of those links 404s.** `app/api/kanji-sheets/route.ts:2,13` imports and searches
  `N5_KANJI` only, returning `404 "Kanji not found in N5 dataset"`.
- `app/free-resources/kanji-sheets/page.tsx:46-77` hardcodes `available: false` for N4–N1, so the
  UI shows disabled "Not Available Yet" buttons and the pages are unreachable by navigation…
- …but `app/sitemap.xml/route.ts:21-25` lists all four at **priority 0.7**. Google is being
  actively pointed at four pages whose every link is a dead end.

Either extend the API to all five levels (the constants already exist — it is a wider import and a
lookup across five arrays) or pull the four pages from the sitemap. Do not leave it as is. This
belongs in `performance-and-seo-roadmap.md` as much as here.

**This also invalidates the original slot-3 copy.** "Kana, and N5 through N1" would have been a
false claim — only N5 works today.

### Why #1 is still reviews

It is the only feature on the list that creates a *reason to come back tomorrow*. Search, printables
and charts are nice; spaced repetition is the retention loop. If only one of these announcements
works, this is the one that needs to.

The SRS implementation itself is sound — a real SM-2 with a sensible learning-step overlay
(`lib/srs.ts:46-101`), honest per-button interval previews, and clean empty states for both "nothing
learned" and "all caught up". Cards are created lazily for every learned kanji on entry
(`useKanjiSRS.ts:56-71`), so users who checked kanji off *before* SRS shipped get a working session
with no migration. The queue cap is the only thing standing between this and a good first impression.

### Announcement #2 wording caveat

Search covers character, English meaning, onyomi and kunyomi (`KanjiSearchClient.tsx:154-169`) —
but readings are stored as **kana only** (`onyomi: "にち、じつ"`). There is no romaji index, so
`mizu`, `sui`, and `nichi` all return zero results while `水`, `water`, and `みず` work.

Say **"meaning or kana reading"**, never just "reading". A romaji-typing user who bounces off a
"No kanji found" screen is worse than never having been told.

### Announcement #4 is currently blocked

The sentence pipeline is built and validated in CI, but the content is not there yet:

| `data/sentences/N5` | Count |
|---|---|
| `queue/N5.json` → `entries` | 82 |
| `decisions/N5.json` → `decisions` | **0** |
| `published/N5.json` | **0** |

Zero published sentences means the kanji pages currently render no sentence section, so there is
nothing to announce. This one is gated on review throughput, not engineering — consistent with
review capacity being the binding constraint on the whole sentences track.

**Decision needed before Aug 25:** either enough N5 sentences get reviewed and published to make
the claim true, or slot #4 is dropped and the queue ends at three. Do not announce it against an
empty published set. A banner that leads to a page with no visible change is the most expensive
mistake available here — it teaches users that our announcements are not worth clicking.

**Candidate replacement for slot #4** if sentences slip: **kanji search by meaning and reading**
(`app/kanji/KanjiSearchClient.tsx`). It is live, it is genuinely useful, and most users likely
assume search only matches the character itself.

### Found by the sweep, not queued — but worth knowing

Ranked by how much value is sitting idle:

1. **Email capture is built and rendered nowhere.** `components/EmailCapture.tsx` +
   `app/api/subscribe/route.ts` (Kit/ConvertKit, double opt-in, referrer segmentation, DataFast
   goal) + `app/subscribed/page.tsx` thank-you landing. The component is imported by **no page**.
   `docs/prd/phase-0-growth-monetization.md` specifies it on free resources, progress, and Pro
   waitlist surfaces. The entire list-building pipeline is dark. This is not an announcement — it
   is a growth fix, and probably worth more than the whole banner campaign.
2. **SRS interval previews** (`ReviewClient.tsx:329`) — each rating button shows the resulting
   interval before you click. Anki-grade, completely unadvertised. Fold this into announcement #1's
   copy rather than giving it a slot.
3. **A built FAQ section renders nowhere** — `components/sections/FAQ.tsx` (with
   `components/ui/accordion.tsx` as its only consumer), alongside `Hero.tsx`, `Problem.tsx`,
   `Experience.tsx`. Old landing-page sections, imported by nothing.
4. **`?search=` deep-linking works** (`KanjiSearchClient.tsx:142-147`), wired to a schema.org
   `SearchAction` in `layout.tsx:88-92`. Supports announcement #2's copy.
5. **The kana sheet API supports a `filled` format** (`app/api/kana-sheets/route.ts:4`) that no
   `SheetCard` exposes — `free-resources/kana-sheets/constants.ts` defines only 4 of the 6 possible
   combos. Two cards away from a free feature.
6. **Product mismatch:** the *N5 kanji* workbook CTA (`KanjiN5WorkbookCTA.tsx:37`) is placed on the
   N1, N2, N3 and N4 sheet pages.

### Gaps confirmed absent (do not announce, and worth a roadmap line)

No PWA (icons ship at `public/assets/web-app-manifest-*.png` with **no manifest referencing them**),
no offline support, no export/share of learned kanji, no accounts or cross-device sync.

**No keyboard shortcuts on any user-facing surface** — the only `keydown` handler in the repo is in
the admin sentence reviewer. The SRS screen has no space-to-flip and no 1-4 to rate, which is a
conspicuous gap for a flashcard feature and a cheap, high-satisfaction win before announcement #1.

### Held back deliberately

- **Stroke-order animation** — users who reach a kanji page already see it. Announcing it tells
  people something they know, which spends credibility for nothing.
- **Anything on the roadmap but unshipped** — the banner announces what exists today. No teasers.

---

## Success criteria

Reviewed after the queue completes, ~Aug 31, 2026:

- **Primary** — unique visitors to `/kanji/review` during and after run #1, against the pre-Aug-4
  baseline. The post-run number matters more than the during-run spike; a spike that fully decays
  means the nav fix did not take.
- **Secondary** — count of localStorage `kanji-srs` stores created in August.
- **Guardrail** — dismiss-on-first-impression rate. If it exceeds ~40% on any announcement, the
  banner is reading as an ad. Stop the queue and reconsider the surface.

---

## Decision note: why a bar and not the modal

The reference screenshot (`announcement.png`) is a full-screen interstitial from a Greek t-shirt
shop announcing an order deadline before a holiday closure. It works *there* because the visitor
arrived intending to buy and the message is a hard, time-critical logistics constraint on that
purchase.

Our situation inverts every one of those conditions. Our traffic is search-driven and lands
directly on kanji detail pages with an immediate task in mind; the message is informational, not
time-critical; and Google penalises content-blocking interstitials on mobile for search landings —
a direct conflict with the work tracked in `performance-and-seo-roadmap.md`.

A dismissible bar costs approximately nothing in bounce and carries no interstitial risk. We take
the lower ceiling for the much lower floor.

---

## Later: the surface that probably beats the banner

`/kanji/progress` and `/kanji/review` are where returning users go voluntarily, already in a
"what should I do next" frame. A permanent, low-key **"What's new"** line there will likely
out-convert any homepage banner, and it does not expire.

Worth building after the queue completes, informed by which of the four announcements actually
moved anything.
