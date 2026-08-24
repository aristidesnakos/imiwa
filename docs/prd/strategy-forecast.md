# MichiKanji — Position, Options, Forecast

**Version 1.1** · Created 2026-08-24 · Updated 2026-08-24 · Owner: Ari Nakos
**§8 supersedes parts of §3, §4, §6 and §7 — read it before acting on them.**
**Data:** `data/query-history.json`, four 28-day readings, 2026-08-02 → 2026-08-17
**Related:** [`phase-0-growth-monetization.md`](./phase-0-growth-monetization.md) · [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) · [`story-pages.md`](./story-pages.md) · [`../3rdVersion/seo-operations-review.md`](../3rdVersion/seo-operations-review.md)

A PM read of where the site actually is, what I said earlier that survives contact with the data,
what I'd revise, and the itemized options. Compare clicks only within one Search Console dimension —
everything below is the **query** dimension unless it says otherwise.

---

## 1. Where you actually are

### Finding 1 — Impressions are growing. Clicks are not.

| Reading | Window ends | Impressions | Clicks | CTR |
|---|---|---|---|---|
| 2026-08-02 | 07-30 | 26,684 | 1,028 | 3.85% |
| 2026-08-03 | 07-31 | 27,066 | 1,038 | 3.83% |
| 2026-08-10 | 08-07 | 30,447 | 1,116 | 3.67% |
| 2026-08-17 | 08-14 | 33,359 | 1,041 | **3.12%** |

**Impressions +25.0%. Clicks +1.3%.** You said sessions are only growing — impressions are; clicks
aren't. You're winning visibility on queries you can't convert, and site CTR is falling as a direct
consequence.

The largest single driver is **"japanese kanji"**: 1,289 → 2,539 impressions (+97%) for 23 → 35
clicks, stuck at position 7.6. That one query supplied ~19% of all impression growth and 1.7% of
click growth. It's a head term you rank mid-page-one for and cannot convert, and it is quietly
dragging your average CTR down. Not a problem to fix — a number to stop reading as progress.

### Finding 2 — The stroke-order cluster, which *is* the business, is declining

| | 08-02 reading | 08-17 reading | Δ |
|---|---|---|---|
| "kanji stroke order" clicks | 353 | 296 | **−16.1%** |
| "kanji stroke order" position | 3.32 | 3.54 | worse |
| Whole cluster, clicks | 452 | 383 | **−15.3%** |

Cluster = kanji stroke order + japanese stroke order + stroke order japanese + stroke order kanji +
kanji stroke.

That cluster is **37% of all site clicks**. Brand ("michikanji" + "michi kanji") is another 14%. Half
your traffic sits on two pillars and the bigger one is eroding.

**Caveat, and it matters:** this window is mid-July to mid-August. Northern-hemisphere summer
depresses study traffic, and two weeks is not a trend. Position also moved (3.06 → 3.54), which
seasonality alone doesn't explain. **Take 2–4 more weekly readings before concluding** — but treat
this as the highest revenue-at-risk item on the board until it's ruled out.

### Finding 3 — The detail pages aren't a CTR problem. They're an intent problem.

Page dimension: 41,788 impressions → **127 clicks (0.30%)** at position 10.3. Slightly better than
the 0.25% in the PRD, still roughly 10× below par for that position.

The query data shows why. These are the meaning-lookup queries you rank for, from the latest reading:

| Query | Impressions | Clicks | Position |
|---|---|---|---|
| difference in meaning of 漏, 泄, 洩 kanji | 464 | 0 | 9.63 |
| samurai kanji | 261 | 0 | 9.28 |
| pain kanji | 249 | 1 | 8.75 |
| heal in japanese | 230 | 0 | 7.75 |
| i kanji | 220 | 1 | 7.14 |
| migi kanji | 211 | 0 | 5.97 |
| day kanji | 174 | 0 | 7.45 |

**~1,809 impressions, 2 clicks. 0.11% CTR.** At positions 6–10, where 2–3% is normal.

This is not fixable by moving up two positions. Someone searching "day kanji" wants to see 日 and be
done — Google shows it, they never click, and no title rewrite changes that. **A meaningful share of
your 41,788 impressions is structurally zero-click inventory.** S1 shipped meaning-bearing titles to
win exactly these, and the data says it didn't work, because the query doesn't want a page.

The strategic consequence: stop treating 41,788 impressions as a reservoir of clicks waiting to be
unlocked. Segment it. Some is winnable; a lot is a vanity number.

### Finding 4 — A printables cluster is emerging, and it converts 13× better than your detail pages

