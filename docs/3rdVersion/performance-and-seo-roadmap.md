# Performance & SEO Roadmap (3rd Version)

**Status**: 🚧 Active — P0 shipped and verified in production, P1–P4 open
**Started**: July 29, 2026
**Baseline audit**: July 29, 2026, against `seoroast.com/nomadlist` as a reference teardown
**Website**: michikanji.com
**Last verified against code**: July 29, 2026 (commit `07cc952` on `main`)

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
| Brand / entity inconsistency | ❌ **We had this** — see P1-1, P1-2 |
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

## P1 — Brand entity & crawl signals

This is the cluster that maps directly onto NomadList's brand-perception failure. Cheap
to fix, and it is what makes Google treat us as one coherent entity.

- [ ] **P1-1 · Article schema credits the wrong brand.** `app/kanji/[character]/page.tsx:141`
      sets `author.name: 'Imiwa'` on all ~1,900 pages. Should be `MichiKanji`.
      *(`Imiwa` is the git repo name — it leaked into the schema.)*
- [ ] **P1-2 · JSON-LD entity URLs use the apex, canonicals use `www`.**
      `app/layout.tsx` hardcodes `https://michikanji.com` at lines **56, 57, 66, 71, 74,
      79, 87** — `Organization.url`, `logo`, `WebSite.url`, `publisher.url`,
      `publisher.logo`, the `SearchAction` target, and `EducationalOrganization.url`.
      All of those 301 to `www`. Derive from `config.domainName` instead of hardcoding.
- [ ] **P1-3 · `logo.png` does not exist.** Every `Organization` / `publisher` logo in the
      JSON-LD points at `https://michikanji.com/logo.png`, which **404s** (no
      `public/logo.png` in the repo). A publisher logo is required for several rich
      results and feeds knowledge-panel eligibility. Either ship the asset or drop the
      property — a 404 is worse than absent.
- [ ] **P1-4 · Sitemap `lastmod` is untrustworthy.** `app/sitemap.xml/route.ts:33,40` stamp
      `new Date().toISOString()` onto **every** URL, so all ~1,900 claim to have changed
      at the same instant. Google demotes and eventually ignores unreliable `lastmod`,
      which works directly against the crawl-efficiency goal of P0-1. Use a build-time
      constant or a content-derived timestamp.
      *(Note: the route builds as `○ Static`, so this is baked per-deploy rather than
      per-request — less bad than it first appeared, but still one identical value for
      every URL.)*
- [ ] **P1-5 · Article schema is not rich-result eligible.** Missing `datePublished`,
      `dateModified`, `image`, and `publisher`. As written it earns nothing. The sibling
      `FAQPage` and `BreadcrumbList` blocks are correct — leave them alone.
- [ ] **P1-6 · Dead `/blog` rules in robots.txt.** Lines 8–9 `Allow: /blog`, `/blog/*`
      reference routes that do not exist. Remove them, or build the blog (see P4-1).

---

## P2 — Measurement & regression guards

**We currently have no automated way to detect an SEO or performance regression.** P0-1
sat in production undetected. This section is what stops the next one.

### Continuous — runs on every PR

- [ ] **P2-1 · Lighthouse CI** (`@lhci/cli`) as a GitHub Action, with assertions on LCP /
      INP / CLS and a JS bundle budget. Fails the PR *before* a regression ships. This is
      the single highest-value item in P2.
- [ ] **P2-2 · Vercel Speed Insights** for **field** Core Web Vitals. DataFast gives us
      traffic; this gives us real-user performance data, which is what actually feeds
      page-experience signals. Different datasets — we need both.
- [ ] **P2-3 · A pre-push hook** checking that every changed `page.tsx` exports
      `generateMetadata` or `metadata` **and** resolves a self-canonical. This is exactly
      the class of bug that produced P0-4 and P0-5, and it is mechanically detectable.

### Periodic — monthly

- [ ] **P2-4 · Unlighthouse** — runs Lighthouse across the whole route tree rather than one
      URL. Built for our shape (~1,900 near-identical pages; sample a subset per level).
- [ ] **P2-5 · Full-site crawl** — Screaming Frog (free to 500 URLs) or Ahrefs Webmaster
      Tools (free site audit; we already load Ahrefs analytics, so setup is near-zero) for
      orphan pages, redirect chains, and duplicate detection.
- [ ] **P2-6 · Schema validation in CI** — Google Rich Results Test / Schema Markup
      Validator against one sampled kanji page. Would have caught P1-1 and P1-3.

### Indexation alarm

- [ ] **P2-7 · Search Console API → weekly indexed-page-count report.** NomadList's
      collapse was 3,540 → 262 pages. A count that moves sharply is the earliest possible
      warning of a crawlability failure, and it is the one metric that would have caught
      their disaster in time.
- [ ] **P2-8 · Bing Webmaster Tools + IndexNow.** Trivial on Vercel, and the fastest route
      to getting new pages discovered.

### Baseline to track

Record these on each review so the trend is legible:

| Metric | Baseline (Jul 29, 2026) | Source |
|---|---|---|
| Kanji pages prerendered | 1,894 | build output |
| Total static pages | 1,924 | build output |
| Sitemap URLs | 1,906 (1,893 kanji + 13 static) | `/sitemap.xml` |
| Indexed pages | **not yet recorded** | Search Console |
| Kanji page `x-vercel-cache` | `MISS` → **`HIT` confirmed Jul 30** | `curl -I` |
| Kanji page First Load JS | 123 kB | build output |
| Heaviest route | `/kanji/progress`, 231 kB | build output |
| Shared chunk baseline | 102 kB | build output |

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
2. **P1 as one batch** — six small, mechanical, related fixes. One commit.
3. **P2-1, P2-2, P2-7** — Lighthouse CI, Speed Insights, and the indexation alarm. Do
   these *before* P3/P4 so later work is measured rather than assumed.
4. **P3** opportunistically, **P4-1** as the next real project.

**Principle for this cycle**: P0-1 was invisible for months because nothing was watching.
Ship the guard rails (P2) before the next round of improvements, so the next regression
announces itself instead of quietly costing traffic.
