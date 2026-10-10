/**
 * Lighthouse CI configuration — performance guard rail for pull requests.
 * See .github/workflows/lighthouse-ci.yml for the runner.
 *
 * WHY .js AND NOT .json: this file needs comments (the thresholds below are only
 * defensible with their rationale attached) and a small amount of logic to share
 * a common assertion shape across three routes.
 *
 * ---------------------------------------------------------------------------
 * ON "INP"
 * ---------------------------------------------------------------------------
 * Interaction to Next Paint is a FIELD-ONLY metric. It requires a real user
 * interacting with the page, so a lab Lighthouse navigation run cannot produce
 * it — there is no `interaction-to-next-paint` audit to assert on here. The
 * accepted lab proxy is Total Blocking Time (`total-blocking-time`), which
 * measures how long the main thread was blocked during load and is what
 * actually causes bad INP. We assert on TBT below and treat it as the INP
 * stand-in.
 *
 * There is deliberately NO field-INP source in this project: roadmap P2-2
 * (Vercel Speed Insights) was implemented and then reverted — the owner
 * declined a paid add-on. So TBT here is not a stopgap alongside real INP, it
 * is the ONLY interaction-cost signal we have. Treat a TBT regression as the
 * only warning you will get. If field INP is wanted later, the free route is
 * the CrUX API (see P2-2 in the roadmap), not this file.
 *
 * ---------------------------------------------------------------------------
 * HOW THESE NUMBERS WERE PICKED
 * ---------------------------------------------------------------------------
 * Measured 2026-07-30 against a real `pnpm build` + `pnpm start`, Lighthouse
 * 12.1.0, default mobile emulation, 3 runs per URL, median taken. Three
 * independent 9-run collections on the same commit; the median of each
 * collection, so you can see the run-to-run spread:
 *
 *              perf        LCP (ms)          FCP (ms)        CLS                TBT (ms)      script  total
 *   /          96/95/97    2603/2765/2576    934/916/922     0.058/0/0.058      47/110/26     222 kB  373 kB
 *   /kanji     66/66/65    2874/2880/2884    1212/1212/1214  0.157/0.157/0.157  1064/1116/1231 340 kB 573 kB
 *   /kanji/日  92/95/98    3295/2867/2432    935/909/913     0.026/0.026/0.026  51/9/8        228 kB  363 kB
 *
 * Thresholds are baseline + headroom, NOT aspirational targets. A gate that
 * fails on unmodified `main` gets switched off and stops guarding anything.
 * Headroom is sized per metric class:
 *
 *   - Byte budgets came out BYTE-IDENTICAL across all 27 runs, so they get the
 *     tightest headroom (~13%). These are the real bundle gate: almost every JS
 *     regression shows up here first, and it cannot flake.
 *   - CLS is near-deterministic; the ceiling is the "good" boundary (0.1) on
 *     the two routes that already sit inside it.
 *   - LCP under simulated throttling is mostly waterfall-driven, but the two
 *     content-heavy routes land their LCP element after hydration, which makes
 *     it partly CPU-bound. Ceiling ~1.4x median.
 *   - TBT is by far the noisiest and the most sensitive to runner CPU speed:
 *     mobile emulation applies a 4x CPU slowdown multiplier, so any hardware
 *     difference between this laptop (Apple silicon) and a GitHub-hosted
 *     4-vCPU runner is amplified 4x. Single runs here already spread 18-190ms
 *     on `/` and 1024-1581ms on `/kanji`. It therefore gets the loosest
 *     headroom by design: it is a "something got dramatically heavier" alarm,
 *     not a precision instrument. The byte budget is what catches the subtle
 *     stuff.
 *
 * ---------------------------------------------------------------------------
 * ACTUAL GITHUB RUNNER BASELINE — measured, run 30534096642, 2026-07-30
 * ---------------------------------------------------------------------------
 * ubuntu-latest, workflow_dispatch on main, median LHR of 3 runs per URL:
 *
 *              perf   LCP     FCP    CLS     TBT     script  total
 *   /          96     2747    917    0.000   42      222 kB  372 kB
 *   /kanji     65     3056    1219   0.000   2305    340 kB  572 kB
 *   /kanji/日  98     2422    915    0.025   57      228 kB  362 kB
 *
 * What this told us, versus the laptop numbers above:
 *
 *   - BYTE BUDGETS ARE EXACTLY IDENTICAL on runner and laptop (222/340/228 kB
 *     script). That settles it: they are fully deterministic and are the gate
 *     to trust.
 *   - LCP barely moved (2747 vs 2603, 3056 vs 2874, 2422 vs 2432). The 4x CPU
 *     multiplier does not dominate LCP here, so the ~1.4x ceilings have far
 *     more headroom than they need.
 *   - TBT on /kanji DOUBLED: 2305ms on the runner vs ~1100ms locally (~2.1x,
 *     close to the assumed 2.5x). It passed the 3500ms ceiling with ~1.5x
 *     headroom. A tighter ceiling picked from laptop data alone WOULD have
 *     failed this run. The generous choice was correct.
 *   - CLS DISAGREES BETWEEN ENVIRONMENTS: /kanji measured 0.157 locally but
 *     0.000 on the runner, and / measured 0.058 locally but 0.000. So the
 *     /kanji layout shift is NOT confirmed debt — it is environment- or
 *     timing-dependent. Do not treat 0.157 as a known defect (P3-8 is
 *     corrected accordingly).
 *
 * !! STILL NOT CALIBRATED, deliberately. The above is a SINGLE runner sample
 * (n=1). Ratcheting the noisiest metric on one observation is precisely how a
 * gate becomes flaky, so nothing was tightened yet. After ~5 real runs, read
 * the spread and THEN ratchet LCP toward runner-baseline + ~40% (roughly
 * 3900/4300/3400) and TBT once its true variance is known. Leave the byte
 * budgets alone — they are already tight and provably stable.
 *
 * CALIBRATED 2026-10-10, from the median LHRs of the last 10 runner runs
 * (c90b7fb..4e959da, Oct 3-10). LCP and FCP ceilings are 1.4x the runner
 * median, never under 1.25x the worst run, applied only where that LOWERED a
 * ceiling (it would have raised LCP on `/`, `/kanji` and `/stories`, which
 * kept theirs). Runner median (worst), ms:
 *
 *                     LCP           FCP
 *   /                 2847 (3314)    917 (925)
 *   /kanji            2953 (3030)   1373 (1415)
 *   /kanji/日         2347 (2493)    957 (995)
 *   /kanji/n5         2170 (2264)   1029 (1057)
 *   /kanji/n5/quiz    2150 (2612)    916 (920)
 *   /stories          2498 (2806)    919 (936)
 *   /stories/<ep>     2380 (2960)    998 (1010)
 *
 * TBT stays generous: /kanji alone spread 72-402ms across those ten. The same
 * day, every byte budget that had drifted looser than measured + ~17% was
 * ratcheted to measured + ~15%. "Byte-identical on runner and laptop" no longer
 * holds exactly: a lazy image right at the edge of Chrome's load-ahead window
 * can load on one and not the other (see /kanji/<char>), so a byte budget is
 * set from the larger of the two.
 *
 * Some of these freeze known debt rather than endorse a healthy state:
 *   - /kanji TBT ~1.1s is bad, and unlike CLS it reproduces everywhere — the
 *     runner measured 2305ms, worse still. Confirmed debt. The gate stops it
 *     getting worse; fixing it is separate work. PAID 2026-09-24: 62ms locally
 *     once the hub stopped prefetching /kanji/progress and /kanji/review, and
 *     its entry below is ratcheted to match.
 *   - /kanji/<char> LCP ~3s is "needs improvement" on the template that
 *     carries essentially all organic traffic. No longer true by 2026-10: the
 *     runner median was 2.35s, and its ceiling is ratcheted to match.
 *   NOT on that list: /kanji CLS. The 0.157 laptop figure did not reproduce on
 *   the runner (0.000), so it is environment- or timing-dependent and remains
 *   UNCONFIRMED — see the runner-baseline section above. Its 0.25 ceiling is a
 *   loose guard against a real regression, not an admission of debt, so do not
 *   go chasing a layout shift on the strength of this file.
 *   When the confirmed ones are fixed, ratchet the corresponding numbers DOWN.
 *
 * RECALIBRATING: run `pnpm dlx @lhci/cli@0.14.0 autorun --config=./lighthouserc.js`
 * locally after a `pnpm build`, or read the medians off the temporary-public-storage
 * report linked in the workflow log.
 */

