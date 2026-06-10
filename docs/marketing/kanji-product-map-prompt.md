# Prompt: Build the Kanji → Product Mapping Table

Copy everything below the line into a new Claude session (Cowork or Claude Code, with web access and this project folder mounted).

---

Build a category→product affiliate mapping table covering all 1,994 unique kanji on MichiKanji.com (JLPT N5–N1 plus a non-JLPT set, listed at https://www.michikanji.com/kanji). Note: the repo data files hold 2,020 entries but 26 kanji are listed at two JLPT levels — dedupe by character to 1,994.

## Step 1 — Get the kanji list

Fetch the full kanji inventory with meanings. Prefer the site's own data source — in this repo it lives in `lib/constants/n5-kanji.ts`, `n4-kanji.ts`, `n3-kanji.ts`, `n2-kanji.ts`, `n1-kanji.ts`, and `non-jlpt-kanji.ts`. If unavailable, use the KanjiVG-aligned JLPT lists (N5–N1) with English meanings from a standard source like jisho.org data or the jmdict/kanjidic2 dataset. Every kanji must end up in the output — zero unmapped.

## Step 2 — Define ~25 semantic buckets

Cluster kanji by meaning into roughly 25 buckets. Required buckets (extend as needed):

food-drink, tea-kitchen, nature-plants, animals, home-dwelling, weather-sky, body-health, clothing, travel-movement, water-sea, fire-light, writing-language, school-study, time-calendar, numbers-counting, money-trade, people-family, emotions-mind, work-craft, music-art, war-conflict, religion-spirit, geography-places, abstract-grammar, misc-fallback.

Rules:
- Assign each kanji to exactly ONE bucket by its primary meaning.
- abstract-grammar and misc-fallback catch everything without a concrete product association (particles, grammatical kanji, abstract concepts).
- Expect a long tail: it's fine if 30–40% of kanji land in fallback buckets.

## Step 3 — Assign products per bucket

For each bucket, pick 2 products: one PRIMARY (shown by default) and one ALTERNATE (for A/B or seasonal swap). Selection criteria, in priority order:

1. Japanese or Japan-evocative (the "this reminds me of Japan, and it's useful" test)
2. Price $15–80 (avoid sub-$10 items — commission is pennies)
3. Amazon category with ≥3% commission (kitchen 4.5% preferred over home 3%)
4. High review count (>1,000 reviews) and 4.3+ stars
5. Prime-eligible

Defaults to honor:
- writing-language, school-study, abstract-grammar buckets → Japanese writing supplies (Kuretake/Pentel brush pens, genkouyoushi practice notebooks, shodo starter sets). This is the highest-intent category for a stroke-order site.
- tea-kitchen, food-drink → donabe, tetsubin teapot, bento box, Japanese chef's knife (high ticket).
- misc-fallback → Bokksu snack box (use Bokksu affiliate link, 5–10% commission, not Amazon).

For each product record: product name, search-stable Amazon ASIN (verify it exists and is in stock via product page fetch), price band, Amazon category + commission rate, one-line "Tan recommends" blurb (≤90 chars, warm, references the kanji theme, no hard sell).

## Step 4 — Output

Produce two files in the project folder:

1. `kanji-product-map.json` — array of: `{ "kanji": "茶", "meaning": "tea", "jlpt": "N4", "bucket": "tea-kitchen", "primary": { "name", "asin", "url", "price_band", "commission_pct", "blurb" }, "alternate": { ... } }`. URL format: `https://www.amazon.com/dp/ASIN?tag=AFFILIATE_TAG` with the literal placeholder `AFFILIATE_TAG`.
2. `bucket-summary.csv` — one row per bucket: bucket, kanji_count, primary_product, alternate_product, est_commission_pct.

## Step 5 — Verify

- Confirm total kanji count in JSON = 1,994 unique (deduped by character; the repo holds 2,020 entries with 26 cross-level dupes). Report any discrepancy.
- Spot-check 10 random ASINs resolve to live, in-stock products.
- Confirm no kanji appears twice and no bucket is empty.
- Report the bucket distribution so I can sanity-check the clustering.

Do NOT publish or modify the live site. Output files only. Ask me before substituting any default product choice listed above.