| Query | 08-10 reading | 08-17 reading |
|---|---|---|
| kanji practice sheets | 196 imp / 9 clicks | 270 imp / 14 clicks |
| kanji practice | — | 225 imp / 10 clicks |
| kanji sheet | — | 172 imp / 3 clicks |
| **Cluster** | 196 / 9 | **667 imp / 27 clicks — 4.05% CTR, pos ~7.7** |

Absent from the top 25 in both August readings. It went from nothing to 667 impressions in about four
weeks, at a CTR above your site average and 13× your detail pages. This is the fastest-growing thing
you have and nothing in the roadmap is pointed at it.

### Finding 5 — You already sell two products and you don't know if they convert

`components/kanji/KanjiN5WorkbookCTA.tsx` and `components/kana/KanaWorkbookCTA.tsx` link to
`llanai.gumroad.com/l/kanji-n5-sheets-workbook` and `llanai.gumroad.com/l/kana-workbook-beginners`.
They're mounted on all five kanji-sheets level pages and the kana-sheets page. The click is tracked;
the **purchase is not** — that's SG3 ("stop reading $0"), still open.

So: you have a paid product line, sitting on the fastest-growing query cluster you own, and no idea
whether anyone buys it. Before designing a new product, find out what the existing one does.

**Also a brand leak.** Those CTAs send people from michikanji.com to **llanai**.gumroad.com. A
visitor clicking "buy the workbook" lands on a storefront with a different name. That directly
undercuts the brand-building you said is the goal, and it's cheap to fix.

---

## 2. What holds, and what I'd revise

### Holds

- **Page canonical, email as the return mechanism.** Reinforced. A page acquires; only email brings
  people back.
- **One site, not a second domain.** Strongly reinforced — see §5.
- **The episode spec, format, block order, and the validator.** Unaffected by any of this.
- **Homepage before `/kanji` for capture** (25.5 kB vs 9.0 kB headroom). Unaffected.
- **Gate the newsletter on replies, not open-rate deltas,** at this list size. Unaffected.
- **Reciprocal story links on kanji pages deferred** behind the `/kanji` re-baseline. Unaffected.

### Revise

1. **"250 contextual internal links compounding into the 1,890 detail pages."** Overstated. Stories
   reuse the same ~82 N5 kanji, so the links concentrate on the **N5 subset**, not the long tail —
   ~3 links per N5 page, and roughly zero for the other 1,800. Still useful, because the N5 cluster
   ("n5 kanji" + "kanji n5" + "n5 kanji list" = 1,081 impressions, 27 clicks, position ~9.8) is
   winnable and is where beginner intent lives. But it is a narrow lever, not a site-wide one.

2. **"Stories are the traffic play."** No. On this data, stories are a **brand and product** play.
   The traffic levers are defending stroke order, the printables cluster, and triaging detail-page
   intent. I framed stories as serving your traffic goal; that was too generous to them.

3. **Gating episodes.** I'd now argue against gating web episodes at all — see §4.

4. **I underweighted printables entirely.** Never mentioned them. They're the best-converting
   non-brand cluster you have, they're growing fastest, and you've already built the generator, the
   pages, and the paid product. That's a substantial miss on my part.

5. **Your premise, gently — "sessions are only growing."** Impressions are. Clicks are flat. Worth
   correcting because it changes what "growth" means when you decide what to build.

---

## 3. The options, itemized

Effort is your evening hours. "Signal" is time until you learn something.

| # | Option | Effort | Signal | 12-mo traffic | 12-mo revenue | Confidence |
|---|---|---|---|---|---|---|
| 1 | **SG3 — instrument Gumroad revenue** | 2–3 h | 2 weeks | — | Reveals it | High |
| 2 | **Fix the llanai→MichiKanji brand leak** | 1–2 h | — | — | Small lift | High |
| 3 | **Diagnose the stroke-order slip** | 3–4 h | 2–4 weeks | Protects ~450 clicks/mo | — | High |
| 4 | **Lean into printables** | 1–2 wk | 4–8 weeks | +100–200 clicks/mo | $300–1,500 | Med-High |
| 5 | **Detail-page intent triage** | 1 wk | 8–12 weeks | +50–200 clicks/mo | — | Medium |
| 6 | **N5 cluster push** | 3–5 d | 8–12 weeks | +30–80 clicks/mo | — | Medium |
| 7 | **Story pages + hub** | 1 d build, then weekly | 3–6 months | +30–120 clicks/mo | Seeds #8 | Low-Med |
| 8 | **"Travels of Tan" bundle** | 1–2 wk after 10 eps | 6–12 months | — | $200–1,200 | Low |
| 9 | **Email list** | Done | 4–8 weeks | Return visits | Enables #8 | Medium |

