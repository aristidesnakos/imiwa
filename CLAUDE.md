# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repository is named `imiwa` for historical reasons; the product is **MichiKanji**. `config.ts` is
the single source of truth for the product name and domain. `README.md` documents the product and
feature set in depth — this file covers what you need to *work* in the codebase.

## Commands

```bash
pnpm install    # pnpm 9.15.4+
pnpm dev
pnpm build      # no postbuild step — the sitemap is served dynamically by app/sitemap.xml/route.ts
pnpm lint
pnpm analyze    # build with the bundle analyzer
```

Opt into the tracked git hooks once per clone (they are not in `.git/hooks`, so they are not
automatic):

```bash
git config core.hooksPath .githooks
```

The `commit-msg` hook rejects a CI-skip marker appearing **below** the subject line. This is not
pedantry: Vercel scans the whole commit message, and a body that merely *described* the marker in
prose once silently skipped four deployments.

### Validation — there is no unit test runner

Correctness is enforced by targeted validators, each guarding one subsystem's contract. These are
the closest thing to "running a single test":

```bash
pnpm validate:schema         # structured data / JSON-LD across page types
pnpm validate:kanji-data     # the level lists: no duplicates, one code point, readings present
pnpm validate:romaji         # kana->Hepburn rules + a leakage sweep over every reading
pnpm validate:sentences      # published example sentences against lib/sentences/types.ts
pnpm validate:announcements  # announcement config + a replay of the acknowledgement model
pnpm announcements:status    # human-readable state of the announcement queue
```

`validate:announcements` does more than check a config shape — it replays the acknowledgement model
against synthetic visitors and dates, asserting that first-time visitors never see a bar, that
dismissing one entry never suppresses another, and that the impression cap retires an ignored bar.
Those are user-facing promises asserted nowhere else.

Performance budgets run in CI on every PR, and locally after a `pnpm build`:

```bash
pnpm dlx @lhci/cli@0.14.0 autorun --config=./lighthouserc.js
```

### Content pipeline

```bash
pnpm sentences:publish --level N5 --dry-run      # queue + decisions -> published/<level>.json
pnpm check-indexation                            # Search Console indexed-page trend
pnpm submit-indexnow
```

## Architecture

### Kanji data and rendering

Kanji live in `lib/constants/n{1..5}-kanji.ts` and are compiled into the bundle. There is no
database. `/kanji/[character]` prerenders all ~1,896 characters via `generateStaticParams`, with
`revalidate = 86400` and `dynamicParams = true` so unknown characters still render on demand.

**A character appearing in more than one level list always resolves to the lowest level**, but two
different mechanisms implement that rule: the detail page concatenates N5→N1 and takes the first
`.find` match, while `KANJI_MAP` in `app/api/kanji-sheets/route.ts` and `ReviewClient.tsx` inserts
N1→N5 so N5 overwrites. Any new lookup must land on the same answer.

Six call sites merge the five lists this way, three different ways, and `app/sitemap.xml/route.ts`
concatenates with no dedup at all. They agree only because the data is clean, so
`pnpm validate:kanji-data` is what keeps them agreeing: it asserts no character appears twice within
or across the lists, that every `kanji` field is exactly one code point, and that every entry has a
meaning and at least one reading (with a committed allowlist for the reading-less entries). It
replaced three one-off regex scripts that used to sweep duplicates out by hand — deleted, because
they rewrote the constants files wholesale and would now clobber the shared type.

`KanjiData` and `KanjiWithLevel` live in `lib/constants/kanji-types.ts` and are re-exported by each
level file, so `import type { KanjiData } from '@/lib/constants/n5-kanji'` still resolves. `level` is
never stored in the data — it is added by whichever call site does the merge. Keep these imports
`import type`: `/kanji` runs against a hard Lighthouse byte budget, and a barrel that pulls the data
arrays into the five single-level `kanji-sheets` routes would blow it.

Stroke diagrams are proxied through `app/api/kanji-svg/[hex]/route.ts`. The hex comes from
`codePointAt(0)` (never `charCodeAt`, which returns a lone surrogate above U+FFFF).

