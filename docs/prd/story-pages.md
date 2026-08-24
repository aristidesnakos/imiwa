# Story Pages — Implementation Spec

**Version 1.0** · Created 2026-08-24 · Owner: Ari Nakos
**Related:** [`episode-spec.md`](./episode-spec.md) (the format) · [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) (the pilot) · [`example-sentences-system.md`](./example-sentences-system.md) (the pipeline this copies)

## Why the page, not the email

Decided 2026-08-24. The goal is site traffic and brand, and email delivers neither — it isn't
crawled, isn't shareable, and isn't linkable. But the SEO case is **not** that story pages will rank;
they probably won't for a long time, against NHK Easy News, Tadoku and Satori Reader, from a domain
currently sitting at position 10.5 for its own core terms. Six episodes is a folder, not an asset.

The case is **internal linking into the ~1,890 detail pages that can't win from the SERP**. Fifty
episodes × five contextual links is 250 in-content links with real anchor text, pointing at pages
converting 38,670 impressions at 0.25%. That compounds, and email provides exactly none of it.

Build for that reason, and the decisions below follow. Build hoping the stories themselves rank, and
you'd design this differently and be disappointed.

**Kit is not dropped.** The page has no return mechanism — a reader who finds episode 3 via search
reads it and vanishes. Email is the only thing that brings them back, and the return-open is the
pilot's actual question. Page acquires, email returns.

---

## 1. Data model

Episodes are typed data compiled into the bundle, exactly like `lib/constants/n{1..5}-kanji.ts` and
`data/sentences/`. No database, no MDX. The content is *structured* — parallel JP/EN lines, vocab
entries, questions, answers — and MDX would turn all of that into unvalidatable prose.

`lib/stories/types.ts`:

```ts
/** An N5 grammar pattern, written once and reused across every episode. */
export interface GrammarPattern {
  id: PatternId;          // union, not string — see §5
  form: string;           // 〜たいです
  gloss: string;          // "want to do"
  note: string;           // 2–3 sentences, the whole explanation
}

export interface StoryLine {
  ja: string;             // one sentence, word-spaced (分かち書き)
  en: string;             // its translation, same index
}

export interface TargetWord {
  word: string;           // 山
  reading: string;        // やま
  meaning: string;        // mountain
  hook: string;           // one line, why it sticks
  kanji: string;          // the single char whose page this links — must be in N5_KANJI
}

export interface Episode {
  slug: string;           // ep-01-mountain
  number: number;
  titleJa: string;
  titleEn: string;
  lines: StoryLine[];     // JP and EN cannot drift — one array, not two
  targets: TargetWord[];  // 3–5
  patterns: PatternId[];  // tags into the pattern library — notes are assembled, not written
  questions: string[];    // 3, English
  answers: string[];      // 3, aligned by index
  replyPrompt: string;    // the one question that goes in the email
  publishedAt: string;    // ISO date
}
```

`lines` holds JP and EN together deliberately. Two parallel arrays drift the moment someone inserts a
sentence, and the drift is silent — one array makes the alignment structural rather than a promise.

## 2. What is derived, not written

This is what keeps the weekly cost flat. **"Full build" is front-loaded engineering, not recurring
authoring.**

| Page element | Source | Per-episode cost |
|---|---|---|
| Vocab table (every kanji in the story, with readings + meanings) | Parse `lines[].ja`, intersect with `N5_KANJI`, join on the existing `onyomi` / `kunyomi` / `meaning` fields | **Zero** — fully derived |
| Grammar notes | `patterns[]` tags → the pattern library | **Zero after the library exists** — write ~15 notes once, reuse forever |
| Kanji page links | `targets[].kanji` → `/kanji/${encodeURIComponent(c)}` | **Zero** — encoding is code, never hand-typed (see §5) |
| Furigana toggle | Client-side, from readings already in the data | Zero |
| Story, translation, questions, answers, targets, reply prompt | Written | The real cost |

So the weekly authoring load is: 8–14 sentence pairs, 3–5 target words, 3 questions, 3 answers, a
reply prompt, and a list of pattern tags. That is the same load as the email-only plan.

## 3. Routes

Follow `/kanji/[character]`: `generateStaticParams`, `revalidate = 86400`, `dynamicParams = false`
(unlike kanji — an unknown story slug is a 404, not a render-on-demand).

**`/stories/[slug]`** — the episode. Block order from `episode-spec.md` §A2, with the two things that
only work on a page:

- **Furigana toggle** — the thing email can't do. Default on.
- **Answers in a `<details>`** — a real collapsible, not "scroll to the bottom."

Then the page-only additions: the derived vocab table, and the assembled grammar notes.