### The four that carry the most weight

**#1 — Instrument the revenue. Do this first, this week.** You are two hours from knowing whether you
already have a business. Every product decision below — including whether $25 is the right price for
Tan — is currently a guess, and stops being one the moment SG3 lands. Highest
information-per-hour on the board by a wide margin, and it costs almost nothing.

**#3 — Find out whether stroke order is slipping or just summering.** 37% of your clicks. If position
3.06 → 3.54 is a real ranking loss rather than seasonal noise, everything else is rearranging
furniture. Pull weekly readings, check whether a competitor moved above you, check whether the
stroke-order pages changed.

**#4 — Printables are the strongest signal you have.** Demand is visible and growing, CTR is 4%, the
generator exists, the paid product exists. Concretely: build the pages that match how people actually
search ("kanji practice sheets" as a landing page, not a sub-route of free-resources), add sheet
types, and make the workbook upsell coherent. Your own affiliate research already concluded that at
this scale an **owned product** is what pays and third-party affiliate isn't — printables are that
owned product, already half-built.

**#7 — Stories, honestly framed.** They will not move traffic much inside 12 months. What they do is
give you a reason for someone to return weekly, a brand with a character in it, and the raw material
for a product. Those are real, they're what you said you want, and they compound. Just don't fund
them out of the traffic budget.

---

## 4. On "The Travels of Tan"

The instinct is right. Two things about the execution I'd change.

### Don't gate. Package.

