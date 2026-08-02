# MichiKanji — Japanese Kanji Learning Platform

**Master Japanese kanji through interactive stroke order practice**

MichiKanji ([michikanji.com](https://www.michikanji.com)) is a web platform that helps Japanese
language learners master kanji from JLPT N5 through N1. It teaches proper stroke order through
interactive diagrams, drills recall with spaced repetition, and tracks progress — all without an
account, because everything is stored in the browser.

> The repository is named `imiwa` for historical reasons; the product is MichiKanji.
> `config.ts` is the single source of truth for the product name and domain.

## Product Overview

### Target users
- Japanese language learners preparing for JLPT exams (N5–N1)
- Students improving their kanji writing technique
- Educators looking for visual kanji teaching tools
- Self-directed learners building systematic kanji knowledge

### Value propositions
1. **Comprehensive coverage** — 1,896 characters across all five JLPT levels
2. **Interactive learning** — animated stroke order diagrams from the KanjiVG database
3. **Retention, not just recognition** — a real SM-2 spaced repetition system built on the kanji
   you have already marked as learned
4. **Printable practice** — an A4 practice sheet generated on demand for any character
5. **Privacy by construction** — no accounts, no sync, no server-side user data

## Technical Architecture

### Stack
- **Framework**: Next.js 15, App Router, React Server Components
- **Styling**: Tailwind CSS with Radix UI primitives (shadcn/ui)
- **Data storage**: browser `localStorage` only — no database, no auth
- **Stroke diagrams**: KanjiVG SVGs, served through an internal API route
- **Email**: Resend (contact) and Kit (list)
- **Analytics**: DataFast, with consent-gated Ahrefs
- **Deployment**: Vercel

### Core features

#### 1. Kanji dictionary and search
- **Multi-level organisation** — characters categorised by JLPT level, deduplicated to the lowest
  level a character appears in
- **Search** — by character, English meaning, onyomi or kunyomi. Search still matches **kana only**,
  so `水`, `water` and `みず` all match while `mizu` and `sui` do not; describe this feature as
  "meaning or kana reading", never just "reading". Romaji itself is no longer missing from the
  codebase — `lib/romaji/` derives it and the detail pages and their metadata carry it — but the
  search predicate has not been wired to it yet.
- **Deep linking** — `/kanji?search=…` is wired to a schema.org `SearchAction`
- **Character detail pages** — statically generated for all 1,896 characters

#### 2. Interactive stroke order
- SVG animations driven by the KanjiVG database
- Play / pause / reset controls
- Graceful degradation for characters with no stroke data

#### 3. Spaced repetition (`/kanji/review`)
- A real SM-2 implementation (`lib/srs.ts`) with a learning-step overlay
- Per-button interval previews — each rating shows the resulting interval before you commit
- Cards are created lazily for every learned kanji on entry, so users who marked kanji as learned
  before SRS shipped get a working session with no migration
- Sessions are capped at 20 cards. Every learned kanji starts due, so an uncapped session for
  someone with a 400-kanji backlog would open at "1/400" and never be finished. The remaining
  backlog is stated plainly and drained by repeating the session.

#### 4. Progress tracking (`/kanji/progress`)
- Mark characters as learned, with timestamps
- Cumulative learning curve over 24H / 7D / 30D / 12M windows, plus per-bucket deltas
- Per-level completion percentages
- `noindex` by design — it is a private dashboard, not a landing page

#### 5. Printable practice sheets
- `/api/kanji-sheets?character=水` returns a print-ready A4 sheet: the character, its readings,
  stroke count, the KanjiVG stroke diagram, and an 80-square practice grid with crosshair guides
- Works for every character in the dataset, all five levels
- Reachable from each kanji's own page and from the per-level sheet listings under
  `/free-resources`
- `/api/kana-sheets` does the same for hiragana and katakana

#### 6. Example sentences
- A full pipeline from the Tatoeba corpus: candidate selection → human review → publish, with
  furigana rendering and per-sentence attribution
- **Currently unpublished.** 82 N5 candidates sit in the review queue and nothing has been
  published, so kanji pages render no sentence section. The gate is review throughput, not
  engineering — sentences must be checked by a qualified reader before they ship.

#### 7. Announcement bar
- A slim, dismissible bar that tells **returning** users about features they already have but do
  not know about. Never shown to first-time or search-arrival visitors.
- Config-driven: `lib/announcements/config.ts` is the only file edited per announcement.
- Acknowledgement is write-once and scoped per announcement — the X, `Esc`, a CTA click, or three
  impressions with no interaction all retire it permanently. Each entry also carries a precondition
  so we never announce a feature to someone who already uses it.
- Every entry carries an expiry, so a run ends because the config says so rather than because
  someone remembered to remove it.
- See [`docs/3rdVersion/announcement-banner-roadmap.md`](docs/3rdVersion/announcement-banner-roadmap.md).

### Data architecture

All user data lives in `localStorage`. There is no database and no server-side user state.

| Key | Written by | Holds |
|---|---|---|
| `kanji-progress` | `hooks/useKanjiProgress.ts` | learned characters + timestamps |
| `kanji-srs` | `hooks/useKanjiSRS.ts` | SM-2 card state per character |
| `mk-announcements` | `lib/announcements/state.ts` | which announcements have been acknowledged |
| `cookie-consent` | `components/CookieConsent.tsx` | consent choices, 365-day expiry |

```typescript
interface KanjiData {
  kanji: string;        // The character
  onyomi: string;       // Chinese reading(s), kana
  kunyomi: string;      // Japanese reading(s), kana
  meaning: string;      // English definition
}

interface KanjiProgressData {
  learnedKanji: string[];             // Learned characters
  timestamps: Record<string, number>; // Learning timestamps, for the progress chart
}
```

Stored blobs are shape-validated on read rather than trusted, and are never deleted on a
mismatch — an unrecognised shape may still be recoverable, and destroying someone's progress is
worse than an empty chart.

### Japanese language context

#### JLPT levels

Counts are the characters actually in this dataset, not the official JLPT lists:

| Level | Characters | Scope |
|---|---|---|
| N5 (Beginner) | 82 | everyday vocabulary, numbers, basic verbs |
| N4 (Elementary) | 171 | more complex daily situations |
| N3 (Intermediate) | 380 | workplace and academic contexts |
| N2 (Upper-intermediate) | 259 | news, literature, professional contexts |
| N1 (Advanced) | 1,004 | academic and specialised texts |
| **Total** | **1,896** | |

#### Why stroke order matters
- **Character recognition** — consistent stroke patterns aid reading speed
- **Legibility** — correct strokes produce more readable characters
- **Cultural appropriateness** — following traditional writing conventions
- **Muscle memory** — building automatic writing reflexes

### Content licensing

Third-party content carries obligations that are load-bearing, not decorative:

- **KanjiVG** stroke diagrams — CC BY-SA 3.0, © 2009–2012 Ulrich Apel. Attribution must travel with
  the copies distributed, so it renders in the site-wide footer, including on every kanji page.
- **Tatoeba** sentences — CC BY 2.0 FR. Tatoeba does not own the sentences and cannot waive its
  contributors' attribution rights, so individual contributors are credited on each sentence in
  addition to the project-level credit.

See [`docs/prd/content-source-licence-investigation.md`](docs/prd/content-source-licence-investigation.md)
before adding any new content source.

## Development

```bash
pnpm install                 # Install dependencies (pnpm 9.15.4+)
pnpm dev                     # Start the development server
pnpm build                   # Production build — no postbuild step; the sitemap is served
                             # dynamically by app/sitemap.xml/route.ts
pnpm lint                    # ESLint
pnpm analyze                 # Build with the bundle analyzer
```

### Validation

The repository has no unit test runner. Correctness is enforced by targeted validators that run in
CI and can be run locally:

```bash
pnpm validate:schema         # structured data / JSON-LD across page types
pnpm validate:sentences      # published example sentences against the content contract
pnpm validate:announcements  # announcement queue contract + a replay of the acknowledgement model
pnpm announcements:status    # human-readable state of the announcement queue
```

`validate:announcements` is worth calling out: beyond checking the config, it replays the
acknowledgement model against synthetic visitors and dates, asserting that first-time visitors are
never shown a bar, that dismissing one entry never suppresses another, and that the impression cap
retires an ignored bar on its own. Those are promises to users, and this is the only place they are
asserted.

### Continuous integration

| Workflow | Trigger | Purpose |
|---|---|---|
| `announcements-check` | PR / push touching the banner | queue contract + acknowledgement model |
| `announcements-status` | daily 07:00 UTC | reports the queue into one self-closing tracking issue |
| `sentences-check` | PR / push touching sentence data | published sentences against the contract |
| `schema-check` | PR / push | structured data validity |
| `lighthouse-ci` | push | performance and Core Web Vitals budgets |
| `indexation-alarm` | weekly | indexed-page trend via the Search Console API, with a dead-man's switch |
| `indexnow-submit` | push | submits changed URLs to IndexNow |

### Architecture decisions
- **Client-side storage** — privacy-focused, no accounts, no sync. The trade-off is real and
  stated in the UI: clearing browser data loses progress.
- **Static generation** — every kanji page is prerendered at build time and revalidated daily
- **Component architecture** — modular, with shared primitives in `components/ui`
- **Mobile-first responsive design**
- **Hydration** — two deliberate patterns that must not be mixed. Components that must not appear
  in server HTML use a `mounted` flag (`CookieConsent`, `AnnouncementBanner`); hooks use an
  SSR-safe default state hydrated in an effect (`useKanjiProgress`, `useKanjiSRS`).

## Roadmap

Shipped since the first version of this document: spaced repetition, the progress dashboard,
per-character practice sheets, and the announcement system.

Still open:
- **Publishing example sentences** — pipeline is built; content is gated on review capacity
- **Writing practice** — a digital canvas for stroke practice
- **Audio** — pronunciation guides for reading practice
- **Offline support** — there is currently **no PWA and no offline capability**. Manifest icons
  ship at `public/assets/web-app-manifest-*.png` with no manifest referencing them.
- **Keyboard shortcuts** — the SRS screen has no space-to-flip and no 1–4 to rate
- **Export / share** of learned kanji, and cross-device sync

## Business Context

### Positioning
- Free, comprehensive kanji coverage with no subscription barrier
- Focus on writing technique and retention, not recognition alone
- Systematic progression following JLPT structure
- Privacy-respecting by design

### Success metrics
- Organic search traffic for JLPT-related kanji queries
- Progress-tracking and review-session completion rates
- Mobile usage patterns
- Stroke diagram load and interaction performance

MichiKanji is a modern approach to traditional Japanese language learning, combining technological
innovation with respect for authentic Japanese writing practices.
