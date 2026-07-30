# Search Indexing Automation: What's Actually Automatable, and What Isn't

## The question this answers

"We changed our SEO (canonicals, schema, sitemap, prerendering) — how do we get
crawlers to notice fast?" People reach for "resubmit the sitemap" or "ping Google."
Neither does what it sounds like. This doc records what's real, what we built, and
how to carry it to another project.

## The reality check (read this before building anything here)

- **Google has no public API to force indexing of an ordinary page.** The
  "Indexing API" exists, but Google restricts it by policy to two content types:
  `JobPosting` and `BroadcastEvent` (livestream). Calling it for anything else is a
  ToS violation and Google ignores the result anyway. Don't build this.
- **`google.com/ping?sitemap=...` was deprecated in 2023.** It does nothing now.
- **Search Console's "Request Indexing" button is real but manual and rate-limited**
  (roughly ~10 URLs/day in practice). It's for a handful of priority URLs after a
  meaningful change, not a bulk lever.
- **Resubmitting a sitemap in Search Console** just makes Google re-fetch the
  sitemap *file* sooner, so it notices new `lastmod` values. It does not force a
  recrawl of already-indexed URLs — Google schedules that on its own crawl budget.
  It's only a meaningful signal at all if your `lastmod` values are trustworthy
  (see `lib/seo/site.ts` — hand-maintained constants, not `new Date()`; a value that
  moves on every request teaches Google to ignore the field entirely).
- **IndexNow is the one thing that's actually a real, working push API** — but only
  for Bing, Yandex, Naver, and Seznam, who jointly committed to the protocol.
  Google does not participate.

So the automatable half of this problem is IndexNow (a real push). The Google half
is monitoring-only: check what Google currently believes, so a human can make the
few "Request Indexing" clicks that matter.

## What we built

Two independent scripts, sharing one auth module:

```
scripts/lib/google-service-account-auth.ts   # shared: zero-dep Google service-account JWT auth
scripts/submit-indexnow.ts                   # automatable: pushes changed URLs to IndexNow
scripts/check-index-status.ts                # monitoring: reports Google's actual per-URL status
scripts/check-indexation.ts                  # (pre-existing) weekly indexed-page-count trend alarm
lib/seo/indexnow.ts                          # committed IndexNow verification key (not a secret)
public/<key>.txt                             # IndexNow's required key-file, served at the domain root
data/indexnow-state.json                     # { url: lastSubmittedLastmod }, committed by CI
.github/workflows/indexnow-submit.yml        # daily cron + manual dispatch
```

### `scripts/submit-indexnow.ts` — the real push