### Romaji

`lib/romaji/` derives romaji from the kana readings at runtime. Nothing is stored: baking romaji
into `lib/constants/*` would add an estimated 15–25 kB gzipped to the `/kanji` client bundle, which
has roughly 44 kB of headroom against a Lighthouse budget that is an `error`, not a warning.

Two layers, and callers should use the upper one:

- `hepburn.ts` knows kana only. It parses once and renders three ways, because a long vowel has no
  single correct spelling and learners type all of them: `どう` → `dō` (display), `dou` (typed),
  `do` (typed without an IME). Modified Hepburn, so `えい`/`いい` are **not** macronised.
- `readings.ts` knows *our data*, which carries two annotation dialects: the native `、` + `（）`
  and a KANJIDIC-imported `, ` + `.` (55 entries). It also folds katakana, because 137 onyomi are
  stored in katakana and 1,714 in hiragana with no rule behind which. **Never romanise a raw
  reading field** — annotation syntax will leak into titles and JSON-LD, which is exactly what
  `Article.mainEntity.alternateName` used to do.

`validate:romaji` pins the rules a naive implementation gets wrong (gemination, `っち` → `tch`, the
ei/ii carve-out, moraic `n`) and then sweeps all ~3,586 readings asserting no annotation or
unconverted kana reaches the output. That sweep is the actual contract.

Why it exists: a learner who has heard a word searches "michi kanji", not "みち" — they usually
cannot type kana yet, which is why they are looking the character up. With no romaji anywhere,
`/kanji/道` was unmatchable for that whole query class and Google ranked the homepage instead.

### No server-side user state

Everything personal is in `localStorage`: `kanji-progress`, `kanji-srs`, `mk-announcements`,
`cookie-consent`. Stored blobs are shape-validated on read and **never deleted on mismatch** — an
unrecognised shape may still be recoverable, and destroying someone's progress is worse than an
empty chart.

Two hydration patterns exist and **must not be mixed**:

- Components that must not appear in server HTML use a `mounted` flag and `return null`
  (`CookieConsent`, `AnnouncementBanner`).
- Hooks start from an SSR-safe empty state and hydrate in an effect (`useKanjiProgress`,
  `useKanjiSRS`). No `mounted` guard is needed downstream of these.

### Example sentences — the most multi-file subsystem

`lib/sentences/types.ts` is the contract three things build against:

```
scripts/sentences/select.ts   -> data/sentences/queue/<level>.json      (candidates)
app/admin/review/*            -> data/sentences/decisions/<level>.json  (human verdicts)
scripts/sentences/publish.ts  -> data/sentences/published/<level>.json  (what the site renders)
```

Decisions live in their own file keyed by a stable Tatoeba pair id, so regenerating the queue with a
better ranker never destroys review work.

The site's read path is `lib/sentences/published.ts`, which uses **static JSON imports, not `fs`** —
a runtime `fs` read works at build time and then fails in a serverless function because Next's file
tracing never saw the path. Adding a level means committing its file *and* adding an import there;
the build should fail loudly on a missing import rather than silently render nothing.

An empty `published/*.json` is a valid, expected state, and `ExampleSentencesSection` renders
nothing at all when a kanji has no sentences — no heading, no empty state. Today every level is
empty; the bottleneck is review throughput, not code.

The review dashboard under `/admin` is a **local developer tool** that writes flat files with `fs`
and has no auth. `lib/sentences/local-only.ts` provides two guards that must be the first statement
of every admin route handler (`blockedResponse()`) and every admin page/layout
(`assertLocalOnlyPage()`). Gating only the APIs ships broken UI against dead endpoints.

### Design tokens — read this before touching colour

`app/globals.css` defines the palette as **hex values**, and `tailwind.config.js` maps colours to
`var(--token)` **with no `hsl()` wrapper**. Consequences worth internalising:

