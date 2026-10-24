/**
 * Every offline validator, one after another, the way CI runs them.
 *
 * Run: pnpm validate:all
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The validators are this repo's test suite, but each lived in its own
 * path-filtered workflow, so no single place said "this change is fine".
 * .github/workflows/ci.yml needs one command that means that, and so does a
 * person about to push. A list of validators kept in a workflow is a list
 * somebody forgets to extend, so this reads package.json instead: every
 * `validate:*` script is run, and a new validator is part of the gate the moment
 * it exists.
 *
 * Two are left out on purpose:
 *   validate:all     this script.
 *   validate:schema  reads the built site (.next), so CI runs it after `pnpm build`.
 *
 * A failing validator does not stop the others: the point is the whole list of
 * what is wrong, with the tail of each failure's output. Exit 0 only if every
 * validator passed.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..');
const LEFT_OUT = new Set(['validate:all', 'validate:schema']);
const TAIL_LINES = 25;

const scripts = (JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
const names = Object.keys(scripts).filter(name => name.startsWith('validate:') && !LEFT_OUT.has(name));

if (names.length === 0) {
  console.error('No validate:* scripts found in package.json: refusing to report a pass.');
  process.exit(1);
}

let failed = 0;
const failures: Array<{ name: string; tail: string }> = [];

for (const name of names) {
  const started = Date.now();
  const run = spawnSync('pnpm', ['run', name], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, CI: '1' } });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = run.status === 0;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(26)} ${seconds}s`);
  if (!ok) {
    failed++;
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trimEnd().split('\n');
    failures.push({ name, tail: output.slice(-TAIL_LINES).join('\n') });
  }
}

for (const { name, tail } of failures) {
  console.log(`\n--- ${name} (last ${TAIL_LINES} lines)\n${tail}`);
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${names.length - failed}/${names.length} validators passed`);
process.exit(failed === 0 ? 0 : 1);
