/**
 * scripts/stories/ship-episode.ts
 *
 *   pnpm stories:ship <ep-number | path-to-strips/ep-NN> [--published YYYY-MM-DD] [--dry-run]
 *
 * Does the mechanical part of putting a new episode on the site, in order, and
 * stops with exact instructions at the parts a program cannot do:
 *
 *   1. import      python3 scripts/stories/import-episode.py  (data file + art)
 *   2. register    lib/stories/index.ts: the import line and the EPISODES entry
 *                  (and drops a matching UPCOMING entry). Skipping this once
 *                  shipped episode 6 as a 404.
 *   3. readings    STOPS if data/stories/readings/ep-NN.ts is missing or not
 *                  registered. A program cannot pick a reading for 十, so a
 *                  person drafts it and the Japanese reviewer checks it.
 *   4. email art   pnpm stories:render-email-panels <slug>
 *   5. validators  validate:stories, validate:subscribe, validate:broadcast
 *
 * then prints what to commit and by when. It never commits, never pushes and
 * never calls Resend: the weekly job books the send (docs/runbooks/newsletter.md).
 * Safe to re-run. A re-import keeps the existing `publishedAt` unless
 * --published says otherwise, so running it again cannot move an episode's date.
 *
 * --dry-run reads and reports, writes nothing. --root <dir> runs against a
 * copy of the repo, which is how this script is tested.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { dayBeforeSendName, formatUtcInstant, nextSendDate, writeByDate } from '../../lib/email/send-schedule';

/** When .github/workflows/weekly-broadcast.yml runs, on the write-by day and the day before the send. */
const JOB_TIME_UTC = '12:07';
/** A run after this on the send day books the following week (MIN_SCHEDULE_LEAD_MINUTES before 13:00). */
const LAST_MANUAL_RUN_UTC = '12:30';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = args.includes('--dry-run');
const ROOT = resolve(flag('--root') ?? join(__dirname, '..', '..'));
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--published' && args[i - 1] !== '--root');
const published = flag('--published');

const say = (s = '') => console.log(s);
const stop = (why: string): never => {
  say(`\nSTOPPED: ${why}`);
  process.exit(1);
};
const rel = (p: string) => p.replace(`${ROOT}/`, '');

if (!target) stop('usage: pnpm stories:ship <ep-number | path-to-strips/ep-NN> [--published YYYY-MM-DD] [--dry-run]');
if (published && !/^\d{4}-\d{2}-\d{2}$/.test(published)) stop(`--published must be YYYY-MM-DD, not ${published}`);

// --- which episode, and where its source is -------------------------------
function resolveEpisodeDir(t: string): string {
  if (!/^\d+$/.test(t)) return resolve(t);
  const name = `ep-${t.padStart(2, '0')}`;
  const roots = [
    process.env.STRIPS_DIR,
    join(homedir(), 'Documents/Claude/Projects/Michikanji/strips'),
    join(ROOT, '..', 'Michikanji', 'strips'),
  ].filter((r): r is string => !!r);
  const hit = roots.map(r => join(r, name)).find(d => existsSync(join(d, 'script.json')));
  return hit ?? stop(`no ${name}/script.json under ${roots.join(' or ')}. Set STRIPS_DIR or pass the directory.`);
}
const epDir = resolveEpisodeDir(target as string);
if (!existsSync(join(epDir, 'script.json'))) stop(`${epDir}/script.json does not exist`);
const script = JSON.parse(readFileSync(join(epDir, 'script.json'), 'utf8')) as { episode: number; slug: string };
const nn = String(script.episode).padStart(2, '0');
const slug = script.slug;
const dataFile = join(ROOT, 'data/stories', `ep-${nn}.ts`);
const readingsFile = join(ROOT, 'data/stories/readings', `ep-${nn}.ts`);
const registry = join(ROOT, 'lib/stories/index.ts');
const readingsRegistry = join(ROOT, 'lib/stories/readings.ts');

say(`Episode ${script.episode}: ${slug}${DRY ? '   (dry run: nothing is written)' : ''}`);
say(`  source ${epDir}\n`);

function run(label: string, cmd: string, cmdArgs: string[]): boolean {
  say(`$ ${cmd} ${cmdArgs.join(' ')}`);
  const ok = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' }).status === 0;
  say(`${ok ? 'ok    ' : 'FAILED'} ${label}\n`);
  return ok;
}

// --- 1. import -------------------------------------------------------------
const existing = existsSync(dataFile) ? /publishedAt: "([^"]+)"/.exec(readFileSync(dataFile, 'utf8'))?.[1] : undefined;
const date = published ?? existing; // undefined: the importer stamps today, correct for a new episode
if (DRY) {
  say(existing
    ? `done   import: ${rel(dataFile)} exists (publishedAt ${existing}); re-importing is safe and keeps that date`
    : `would  import: python3 scripts/stories/import-episode.py ${epDir}${date ? ` --published ${date}` : ''}`);
} else {
  const importArgs = [join(ROOT, 'scripts/stories/import-episode.py'), epDir, ...(date ? ['--published', date] : [])];
  if (!run('import', 'python3', importArgs)) stop('the importer failed; fix what it printed, then re-run.');
}

