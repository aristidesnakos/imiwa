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
 * Some of these freeze known debt rather than endorse a healthy state:
 *   - /kanji CLS 0.157 (Google: "needs improvement") and TBT ~1.1s are both
 *     bad. The gate stops them getting worse; fixing them is separate work.
 *   - /kanji/<char> LCP ~3s is "needs improvement" on the template that
 *     carries essentially all organic traffic.
 *   When those are fixed, ratchet the corresponding numbers DOWN.
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
      url: [`${HOST}/`, `${HOST}/kanji`, `${HOST}/kanji/%E6%97%A5`],
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
          fcp: 1800, // ~0.92s baseline (one outlier run hit 1.97s)
          cls: 0.1, // <=0.058 baseline; hold Google's "good" boundary
          tbt: 600, // 47-110ms median, 190ms worst single run; CPU-noise room
          scriptKb: 250, // 222 kB baseline, +13%
          totalKb: 440, // 373 kB baseline, +18%
          perfScore: 0.85,
        }),
        route({
          // Anchored so it does NOT also match /kanji/<char>.
          matchingUrlPattern: '^http://localhost:3000/kanji$',
          lcp: 4000, // ~2.88s baseline, ~1.4x
          fcp: 2200, // ~1.21s baseline
          cls: 0.25, // 0.157 baseline — KNOWN DEBT; ceiling is the "poor" line
          tbt: 3500, // ~1.1s baseline, 1581ms worst run — KNOWN DEBT, x4 CPU noise
          scriptKb: 384, // 340 kB baseline, +13% — the real gate for this route
          totalKb: 660, // 573 kB baseline, +15%
          perfScore: 0.6,
        }),
        route({
          matchingUrlPattern: '^http://localhost:3000/kanji/.+',
          lcp: 4500, // 2.87-3.30s baseline (noisy, post-hydration LCP element)
          fcp: 1800, // ~0.92s baseline
          cls: 0.1, // 0.026 baseline
          tbt: 600, // 9-51ms median, 116ms worst single run
          scriptKb: 260, // 228 kB baseline, +14%
          totalKb: 440, // 363 kB baseline, +21%
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