**`/stories`** — the hub, and the page actually built to rank. It carries the category query
("easy Japanese stories for beginners", "N5 graded reader", "Japanese reading practice N5"): what
the format is, what N5 means, how to use it, who it's for, then the episode list. The hub does the
ranking work; individual episodes do the internal-linking work. Do not treat the hub as a bare index.

## 4. SEO treatment

- **JSON-LD `LearningResource`** per episode, with `educationalLevel: "JLPT N5"`, `teaches` listing
  the target words, `inLanguage: ["ja", "en"]`. Extend `pnpm validate:schema` to cover the new type —
  the existing validator is where every other page type's structured data is asserted, and an
  unasserted type will rot.
- **Sitemap.** `app/sitemap.xml/route.ts` is served dynamically with no postbuild step, so this is
  additive. Note the existing caveat in `CLAUDE.md`: that route concatenates the level lists with
  **no dedup**. Don't copy that pattern into the stories block.
- **Internal links are the whole point.** Every episode links its 3–5 target kanji in-content. Do
  **not** link every kanji in the story — it wrecks readability and inflates link count for no gain.
- **Reciprocal links come later, deliberately.** A "stories featuring this kanji" block on
  `/kanji/[character]` closes the loop, but it touches ~1,890 pages against a **9.0 kB** script
  budget on `/kanji` that has already drifted ~32 kB past its recorded baseline. Not in this build.
  Re-baseline that route first.
- **Thin-content guard.** A strict-N5 story is ~300 JP characters. The derived vocab table and
  assembled grammar notes are what take the page from thin to substantive — they are load-bearing
  for ranking, not decoration.

## 5. `pnpm validate:stories` — the contract

This repo has no unit test runner; correctness lives in targeted validators, each guarding one
subsystem's contract. So `episode-spec.md`'s rules stop being a document you remember to follow and
become a build failure. Model it on `scripts/sentences/validate-published.ts`.

Assertions:

1. **Every kanji in `lines[].ja` appears in `N5_KANJI`.** This is the strict-N5 rule, mechanised.
   It's the single highest-value check here — it's the constraint most likely to slip at 11pm on a
   send night.
2. `lines[].en` is non-empty for every entry (the array makes drift impossible; this catches blanks).
3. `targets.length` between 3 and 5; every `targets[].kanji` is a single code point present in
   `N5_KANJI`.
4. `questions.length === answers.length === 3`.
5. Every `patterns[]` id resolves in the pattern library.
6. `slug` is unique and URL-safe; `number` is unique and contiguous.
7. No `targets[].kanji` repeats as a *focus* character across episodes (the calendar's no-repeat
   rule).

**`PatternId` is a union type, not a string** — same reasoning you applied to `EmailSignupSource` and
`ProCtaLocation`. A misspelt pattern tag would silently render no note, and nothing would raise.

**Never hand-type an encoded URL.** Build hrefs with `encodeURIComponent` at render time.
`episode-spec.md` §A5 lists pre-encoded URLs because *Kit's composer* has no code — on the site,
hand-encoding is how you eventually ship `%25E5%25B1%25B1` and a 404.

## 6. What the email becomes

Kit stops holding your content. The typed file is the source of truth; the email is generated from
it and links to the page.

The email carries: title, the first 2–3 lines of the story as a hook, the reply prompt, and a link to
the full episode. Every constraint in `episode-spec.md` §A1 still applies to it — it's still an email,
Outlook still uses the Word engine, links still need encoding.

The measurement improves as a side effect. Today the read signal is an open, which Apple Mail Privacy
Protection inflates into near-uselessness. With a teaser, the signal becomes **click-through to the
page**, which DataFast measures directly and which is a far better proxy for "did they read it."

## 7. Build order

One working day, roughly in this order. Each step is independently shippable.

1. `lib/stories/types.ts` + the ~15-entry pattern library. **Do this first** — it's the piece that
   makes every later episode cheap, and it's pure writing with no dependencies.
2. `data/stories/ep-01.ts` from the episode-spec calendar. One real episode beats a fixture.
3. `scripts/validate-stories.ts` + the `validate:stories` script entry. Before the pages, so the
   first page renders data already known good.
4. `/stories/[slug]` — blocks, derived vocab table, assembled notes, furigana toggle, `<details>`
   answers.
5. `/stories` hub, written as a ranking page.
6. JSON-LD + `validate:schema` extension + sitemap entries.
7. Lighthouse gate. New routes need budgets in `lighthouserc.js` — they have no baseline, and an
   unbudgeted route is an ungated route.

**Deliberately not in this build:** the reciprocal block on kanji pages (§4), send automation, audio,
and any N4 escalation.