// --- 2. register -----------------------------------------------------------
const alias = `EP${nn}`;
const importLine = `import { EPISODE as ${alias} } from '../../data/stories/ep-${nn}';`;
let src = readFileSync(registry, 'utf8');
const changes: string[] = [];
if (!src.includes(importLine)) {
  const lastImport = [...src.matchAll(/^import \{ EPISODE as EP\d+ \}.*$/gm)].pop();
  if (!lastImport) stop(`cannot find the EP imports in ${rel(registry)}; add ${alias} by hand`);
  const at = lastImport!.index! + lastImport![0].length;
  src = `${src.slice(0, at)}\n${importLine}${src.slice(at)}`;
  changes.push(`import ${alias}`);
}
const list = /(export const EPISODES: readonly Episode\[\] = \[)([^\]]*)(\];)/.exec(src);
if (!list) stop(`cannot find the EPISODES array in ${rel(registry)}; add ${alias} by hand`);
if (!new RegExp(`\\b${alias}\\b`).test(list![2])) {
  src = src.replace(list![0], `${list![1]}${list![2].replace(/\s*$/, '')}, ${alias}${list![3]}`);
  changes.push('add to EPISODES');
}
const upcoming = new RegExp(`\\n  \\{\\n    number: ${script.episode},[\\s\\S]*?\\n  \\},`);
if (upcoming.test(src)) {
  src = src.replace(upcoming, '').replace(/(UpcomingEpisode\[\] = \[)\s*(\];)/, '$1$2');
  changes.push('remove its UPCOMING entry');
}
if (!changes.length) say(`done   register: ${rel(registry)} already has ${alias}`);
else {
  say(`${DRY ? 'would  ' : 'edited '}register: ${rel(registry)}: ${changes.join(', ')}`);
  if (!DRY) writeFileSync(registry, src);
}

// --- 3. readings: a person's job ------------------------------------------
const readingsRegistered = readFileSync(readingsRegistry, 'utf8').includes(`readings/ep-${nn}'`);
if (!existsSync(readingsFile)) {
  stop(
    `${rel(readingsFile)} does not exist.\n` +
      `  The readings (pronunciation kana, one per line of dialogue) must be drafted and then checked by the\n` +
      `  Japanese reviewer; this script does not generate them, because a program cannot pick a reading for 十.\n` +
      `  Ask Claude to draft it from ${rel(dataFile)}, following the conventions in the header of\n` +
      `  lib/stories/readings.ts and the layout of data/stories/readings/ep-07.ts. Then re-run this command.`
  );
}
if (!readingsRegistered) {
  stop(
    `${rel(readingsFile)} exists but is not registered.\n` +
      `  Add its import (READINGS as R${nn}) and R${nn} to the READINGS array in lib/stories/readings.ts, then re-run.`
  );
}
say(`done   readings: ${rel(readingsFile)} exists and is registered (review status is the Japanese reviewer's call)`);

// --- 4 and 5. email panels, then the validators ---------------------------
const results: [string, boolean | null][] = [];
const step = (label: string, pnpmScript: string, more: string[] = []) => {
  if (DRY) {
    say(`would  run: pnpm ${pnpmScript} ${more.join(' ')}`.trimEnd());
    results.push([label, null]);
  } else results.push([label, run(label, 'pnpm', [pnpmScript, ...more])]);
};
step('render email panels', 'stories:render-email-panels', [slug]);
step('validate:stories', 'validate:stories');
step('validate:subscribe', 'validate:subscribe');
step('validate:broadcast', 'validate:broadcast');

// --- the deadline, from the same module the weekly job uses ----------------
const now = new Date();
const at = (day: string, time: string) => new Date(`${day}T${time}:00Z`);
let sendDay = nextSendDate(now);
if (now > at(sendDay, LAST_MANUAL_RUN_UTC)) sendDay = nextSendDate(new Date(at(sendDay, '00:00').getTime() + 864e5));
const friday = new Date(at(sendDay, '00:00').getTime() - 864e5).toISOString().slice(0, 10);
const writeBy = writeByDate(sendDay);
const tail = now > at(friday, JOB_TIME_UTC)
  ? `Friday's run has already gone: run the Weekly Broadcast workflow by hand before ${sendDay} ${LAST_MANUAL_RUN_UTC} UTC, or it waits a week.`
  : now > at(writeBy, JOB_TIME_UTC)
    ? `Wednesday's run has gone; ${dayBeforeSendName()}'s is the last.`
    : `Landing by ${formatUtcInstant(at(writeBy, JOB_TIME_UTC))} gives the full review window.`;

say('\n--- result ---');
for (const [label, ok] of results) say(`${ok === null ? 'skipped' : ok ? 'ok     ' : 'FAILED '} ${label}`);
const failed = results.some(([, ok]) => ok === false);
say(`
Next, by hand:
  1. Commit and push to main: data/stories/ep-${nn}.ts, data/stories/readings/ep-${nn}.ts, lib/stories/index.ts,
     lib/stories/readings.ts, public/stories/${slug}/ (webp, jpg, og.jpg and e1..e6.jpg).
  2. Push by ${formatUtcInstant(at(writeBy, JOB_TIME_UTC))} (write-by) or ${formatUtcInstant(at(friday, JOB_TIME_UTC))} (the last
     scheduled run) to be booked for ${sendDay} 13:00 UTC. ${tail}
  3. The job books an episode only once /stories/${slug} answers 200 in production, so wait for the deploy.
  4. Look at the email first: pnpm email:preview ${slug} --local
If another episode is already booked, this one waits for the Saturday after.
${DRY ? 'Dry run: nothing above has been done.' : 'Nothing was committed, pushed or sent.'}`);
process.exit(failed ? 1 : 0);
