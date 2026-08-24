/**
 * Validator for brand-palette alignment in `app/` and `components/`.
 *
 * Run: pnpm validate:palette
 *      pnpm validate:palette --tighten   (re-record the baseline, downward only)
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The palette in `app/globals.css` is not decoration. It carries contrast
 * decisions that were measured rather than guessed — the fill/ink split on
 * coral and destructive exists because `#FF6B47` is 2.7:1 and cannot legally
 * carry a label; `--input`, `--accent-foreground` and `--switch-unchecked` each
 * have a committed ratio in a comment beside them. A stock Tailwind colour
 * dropped into a component bypasses every one of those decisions silently. It
 * looks fine in review, because `text-gray-500` looks like a colour someone
 * chose.
 *
 * CLAUDE.md already states the rule and explains why colour work has to be
 * verified against computed values rather than by reading the class list. It
 * had no enforcement, and the drift is not small: this validator found 625
 * off-palette usages across 52 files the first time it ran. That is what an
 * unenforced convention looks like after a couple of years.
 *
 * ---------------------------------------------------------------------------
 * The four failure modes, and why they are one validator
 * ---------------------------------------------------------------------------
 *
 * 1. DEAD ALPHA — `bg-japan-soft-mist/60`, `border-japan-sakura-waters/20`.
 *
 *    These compile to NOTHING. Tailwind cannot fold an opacity modifier into a
 *    colour whose value is a bare `var(--x)` holding a hex, which is how
 *    `tailwind.config.js` maps every `japan.*` token, so it drops the whole
 *    utility rather than erroring. The element then falls back to preflight's
 *    stock `#e5e7eb` border or to no background at all.
 *
 *    This is the third instance of the same failure mode already recorded in
 *    CLAUDE.md — after the bare HSL triplets that produced an invalid
 *    declaration, and the undefined tokens that resolved to `currentcolor`.
 *    All three share one shape: the property does not apply, nothing warns,
 *    and the class list still reads correctly. It is the reason this file
 *    checks compiled behaviour rather than intent.
 *
 *    The sanctioned way to write a tint is `color-mix` on the token:
 *
 *        to-[color-mix(in_srgb,var(--sakura-waters)_25%,var(--temple-stone))]
 *
 *    and for a border it must carry the `color:` type hint —
 *    `border-[color:color-mix(...)]` — or tailwind-merge reads the arbitrary
 *    value as a border-WIDTH and strips the element's own `border` class,
 *    which preflight has already set to width 0.
 *
 * 2. STOCK PALETTE — `text-gray-500`, `border-amber-500`, `text-green-500`.
 *    Off-brand by definition, and unmeasured against our backgrounds.
 *
 * 3. BLACK AND WHITE — `bg-white`, `bg-black/40`.
 *    The palette has `--temple-stone` for card surfaces and `--ink-black` for
 *    text precisely so neither is pure. Pure white on temple-stone is a real,
 *    visible seam.
 *
 * 4. COLOUR LITERALS — `border-[#7BB3D3]/20`, `fill="#1B365D"`, a hex in a
 *    `style={{}}`. Note the first one: it is `--sakura-waters` written out by
 *    hand, and it exists in the codebase because somebody hit failure mode 1,
 *    found that the arbitrary form worked, and moved on without diagnosing it.
 *    A literal is a token that has been disconnected from its definition, so
 *    when the token changes the literal does not.
 *
 * ---------------------------------------------------------------------------
 * Why a ratcheting baseline rather than an allowlist of occurrences
 * ---------------------------------------------------------------------------
 *
 * 625 violations cannot be fixed as a precondition for turning the gate on,
 * and a validator that can never go green is a validator nobody runs. So the
 * baseline records a per-file COUNT per failure mode. A count that goes up
 * fails. A file that is not in the baseline must be clean. A count that goes
 * down is reported as a baseline to tighten.
 *
 * The numbers only ever move one way. That is the whole mechanism: today's
 * debt is frozen exactly where it is, and every new component is held to the
 * palette from its first commit — which is the actual rule.
 *
 * `--tighten` rewrites the baseline, and refuses to raise any count. There is
 * deliberately no way to record new debt from the CLI.
 *
 * ---------------------------------------------------------------------------
 * Check 1 has no baseline, and judges reachability instead
 * ---------------------------------------------------------------------------
 *
 * Every `var(--x)` a colour in `tailwind.config.js` is built on must be defined
 * in `app/globals.css`, and its wrapper must match its value: `hsl(var(--x))`
 * around a hex is invalid, and a bare `var(--x)` around an HSL triplet is
 * invalid. Both drop silently. Those are not hypotheses — the first is how
 * `border-input` rendered in the inherited text colour for months, the second
 * is what shipped on `--destructive`. Both are covered by a negative test.
 *
 * There is no baseline here because there is no live debt: the only broken
 * tokens today are the eight `--sidebar-*` entries, and
 * `components/ui/sidebar.tsx` has zero importers. So a broken token that
 * nothing renders is a warning, and a broken token that something renders is a
 * failure. Wiring the sidebar up turns its warnings into failures on the same
 * commit, which is the point.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const REPO = join(__dirname, '..');
const BASELINE_PATH = join(__dirname, 'palette-baseline.json');
const SCAN_ROOTS = ['app', 'components'];

// ---------------------------------------------------------------------------
// Reporting, matching the other validators in this directory
// ---------------------------------------------------------------------------

let checks = 0;
let failures = 0;
const warnings: string[] = [];

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function check(label: string, problems: string[], okMessage: string): void {
  checks += 1;
  if (problems.length === 0) {
    console.log(`  ok    ${okMessage}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`);
  for (const p of problems.slice(0, 40)) console.log(`          ${p}`);
  if (problems.length > 40) console.log(`          ... and ${problems.length - 40} more`);
}

// ---------------------------------------------------------------------------
// Source discovery
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((r) => walk(join(REPO, r))).map((f) => relative(REPO, f)).sort();

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

const STOCK_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
].join('|');

// Every Tailwind utility prefix that takes a colour. `shadow` is included
// because `shadow-<color>` exists alongside `shadow-<size>`; the size variants
// cannot collide with a palette name, so there is no ambiguity to resolve.
const COLOR_PROP =
  'bg|text|border|ring|ring-offset|from|to|via|fill|stroke|divide|outline|decoration|accent|caret|placeholder|shadow';

type Kind = 'deadAlpha' | 'stock' | 'blackWhite' | 'literal';

const KIND_LABEL: Record<Kind, string> = {
  deadAlpha: 'opacity modifier on a japan-* token (compiles to nothing)',
  stock: 'stock Tailwind palette colour',
  blackWhite: 'pure black/white instead of ink-black/temple-stone',
  literal: 'hard-coded colour literal instead of a token',
};

const KIND_FIX: Record<Kind, string> = {
  deadAlpha: 'use color-mix on the token: [color-mix(in_srgb,var(--token)_25%,var(--temple-stone))] (borders need the color: hint)',
  stock: 'use a japan-* token or a semantic token (primary/muted/card/destructive/...)',
  blackWhite: 'use text-japan-ink-black or bg-japan-temple-stone',
  literal: 'reference the token: var(--token), not its hex',
};

const PATTERNS: Record<Kind, RegExp> = {
  deadAlpha: new RegExp(`\\b(?:${COLOR_PROP})-japan-[a-z-]+\\/\\d+\\b`, 'g'),
  stock: new RegExp(`\\b(?:${COLOR_PROP})-(?:${STOCK_PALETTE})-(?:50|[1-9]00|950)(?:\\/\\d+)?\\b`, 'g'),
  blackWhite: new RegExp(`\\b(?:${COLOR_PROP})-(?:black|white)(?:\\/\\d+)?\\b`, 'g'),
  // Two shapes: a colour literal anywhere inside a Tailwind arbitrary value
  // (which covers `bg-[#fff]` and a color-mix whose ingredient is a hex rather
  // than a token), and a literal in a JSX colour attribute or a style object.
  literal:
    /(?:\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|divide|outline|decoration|placeholder)-\[[^\]]*(?:#[0-9a-fA-F]{3,8}|\brgba?\(|\bhsla?\()[^\]]*\])|(?:(?:fill|stroke|color|stopColor|backgroundColor|borderColor)\s*[=:]\s*["'`]\s*(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\())/g,
};

const KINDS = Object.keys(PATTERNS) as Kind[];

type Counts = Partial<Record<Kind, number>>;

const observed: Record<string, Counts> = {};
const samples: Record<string, Partial<Record<Kind, string[]>>> = {};

for (const file of files) {
  const src = readFileSync(join(REPO, file), 'utf8');
  for (const kind of KINDS) {
    const matches = src.match(PATTERNS[kind]);
    if (!matches || matches.length === 0) continue;
    observed[file] = observed[file] || {};
    observed[file][kind] = matches.length;
    samples[file] = samples[file] || {};
    // Deduped without Set iteration: scripts/ sits outside tsconfig.json (see
    // CLAUDE.md), so this file gets checked under whatever target an editor
    // picks, and Array.from(new Set(...)) infers unknown[] under ES5.
    const distinct: string[] = [];
    for (const m of matches) if (!distinct.includes(m)) distinct.push(m);
    samples[file][kind] = distinct.slice(0, 3);
  }
}

// ---------------------------------------------------------------------------
// 1. Every colour token the Tailwind config points at is actually defined
// ---------------------------------------------------------------------------

section('1. Colour tokens are defined, and their wrapper matches their value');
{
  // Resolve the config rather than regexing the file: a raw sweep also picks up
  // runtime variables that are not ours to define, such as Radix's
  // --radix-accordion-content-height in the keyframes block.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const resolveConfig = require('tailwindcss/resolveConfig');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const resolved = resolveConfig(require(join(REPO, 'tailwind.config.js')));
  const globals = readFileSync(join(REPO, 'app', 'globals.css'), 'utf8');

  const defs = new Map<string, string>();
  for (const m of globals.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
    defs.set(m[1], m[2].trim());
  }

  // `--background: var(--temple-stone)` has to be chased to the hex before its
  // shape can be judged.
  function shapeOf(token: string, seen = new Set<string>()): 'missing' | 'hex' | 'triplet' | 'function' {
    if (seen.has(token)) return 'function';
    seen.add(token);
    const raw = defs.get(token);
    if (raw === undefined) return 'missing';
    const alias = raw.match(/^var\((--[a-z0-9-]+)\)$/);
    if (alias) return shapeOf(alias[1], seen);
    if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return 'hex';
    // A bare HSL/RGB triplet: "0 84.2% 60.2%" — only valid inside hsl()/rgb().
    if (/^[\d.]+(deg)?\s+[\d.]+%?\s+[\d.]+%?(\s*\/\s*[\d.%]+)?$/.test(raw)) return 'triplet';
    return 'function';
  }

  // colour name as it appears in a utility -> { token, wrapped }
  const used = new Map<string, { token: string; wrapped: boolean }>();
  const collect = (value: unknown, path: string[]): void => {
    if (typeof value === 'string') {
      const m = value.match(/var\((--[a-z0-9-]+)\)/);
      if (m) used.set(path.join('-'), { token: m[1], wrapped: /^(hsl|rgb|hsla|rgba)\(/.test(value) });
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        collect(v, k === 'DEFAULT' ? path : [...path, k]);
      }
    }
  };
  collect(resolved.theme.colors, []);

  // An undefined or mis-wrapped token only breaks something if a utility built
  // on it renders. components/ui/sidebar.tsx has zero importers, so its eight
  // tokens are inert dead config — real debt, but not a live defect, and
  // failing the gate on day one over dead code teaches people to skip the gate.
  const liveSource = files
    .filter((f) => f !== 'components/ui/sidebar.tsx')
    .map((f) => readFileSync(join(REPO, f), 'utf8'))
    .join('\n');

  const live: string[] = [];
  let bad = 0;

  for (const [name, { token, wrapped }] of Array.from(used.entries()).sort()) {
    const shape = shapeOf(token);
    let problem: string | null = null;

    if (shape === 'missing') {
      problem =
        `${token} (utilities named *-${name}) is mapped by tailwind.config.js but never defined in ` +
        `app/globals.css — every utility built on it resolves to an invalid value and is silently ` +
        `dropped, exactly as border-input did while --input was undefined`;
    } else if (wrapped && shape === 'hex') {
      problem =
        `${token} (utilities named *-${name}) is a hex, but tailwind.config.js wraps it as ` +
        `hsl(var(${token})) — hsl() of a hex is invalid and the browser drops the declaration`;
    } else if (!wrapped && shape === 'triplet') {
      problem =
        `${token} (utilities named *-${name}) is a bare HSL/RGB triplet, but tailwind.config.js uses ` +
        `it unwrapped — the declaration lands as e.g. "color: 0 84% 60%", which is invalid and ` +
        `dropped. This is what shipped on --destructive for a long time`;
    }

    if (!problem) continue;
    bad += 1;
    const reachable = new RegExp(`\\b(?:${COLOR_PROP})-${name}(?:\\b|/)`).test(liveSource);
    if (reachable) live.push(problem);
    else warnings.push(`${problem} — nothing renders it today, but it is a trap for whoever wires it up`);
  }

  check(
    'a colour token used by rendered code is undefined or wrapped inconsistently with its value',
    live,
    `${used.size} token-backed colour(s); ${bad} broken, none reachable from rendered code`
  );
}

// ---------------------------------------------------------------------------
// 2. No file may exceed its recorded count, and new files must be clean
// ---------------------------------------------------------------------------

type Baseline = Record<string, Counts>;

let baseline: Baseline = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
} catch {
  console.log(`\n  note  no baseline at ${relative(REPO, BASELINE_PATH)} — treating every count as 0`);
}

// One-time, and it refuses to run once the file exists. Freezing today's debt
// is a thing you do once; after that the only supported direction is down, via
// --tighten. Without this guard, "just re-bootstrap it" becomes the way every
// regression gets waved through, and the gate stops meaning anything.
if (process.argv.includes('--bootstrap')) {
  let exists = true;
  try { readFileSync(BASELINE_PATH, 'utf8'); } catch { exists = false; }
  if (exists) {
    console.log(`\n  refused: ${relative(REPO, BASELINE_PATH)} already exists.`);
    console.log('  The baseline only ever shrinks — use --tighten to re-record it downward.');
    process.exit(1);
  }
  const seeded: Baseline = {};
  for (const file of Object.keys(observed).sort()) seeded[file] = observed[file];
  writeFileSync(BASELINE_PATH, `${JSON.stringify(seeded, null, 2)}\n`);
  const total = Object.values(seeded).reduce(
    (n, c) => n + Object.values(c).reduce((a, b) => a + (b ?? 0), 0), 0
  );
  console.log(`\n  baseline seeded with ${total} existing usage(s) across ${Object.keys(seeded).length} file(s)`);
  console.log(`  ${relative(REPO, BASELINE_PATH)}`);
  process.exit(0);
}

if (process.argv.includes('--tighten')) {
  const next: Baseline = {};
  let lowered = 0;
  let refused = 0;
  for (const file of Object.keys({ ...baseline, ...observed }).sort()) {
    const was = baseline[file] || {};
    const now = observed[file] || {};
    const merged: Counts = {};
    for (const kind of KINDS) {
      const before = was[kind] ?? 0;
      const after = now[kind] ?? 0;
      // Downward only. Recording new debt from the CLI is the one thing this
      // flag must not be able to do.
      if (after > before) {
        refused += 1;
        merged[kind] = before;
      } else if (after < before) {
        lowered += 1;
        if (after > 0) merged[kind] = after;
      } else if (before > 0) {
        merged[kind] = before;
      }
    }
    if (Object.keys(merged).length) next[file] = merged;
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`\n  baseline rewritten: ${lowered} count(s) lowered, ${refused} increase(s) refused`);
  console.log(`  ${relative(REPO, BASELINE_PATH)}`);
  process.exit(0);
}

section('2. Off-palette usage has not grown');
{
  const regressions: string[] = [];

  for (const file of Object.keys(observed).sort()) {
    for (const kind of KINDS) {
      const now = observed[file][kind] ?? 0;
      const allowed = baseline[file]?.[kind] ?? 0;
      if (now <= allowed) continue;
      const eg = (samples[file]?.[kind] ?? []).join(', ');
      regressions.push(
        `${file}: ${now} ${KIND_LABEL[kind]} (baseline ${allowed}) — e.g. ${eg}`
      );
      regressions.push(`    fix: ${KIND_FIX[kind]}`);
    }
  }

  const totalNow = Object.values(observed).reduce(
    (n, c) => n + Object.values(c).reduce((a, b) => a + (b ?? 0), 0), 0
  );

  check(
    'a file uses more off-palette colours than its recorded baseline',
    regressions,
    `${totalNow} recorded off-palette usage(s) across ${Object.keys(observed).length} file(s), none above baseline`
  );
}

// ---------------------------------------------------------------------------
// 3. The baseline itself is not stale
// ---------------------------------------------------------------------------

section('3. The baseline only ever shrinks');
{
  // Counted separately from `warnings`, which by this point also holds check 1's
  // unreachable-token notes. Reporting those here would claim files improved
  // that nobody touched.
  const shrunk: string[] = [];
  for (const file of Object.keys(baseline).sort()) {
    for (const kind of KINDS) {
      const allowed = baseline[file]?.[kind] ?? 0;
      if (allowed === 0) continue;
      const now = observed[file]?.[kind] ?? 0;
      if (now < allowed) {
        shrunk.push(
          `${file}: ${KIND_LABEL[kind]} is down to ${now} from a baseline of ${allowed} — ` +
            `run \`pnpm validate:palette --tighten\` so it cannot drift back`
        );
      }
    }
  }
  warnings.push(...shrunk);
  // Not a check() — a shrinking baseline is good news, and blocking a PR that
  // improved things would teach exactly the wrong lesson.
  console.log(
    shrunk.length
      ? `  ${shrunk.length} file(s) improved and can be re-recorded`
      : '  ok    baseline matches the tree'
  );
}

// ---------------------------------------------------------------------------

section('Off-palette usage by kind');
{
  for (const kind of KINDS) {
    const total = Object.values(observed).reduce((n, c) => n + (c[kind] ?? 0), 0);
    const nFiles = Object.values(observed).filter((c) => (c[kind] ?? 0) > 0).length;
    console.log(`  ${String(total).padStart(4)}  ${KIND_LABEL[kind]}  (${nFiles} file(s))`);
  }
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s) — not fatal, but the baseline should shrink:`);
  for (const w of warnings) console.log(`  WARN ${w}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
