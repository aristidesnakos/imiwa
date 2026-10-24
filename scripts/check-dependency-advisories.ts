/**
 * Do the production dependencies carry a high or critical advisory we have not
 * accepted?
 *
 * Run: pnpm check-advisories            audit production dependencies (needs the network)
 *      pnpm check-advisories --self-test  replay the decision rules on fixtures (offline)
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * On 2026-10-24 the lockfile pinned next@15.5.24, inside the range of a
 * critical advisory published two days earlier (GHSA-2464-fhr4-w9xw, fixed in
 * 15.5.28, a version package.json already allowed). Nothing said so: GitHub's
 * Dependabot alerts were off, there is no dependabot.yml, and no job ran
 * `pnpm audit`. The same audit found about 50 advisories that reached the repo
 * only through dependencies nothing imported. The gaps were the same one: no
 * check ever asked the advisory database about what this repo ships.
 *
 * ---------------------------------------------------------------------------
 * The rules
 * ---------------------------------------------------------------------------
 *
 *   - It audits production dependencies only (`pnpm audit --prod`): lint and
 *     script tooling in devDependencies never reaches a visitor.
 *   - pnpm prints one row per dependency path. Advisories are counted once, by
 *     GitHub advisory id.
 *   - A critical or high advisory fails the check unless its id is in
 *     scripts/advisories-accepted.json with a reason and a point to look again.
 *     Moderate and low are printed and never fail.
 *   - An accepted id that no longer appears is a warning, not a failure: it was
 *     fixed or withdrawn, and an advisory database must not turn this red by
 *     itself.
 *   - If the audit cannot run or does not answer (registry unreachable, an
 *     error shape this script does not know), it exits 2 and says so. A check
 *     that passes when it could not look is the failure this file exists to end.
 *
 * Exit codes: 0 clean, 1 an unaccepted advisory or a malformed accepted list,
 * 2 the audit itself did not run.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..');
const ACCEPTED_PATH = join(__dirname, 'advisories-accepted.json');

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
const BLOCKING: Severity[] = ['critical', 'high'];

interface Advisory {
  id: string;
  module: string;
  severity: Severity;
  title: string;
  patched: string;
  /** Installed versions the audit flagged, e.g. ["8.4.31"]. */
  installed: string[];
  /** The first dependency path, to show who pulls it in. */
  via: string;
}

interface Accepted {
  reason?: string;
  revisit?: string;
}

interface Decision {
  blocking: Advisory[];
  acceptedHere: Advisory[];
  informational: Advisory[];
  stale: string[];
}

/** pnpm audit --json -> one Advisory per GitHub advisory id. Throws on a shape it does not know. */
export function summarise(raw: unknown): Advisory[] {
  const json = raw as { advisories?: Record<string, any>; metadata?: unknown; error?: { code?: string; message?: string } } | null;
  if (json?.error) {
    throw new Error(`pnpm audit failed (${json.error.code ?? 'no code'}: ${json.error.message ?? 'no message'})`);
  }
  if (!json || typeof json !== 'object' || !json.advisories || !json.metadata) {
    throw new Error('the audit answered, but not in the shape of an advisory report');
  }
  const byId = new Map<string, Advisory>();
  for (const entry of Object.values(json.advisories)) {
    const id: string = entry.github_advisory_id;
    if (!id) throw new Error(`an advisory with no GitHub id: ${String(entry.title)}`);
    const findings: any[] = entry.findings ?? [];
    const installed = [...new Set(findings.map(f => String(f.version)))];
    const existing = byId.get(id);
    if (existing) {
      for (const v of installed) if (!existing.installed.includes(v)) existing.installed.push(v);
      continue;
    }
    byId.set(id, {
      id,
      module: entry.module_name,
      severity: entry.severity,
      title: entry.title,
      patched: entry.patched_versions,
      installed,
      via: String(findings[0]?.paths?.[0] ?? '').replace(/\([^)]*\)/g, ''),
    });
  }
  return [...byId.values()];
}

/** Problems with the accepted list itself: an entry with no reason or no point to look again. */
export function acceptedProblems(accepted: Record<string, Accepted>): string[] {
  const problems: string[] = [];
  for (const [id, entry] of Object.entries(accepted)) {
    if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(id)) problems.push(`${id}: not a GitHub advisory id`);
    if (!entry.reason?.trim()) problems.push(`${id}: no reason`);
    if (!entry.revisit?.trim()) problems.push(`${id}: no revisit point`);
  }
  return problems;
}

export function decide(advisories: Advisory[], accepted: Record<string, Accepted>): Decision {
  const blocking: Advisory[] = [];
  const acceptedHere: Advisory[] = [];
  const informational: Advisory[] = [];
  for (const advisory of advisories) {
    if (!BLOCKING.includes(advisory.severity)) informational.push(advisory);
    else if (accepted[advisory.id]) acceptedHere.push(advisory);
    else blocking.push(advisory);
  }
  const seen = new Set(advisories.map(a => a.id));
  const stale = Object.keys(accepted).filter(id => !seen.has(id));
  return { blocking, acceptedHere, informational, stale };
}

// ---------------------------------------------------------------------------
// Self-test: the rules above, replayed on fixtures
// ---------------------------------------------------------------------------