Fetches the *live* sitemap (not the source data behind it — the live file, so it
only ever submits what's actually public), diffs each URL's `<lastmod>` against
`data/indexnow-state.json`, and bulk-POSTs only what's new or changed to
`https://api.indexnow.org/indexnow`. One call reaches Bing, Yandex, Naver, and
Seznam. Runs daily via `.github/workflows/indexnow-submit.yml`, but is idempotent
and cheap — most days there's nothing to submit, because `lastmod` values are
hand-bumped, not generated per-request.

The verification key (`lib/seo/indexnow.ts`) is **not a secret** — it's a
plain-text file at `https://<host>/<key>.txt` that proves domain ownership,
conceptually identical to a Search Console HTML-verification file. It's committed
directly; no GitHub Secret, no env var. That's a deliberate and notable contrast
with the GSC scripts below, which *do* need a real credential.

Run manually: `pnpm run submit-indexnow`

### `scripts/check-index-status.ts` — the Google monitor

Calls Search Console's `urlInspection.index.inspect` for a short, hand-picked
priority-URL list (edit `DEFAULT_PRIORITY_URLS` in the script), and reports each
URL's actual coverage state, indexing state, last crawl time, and — notably —
whether Google's chosen canonical matches the page's declared canonical. A
mismatch there is a common self-inflicted indexing bug (exactly the class of bug
this repo's canonical-URL fixes addressed).

Deliberately **not** wired to a scheduled workflow. Its value is answering "did
Google notice the page I just changed?" right after a deploy — an on-demand
question, not a weekly trend. (`check-indexation.ts` already covers the trend
side; see that file's header for why a full-sitemap sweep with this same API
is not viable as a recurring job — 2,000 queries/day, 600/min, ~1,900 URLs here.)

Run manually:
```bash
pnpm run check-index-status                                    # default priority list
pnpm run check-index-status https://example.com/some/page      # specific URLs
```

### `scripts/lib/google-service-account-auth.ts` — the reusable unit

Exchanges a Google service-account JSON key for a bearer token via a self-signed
RS256 JWT, using only `node:crypto` — no `googleapis` / `google-auth-library`
dependency. Two exports: `parseServiceAccountKey(raw, envVarName?)` and
`getGoogleAccessToken(key, scope)`. Both `check-indexation.ts` and
`check-index-status.ts` use it; it has zero imports from the rest of this repo,
so it's the one file in this set that's truly copy-paste portable.

## One-time setup (per project)

### IndexNow (no secret required)
1. Generate a key: `openssl rand -hex 16`
2. Add it as a committed constant (`lib/seo/indexnow.ts` here).
3. Commit a file at `public/<key>.txt` whose entire content is the key.
4. Done — no GitHub Secret, no Vercel env var, no dashboard signup.

### Google Search Console (one real credential, shared by two scripts)
1. Google Cloud Console → APIs & Services → Library → enable "Google Search
   Console API".
2. IAM & Admin → Service Accounts → Create service account (no IAM roles needed).
3. On that service account: Keys → Add key → Create new key → JSON. Download it.
4. Search Console → select the property → Settings → Users and permissions → Add
   user. Paste the service account email, grant **Full** permission ("Restricted"
   is not enough for `searchAnalytics.query`).
5. Store the entire downloaded JSON as `GSC_SERVICE_ACCOUNT_KEY` (GitHub Secret
   for CI, local env var for manual runs).
6. If the Search Console property is a *domain* property (`sc-domain:example.com`)
   rather than a URL-prefix property, also set `GSC_PROPERTY_TYPE=domain`. Default
   assumes url-prefix; a wrong guess degrades to a warning and auto-retries the
   other form, so this is a nice-to-have, not a hard blocker.

Full step-by-step with exact menu paths lives in `scripts/check-indexation.ts`'s
`SETUP_INSTRUCTIONS` constant — both GSC scripts print it verbatim if the
credential is missing, so a misconfigured environment is self-diagnosing.

## Porting this pair of scripts to another project

Everything here was built to be lifted, not just to work in place:

1. Copy `scripts/lib/google-service-account-auth.ts` verbatim — zero repo-specific
   imports.
2. Copy `scripts/submit-indexnow.ts` and `scripts/check-index-status.ts`. Each has
   exactly one project-specific import: `SITE_URL` from this project's SEO config
   module. Point that import at wherever the new project keeps its canonical site
   URL (or replace it with a hardcoded string / env var — it's one line).
3. `submit-indexnow.ts` assumes a sitemap shaped like
   `<url><loc>..</loc><lastmod>..</lastmod></url>` (Next.js's own `sitemap.ts`
   convention, and what this repo's hand-written route produces). If the target
   project's sitemap has a meaningfully different shape (nested indexes, extra
   namespaces), the `parseSitemap()` regex scan is the only thing to touch.
4. `check-index-status.ts`'s `resolveProperties()` lives in `check-indexation.ts`
   in this repo (both scripts share it) — if porting `check-index-status.ts`
   without also porting `check-indexation.ts`, either copy that one function or
   inline the url-prefix/domain-property logic (it's ~15 lines, documented in
   place with why both forms exist).
5. Generate a fresh IndexNow key per project — never reuse one across domains,
   since the key file's *location* (`https://<that-project's-host>/<key>.txt`) is
   part of what proves ownership.
6. Adjust `DEFAULT_PRIORITY_URLS` in `check-index-status.ts` to the new project's
   actual high-value pages.

Nothing here depends on Next.js specifically except the sitemap shape assumption
above — the scripts are plain Node/TypeScript (`tsx`) and would run unmodified
against any site that exposes a sitemap and/or has a Search Console property.

## What NOT to build

- Anything that calls Google's Indexing API for non-Job/Livestream content. It's
  against Google's terms, and multiple SEO practitioners have documented that
  Google silently ignores or rate-limits abuse of it anyway — it is not a secret
  workaround, it's a dead end.
- A script that "auto-clicks" Request Indexing via browser automation against the
  Search Console UI. Fragile, against the spirit of the rate limit, and the UI
  changes without notice — `check-index-status.ts` gets you 90% of the value
  (knowing *which* URLs need the click) without the fragility.
- A cron that sweeps the *entire* sitemap through `urlInspection.index.inspect`.
  The quota math doesn't work at any real site's scale (see `check-indexation.ts`
  header) — that's exactly why the trend-proxy script and the on-demand
  short-list script are two different tools instead of one "monitor everything"
  script.