- Stock shadcn tokens copied in as bare HSL triplets (`0 84.2% 60.2%`) produce an invalid
  declaration that the browser silently **drops**. No error, no warning — the property just does not
  apply. This shipped for a long time on `--destructive`.
- An **undefined** token does the same: `border-input` fell back to `currentcolor` for months.

So verify colour work against computed values in a browser, not by reading the class list.

Several brand colours are too light to carry text, so the palette uses **fill/ink pairs**: use
`--coral-sunset` / `--destructive` as backgrounds and washes, and `--coral-sunset-ink` /
`--destructive-ink` for text, borders and state indicators. Known open failure: the N4 and N3 level
badges on the homepage still put white on light fills.

Two related conventions:

- Prefer `hover:brightness-90` over an alpha hover (`hover:bg-x/90`). Alpha composites against
  whatever is behind the element, so one class darkens on a dark section and *lightens* on a light
  one — a hover that drops below its own resting contrast.
- Focus rings come from `buttonVariants` plus `--ring`. Raw `<button>`/`<a>` elements that do not go
  through `buttonVariants` need the ring added explicitly; several once carried near-invisible
  hand-rolled rings alongside `outline-none`.

### Page structure conventions (`/kanji/[character]`)

`components/kanji/section.ts` holds the one rhythm — `SECTION_BAND` and `SECTION_HEADING` — shared
by every major section so a new band can be dropped anywhere in the order without renegotiating
spacing or type scale. Sections whose body is a bordered card skip the band's rule. Every `<h2>` is
phrased as something a person would search, not as a label for the widget beneath it. Centring means
exactly one thing on that page: a moment rather than content.

### SEO

`robots.txt` and `sitemap.xml` are dynamic route handlers, not build artifacts. Kanji pages emit
three linked JSON-LD types (Article, FAQPage, BreadcrumbList); `lib/seo/site.ts` is the single source
of absolute URLs, and JSON-LD must use the canonical `www` host — the apex 301s to it, and hardcoding
the apex splits the brand entity across two hostnames. `schema-check` CI gates this on every PR.

### Performance budgets

`lighthouserc.js` gates PRs across `/`, `/kanji` and `/kanji/日`. Read its header comment before
changing a threshold — it records how each number was derived and which ones freeze known debt.
The **byte budgets are the gate to trust**: they came out byte-identical across 27 local and CI runs.
TBT is noisy under 4× CPU emulation and is a "something got dramatically heavier" alarm only.
`/kanji` TBT is confirmed debt; `/kanji` CLS is *not* — it did not reproduce on the runner.

### Content licensing

Attribution obligations here are load-bearing, not decorative. KanjiVG is CC BY-SA 3.0 and its credit
must travel with every page that ships a diagram (hence the site-wide footer). Tatoeba does not own
its sentences and cannot waive contributors' attribution, so each sentence credits its own author and
licence — a footer line alone is not sufficient. Our own editorial commentary must render
structurally separate from licensed text, or the result becomes Adapted Material. Read
`docs/prd/content-source-licence-investigation.md` before adding any content source.

## Gotchas

- **`scripts/` is excluded from `tsconfig.json`.** Neither `pnpm build` nor `pnpm lint` typechecks
  it, so a broken import there surfaces only when its scheduled workflow runs. Check `scripts/` by
  hand whenever you delete or move a `lib/` module.
- `middleware.ts` runs on every non-static path for AI-crawler tracking.
- `next lint` is deprecated and prints a migration notice; the pre-existing `no-unused-vars` warnings
  in `lib/utils.ts`, `lib/hooks/use-toast.ts`, `lib/sentences/validate.ts`, `KanjiSearchClient.tsx`
  and `sentence-reviewer.tsx` are noise — do not treat a clean-looking lint run as a change signal
  without filtering to the files you touched.
- Search matches **kana only** — `水`, `water` and `みず` match; `mizu` and `sui` do not. Describe the
  feature as "meaning or kana reading", never just "reading".
- `docs/learnings/development-guide.md` holds the project's general SOLID/spec-driven guidance.
