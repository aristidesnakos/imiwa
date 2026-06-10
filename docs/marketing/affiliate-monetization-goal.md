# Goal: Kanji-Contextual Affiliate Monetization

## Document Info
- **Version**: 1.0
- **Created**: 2026-06-10
- **Status**: Proposed
- **Owner**: Ari
- **Source**: MichiKanji Affiliate Strategy — Findings Report (June 10, 2026)

---

## Confirmed Denominator

The data files in `lib/constants/*-kanji.ts` hold **2,020 entries** → **1,994 unique kanji** (26 kanji are listed at two JLPT levels, e.g. 食 in both N5 and N4; none involve the non-JLPT set). Counts: N5 81, N4 187, N3 387, N2 261, N1 1,002, non-JLPT 102.

**Coverage target = 1,994 unique kanji pages**, not the report's 1,918. Use 1,994 (deduped by character) everywhere below; the 1,918 figure in the source report is superseded.

---

## The Goal (one sentence)

Turn MichiKanji's 1,994 kanji pages into a passive affiliate revenue stream by rendering one contextual "Tan recommends" product card per page, skewed toward high-intent writing supplies and high-ticket Japanese goods — without degrading page quality or trust.

**Why now:** Affiliate links require nothing but placement (selling ad slots needs traffic proof we don't have yet). Each kanji page is already a ranked semantic keyword; we are leaving the most natural monetization surface on the site unused.

---

## Success Metrics

### Primary (revenue & survival)
- **Pass Amazon's gate**: ≥3 qualifying sales within 180 days of joining Associates (account closes otherwise).
- **Coverage**: 100% of kanji pages render a product card. Zero unmapped kanji (1,994/1,994 unique).
- **Click-through**: ≥1% of kanji-page sessions click an affiliate card within 90 days of launch.

### Secondary (optimization signal)
- Per-bucket click data captured for all ~25 semantic buckets (becomes the input for quarterly pruning).
- Average commission-per-click trends up as the mix skews toward $30–150 high-ticket items, not sub-$10 goods.

### Guardrail (do no harm)
- No measurable regression in Core Web Vitals on kanji pages.
- Required disclosure ("As an Amazon Associate I earn from qualifying purchases") present site-wide.
- Card reads as Tan's native recommendation, not an ad block — bounce rate flat or better.

---

## Scope

**In scope**
- Join Amazon Associates + Bokksu.
- Bucket all 1,918 kanji into ~25 semantic categories (not 1:1 mapping).
- Build `kanji-product-map.json` (the lookup table) + `bucket-summary.csv`.
- Render one Tan-voiced product card per kanji page from the lookup table.
- Site-wide affiliate disclosure.
- Click tracking per bucket.

**Out of scope (for v1)**
- Selling direct ad slots (revisit once traffic > ~10k/mo; the Advertise page reuses this click data later).
- Individual per-kanji product curation (buckets only).
- Any change to the live site during the mapping/data phase.

---

## Why higher-intent products (the key correction)

The findings report's central insight: a *stroke-order* site's highest-intent product is **writing supplies**, not cute home goods. Visitors are literally learning to write. A $9 chair-sock at 3% earns ~$0.27; a $40 brush-pen set or a $90 donabe at 4.5% is real money. Default every ambiguous bucket to writing supplies.

| Tier | Kanji trigger | Products | Price @ commission |
|---|---|---|---|
| Highest intent (default) | All pages | Brush pens, genkouyoushi notebooks, shodo sets | $8–40 @ ~4% |
| High payout | 茶 食 飯 皿 刀 | Donabe, tetsubin, bento, Japanese knives | $30–150 @ 4.5% |
| Cute & clickable | 家 月 風 猫 木 花 | Noren, furin, maneki-neko, bonsai, akari lamps | $15–60 @ 3% |
| Fallback | Numbers, abstract | Bokksu snack box | 5–10% (beats Amazon) |

---

## Milestones

### M1 — Accounts live (week 1)
- Join Amazon Associates (capture affiliate tag) and Bokksu. Read both programs' link/disclosure rules.
- **Exit:** both tags in hand; disclosure copy finalized.

### M2 — Mapping table built (week 1–2) ← biggest unit of work
- Run the **Build the Kanji → Product Mapping Table** prompt (saved at `docs/marketing/kanji-product-map-prompt.md`).
- Data source for the kanji list: this repo's `lib/constants/n{1-5}-kanji.ts` + `lib/constants/non-jlpt-kanji.ts` (preferred over re-fetching the live site).
- **Exit:** `kanji-product-map.json` (1,994 entries, zero unmapped) + `bucket-summary.csv`; 10 random ASINs verified live/in-stock; bucket distribution reviewed and sane.

### M3 — Card component shipped (week 2–3)
- Build a `TanRecommends` card that reads the lookup table by kanji, renders primary product, includes disclosure.
- Follow SOLID / spec-first per `docs/learnings/development-guide.md`: single-responsibility component, table injected (not hardcoded), lazy-loaded so it doesn't touch CWV.
- **Exit:** card renders on every kanji page from the table; disclosure site-wide; CWV unchanged.

### M4 — Tracking + first revenue (week 3–8)
- Instrument click events tagged by bucket.
- **Exit:** per-bucket click data flowing; ≥3 qualifying Amazon sales before day 180.

### M5 — Prune & optimize (quarterly, ongoing)
- Review bucket click/commission data; kill dead buckets, swap alternates into underperformers.
- **Exit:** a repeatable quarterly review; mix shifting toward higher commission-per-click.

---

## Execution Plan (the 5 steps, made concrete)

1. **Join** Amazon Associates + Bokksu → record affiliate tags.
2. **Bucket** the 1,918 kanji into ~25 semantic categories (see mapping prompt).
3. **Assign** 1 primary + 1 alternate product per bucket; default bucket = writing supplies.
4. **Render** one "Tan recommends" card per kanji page from the lookup table + site-wide disclosure.
5. **Track** clicks per bucket; prune dead categories quarterly.

---

## Risks & Mitigations
- **180-day / 3-sale gate fails** → front-load the highest-intent (writing) cards; they convert best for this audience.
- **Cards feel spammy, hurt trust** → Tan's voice + one card per page (not a grid); ≤90-char warm blurb, no hard sell.
- **Pennies-per-sale trap** → enforce the $15–80 floor in product selection; route abstract/number kanji to Bokksu, not cheap Amazon items.
- **Traffic too low to matter** → accepted; this is the no-friction bet while we grow traffic. Income scales with traffic (~10k+/mo is where it's meaningful), and the click data de-risks the future Advertise-page pitch.

---

## Definition of Done (v1)
Every kanji page renders a Tan-voiced, disclosed product card sourced from a complete 1,994-entry lookup table; clicks are tracked per bucket; Amazon's 3-sale gate is cleared; CWV and bounce rate show no regression.
