# Comic Format Decision — "Tan Strips"

**Version 1.1** · Created 2026-09-13 · Revised 2026-09-13 (simplified after Ari's read) · Owner: Ari Nakos
**Status:** Decided. Nothing shipped.

## 1.1 — The simplified plan (supersedes the test design below where they differ)

Ari's steer: stickers are out, Reddit and any mod-gated channel is out, monetization is the key,
brand awareness feeds it, and the question is whether the **storyline** is worth more than the strip.

**Answer: the storyline is the unit, the strip is its picture, the book is its product.** The
strip and the story are not two channels; they are one weekly episode with three outputs. Gag strips
have one output and no product at the end. `episode-spec.md` Part B already holds the spine — six
themed episodes of *The Travels of Tan* (mountain → river → school → rainy day → train to Tokyo →
family), 30 focus kanji verified in N5, pre-encoded links. Strict N5 cannot carry a plot (§A4), so
the continuity is the **journey**, not cause and effect: one place per episode, Tan moving through
Japan, meeting each kanji where it lives (a sign, a menu, a station board). That is a storyline the
grammar supports, and it is the one the docs already started.

One episode a week produces, from one script:
1. `/stories/<slug>` — the text home (SEO, the 250 in-content links into detail pages that
   `story-pages.md` was built for, and the surface that carries the book CTA and the email form).
2. A **six-panel strip** of the same episode — Pinterest and Instagram, linking to the story page,
   not to a kanji page. No Reddit.
3. After ~12 episodes, **_The Travels of Tan, Vol. 1_ on KDP** — the same print pipeline that built
   the N5 book (`audit_print.py`, the geometry, the cover recipe). This is the storyline's paid form,
   and it is the only uncapped path the forecast found. Forecast §4's Gumroad bundle is retired:
   Gumroad has $2 of evidence, KDP has the pipeline.

### The three steps, in order

| # | Step | Owner | Why it is first / what it waits on |
|---|---|---|---|
| 1 | **Ship the money that is already built.** Push `main` (rename cutover runbook, `d0b1253`), upload the N5 book to KDP, list it, and the book CTA on the sheet pages goes live through `ce41cda`. | Ari (push + KDP credentials); Claude preps the listing copy and the post-push goal verification. | The only step with revenue inside 30 days. Nothing else on this page earns a dollar before it. |
| 2 | **Make the storyline real.** Build `/stories` text-first per `story-pages.md` §7 (one working day), with episodes 1–3 from the calendar. Generate the pose library in one sitting. Render each episode as a strip; post to Pinterest + Instagram linking to the story page. | Claude builds and drafts; Ari reads the Japanese (~10 min/episode) and pushes. | Waits on step 1's push so the goal grammar is live before `stories_*` goals are named. |
| 3 | **Read, then decide the book.** At episode 6 (the calendar's end, ~early Nov), read story-page visits, strip → story arrivals, and N5 book sales against the predictions below. Green-light Vol. 1 only on evidence. | Both. | Waits on six episodes and the KDP sales report. |

### Predictions, written now

- N5 book: ≥ 1 sale in the first 30 days listed. (The kill criterion from the gate review cannot be
  resolved at current traffic; one sale is the floor that proves the path is wired end-to-end.)
- Story pages: episode 1 ≥ 150 pageviews in its first 30 days from all sources; ≥ 40% of those
  arrivals from the strip (UTM), the rest internal.
- Strips: Pinterest ≥ 20 saves per strip at day 14; Instagram ≥ 10 saves.
- Return: any measurable second visit to a story page from a returning visitor in DataFast —
  the site's return rate is 7.1%, so this is the number the storyline exists to move.

### Killed or deferred

Stickers (Telegram, LINE) · Reddit and any mod-approval channel · `/manga` · a strip on the
kanji detail pages (the story page is the strip's home; the detail page gets a link from the story,
which is what it needed) · the Gumroad story bundle · merch · the email *send* until the postal
address and Resend audience exist (Ari's items, outside the repo). The email *form* on the story
page ships regardless, so subscribers accumulate before episode 1 is ever sent.

### The only things Ari has to do himself

Push `main` · upload and list the N5 book · fill `config.business.postalAddress` and create the
Resend audience · confirm which Pinterest/Instagram accounts post · read six scripts.

Everything below this line is the 1.0 analysis and stands as the record of why.

---
**Related:** [`strategy-forecast.md`](./strategy-forecast.md) §4–6 (the forecast this revises) · [`story-pages.md`](./story-pages.md) (the text spine, still unbuilt) · [`episode-spec.md`](./episode-spec.md) §A4 (the grammar whitelist the strip inherits) · [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) (non-goals: no second domain)

## Verdict

**Go — narrowly, and in a different shape than proposed.** A weekly six-panel Tan strip is worth
running, but only as a **pose-library comic**: a fixed set of ~16 Tan poses, generated once, composed
with text by code. Not hand-drawn art every week. The proposal's own cost line — *"consistent
character art per strip, weekly, forever"* — is the thing that kills indie comics, and it is the one
input the repo already knows how to remove.

Three noes, all cheap: no `jlptmanga.com` (301 it to `michikanji.com/manga`, revisit 2027 on §5's
trigger); no `/manga` section before the off-site test reads; no visual layer on `/stories` until
`/stories` exists as text.

The frame is corrected too. The strip is **not a link-equity play**. Reddit, Pinterest and Instagram
links are nofollow or absent, so nothing posted there moves authority. What a strip can do that
nothing else on the site does: give a returning-visitor reason to exist (7.1% of visitors ever
come back — [[datafast-reading-12sep2026]]), put original owned art on pages that today carry only
a licensed corpus, and travel — a save, a share, a group-chat sticker — where a kanji detail page
structurally cannot. Measure those. Not traffic, not revenue, not links.

## What was verified 13 Sep 2026, and where the notes were wrong

| Claim in the notes | Reality |
|---|---|
| "20 Tan assets in `public/assets/`" | 7 in `public/assets/`, 19 in `public/assets/stickers/`. Eight of the 19 are byte-identical duplicates under different names (`tan-01` = `tan-brush` = `tan-celebrate` = `tan-point`; `tan-02` = `tan-confused` = `tan-nap` = `tan-peek`). **13 distinct sticker images**, of which the six `FINAL-*` are the emotional set. |
| The six emotional stickers are "referenced in `ExampleSentencesSection.tsx`" | No component references `assets/stickers/` at all. The section uses `tan-point`, `tan-brush`, `tan-celebrate` from the parent folder. The sticker set is **finished and unshipped, anywhere**. |
| The section "renders nothing at all today because every `published/*.json` is empty" | `data/sentences/published/N5.json` holds **229 reviewed sentences covering 102 kanji**, including every top-traffic character (日 本 時 人 年 月 大 学 生 今 行 見 中). The section renders on those 102 pages; the other ~1,794 get the Tan thumbs-up sign-off instead. There is no "empty slot" — the strip would be an addition, not a fill. |
| The sticker set is "a style guide, not a production pipeline" | Half right. The six FINAL stickers are a **flat cel style** — clean brown outline, sage body, terracotta headband with 探, kana caption + English gloss. Consistent with each other; **not** the watercolour register of the site's hero art. Reads at thumbnail size, which is the property a strip needs. It is a pipeline once it is treated as one (below). |
| "The comic is a distribution and link-equity play" | Distribution yes. Link equity no — see verdict. |
| Skip the email test | Agreed, and moot: the pilot is blocked on the postal address ([[michikanji-weekly-email-strategy]]) and there is no episode to send. |
| `main` state | `main` is **3 commits ahead of `origin/main`** (`119e06b` KDP, `d0b1253` goal rename, `ce41cda` Amazon measurement path). None of it is live. The rename cutover runbook applies before any new goal is named. |

Everything else checked out: `episode-spec.md` §A4 (lines 200–202) is the strip spec in all but
name; `story-pages.md` is fully specced with no `lib/stories` or `app/stories`; the forecast's §5
kills the second domain and §6 names the step-change escape hatch; `weekly-story-newsletter.md:24`
kills `jlptmanga.com` by name.

## The pipeline that makes weekly possible

The repo already contains every rule needed; they have just never been pointed at a comic.

1. **One pose library, one sitting.** [[michikanji-brand-system]]'s style-consistency rule: a
   fixed prompt spine, swap only the action clause, generate the whole set in one session feeding
   the six FINAL stickers as reference. Target **16 poses** (six exist). The ten to add, chosen so
   any N5 slice-of-life beat can be staged: walking · sitting at a desk · holding a book · eating ·
   looking at a phone · pointing at a sign · sleeping (`tan-nap`, currently a duplicate) · peeking
   (`tan-peek`, same) · waving · surprised. Plain white background, **no text in the scene**, then
   PIL flood-fill cut-out — the cover recipe, unchanged.
2. **Text is set by code, never by the model.** Panels are HTML composed with the pose PNGs, kana
   captions in `Noto Sans CJK JP`, rendered with Playwright at `device_scale_factor=2`. The
   `social/` folder already has the grid-paper ground, the sage halo, the terracotta footer band
   and the 探 seal. A strip is that layout with four cells.
3. **Never mirror Tan.** `scaleX(-1)` breaks the 探. Generate a facing-left pose if one is needed.
4. **Script is 4 sentences of strict N5**, validated against the §A4 whitelist exactly as an episode
   would be. Review load per strip: ~4 sentences. That is the whole point — it is the cheapest unit
   of publishable Japanese this project has.

Recurring cost per strip once the library exists: writing + one review pass + a render. No art.
When a beat needs a pose the library lacks, that is a signal to extend the library in a batch, not
to draw one-offs.

## Format

- **Four panels, 1080×1080**, 2×2 grid. A 1000×1500 vertical export (4×1) for Pinterest; the same
  file works for Instagram feed at 4:5 crop.
- **One kanji per strip.** Tan's headband says 探 — he explores one character. Panel 4 always ends
  on the character large, with `michikanji.com/kanji/<char>` in the footer band. This is the bridge
  from the strip back to the pages, and it is what makes the on-site variant a per-page asset.
- **Japanese inside the panels, in kana + the featured kanji, with furigana where §A4 allows.** One
  line of English gloss *under* each panel, outside the artwork, the way the stickers do it. The
  no-English-in-the-art rule from the social graphic holds for the artwork itself.
- **Slice-of-life, one place, one small thing** — §A4's reasoning applied literally. No plot arcs;
  strips are independent so any one can be someone's first.
- Footer band: `MichiKanji.com · 漢字を、たのしく`. Alt text on every export names the kanji, the
  reading, and the meaning — the image is also a document.

## The experiment — zero code, three weeks

Written before anything is posted, so the read cannot be reasoned backward from the result.

**Hypothesis.** A Tan strip earns saves and shares at a rate the existing printable-sheet posts do
not, and a Pinterest pin of a strip sends measurable arrivals to the kanji page it names.

**Instruments.**
- Platform-native: saves, shares, comments per post (Pinterest saves, Instagram saves + shares,
  Reddit upvotes + comments). These are the only instruments that see the thing being tested.
- On-site: DataFast **Referrer → DETAILS**, plus `?utm_source=<platform>&utm_medium=comic&utm_campaign=tan-<nn>`
  on the footer link. Pinterest is absent from the referrer list and Instagram sent **11**
  visitors/30d (3 Sep read), so any movement is attributable without a split.

**Predictions, stated now.** Per strip, 14 days after posting:
- Pinterest: ≥ 20 saves and ≥ 5 arrivals on the named kanji page. (Prior: printables are the
  site's fastest-growing cluster and Pinterest is where printables live; whether any MichiKanji
  pins exist yet is open question 3, so this prior is thin.)
- Instagram: ≥ 10 saves. (Prior: new-ish account, tiny reach; this is a floor, not a target.)
- Reddit: ≥ 50 upvotes and ≥ 5 comments on the one thread that contains all three strips.
- Site: ≥ 15 arrivals total from the three platforms across the three strips.

**Read rule.** Pinterest carries the decision. If Pinterest meets both its numbers on two of three
strips → proceed to the on-site step. If it meets neither on all three → stop; the strip becomes a
monthly brand asset, not a weekly channel. Anything in between → run three more before deciding, and
change exactly one variable (format ratio or kanji choice), not several.

**Procedure improvement each cycle.** Log every strip in `docs/prd/comic-log.md`: kanji, script,
prediction, 14-day read, and one sentence on what the procedure changes next time.

**Reddit is the risky leg, not the important one.** MichiKanji already posted once in a community
(WaniKani, thread 73182) with no origin story and got zero replies. r/LearnJapanese treats
self-promotion as requiring prior moderator approval — **message the mods before posting, post as a
person, one thread, all three strips, never bump**, and open on the problem (strict-N5 has no
conditionals, so a plot is impossible — here is what that forces). If the mods decline, drop the leg;
the test still reads on Pinterest. `[verify the current rule text before posting — the wiki could not
be fetched from this session]`

**Cadence.** Three strips over three weeks, all on `postiz`. Read on day 14 after strip 3 — around
**25 Oct 2026** if strip 1 posts the week of 21 Sep.

## On-site step — only after the test passes

The strip for a kanji goes on that kanji's page, **top-20 characters by pageviews first**, above
`RelatedKanjiSection`. A server-rendered `<img>` and `<a>` — no client boundary on 1,896 pages,
which is the standing rule in `KanjiActionBar` — carrying `data-fast-goal="kanji_strip_click"` and a
scroll marker `kanji_scroll_strip`, both in the `place_thing_action` grammar. A server-rendered
anchor is trackable ([[michikanji-book-measurement-path]]).

What it answers: whether arrived readers engage with the strip (scroll reach, click-through to the
next kanji's strip, return visits to the 20 pages vs the untreated rest). What it cannot answer:
acquisition — these pages are structurally zero-click from search ([[detail-page-ctr]]).

`[untested — cheap upside]` Every one of these SERPs shows an image pack above the result. An
original, alt-texted Tan image on `/kanji/日` is the first image the site has ever offered that
pack. No claim it enters; worth watching in Search Console's image tab after indexing.

## Where the money is, and what the strip does for it

Stated plainly: $2 lifetime, `email_signup` has never fired, 7% return. No side stream below is
funded by the strip; the strip feeds them. Ordered by distance to first dollar:

| Stream | Distance | What it waits on | What the strip contributes |
|---|---|---|---|
| **N5 print book on KDP** | Closest. Content built, audit passed, measurement path committed (`ce41cda`), nothing uploaded. | Push `main`, upload, list. | Tan on the cover already; strips are the launch posts and the book's Pinterest boards. |
| **Sticker packs** — Telegram (free, no minimum, gives a public link) then LINE (paid, needs 8; two more poses come out of the library sitting) | One day, zero spend. | The pose library sitting. | The stickers *are* the strip's cast. Revenue negligible by design; value is Tan in learners' group chats. |
| **Strip / story collection PDF** — forecast §4's "package, don't gate" | 3–6 months. | ~10 strips or episodes and evidence anyone downloads free ones. | Is the product. |
| **Amazon affiliate on book/resources pages** | Weeks, once the book lists. | The listing. | None directly. |
| **Teacher referral / `/story-by/<name>`** ([[michikanji-creator-collab-strategy]]) | After the email pilot. | Pilot numbers to pitch with. | A strip with a guest teacher's byline is a cheaper barter than an episode. |
| **Pro tier** | Not now. | A retention loop that does not exist yet. | Nothing until the return rate moves. |

Not on the list: ads (the ad box was killed for being the loudest thing on the page), sponsorships
(audience too small to price), a second domain, and any physical merch beyond the KENCHIKU waitlist
question already parked (validate only, zero spend).

## Not now

- `/manga` route, hub, or sitemap entries. Wait for the read.
- `/stories` with a visual layer. Build `/stories` text-first per its own spec, or not yet at all.
- A new Tan style. Flat for strips and stickers, watercolour stays for the site hero. Two registers
  of one character is normal; a third is drift.
- Hand-drawn or per-strip generated art. The library is the rule.
- Any goal name before the rename cutover has deployed.

## The weekly loop, in tandem

One strip a week is one hour of Ari's time if the split is right.

| Day | Who | What |
|---|---|---|
| Mon | Claude | Pick the kanji (top-traffic first, then N5 order). Draft the 4-sentence script against §A4; run it through the episode validator's grammar gate. Compose and render the 1080² and 1000×1500 exports. |
| Tue | Ari | Read the Japanese (≈10 min). Approve or mark one line. |
| Wed | Claude | Schedule on `postiz` with UTM'd links; add the row to `comic-log.md` with the prediction. |
| Sun | Claude | Pull platform numbers and the DataFast referrer cut for last week's strip into the log. |
| Every 3rd Sun | Both | Compare reads to predictions; change one variable in the procedure. |

## Open questions

1. **Style, settled or not?** The recommendation above is flat for strips. If Ari wants the strip
   in the site's watercolour register, the library sitting is the same cost but the six FINAL
   stickers cannot be reused as-is, and thumbnails will read worse. Decide before the sitting.
2. **Reddit, or skip it?** The forum-post track record is zero replies. The mod-approval step is
   the gate; the test does not need Reddit to read.
3. **Which account posts?** The Instagram referrer (11/30d) implies something exists. Whether it is
   MichiKanji's, and whether Pinterest has a MichiKanji account at all, decides day-1 setup.
4. **Does the kanji page get the strip or the sticker?** Cheaper interim: the *sticker* for the
   featured emotion on every one of the 1,896 pages costs nothing and closes the mascot coverage gap
   today. It does not test the strip, so it is not the experiment — but it is free brand coverage.
5. **The 8 duplicate sticker files.** `tan-nap` and `tan-peek` are not naps or peeks. Rename or
   regenerate in the sitting so filenames stop lying.
6. **Does `postiz` reach Pinterest and Instagram with the accounts Ari has?** Unverified from here.