Gating episodes after N free ones fights three things at once: your own phase-0 guardrail (*"never
gate or slow the free pages — they are the acquisition engine"*), the SEO case for having story pages
at all (gated content doesn't rank, so gating the back half deletes the reason you built pages
instead of emails), and your infrastructure (gating needs accounts and auth, which is a non-goal
everywhere in your docs).

**Every episode stays free and public.** The paid product is the same content in a form the web
version can't be: all episodes as a **PDF + EPUB + audio bundle**, with answer keys, a printable
vocab workbook, and the grammar notes collected. Sold through Gumroad — no auth, no billing code, and
you already have the account and two products on it.

This is strictly better. The free pages keep acquiring and ranking. The paid bundle sells
convenience, portability, and audio — which are genuinely worth money and genuinely absent from a web
page. And a downloadable artifact *feels* like $25 in a way a login does not.

### Don't guess the price — you're two hours from knowing it

$25 for a digital N5 reader is above the market: Olly Richards' *Short Stories in Japanese* is ~$15 in
paperback from a real publisher, Crystal Hunters is ~$10–15 a volume, and Satori Reader is ~$9/month.
$25 is defensible for 20+ episodes with audio and a workbook. It is not defensible for 10 web
episodes behind a paywall.

But you don't have to reason from comparables. Once SG3 is live you'll have **your own** audience's
conversion rate and price sensitivity from the two workbooks already selling. Price Tan from that.

**Sequencing:** don't build the bundle until you have ~10 episodes and evidence the workbooks
convert. If they don't convert, the honest read is that this audience doesn't buy from you yet, and
the answer is more brand before more product.

---

## 5. One site, or a site for stories?

**One site. This isn't close, and you already reached this conclusion once** — the PRD's non-goals
record that a `jlptmanga.com`-style second site was considered and killed.

The data makes it starker. Your brand query pulls **~100 impressions a month**. You have essentially
no brand equity to split, and no domain authority to spare — you rank position 10.3 on your own core
inventory. A new domain starts at zero and takes 12+ months to reach where michikanji.com already is,
during which it gets nothing from the 41,788 monthly impressions you already own.

`michikanji.com/stories` inherits the authority, the internal links flow both ways, and every story
reader is one click from the stroke-order pages that are your actual product.

**Revisit only if** stories become the dominant business — sustained, and clearly held back by living
under a kanji-dictionary brand. That's a 2027 question at the earliest. "The Travels of Tan" works
fine as a *product* name inside MichiKanji; it doesn't need a domain.

---

## 6. Twelve-month forecast

Baselines: ~1,771 clicks/28d (page dimension), ~2,000 sessions/mo, revenue unknown.

**Scenario A — Stories only (current plan).** Stroke order drifts, printables go unexploited, the
newsletter runs. **~1,900–2,300 clicks/28d. Revenue $200–1,000.** Most of the year's effort goes to a
channel that adds 30–120 clicks/mo.

**Scenario B — Defend and exploit; stories as the brand layer.** SG3 + stroke-order defence +
printables + intent triage, stories weekly in the background. **~2,800–3,800 clicks/28d. Revenue
$1,000–4,000.** Roughly 2× traffic and 4× revenue against A, for similar total hours pointed
differently.

**Scenario C — Do nothing new.** Impressions keep inflating, clicks flat to down. **~1,500–1,800
clicks/28d.**

Say the quiet part: **none of these is a business yet.** Scenario B is a few thousand dollars a year.
That's fine — you said you have the time and willingness to keep building, and the asset compounds.
But it should be a deliberate choice, and it changes what "success" means at the next gate.

The variable that would break this range isn't in the table: a **step change in authority or content
volume**. Fifty story episodes, a printables library that owns its cluster, or one piece of content
that earns real links. Nothing here compounds fast enough to matter without one of those.

---

## 7. Recommended sequence

**This week (~5 h)** — SG3 revenue attribution (#1). Fix the llanai brand leak (#2). Start weekly
query readings to resolve the stroke-order question (#3).

**Weeks 2–4** — Read SG3. Ship the printables landing page and expand sheet types (#4). Write
episodes 1–2 in the background; keep the newsletter running.

**Weeks 5–10** — Build `/stories` + the hub (#7) — one day, per the implementation spec. Detail-page
intent triage (#5): segment the 41,788 into winnable and structurally zero-click, and only work the
former. N5 cluster push (#6), which the story pages support.

**Months 3–6** — Ten episodes exist. Now decide on the Tan bundle (#8) with real conversion data
rather than a guess.

**The one gate that matters:** if SG3 shows the workbooks convert at any respectable rate, the whole
strategy tilts toward owned digital products and stories become the top of that funnel. If it shows
near-zero, the honest read is that this audience doesn't buy from you yet, and the next year is about
brand and traffic before any new product.

Either way you learn it for two hours of work, and you learn it this week.

---

## 8. SG3 answered — Gumroad, read 2026-08-24

The gate in §7 fired immediately. Ari pulled the Gumroad dashboard; no instrumentation was needed
because the numbers are unambiguous.

| Product | Visits | Sales | Revenue |
|---|---|---|---|
| Kanji N5 Workbook — Printable Practice Sheets with Stroke Order | **777** | **0** | $0 |
| Hiragana & Katakana Workbook — Printable Practice Sheets | 84 | 1 | $2 |
| Kanji + Kana Sheets for Japanese Beginners (N5) | 4 | 0 | $0 |
| **Total (lifetime)** | **865** | **1** | **$2** |

Last 30 days: **$0 across all three.**

### What this does and doesn't prove

**777 visits and zero sales is the only number here with statistical power.** By the rule of three,
zero events in 777 trials puts the 95% confidence ceiling on the true conversion rate at **0.386%** —
so the real rate is confidently below 0.4%, against 1–3% for a normal digital-product funnel. The
kana workbook's 1-in-84 is a single sale; it carries no information.

Lifetime revenue per Gumroad visit: **$0.0023.** Roughly a quarter of a cent per click.

But this is **not** proof that the audience won't pay. The experiment was badly confounded, and it's
worth being precise about how, because the fixes are cheap and they're all in your control.

### Why it converted at zero — the diagnosis

**1. You are competing with yourself, on the same screen.** `KanjiN5WorkbookCTA` is mounted in
`app/free-resources/kanji-sheets/n5-sheets/page.tsx` immediately below a grid of all 82 N5 kanji,
each one a link to a free printable practice sheet with stroke order. The CTA then offers *"all JLPT
N5 kanji in one beautifully designed workbook… with stroke order diagrams and guided practice
grids."*

Free thing above the button: every N5 kanji, practice sheet, stroke order.
Paid thing behind the button: every N5 kanji, practice sheet, stroke order, in one file.

**2. And directly below the button, you teach them to build it themselves.** The next section is a
numbered "How to Print to PDF" guide — click a kanji, Ctrl+P, Save as PDF. You have sandwiched a paid
product between the free version and the DIY instructions.

The convenience gap is real (82 characters × Ctrl+P is genuinely tedious, and that *is* worth money).
But nothing on the page frames it that way, and the how-to actively dissolves it.

**3. No price before the click.** The button reads *"View Kanji N5 Workbook."* People click not
knowing the cost, meet a price on a page they didn't expect to be a checkout, and leave. That alone
routinely accounts for most of a drop like this.

**4. The brand breaks at the moment of payment.** michikanji.com → **llanai**.gumroad.com. The
storefront has a different name than the site they trusted thirty seconds ago.

Ranked by likely contribution: **1 and 2 together, then 3, then 4.**

### The revisions this forces

**§4's "don't gate, package" is contradicted by this data, and I'm withdrawing it as stated.**
777 → 0 *is* the repackage-free-content-as-paid model failing, on real traffic, at n=777. Proposing
the identical model for the story bundle — free episodes on the site, paid PDF/EPUB of the same
episodes — would re-run an experiment that has already returned zero.

Corrected principle: **the paid artifact must contain what the free one does not.** Audio qualifies.
Exercises that aren't on the site qualify. Episodes never published free qualify — and note that this
does *not* violate the phase-0 guardrail, which protects the *kanji and stroke-order* acquisition
pages, not story inventory. A "Season 2" sold as a download needs no auth, no accounts, no gate on
your site at all. It's just a product.

**§3, option #4 — printables revenue, revised down.** The *traffic* case stands (667 impressions,
4.05% CTR, growing fast). The *revenue* case does not: $300–1,500 was too optimistic against evidence
that this exact product converts below 0.4%. Traffic yes; revenue only if the offer changes.

**§4's price discussion — $25 for Tan is unsupportable on this evidence.** The one thing that ever
sold here sold at ~$2.

**§6's revenue forecasts — halve them** until a funnel fix demonstrates otherwise.

### The number that reframes everything

Fix every confound above and land a healthy 2% conversion at $12. Against ~800 Gumroad clicks per
quarter that is 16 sales — **about $770 a year.**

That is the ceiling with a *good* funnel at current traffic. So the binding constraint was never
conversion; it's that **no B2C digital product priced $2–25 becomes meaningful revenue at 2,000
sessions a month.** A 17× conversion improvement still lands under a thousand dollars.

Only three things change that arithmetic:

- **10× the traffic.** The long game — stroke order and printables are the levers (§3, #3 and #4).
- **Higher ticket.** Teacher and school licensing. One school licence at $200–500 equals a year of
  workbook sales. This is what the original newsletter PRD identified as the payoff, and I
  under-weighted it in §3. At this traffic it may be the only B2C-adjacent model where the numbers
  work at all.
- **Sell where the traffic already is.** See below.

### The option I missed entirely — Amazon KDP

Every plan in this document is capped by your ~2,000 monthly sessions. A print-on-demand paperback on
**Amazon KDP** is not: Amazon supplies the discovery, and "japanese kanji practice workbook" is a
real, high-intent buying query on a marketplace with orders of magnitude more traffic than you have.

You are unusually close to this already. The PDF generation exists (`app/api/kanji-sheets`, 334
lines), the sheet designs exist, `docs/physical-products/` holds specs for kanji sheets, kana sheets,
and a PDF generation utility, and there's already a cover image (`japanese-cover.jpg`). A KDP
paperback at $12–15 with no inventory risk turns michikanji.com from *the store* into *the marketing*
— which is the right role for a site with this much reference traffic and this little buying intent.

Sceptical note, stated plainly: the beginner-Japanese workbook category on Amazon is crowded, and
most self-published entries sell in single digits per month. This is not a guaranteed win. It is the
only option on the board whose upside isn't bounded by your own traffic, and the marginal cost of
trying is low because the content already exists.

### Revised near-term sequence

**Do not build a new product to answer a question the existing one can answer this month.** The
workbook funnel is a free laboratory with live traffic. Fix it and read the result.

1. **Put the price on the CTA** and change the button to `Get the complete workbook — $X`. One line.
2. **Reframe the value as time, not content** — "82 sheets, one file, print once" — and move the
   how-to-DIY section *above* the CTA so the free path is finished before the offer appears.
3. **Move the products to a MichiKanji-branded Gumroad** (or a custom domain on the existing one).
4. **Differentiate the paid artifact.** Add something the free grid can't produce: answer keys,
   grid-paper practice pages, a suggested 8-week order, kana + kanji combined.
5. **Watch for one month.** Same traffic, fixed funnel. If it stays near zero, that *is* the clean
   read on willingness to pay, and the next year is brand, traffic, and B2B — not new B2C products.
6. **In parallel, scope the KDP paperback.** It's the only uncapped path and the content exists.

Stories continue throughout as the brand and B2B asset. Their most valuable output is probably the
teacher conversation, not the bundle.

### Two things I need from you

- **The price of the Kanji N5 workbook.** The entire funnel diagnosis sharpens once I know whether
  777 people bounced off $5 or off $19.
- **The window those 777 visits accumulated over.** Lifetime-since-launch, or recent? It sets how
  long a post-fix read has to run before it means anything.

