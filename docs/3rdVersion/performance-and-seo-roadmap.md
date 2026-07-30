# Performance & SEO Roadmap (3rd Version)

**Status**: 🚧 Active — P0 and P1 shipped and verified, P2–P4 open
**Started**: July 29, 2026
**Baseline audit**: July 29, 2026, against `seoroast.com/nomadlist` as a reference teardown
**Website**: michikanji.com
**Last verified against code**: July 30, 2026 (P1 batch, [`b8a98fc`](https://github.com/aristidesnakos/imiwa/commit/b8a98fc), live in production)

> **Purpose of this folder** — `docs/3rdVersion/` tracks how michikanji.com improves
> along two axes at once:
> - **Product / performance** — render strategy, CDN caching, Core Web Vitals, bundle size.
> - **Marketing / SEO** — crawlability, indexation, structured data, content surface, AI visibility.
>
> The two are the same work. The largest SEO win in this cycle (P0-1) was a *rendering*
> fix. Keep both columns in every entry below.

---

## Why this cycle exists

We reviewed the `seoroast.com/nomadlist` teardown — a post-mortem on a site that lost
~64% of its organic traffic and went from **3,540 indexed pages → 262** after a domain
migration. We audited michikanji.com against every failure mode it identified.

**We were clean on the catastrophic ones**, verified live with Googlebot user-agent tests:

| NomadList failure | MichiKanji |
|---|---|
| Firewall returning 429 to Googlebot | ✅ Clean — `200` on all tested paths |
| Cloaking (bot vs. mobile UA divergence) | ✅ Clean — identical status and TTFB |
| Broken / looping 301s | ✅ Clean — apex → `www` in one absolute permanent hop |
| Missing robots.txt | ✅ Present |
| Title in `<body>`, JS-swapped, or duplicated | ✅ Clean — one SSR `<title>` in `<head>`, one `<h1>` |
| Brand / entity inconsistency | ❌ **We had this** — fixed in P1-1, P1-2, P1-3 |
| Indexation collapse | ⚠️ Different cause, same risk — see P0-1 |

The rate limiter (`middlewares/rateLimiter.ts`) is scoped to two form endpoints only
(`api/feedback`, `api/advertise`) and never touches page routes — so we are not exposed
to the 429-to-crawler failure that caused most of NomadList's loss.

**But the underlying theme of that teardown — can Google cheaply and consistently fetch
your pages — is where we had a large, real problem.** That became P0.

---

## P0 — Shipped ✅

Commit [`07cc952`](https://github.com/aristidesnakos/imiwa/commit/07cc952) on `main`, July 29, 2026.

### P0-1 · All ~1,900 kanji pages were uncached and dynamically rendered

**Measured before the fix** (live, Googlebot UA):

```
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
x-vercel-cache: MISS
x-vercel-id:    fra1::iad1::...     ← edge in Frankfurt, function in Virginia
```

Cause was three lines in `app/kanji/[character]/page.tsx`:
- `export const dynamic = 'force-dynamic'`
- `generateStaticParams()` returning `[]` — commented "force all pages to be dynamic"
- a comment claiming "Enable ISR" while nothing enabled it

Nothing on the page needed dynamic rendering; the data is static imports from
`lib/constants/*`. Every Googlebot hit cold-started a serverless function and the CDN
cached nothing — a crawl-budget tax on our ~1,900 highest-value pages, plus a direct
LCP penalty.

**Fix**: removed `force-dynamic`, `generateStaticParams` now returns every kanji,
`export const revalidate = 86400`.

**Verified**: build emits `● /kanji/[character] … 1d 1y` with 1,894 prerendered paths
(1,924 static pages total). Typecheck clean, build exit 0.

### P0-2 · `robots.txt` blocked `/_next/`

That directory holds our JS and CSS. Google needs both to render the page. Removed.

### P0-3 · `Crawl-delay: 1`

Google ignores it; Bing honours it and throttles to one request per second. Pure
downside on a ~1,900-page site. Removed.

### P0-4 · `/advertise` self-canonicalled to the homepage

The file had **no `metadata` or `generateMetadata` export at all**, so it inherited the
root layout's `canonicalUrlRelative: "/"`. Confirmed live before fixing:

```
/advertise → <link rel="canonical" href="https://www.michikanji.com"/>
           → <title>Learn Japanese Kanji with Stroke Order …</title>   ← homepage title
```

We were telling Google our sponsorship sales page was a duplicate of the homepage.
Added a proper title, description, and self-canonical.

### P0-5 · `/kanji/progress` had the same canonical bug

Used a bare `Metadata` object rather than `getSEOTags`, so it also canonicalled to `/`.
It is a personal `localStorage`-backed view with 112 kB of route JS and no search value.
Now `robots: { index: false, follow: true }` plus a self-canonical.

### P0-6 · react-scan shipping to production

A development React profiler was loading on every page, costing Total Blocking Time —
while being blocked by our own CSP (`unpkg.com` was never in `script-src`), so it also
threw console errors. Gated on `NODE_ENV !== 'production'`.

### P0-7 · Malformed URLs returned 500 instead of 404

`decodeURIComponent` throws on input like `/kanji/%E6`. Added a `safeDecode` guard so
crawlers hitting malformed paths get a clean 404.

### ✅ P0 verified in production — July 30, 2026

```
before:  x-vercel-cache: MISS
         cache-control: private, no-cache, no-store, max-age=0, must-revalidate
after:   x-vercel-cache: HIT
         cache-control: public, max-age=0, must-revalidate
         x-nextjs-prerender: 1
         x-nextjs-stale-time: 300
```

`x-nextjs-prerender: 1` is the direct confirmation that the HTML is served from the
build-time prerender rather than a per-request render. `age` values in the tens of
thousands of seconds confirm pages are persisting in the edge cache.

**Reading the cache states.** Testing kanji that had never been requested showed a
consistent pattern:

```
req1 → BYPASS or MISS    ← first request at a given edge PoP fills the cache
req2 → HIT
req3 → HIT
```

Vercel's CDN is per-location, so the first visitor to each PoP populates that node. A
lone `MISS`/`BYPASS` on a cold page is **not** a regression — only a sustained `MISS`
across repeat requests to the same PoP would be. Verified identical for Googlebot and
browser user-agents, so there is no differential treatment or cloaking risk.

**On `cache-control: public, max-age=0, must-revalidate`** — this looks like "don't cache"
but is correct. `public` (previously `private`) is what permits shared/CDN caching at all;
`max-age=0, must-revalidate` applies to the **browser**, so users always revalidate and
never see stale HTML while the edge absorbs the load. The edge TTL is managed separately
by Vercel from our `revalidate = 86400` — that is what `x-nextjs-stale-time` reports. Two
caches, deliberately different rules.

**Re-verification command** (expect `HIT` on the second request onward):

```bash
curl -sSI https://www.michikanji.com/kanji/%E6%97%A5 | grep -iE 'x-vercel-cache|cache-control|prerender'
```

---

## P1 — Brand entity & crawl signals — Shipped ✅

This is the cluster that maps directly onto NomadList's brand-perception failure. Cheap
to fix, and it is what makes Google treat us as one coherent entity.

Shipped July 30, 2026 as one commit. All six items verified against the build output
(see "P1 verified" below).

New in this batch: **`lib/seo/site.ts`** — the single source of truth for absolute URLs,
brand assets, and content timestamps in structured data. Every value below derives from
`config.domainName` or a hand-maintained date constant, so the apex/`www` split and the
moving-`lastmod` problem cannot recur by copy-paste.

- [x] **P1-1 · Article schema credited the wrong brand.** `app/kanji/[character]/page.tsx`
      set `author.name: 'Imiwa'` on all ~1,900 pages. *(`Imiwa` is the git repo name — it
      leaked into the schema.)* Now `SITE_NAME` (`MichiKanji`) with a `url`.
- [x] **P1-2 · JSON-LD entity URLs used the apex while canonicals used `www`.**
      `app/layout.tsx` hardcoded `https://michikanji.com` in seven places —
      `Organization.url`, `logo`, `WebSite.url`, `publisher.url`, `publisher.logo`, the
      `SearchAction` target, and `EducationalOrganization.url`. All of them 301 to `www`,
      so we were asserting our own entity at a redirecting hostname. All now derive from
      `SITE_URL`. The kanji page's own hardcoded `baseUrl` (used by `BreadcrumbList`) was
      already on `www` but is now derived too.
- [x] **P1-3 · `logo.png` did not exist.** Every `Organization` / `publisher` logo pointed
      at `/logo.png`, which **404'd** — there is no `public/logo.png`. Repointed at
      `public/assets/web-app-manifest-512x512.png` (the Tan brand mark, verified `200` in
      production) and upgraded from a bare string to a full `ImageObject` with
      `width`/`height`. A 404 logo is worse than an absent one.
- [x] **P1-4 · Sitemap `lastmod` was untrustworthy.** `app/sitemap.xml/route.ts` stamped
      `new Date().toISOString()` onto **every** URL, so all ~1,900 claimed to have changed
      at the same instant *and the instant moved on every deploy*. Google ignores `lastmod`
      it cannot trust, which works directly against the crawl-efficiency goal of P0-1.
      Replaced with hand-maintained dates taken from git history: a `STATIC_PAGES` table
      carrying each page's real last-changed date, and `KANJI_CONTENT_LAST_MODIFIED`
      (`2026-06-14`, commit `ba5c8fd`, the last kanji-data edit) for the kanji pages.
      *Known limitation:* the 1,893 kanji URLs still share one date. That is accurate —
      the data genuinely changed once, on that date — and the important property is that
      it no longer moves per deploy. Per-kanji dates would need per-kanji provenance in
      `lib/constants/*`, which we do not have.
- [x] **P1-5 · Article schema was not rich-result eligible.** Added `datePublished`
      (`2025-10-20`, commit `dab4476` — dictionary launch), `dateModified`, `image` (the
      1200×630 `/opengraph-image`, verified `200 image/png`), `publisher` with the logo
      `ImageObject`, and `mainEntityOfPage`. The sibling `FAQPage` and `BreadcrumbList`
      blocks were already correct and were left alone.
- [x] **P1-6 · Dead `/blog` rules in robots.txt.** `Allow: /blog`, `/blog/*` referenced
      routes that do not exist. Removed. *(Note: this means P4-1 must add them back when
      the blog ships — `Allow` under a permissive `User-agent: *` was a no-op anyway.)*

### ✅ P1 verified — July 30, 2026

Typecheck clean, `pnpm build` exit 0, **1,924 static pages / 1,894 prerendered kanji paths
— unchanged from the P0 baseline.** Verified in the build artefacts, not just the source:

```
prerendered /kanji/日 JSON-LD:
  Organization.url            https://www.michikanji.com          ← was apex
  Organization.logo.url       .../assets/web-app-manifest-512x512.png  ← was 404
  Article.author.name         MichiKanji                          ← was "Imiwa"
  Article.datePublished       2025-10-20                          ← was absent
  Article.dateModified        2026-06-14                          ← was absent
  Article.image / publisher   present                             ← were absent

grep for apex-only or logo.png references across .next/server/app/:  none

sitemap.xml.body:  1906 <loc>  (unchanged)
  distinct <lastmod> values: 6   ← was 1, and it moved every deploy
robots.txt.body:   no /blog rules
```

**Still hardcoding `https://www.michikanji.com`** (correct host, so not a bug — but they
should adopt `SITE_URL` opportunistically): the seven `app/free-resources/**/page.tsx`
JSON-LD blocks and `app/kanji/progress/page.tsx:10`.

### ✅ P1 verified in production — July 30, 2026

Commit [`b8a98fc`](https://github.com/aristidesnakos/imiwa/commit/b8a98fc) deployed. Every
build-artefact assertion above reproduced against the live site, which is the check that
matters — build output proves what we compiled, not what Vercel serves.

```
GET /kanji/日 — live JSON-LD
  Organization.url            https://www.michikanji.com                 ← was apex
  Organization.logo.url       …/assets/web-app-manifest-512x512.png      ← was 404
  Article.author              MichiKanji  (+ url)                        ← was "Imiwa"
  Article.datePublished       2025-10-20                                 ← was absent
  Article.dateModified        2026-06-14                                 ← was absent
  Article.image               ImageObject /opengraph-image 1200×630      ← was absent
  Article.publisher           MichiKanji + logo ImageObject              ← was absent
  Article.mainEntityOfPage    …/kanji/%E6%97%A5                          ← was absent
  FAQPage                     3 questions        (unchanged, was already correct)
  BreadcrumbList              3 items, all www   (unchanged, was already correct)

apex (non-www) URL occurrences in served HTML:  none
/assets/web-app-manifest-512x512.png            200 image/png
/opengraph-image                                200 image/png

GET /sitemap.xml   1906 <loc>  ← unchanged from the P0 baseline
  distinct <lastmod>: 6 — 2026-01-10, 01-20, 01-24, 05-02, 06-14, 07-29
GET /robots.txt    200, no /blog rules, no /_next/ block, no Crawl-delay
```

**Reproduction commands**, if any of this needs re-checking later:

```bash
curl -sS https://www.michikanji.com/sitemap.xml | grep -o '<lastmod>[^<]*' | sort -u
curl -sS https://www.michikanji.com/robots.txt
# apex leak check — expect no output
curl -sS https://www.michikanji.com/kanji/%E6%97%A5 \
  | grep -o 'https://michikanji\.com[^"'"'"' ]*' | grep -v 'www\.'
```

**Not yet done for P1**: the JSON-LD has not been through Google's hosted Rich Results
Test. That is a manual, browser-based step. It is worth doing once — but see the caveat
under P2-6 about whether `Article` is even the right type for a dictionary entry, because
a "no rich results detected" verdict there would be a *modelling* finding, not a bug.

---

## P2 — Measurement & regression guards

**We currently have no automated way to detect an SEO or performance regression.** P0-1
sat in production undetected. This section is what stops the next one.

### Continuous — runs on every PR

- [x] **P2-1 · Lighthouse CI** (`@lhci/cli`) as a GitHub Action, with assertions on LCP /
      INP / CLS and a JS bundle budget. Fails the PR *before* a regression ships. This is
      the single highest-value item in P2. **Shipped July 30, 2026** —
      `.github/workflows/lighthouse-ci.yml` + `lighthouserc.js`, on `pull_request` → `main`
      plus `workflow_dispatch`. `@lhci/cli@0.14.0` via pinned `pnpm dlx`, so **no
      devDependency** (it pulls ~290 transitive packages nothing else here needs).
      Verified with **27 real Lighthouse runs** locally (3 URLs × 3 runs × 3 collections),
      plus a negative test with impossible thresholds confirming every assertion can
      actually fail and that each `assertMatrix` pattern matches only its intended route.
      **Two implementation details that were load-bearing, worth not re-discovering:**
      `aggregationMethod: 'median'` is set explicitly on every assertion — LHCI's default
      is `optimistic`, which for a `maxNumericValue` assertion takes the **fastest** of the
      3 runs and would wave regressions through. And `startServerReadyPattern: 'Ready in'`
      is required, because `next start` prints `✓ Ready in 354ms` while LHCI's default
      pattern is lowercase `/listen|ready/` and never matches.
      **On INP**: lab Lighthouse cannot measure it — there is no such audit. TBT is the
      proxy, and since P2-2 was reverted it is now our *only* interaction-cost signal.
      ⚠️ **Thresholds need one calibration pass.** They were measured on Apple-silicon
      hardware; mobile emulation applies a 4× CPU multiplier, so runner/laptop differences
      are amplified 4×. LCP and TBT ceilings assume a runner up to ~2.5× slower and are
      deliberately generous — **a flaky gate gets switched off and stops guarding.** The
      byte budgets (~13% headroom) are the tight, non-flaky gate; they came out
      **byte-identical across all 27 runs**. After a few real CI runs, ratchet TBT/LCP down
      to runner-baseline + ~40%. Run via `workflow_dispatch` once before relying on it.
- [~] **P2-2 · Vercel Speed Insights — implemented, then deliberately reverted.**
      **Decision (July 30, 2026): not adopted.** Owner does not want a paid add-on. Recorded
      here rather than deleted, because the *goal* (field Core Web Vitals) is still open and
      the next person will otherwise re-propose the same tool.

      *First, a correction to how this item was originally justified.* It read "DataFast
      gives traffic; this gives real-user CWV — we need both", which understated the overlap.
      Accurate picture:
      - **DataFast is not part of this tradeoff at all** — revenue/traffic attribution,
        cookieless, <1 kB, and **no CWV whatsoever**.
      - **Search Console genuinely overlaps.** Its Core Web Vitals report *is* real field
        data. The case for a paid tool on top has to rest on CrUX's limits, not on DataFast.

      **Cost, for the record**: free on Hobby (one project, 10,000 data points/month, then
      recording pauses until the next day); **$10/project/month on Pro**, plus $0.65 per
      additional 10,000 events. So this is only a spend decision on Pro.

      **Why Lighthouse CI (P2-1) is a defensible substitute.** P2 exists to *catch
      regressions*, and for that purpose lab beats field: LHCI gates the PR **before** the
      regression ships, whereas field data surfaces it weeks later, after users already
      absorbed it. LHCI covers LCP, CLS, TBT and bundle budgets deterministically.
      **The honest gap**: lab cannot measure **INP** — interaction latency needs real
      users, and TBT is only a proxy. We also lose real device/network/geographic diversity.
      Mitigating that loss: at ~2k monthly visitors a p75 INP across ~1,900 routes would
      have been statistically thin anyway, so less was given up than it appears.

      **Free path to field CWV if we want it later** — the **CrUX API** is free (150
      queries/minute, no paid tier, API key only) and returns origin- and URL-level field
      LCP/INP/CLS. It could be queried from the same scheduled workflow as P2-7 at zero
      cost. Same caveat as GSC: it **404s when an origin has insufficient data**, so it may
      return nothing until traffic grows — but it costs nothing to attempt and starts
      working on its own as the site grows. This is the recommended way to close P2-2
      without spending.
- [ ] **P2-3 · A pre-push hook** checking that every changed `page.tsx` exports
      `generateMetadata` or `metadata` **and** resolves a self-canonical. This is exactly
      the class of bug that produced P0-4 and P0-5, and it is mechanically detectable.

### Periodic — monthly

- [ ] **P2-4 · Unlighthouse** — runs Lighthouse across the whole route tree rather than one
      URL. Built for our shape (~1,900 near-identical pages; sample a subset per level).
- [ ] **P2-5 · Full-site crawl** — Screaming Frog (free to 500 URLs) or Ahrefs Webmaster
      Tools (free site audit; we already load Ahrefs analytics, so setup is near-zero) for
      orphan pages, redirect chains, and duplicate detection.
- [x] **P2-6 · Schema validation in CI** — **Shipped July 30, 2026.**
      `scripts/validate-schema.ts` + `.github/workflows/schema-check.yml`, zero new
      dependencies (Node built-ins, run via the established `npx tsx` pattern). Checks
      **all 1,893** kanji pages in ~5s, so CI does not sample. Every expected value is
      *imported* from `lib/seo/site.ts` rather than re-hardcoded, so the validator cannot
      itself become the next place the brand drifts; `SITE_HOST`/`APEX_HOST` derive from
      `SITE_URL`, so it re-targets automatically if the canonical host changes.
      **Proven in both directions** — passes on unmodified `main`, and each regression was
      injected into a prerendered artefact and confirmed to fail with an actionable message:
      `author.name: 'Imiwa'` (P1-1), a `/logo.png` reference (P1-3, caught 6 ways — as both
      an equality mismatch and a file-resolution failure), an apex `Organization.url`
      (P1-2, caught by field check, equality check *and* a whole-build scan of 5,803
      artefacts), plus stripped Article dates, a broken breadcrumb `position` sequence,
      corrupt/absent `ld+json`, and apex URLs in `robots.txt`/`sitemap.xml`. All mutations
      restored and checksum-verified afterwards.
      **The check that actually catches P1-3**: every `logo`/`image`/`thumbnailUrl`/
      `contentUrl` URL is **resolved to a real file** — `public/`, then a built route
      handler, then an `app/` file convention — rather than string-matched. That is what
      lets `/opengraph-image` (a route handler) pass while `/logo.png` fails. A
      valid-*looking* URL that 404s is exactly the P1-3 failure.
      Failures are grouped by (type, field, expected, actual) with ≤3 example files and a
      `+N more`, so one systemic bug reports once instead of 1,893 times.
      *Two notes:* `tsconfig.json` **excludes `scripts/`**, so neither `next lint` nor the
      repo's `tsc` type-checks this file — it was verified under a separate tsconfig.
      And `app/learned-kanji.html` carries no JSON-LD at all, which is **correct, not a
      gap**: `app/learned-kanji/page.tsx` is a four-line bare `redirect()` with no rendered
      output. Its exclusion from `PAGES_REQUIRING_SITE_GRAPH` is right for the right reason
      — do not "fix" it.
      *Implementation note:* the hosted Google validator is rate-limited and would make CI
      flaky, so the CI check should be a **local structural validator** parsing the
      prerendered `.next/server/app/kanji/<char>.html` — the technique used to verify P1.
      Run the hosted tool manually instead. Two gotchas worth carrying over: the ld+json
      blocks are not uniformly objects (one is a bare array, one uses `@graph`), and logo
      URLs must be resolved to real files rather than string-matched, since P1-3 was a
      *valid-looking URL that 404'd*.
      *Open modelling question, distinct from validity:* `Article` rich results target
      news/blog content, so a dictionary entry may never win one however complete the
      markup is. P1-5 made the block valid and eligible, which was the right move
      regardless. But if the Rich Results Test reports nothing for a kanji page, the answer
      is probably to model these as `DefinedTerm` / `DefinedTermSet` rather than to add
      more `Article` fields. Needs post-deploy data, not more code reading.

### Indexation alarm

- [x] **P2-7 · Search Console API → weekly indexed-page-count report.** NomadList's
      collapse was 3,540 → 262 pages. A count that moves sharply is the earliest possible
      warning of a crawlability failure, and it is the one metric that would have caught
      their disaster in time. `scripts/check-indexation.ts` +
      `.github/workflows/indexation-alarm.yml`, Mondays 07:00 UTC. Opens/comments on a
      GitHub Issue when the proxy count drops >20% WoW or >30% off its trailing peak.
- [⏸] **P2-8 · Bing Webmaster Tools + IndexNow — BUILT, BRIEFLY MERGED, THEN BACKED OUT.
      Awaiting owner decision.** This was **not requested** in this cycle (agreed scope was
      P2-1, P2-6, P2-7). It was built as unasked-for scope and — through an agent error —
      committed and pushed to `main` in [`94843bc`](https://github.com/aristidesnakos/imiwa/commit/94843bc)
      without approval, then removed in the following commit.
      **Why it was backed out rather than left in place**: merging it activates a **daily
      cron that submits URLs to third-party services** (Bing, Yandex, Naver, Seznam) on the
      owner's behalf. Recurring outward-facing automation is the owner's call, not an
      implementation detail. **No submission ever fired** — the workflow was removed the
      same day, before its first 06:00 UTC schedule.
      *Nothing about the code is suspect* — IndexNow is a legitimate, widely-adopted
      protocol and the committed key is genuinely not a credential (same trust model as a
      Search Console HTML verification file). The objection is purely to activating it
      unasked. To adopt it, restore the five files listed below.
      `scripts/submit-indexnow.ts` +
      `.github/workflows/indexnow-submit.yml`, daily 06:00 UTC. Diffs the live sitemap
      against `data/indexnow-state.json` and bulk-pushes only new/changed URLs to
      `https://api.indexnow.org` (fans out to Bing, Yandex, Naver, Seznam). No secret
      needed — the verification key (`lib/seo/indexnow.ts`) is committed, not a
      credential. Google has no equivalent push API for ordinary pages (Indexing API is
      restricted to JobPosting/Livestream by Google's own terms); for Google,
      `scripts/check-index-status.ts` reports actual per-URL index status on demand via
      `urlInspection.index.inspect`, so you know which handful of priority URLs deserve a
      manual "Request Indexing" click in Search Console.
      **The five files removed from `main`**, recoverable in full from `94843bc`:
      `scripts/submit-indexnow.ts`, `.github/workflows/indexnow-submit.yml`,
      `lib/seo/indexnow.ts`, `public/<key>.txt`, and
      `docs/learnings/search-indexing-automation.md` (the full playbook, including how to
      port the scripts to another project). To adopt P2-8:
      `git checkout 94843bc -- <those five paths>` and re-add the `submit-indexnow`
      package.json script. If declined permanently, no action needed — they are gone from
      the working tree and history keeps the record.
      **`scripts/check-index-status.ts` was deliberately kept** even
      though it arrived with this batch — it is manual-only, makes no scheduled external
      calls, and directly addresses P2-7's central weakness by reporting *true* per-URL
      index status rather than the impression-based proxy.

### Baseline to track

Record these on each review so the trend is legible:

| Metric | Baseline (Jul 29, 2026) | Source |
|---|---|---|
| Kanji pages prerendered | 1,894 | build output |
| Total static pages | 1,924 | build output |
| Sitemap URLs | 1,906 (1,893 kanji + 13 static) | `/sitemap.xml` |
| Indexed pages | **not yet recorded** — P2-7 fills this on its first run | Search Console |
| Kanji page `x-vercel-cache` | `MISS` → **`HIT` confirmed Jul 30** | `curl -I` |
| Kanji page First Load JS | 123 kB | build output |
| Heaviest route *(by build weight)* | `/kanji/progress`, 231 kB | build output |
| Shared chunk baseline | 102 kB | build output |
| **Worst route *(by measured perf)*** | **`/kanji`, Lighthouse 66** — see P3-8 | Lighthouse 12.1.0 |
| Lab CWV `/` | LCP 2.6s · CLS 0.058 · TBT ~50ms · perf 96 | Lighthouse, median of 3 |
| Lab CWV `/kanji` | LCP 2.9s · **CLS 0.157** · **TBT ~1.1s** · perf 66 | Lighthouse, median of 3 |
| Lab CWV `/kanji/<char>` | LCP 2.4–3.3s · CLS 0.026 · TBT ~10–50ms · perf 92–98 | Lighthouse, median of 3 |
| Field CWV | **none — no field source.** P2-2 declined; free route is the CrUX API | — |

Two cautions on this table. The build's "First Load JS" and Lighthouse's transferred-script
figure are **different metrics** — `/kanji` reports 184 kB in the build but transfers 340 kB,
because prefetches and the search chunk are not counted in the former. And every performance
row here is **lab, measured on Apple-silicon hardware**; none of it is real-user data.

---

## P3 — Product performance cleanup

Surfaced by the P0 build and audit. None are urgent; all are real.

- [ ] **P3-1 · `getActiveAd()` now freezes at build time.** `lib/constants/ads.ts:66,80`
      call `new Date()` at render scope. Under `force-dynamic` this evaluated per request;
      under prerendering the ad HTML is fixed until revalidation, so campaign start/end
      dates lag up to ~24h. `ADS` is currently empty, so this is **latent — it will bite
      on the first booked sponsor.** `revalidate = 86400` bounds it; a shorter revalidate
      or client-side date check removes it.
- [ ] **P3-2 · `/opengraph-image` is the last forced-dynamic route.**
      `app/opengraph-image.tsx:3` sets `runtime = 'edge'`, which disables static
      generation (the build warns about this). The image prerenders fine without it.
      Low impact — OG images are fetched by scrapers, not indexed.
- [ ] **P3-3 · PDF routes have no `Cache-Control`.** `app/api/kana-sheets/route.ts` and
      `app/api/kanji-sheets/route.ts` recompute on every request, unlike
      `app/api/kanji-svg/[hex]/route.ts` which caches for 24h. Match that pattern.
- [ ] **P3-4 · `/kanji/progress` ships 112 kB route JS / 231 kB First Load** — by far our
      heaviest route. Now `noindex` (P0-5), so it no longer costs crawl budget, but it is
      still a poor experience for logged-in users. Candidate for chart-library code-split.
- [ ] **P3-5 · Middleware runs on all ~1,900 CDN hits.** `middleware.ts` matches every
      non-asset path for AI-crawler tracking. It runs *before* the cache so it does not
      break caching, but it is a per-request cost on our highest-traffic routes. Worth
      measuring now that those routes are cached.
- [ ] **P3-6 · Migrate to `app/sitemap.ts` / `app/robots.ts`** file conventions, which
      Next.js statically generates at build. Cleaner than hand-rolled route handlers and
      fixes P1-4 structurally.
- [ ] **P3-7 · `CLAUDE.md` claims `pnpm build` runs postbuild sitemap generation.** There is
      no `postbuild` script. Fix the doc or add the script.
- [ ] **P3-8 · `/kanji` is our worst-performing route — newly measured, not previously
      known.** The P2-1 baselines (Lighthouse 12.1.0, mobile emulation, median of 3 runs,
      real `pnpm build` + `pnpm start`) put it well behind everything else:

      | route | perf | LCP | CLS | TBT | script transferred |
      |---|---|---|---|---|---|
      | `/` | 96 | 2.6s | 0.058 | ~50ms | 222 kB |
      | `/kanji/<char>` | 92–98 | 2.4–3.3s | 0.026 | ~10–50ms | 228 kB |
      | **`/kanji`** | **66** | 2.9s | **0.157** | **~1.1s** | **340 kB** |

      CLS 0.157 is in Google's "needs improvement" band and TBT ~1.1s is the worst number
      anywhere in the app — and since P2-2 was declined, TBT is our only interaction-cost
      signal, so this is unmonitored in the field. The 340 kB of transferred script is
      roughly double the 184 kB the build reports as "First Load JS", because the page also
      pulls a ~104 kB search chunk plus Next.js `<Link>` **prefetches** for
      `/kanji/progress` and `/kanji/[character]`.
      This matters more than `/kanji/progress` (P3-4): `/kanji` is indexable, is the entry
      point to the ~1,900 detail pages, and its CLS is a page-experience signal, whereas
      `/kanji/progress` is now `noindex`.
      Likely wins: narrow the `<Link>` prefetching, code-split the search chunk, and reserve
      layout space for whatever shifts (0.157 on a search page is usually results rendering
      into unreserved height).
      ⚠️ P2-1's ceilings for this route (CLS 0.25, TBT 3500ms) **freeze this debt rather
      than endorse it** — they are set at the "poor" boundary purely so the gate passes on
      today's `main`. Ratchet them down as this is fixed.

---

## P4 — Content & AI visibility

Structural growth work. Larger than the above, and the real ceiling on organic traffic.

- [ ] **P4-1 · Build the informational content layer (`/blog`).** Our ~1,900 kanji pages
      capture *navigational* intent ("日 stroke order"). Nothing captures "how to learn
      kanji radicals", "JLPT N5 study plan" — the queries that earn links and feed the
      kanji pages authority. robots.txt already allows `/blog`; nothing exists there.
- [ ] **P4-2 · Differentiate the kanji page template.** ~1,900 pages from one template with
      a handful of interpolated fields is the classic thin-content pattern. Genuinely
      distinct per-page content plus dense internal linking is the fix. *(See "Shelved
      work" below — the radical-cluster feature was one attempt at this.)*
- [ ] **P4-3 · `llms.txt` + explicit AI crawler allowances.** We are **ahead** here:
      `middleware.ts` already tracks AI crawlers via `@datafast/ai-crawl`, which most
      sites do not do. Missing is an `llms.txt` and explicit `User-agent: GPTBot /
      ClaudeBot / PerplexityBot` blocks. The wildcard already permits them, but explicit
      declaration is now the norm and is what AI-visibility audits grade on.
- [ ] **P4-4 · Sitemap index.** Fine at 1,906 URLs; must split before 50,000.
- [ ] **P4-5 · hreflang / i18n.** We teach Japanese in English only. An opportunity, not a
      defect. Unscoped.

---

## Shelved work

**`feature/radical-kanji-clusters`** — adds `components/kanji/RadicalKanjiSection.tsx`,
`lib/linking/radical-clusters.ts`, `lib/linking/radical-kin.ts`, and wires them into the
kanji detail page. One commit, `bf33560`.

**Decision (July 29, 2026): shelved indefinitely, not merged.**

That commit also contains a duplicate copy of the P0 SEO fixes, made before they were
split out onto `main`. **A merge would therefore conflict in
`app/kanji/[character]/page.tsx`, where the SEO hunks collide.**

An idle branch is inert — it causes no problem while it sits there. The conflict only
materialises on a merge attempt. If we ever revive it, the resolution is a rebase onto
`main` taking `main`'s side for every SEO hunk and keeping only the `RadicalKanjiSection`
import and its JSX.

The underlying *idea* — differentiated per-page content via radical relationships —
remains valid and is captured as **P4-2**. The branch is not the only way to get there.

---

## Sequencing

1. ~~**Confirm P0**~~ — ✅ done July 30, 2026. The CDN is serving prerendered HTML.
2. ~~**P1 as one batch**~~ — ✅ done July 30, 2026. Six fixes, one commit.
3. ~~**P2-1, P2-2, P2-7**~~ — ✅ done July 30, 2026, **plus P2-6**. Lighthouse CI and the
   schema validator gate PRs; the indexation alarm runs weekly. **P2-2 was reverted** —
   see its entry. The guard rails are up, so later work is measured rather than assumed.
4. **Two calibration steps before these guard rails can be trusted**, both needing one real
   CI run: ratchet the Lighthouse TBT/LCP ceilings to the runner baseline (P2-1), and
   provision `GSC_SERVICE_ACCOUNT_KEY` so the indexation alarm records its first reading
   (P2-7). Until then P2-1 may be loose and P2-7 is inert.
5. **Decide P2-8** (built, not merged — starts daily third-party submissions).
6. **P3** opportunistically — note **P3-8** is now the largest measured perf problem —
   **P4-1** as the next real project.

**Principle for this cycle**: P0-1 was invisible for months because nothing was watching.
Ship the guard rails (P2) before the next round of improvements, so the next regression
announces itself instead of quietly costing traffic.