const HOST = 'http://localhost:3000';
const KB = 1024;

/**
 * Build one assertMatrix entry. Every numeric assertion aggregates with
 * `median` — LHCI's default is `optimistic`, which for a max-value assertion
 * silently takes the FASTEST of the 3 runs and would let regressions through.
 */
function route({matchingUrlPattern, lcp, fcp, cls, tbt, scriptKb, totalKb, perfScore}) {
  return {
    matchingUrlPattern,
    aggregationMethod: 'median',
    assertions: {
      // --- Core Web Vitals (lab) -------------------------------------------
      'largest-contentful-paint': ['error', {maxNumericValue: lcp}],
      'cumulative-layout-shift': ['error', {maxNumericValue: cls}],
      // Lab proxy for INP. See the note at the top of this file.
      'total-blocking-time': ['error', {maxNumericValue: tbt}],
      'first-contentful-paint': ['error', {maxNumericValue: fcp}],

      // --- JS / payload budget ---------------------------------------------
      // Transferred (compressed) bytes of all scripts the page actually pulls,
      // which includes Next.js <Link> route prefetches and the one third-party
      // script (datafa.st, ~6 kB). Not the same figure as `next build`'s
      // "First Load JS" — this is what the browser really downloads.
      'resource-summary:script:size': ['error', {maxNumericValue: scriptKb * KB}],
      'resource-summary:total:size': ['error', {maxNumericValue: totalKb * KB}],

      // --- Headline score --------------------------------------------------
      // WARN, not ERROR, on purpose. The composite score is a weighted blend
      // dominated by TBT, so an error-level score gate would fail on runner
      // noise before any individual metric gate trips — i.e. it would
      // contradict the ceilings above. Kept for at-a-glance signal in the log.
      'categories:performance': ['warn', {minScore: perfScore}],
    },
  };
}