function selfTest(): boolean {
  const adv = (id: string, severity: Severity): Advisory => ({
    id, module: 'pkg', severity, title: 't', patched: '>=2', installed: ['1'], via: '. > pkg@1',
  });
  const accepted = { 'GHSA-aaaa-aaaa-aaaa': { reason: 'r', revisit: 'when x' } };
  const cases: Array<[string, boolean]> = [];
  const d = (advisories: Advisory[], list = accepted) => decide(advisories, list);

  cases.push(['an unaccepted critical blocks', d([adv('GHSA-bbbb-bbbb-bbbb', 'critical')]).blocking.length === 1]);
  cases.push(['an unaccepted high blocks', d([adv('GHSA-bbbb-bbbb-bbbb', 'high')]).blocking.length === 1]);
  cases.push(['an accepted high does not block', d([adv('GHSA-aaaa-aaaa-aaaa', 'high')]).blocking.length === 0]);
  cases.push(['moderate and low never block', d([adv('GHSA-bbbb-bbbb-bbbb', 'moderate'), adv('GHSA-cccc-cccc-cccc', 'low')]).blocking.length === 0]);
  cases.push(['an accepted id that vanished is stale, not a failure', (() => {
    const r = d([]);
    return r.blocking.length === 0 && r.stale.length === 1;
  })()]);

  const raw = {
    metadata: {},
    advisories: {
      '1': { github_advisory_id: 'GHSA-bbbb-bbbb-bbbb', module_name: 'pkg', severity: 'high', title: 't', patched_versions: '>=2', findings: [{ version: '1', paths: ['. > a > pkg@1'] }] },
      '2': { github_advisory_id: 'GHSA-bbbb-bbbb-bbbb', module_name: 'pkg', severity: 'high', title: 't', patched_versions: '>=2', findings: [{ version: '1.5', paths: ['. > b > pkg@1.5'] }] },
    },
  };
  const merged = summarise(raw);
  cases.push(['one advisory seen on two paths counts once', merged.length === 1 && merged[0].installed.length === 2]);
  cases.push(['a non-report answer is refused', (() => { try { summarise({ error: { code: 'ERR' } }); return false; } catch { return true; } })()]);
  cases.push(['an accepted entry needs a reason and a revisit point', acceptedProblems({ 'GHSA-aaaa-aaaa-aaaa': {} }).length === 2]);
  cases.push(['a made-up id is refused', acceptedProblems({ nope: { reason: 'r', revisit: 'v' } }).length === 1]);

  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`  ${pass ? '✓' : '✗'} ${name}`);
    if (!pass) ok = false;
  }
  console.log(`\n${ok ? 'PASS' : 'FAIL'} — ${cases.filter(c => c[1]).length}/${cases.length} checks passed`);
  return ok;
}

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

function show(label: string, advisories: Advisory[]) {
  if (advisories.length === 0) return;
  console.log(`\n${label} (${advisories.length})`);
  for (const a of advisories) {
    console.log(`  ${a.severity.padEnd(9)} ${a.module}@${a.installed.join(',')}  ${a.id}  patched ${a.patched}`);
    console.log(`            ${a.title}`);
    if (a.via) console.log(`            via ${a.via}`);
  }
}

function main(): number {
  if (process.argv.includes('--self-test')) return selfTest() ? 0 : 1;

  const accepted = (JSON.parse(readFileSync(ACCEPTED_PATH, 'utf8')) as { accepted: Record<string, Accepted> }).accepted;
  const malformed = acceptedProblems(accepted);
  if (malformed.length > 0) {
    console.error('scripts/advisories-accepted.json is malformed:');
    for (const problem of malformed) console.error(`  ${problem}`);
    return 1;
  }

  // pnpm audit exits 1 when it finds anything, so the exit status says nothing
  // about whether it could look; the shape of the answer does.
  const run = spawnSync('pnpm', ['audit', '--prod', '--json'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
  let advisories: Advisory[];
  try {
    advisories = summarise(JSON.parse(run.stdout));
  } catch (error) {
    console.error(`The audit did not run: ${(error as Error).message}.`);
    console.error((run.stderr || run.stdout || '(no output)').slice(0, 600));
    return 2;
  }

  const decision = decide(advisories, accepted);
  console.log(`${advisories.length} distinct advisor${advisories.length === 1 ? 'y' : 'ies'} on production dependencies.`);
  show('BLOCKING: critical or high, not accepted', decision.blocking);
  show('Accepted (see scripts/advisories-accepted.json)', decision.acceptedHere);
  show('Moderate and low (never fail)', decision.informational);
  if (decision.stale.length > 0) {
    console.log(`\nWARN accepted but no longer reported, so safe to remove: ${decision.stale.join(', ')}`);
  }

  if (decision.blocking.length > 0) {
    console.log(`\nFAIL — ${decision.blocking.length} advisor${decision.blocking.length === 1 ? 'y' : 'ies'} to fix or accept`);
    // For .github/workflows/dependency-audit.yml, which comments on its issue only when this set changes.
    console.log(`BLOCKING_IDS=${decision.blocking.map(a => a.id).sort().join(',')}`);
    return 1;
  }
  console.log('\nPASS — no unaccepted critical or high advisory');
  return 0;
}

process.exit(main());