module.exports = {
  ci: {
    collect: {
      // Measure the real production build, never `next dev`.
      startServerCommand: 'pnpm start',
      // `next start` prints "✓ Ready in 354ms". LHCI's default pattern
      // (/listen|ready/) is lowercase and would not match.
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 120000,
      // 3 runs per URL; a single Lighthouse run is far too noisy to gate a PR.
      numberOfRuns: 3,
      // A representative slice, not just the homepage:
      //   /            marketing + hero
      //   /kanji       the client-side search index (heaviest JS of the three)
      //   /kanji/日    a prerendered kanji detail page — the ~1,890-page
      //                template that carries essentially all organic traffic.
      //                Percent-encoded because the segment is a CJK character.
      //   /stories     the story hub — the page written to rank for the
      //                category query
      //   /stories/<s> one episode: six images plus a client-side email form,
      //                the heaviest image payload on the site
      //   /kanji/n5    a JLPT level list — 82 server-rendered entries, and the
      //                page built for the "n5 kanji" query class
      //   /kanji/n5/quiz  the level quiz: the one client-heavy page in the
      //                level family, carrying the N5 data for play
      //   /free-resources/kanji-sheets/custom  the sheet builder: a client
      //                island handed every level's characters as a string,
      //                and the one page whose budget catches someone importing
      //                the kanji data into it
      //   /free-resources/genkouyoushi  blank manuscript paper: two inline
      //                SVG previews of ~500 rects each
      url: [
        `${HOST}/`,
        `${HOST}/kanji`,
        `${HOST}/kanji/%E6%97%A5`,
        `${HOST}/kanji/n5`,
        `${HOST}/kanji/n5/quiz`,
        `${HOST}/stories`,
        `${HOST}/stories/tan-climbs-the-mountain`,
        `${HOST}/free-resources/kanji-sheets/custom`,
        `${HOST}/free-resources/genkouyoushi`,
      ],
      settings: {
        // --no-sandbox / --disable-dev-shm-usage are required for Chrome in a
        // containerised CI runner.
        chromeFlags: '--no-sandbox --headless=new --disable-gpu --disable-dev-shm-usage',
        // Performance is what we assert on. SEO is collected but not asserted —
        // it costs almost nothing and makes the uploaded report useful for
        // spotting canonical/indexability regressions by eye.
        onlyCategories: ['performance', 'seo'],
        // Always fails against a localhost HTTP/1.1 server; pure noise here.
        skipAudits: ['uses-http2'],
      },
    },

    assert: {
      // No `preset` — presets add dozens of unrelated assertions that would
      // fail for reasons that have nothing to do with a perf regression.
      // Per-route thresholds: one shared threshold set would have to be loose
      // enough for /kanji (TBT 1064ms), which would gut the gate on the other
      // two routes.
      assertMatrix: [
        route({
          matchingUrlPattern: '^http://localhost:3000/$',
          lcp: 3800, // ~2.7s baseline, ~1.4x
          fcp: 1300, // 0.92s runner median, 0.93s worst (was 1800)
          cls: 0.1, // <=0.058 baseline; hold Google's "good" boundary
          tbt: 600, // 47-110ms median, 190ms worst single run; CPU-noise room
          // RATCHETED 2026-10-10: 182 kB script / 237 kB total, on CI and
          // locally. The search-first homepage (4e959da) took `/` from ~400 kB
          // to 237, and the old 250/440 ceilings would have let it grow by
          // 200 kB again without failing.
          scriptKb: 210, // 182 kB measured, +15%
          totalKb: 275, // 237 kB measured, +16%
          perfScore: 0.85,
        }),
        route({
          // Anchored so it does NOT also match /kanji/<char>.
          matchingUrlPattern: '^http://localhost:3000/kanji$',
          lcp: 4000, // ~2.88s baseline, ~1.4x (2.43s measured 2026-09-24)
          fcp: 2000, // 1.37s runner median, 1.42s worst (was 2200)
          // RATCHETED 2026-09-24, after the hub rework paid off the debt this
          // entry used to freeze. Script fell 394 → 239 kB (the hub stopped
          // prefetching /kanji/progress and /kanji/review, 112 kB of chart
          // library), CLS 0.87 → 0 locally (the loading state now reserves the
          // grid's height, so the footer no longer flashes into view and
          // prefetches its links), TBT ~1.1s → 62ms. The old ceilings
          // (script 384, total 660, CLS 0.25, TBT 3500) would have let every
          // one of those fixes regress silently.
          cls: 0.1,
          // Loosest TBT here: this route still hydrates a 200-card grid and a
          // 1,906-link index, and runner TBT ran ~2x local before.
          tbt: 800,
          scriptKb: 280, // 239 kB measured, +17%
          totalKb: 430, // 375 kB measured, +15%
          perfScore: 0.85,
        }),
        // Measured 2026-09-14: 3 runs per route, local `pnpm start`, same 4x CPU
        // emulation as every other entry here. Byte budgets are baseline +~15%
        // and are the gate to trust; timings keep the generous ceilings the rest
        // of this file uses, because TBT/LCP are the noisy pair under emulation.
        route({
          matchingUrlPattern: '^http://localhost:3000/stories$',
          // ~2.20s baseline, ~1.4x. Since the cards came first, the LCP element
          // is the first card's art: lazy-loaded it measured 2.84s (CI 2.81s),
          // so it is now `priority`, and measured 2.56s on 2026-10-10.
          lcp: 3100,
          fcp: 1300, // 0.92s runner median, 0.94s worst (was 1800)
          cls: 0.1, // 0.000 measured; hold Google's "good" boundary
          tbt: 600, // 34-42ms measured; CPU-noise room, not a real limit
          // RATCHETED 2026-09-24: 183 kB script / 283 kB total measured. The
          // header logo prefetches `/`, and `/` stopped shipping the whole
          // dictionary when the homepage became a server component, so every
          // page with a header fell ~57 kB of script. Holding the old ceilings
          // would have left that much room for a regression nobody sees.
          scriptKb: 215, // 183 kB measured, +17%
          // RE-BASELINED 2026-10-10: 310 kB measured. The cards-first hub
          // (a10ee0a) took the page to 361 kB (359 on CI, against 325). Two
          // parts of that were waste and came out: the three cards in the
          // viewport prefetched their episode pages (~35 kB with the route's
          // script; the cards are now prefetch={false}), and `sizes` overstated
          // the card, so a phone fetched 750w art for a 348px card (-12 kB at
          // 640w). What stays is intended, because it is the hub's content: the
          // card art. Lighthouse's lazy-load window reaches ~3,000px below the
          // fold (probed: an image at 3,700px loads, one at 3,900px does not),
          // which on this layout is the first 11 cards. So each new episode
          // adds one card's art (~10 kB at 640w, 5-15 kB so far) until episode
          // 11, then the total plateaus near 337 kB, because the newest card
          // pushes the oldest out of the window. Holding 325 would have failed
          // CI again at episode 10.
          totalKb: 357, // 310 kB measured, +15%
          perfScore: 0.85, // 0.99 measured
        }),
        route({
          // Anchored so it does NOT also match /stories itself.
          matchingUrlPattern: '^http://localhost:3000/stories/.+',
          lcp: 3800, // 2.38s runner median, 2.96s worst (was 3900)
          fcp: 1400, // 1.00s runner median, 1.01s worst (was 2000)
          cls: 0.1, // 0.000 measured
          tbt: 600, // 47-53ms measured
          scriptKb: 215, // 183 kB measured 2026-09-24 (was 223), +17% — see /stories
          // Six WebP panels, but next/image serves a responsive size rather
          // than the 1092px master — the whole page lands under the kanji
          // detail route, not over it, which the paper budget got badly wrong.
          // 365 KiB held. 315 kB measured 2026-09-24 (was 367), +16%; then 346 kB
          // measured 2026-10-02 once the episode carried its video poster. That
          // poster is YouTube's 1080x1920 oar2.jpg (~155 kB), which pushed the
          // page to 482 kB until VideoFacade sent it through next/image (it is
          // now one 640w file, ~19 kB). The budget was NOT raised for it: the
          // thumbnail is the only thing that was ever over, and re-baselining on
          // an unresized poster would have given a regression 100 kB of room.
          totalKb: 365,
          perfScore: 0.85, // 0.98 measured
        }),
        // A JLPT level list (/kanji/n5, and later n4..n1). Measured 2026-09-24,
        // local `pnpm start`, same emulation: 192 kB script / 270 kB total. It
        // is lighter than a character page because every link that would
        // prefetch a heavy route — 82 kanji pages, the /kanji dictionary — has
        // prefetch off, and the list itself is server-rendered HTML.
        // N1's list is ~12x N5's: budget it on its own when it gets a page.
        route({
          matchingUrlPattern: '^http://localhost:3000/kanji/n[1-5]$',
          lcp: 3100, // 2.17s runner median, 2.26s worst (was 4100)
          fcp: 1500, // 1.03s runner median, 1.06s worst (was 1800)
          cls: 0.1, // 0.000 measured
          tbt: 600, // 59ms measured
          // RATCHETED 2026-10-10: 186 kB measured, on CI and locally (was 225
          // for 192 kB; the 6 kB it lost left the ceiling at +21%).
          scriptKb: 215, // 186 kB measured, +15%
          totalKb: 310, // 270 kB measured, +15%
          perfScore: 0.85, // 0.94 measured
        }),
        // The level quiz. Measured 2026-09-24, local `pnpm start`: 199 kB script
        // / 247 kB total — heavier on script than the list because the quiz
        // engine and the N5 data ship to play it, lighter on total because the
        // server HTML is a setup form, not 82 entries.
        route({
          matchingUrlPattern: '^http://localhost:3000/kanji/n[1-5]/quiz$',
          lcp: 3300, // 2.15s runner median, 2.61s worst (was 3500)
          fcp: 1300, // 0.92s runner median, 0.92s worst (was 1800)
          cls: 0.1, // 0.000 measured
          tbt: 600, // 38ms measured
          scriptKb: 235, // 199 kB measured, +17%
          totalKb: 285, // 247 kB measured, +15%
          perfScore: 0.85, // 0.98 measured
        }),
        // The sheet builder and the genkouyoushi page, measured 2026-10-10 on
        // Ari's Mac against `pnpm build && pnpm start`, 3 runs each, medians:
        //   builder       190 kB script / 250 kB total, LCP 2.25s, FCP 1.20s, TBT 168ms
        //   genkouyoushi  187 kB script / 241 kB total, LCP 2.68s, FCP 1.11s, TBT 261ms
        // Byte budgets +15%, the gate to trust; LCP and FCP ~1.4x; TBT the
        // shared 600ms alarm. Laptop numbers only: no runner sample yet, so
        // recalibrate from CI as the header describes once a few runs exist.
        route({
          matchingUrlPattern: '^http://localhost:3000/free-resources/kanji-sheets/custom$',
          lcp: 3200, // 2.25s measured, ~1.4x
          fcp: 1700, // 1.20s measured, ~1.4x
          cls: 0.1, // 0.000 measured
          tbt: 600, // 84-181ms measured
          // The island is handed 5.7 kB of characters. Importing the kanji
          // DATA into it instead would put this hundreds of kB over.
          scriptKb: 220, // 190 kB measured, +16%
          totalKb: 290, // 250 kB measured, +16%
          perfScore: 0.85, // 0.96 measured
        }),
        route({
          matchingUrlPattern: '^http://localhost:3000/free-resources/genkouyoushi$',
          lcp: 3800, // 2.68s measured, ~1.4x
          fcp: 1600, // 1.11s measured, ~1.4x
          cls: 0.1, // 0.000 measured
          // 101-690ms measured: the two previews are ~1,000 SVG rects to lay
          // out, which is main-thread time with no script in it.
          tbt: 600,
          scriptKb: 215, // 187 kB measured, +15%
          totalKb: 280, // 241 kB measured, +16%
          perfScore: 0.85, // 0.93 measured
        }),
        route({
          // Percent-encoded segments only, i.e. a character. `/kanji/.+` used
          // to be safe here, but LHCI applies EVERY matching entry to a URL, so
          // it would also hold the level lists (/kanji/n5) to this template's
          // budget on top of their own.
          matchingUrlPattern: '^http://localhost:3000/kanji/%',
          lcp: 3300, // 2.35s runner median, 2.49s worst (was 4500)
          fcp: 1400, // 0.96s runner median, 1.00s worst (was 1800)
          cls: 0.1, // 0.026 baseline
          tbt: 600, // 9-51ms median, 116ms worst single run
          // RATCHETED 2026-10-10: 188 kB script / 269 kB total measured locally,
          // down from 248 / 391. The "Kanji Dictionary" breadcrumb prefetched
          // /kanji, so every character page pulled the dictionary's 61 kB
          // payload and ~60 kB of its script; it is prefetch={false} now. The
          // total is budgeted from 278 kB, CI's figure: the runner also loads
          // the first example-sentence card's Tan sticker (~9 kB, right at the
          // edge of the lazy-load window), which the laptop does not.
          scriptKb: 215, // 188 kB measured, +15%
          totalKb: 320, // 278 kB expected on CI (269 local + the sticker), +15%
          perfScore: 0.85,
        }),
      ],
    },

    upload: {
      // Free, zero-config, and gives a failing PR an inspectable report URL in
      // the job log. Reports are public but expire; they contain nothing
      // sensitive (a localhost build of an already-public site).
      target: 'temporary-public-storage',
    },
  },
};
