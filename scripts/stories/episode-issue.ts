/**
 * scripts/stories/episode-issue.ts
 *
 *   pnpm stories:episode-issue <n> [--title T] [--slug S] [--theme T] [--focus "百 千"]
 *                                  [--release YYYY-MM-DD] [--dry-run]
 *   pnpm stories:episode-issue --next [--dry-run] [--max-unshipped 2]
 *   pnpm stories:episode-status <n> [--now ISO] [--body-file F [--comments-file F]]
 *
 * The approval ledger for one episode in production: one GitHub issue per
 * episode, titled `Episode N production: <title>`, labelled `episode-production`,
 * whose body is a checklist the owner ticks from his phone and whose fields the
 * scheduled tasks read. The body format is specified in
 * docs/runbooks/weekly-episode.md ("The approval issue"); this file is the only
 * writer and the only parser of it.
 *
 *   create   Idempotent: if an issue for that episode exists (any state) nothing
 *            is created. Title, theme and focus kanji come from strips/season-01.json
 *            when that file is on this machine (STRIPS_DIR, or the default strips
 *            folder), else from the flags, else the title falls back to `Episode N`.
 *            --next picks the episode itself: the highest of the registered
 *            episodes and every production issue, plus one, never past 14 (used by
 *            .github/workflows/episode-production-issue.yml). --dry-run prints the
 *            title and body and creates nothing (it tries the duplicate check, and
 *            says so if it could not).
 *   status   Prints JSON: the checkbox states, the fields, the deadlines and what
 *            the Short-variant gate resolves to right now. Exit 0 if the issue
 *            exists, 2 if it does not.
 *
 * Talks to GitHub only through the `gh` CLI (argv arrays, never a shell string),
 * so it needs `gh auth login` locally or GH_TOKEN in CI, and nothing else. JSON
 * goes to stdout, commentary to stderr, so the output can be piped.
 *
 * scripts/ is not typechecked by the build: check this file by hand after an edit.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import config from '../../config';
import { writeByDate } from '../../lib/email/send-schedule';

// --- the schedule, in one place ------------------------------------------

/** Episode 8 releases Sat 2026-10-10 (owner, 2026-09-30); every later episode is one week on. */
const ANCHOR_EPISODE = 8;
const ANCHOR_RELEASE = '2026-10-10';
const SEASON_LAST = 14;
const LABEL = 'episode-production';
const SCHEMA = 'episode-production/v1';
/** The Short-variant gate falls back to the default this long after the ask. */
const SHORT_GATE_HOURS = 24;
const SHORT_VARIANTS = ['c', 'd'] as const;
const SHORT_DEFAULT = 'c';
const VARIANT_LABELS: Record<string, string> = {
  c: 'C (cosy acoustic bed)',
  d: 'D (calm pentatonic bed)',
};
/** Marker a scheduled task puts in the comment that asks for the Short-variant pick. The latest one starts the 24 h clock. */
const SHORT_GATE_MARKER = '<!-- gate: short -->';

const DAY_MS = 86_400_000;

// --- argv ----------------------------------------------------------------

const args = process.argv.slice(2);
const cmd = args[0] && !args[0].startsWith('--') && !/^\d+$/.test(args[0]) ? args[0] : undefined;
const rest = cmd ? args.slice(1) : args;
const flag = (name: string): string | undefined => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const has = (name: string) => rest.includes(name);
const VALUE_FLAGS = ['--title', '--slug', '--theme', '--focus', '--release', '--max-unshipped', '--now', '--body-file', '--comments-file'];
const positional = rest.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(rest[i - 1] ?? ''));

const log = (s = '') => console.error(s);
const out = (o: unknown) => console.log(JSON.stringify(o, null, 2));
const die = (why: string, code = 1): never => {
  console.error(`episode-issue: ${why}`);
  process.exit(code);
};

const ROOT = resolve(__dirname, '..', '..');

// --- dates ---------------------------------------------------------------

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day: string) => new Date(`${day}T00:00:00Z`).getTime();
const atUtc = (day: string, hhmm: string) => `${day}T${hhmm}:00Z`;
const addDays = (day: string, n: number) => isoDay(dayMs(day) + n * DAY_MS);

export function releaseSaturday(episode: number): string {
  return addDays(ANCHOR_RELEASE, 7 * (episode - ANCHOR_EPISODE));
}

/** Everything a scheduled task needs to know is due, derived from the release Saturday. */
export function deadlines(release: string) {
  const sendTime = config.newsletter.sendTimeUtc;
  return {
    buildWeek: addDays(release, -12), // the Monday of the week the episode is built
    japaneseDue: atUtc(addDays(release, -11), '12:00'), // Tuesday of the build week
    artDue: atUtc(addDays(release, -10), '12:00'), // Wednesday of the build week
    shipBy: atUtc(writeByDate(release), '12:07'), // Wednesday before the release: the weekly job's first run
    shortUploadBy: atUtc(addDays(release, -1), '18:00'), // Friday before the release
    releaseAt: atUtc(release, sendTime), // Saturday: email and Short
  };
}

// --- the body: the one format ---------------------------------------------

export interface Meta {
  episode: number;
  slug: string;
  title: string;
  theme: string;
  focus: string;
  release: string;
}

export function issueTitle(m: Pick<Meta, 'episode' | 'title'>): string {
  return `Episode ${m.episode} production: ${m.title}`;
}

export function buildBody(m: Meta): string {
  const d = deadlines(m.release);
  const fields: [string, string][] = [
    ['episode', String(m.episode)],
    ['slug', m.slug || 'pending'],
    ['title', m.title],
    ['theme', m.theme || 'pending'],
    ['focus', m.focus || 'pending'],
    ['release', m.release],
    ['release-at', d.releaseAt],
    ['build-week', d.buildWeek],
    ['japanese-due', d.japaneseDue],
    ['art-due', d.artDue],
    ['ship-by', d.shipBy],
    ['short-upload-by', d.shortUploadBy],
    ['short-default', SHORT_DEFAULT.toUpperCase()],
    ['short-gate-hours', String(SHORT_GATE_HOURS)],
    ['short-release', 'default'],
  ];
  const variantLines = SHORT_VARIANTS.map(
    v => `- [ ] Short variant ${VARIANT_LABELS[v]} <!-- key: short-variant-${v} -->`
  );
  return [
    `<!-- ${SCHEMA} -->`,
    `Production ledger for **Episode ${m.episode}: ${m.title}**, released **${m.release}** (Saturday, 13:00 UTC: the email and the YouTube Short).`,
    `Runbook: \`docs/runbooks/weekly-episode.md\`. Tick the boxes below from your phone; the scheduled tasks read them.`,
    '',
    '### Approvals',
    '',
    `- [ ] Japanese reviewed (script + readings) <!-- key: japanese -->`,
    `- [ ] Art approved <!-- key: art -->`,
    '',
    `**Short variant: pick one** (no pick within ${SHORT_GATE_HOURS} h of the ask means ${SHORT_DEFAULT.toUpperCase()}). To move the Short's date, edit \`short-release\` below to an ISO time such as \`2026-10-09T13:00Z\`.`,
    '',
    ...variantLines,
    '',
    '### Fields',
    '',
    '```episode-fields',
    ...fields.map(([k, v]) => `${k}: ${v}`),
    '```',
    '',
    `_Opened by \`scripts/stories/episode-issue.ts\`. Do not rename the checkbox keys in the comments; the text in front of them may be edited freely._`,
  ].join('\n');
}

const CHECKBOX = /^[ \t]*[-*] \[([ xX])\] (.*?)[ \t]*<!--[ \t]*key:[ \t]*([a-z0-9-]+)[ \t]*-->[ \t]*$/gm;
const FIELDS_BLOCK = /```episode-fields[ \t]*\r?\n([\s\S]*?)```/;

export interface ParsedBody {
  checkboxes: Record<string, boolean>;
  fields: Record<string, string>;
  problems: string[];
}

export function parseBody(body: string): ParsedBody {
  const problems: string[] = [];
  const checkboxes: Record<string, boolean> = {};
  for (const m of body.matchAll(CHECKBOX)) {
    const key = m[3];
    if (key in checkboxes) problems.push(`checkbox key "${key}" appears more than once`);
    checkboxes[key] = m[1].toLowerCase() === 'x';
  }
  for (const key of ['japanese', 'art', ...SHORT_VARIANTS.map(v => `short-variant-${v}`)]) {
    if (!(key in checkboxes)) problems.push(`checkbox key "${key}" is missing (its <!-- key: ${key} --> comment was edited away?)`);
  }
  const fields: Record<string, string> = {};
  const block = FIELDS_BLOCK.exec(body);
  if (!block) problems.push('the ```episode-fields block is missing');
  else {
    for (const line of block[1].split(/\r?\n/)) {
      const m = /^([a-z0-9-]+):[ \t]*(.*?)[ \t]*$/.exec(line);
      if (m) fields[m[1]] = m[2];
    }
  }
  return { checkboxes, fields, problems };
}

// --- status ---------------------------------------------------------------

interface Comment {
  body: string;
  createdAt: string;
}

export function computeStatus(
  body: string,
  comments: Comment[],
  now: Date,
  issue: { number: number; url: string; state: string; title: string } | null
) {
  const parsed = parseBody(body);
  const { checkboxes, fields, problems } = parsed;
  const episode = Number(fields['episode']);
  if (!Number.isInteger(episode)) problems.push('field "episode" is missing or not a number');

  const ticked = SHORT_VARIANTS.filter(v => checkboxes[`short-variant-${v}`]);
  const picked = ticked.length === 1 ? ticked[0] : null;
  const conflict = ticked.length > 1;
  if (conflict) problems.push(`more than one Short variant is ticked (${ticked.join(', ')}); untick all but one`);

  const hours = Number(fields['short-gate-hours']) || SHORT_GATE_HOURS;
  const fallback = (fields['short-default'] || SHORT_DEFAULT).toLowerCase();
  const asks = comments
    .filter(c => c.body.includes(SHORT_GATE_MARKER))
    .map(c => c.createdAt)
    .sort();
  const gateOpenedAt = asks.length ? asks[asks.length - 1] : null;
  const defaultsAt = gateOpenedAt ? new Date(new Date(gateOpenedAt).getTime() + hours * 3_600_000).toISOString() : null;
  let effective: string | null = null;
  let source: 'owner' | 'default' | 'pending' = 'pending';
  if (picked) {
    effective = picked;
    source = 'owner';
  } else if (defaultsAt && now.getTime() >= new Date(defaultsAt).getTime()) {
    effective = fallback;
    source = 'default';
  }

  const releaseAt = fields['release-at'] ?? null;
  const shortRaw = fields['short-release'] ?? 'default';
  let shortReleaseAt = releaseAt;
  let shortReleaseSource: 'default' | 'owner' = 'default';
  if (shortRaw && shortRaw !== 'default') {
    const t = new Date(shortRaw);
    if (Number.isNaN(t.getTime())) problems.push(`short-release "${shortRaw}" is not "default" or an ISO time; using the release time`);
    else {
      shortReleaseAt = t.toISOString();
      shortReleaseSource = 'owner';
    }
  }

  const due = (key: string) => {
    const v = fields[key];
    if (!v) return null;
    const t = new Date(v);
    if (Number.isNaN(t.getTime())) {
      problems.push(`field "${key}" is not a time: ${v}`);
      return null;
    }
    return { at: t.toISOString(), overdue: now.getTime() > t.getTime() };
  };

  return {
    schema: SCHEMA,
    now: now.toISOString(),
    episode: Number.isInteger(episode) ? episode : null,
    issue,
    fields,
    approvals: {
      japanese: !!checkboxes['japanese'],
      art: !!checkboxes['art'],
    },
    shortVariant: { picked, conflict, effective, source, gateOpenedAt, defaultsAt },
    shortRelease: { at: shortReleaseAt, source: shortReleaseSource },
    deadlines: {
      japanese: due('japanese-due'),
      art: due('art-due'),
      ship: due('ship-by'),
      shortUpload: due('short-upload-by'),
      release: due('release-at'),
    },
    checkboxes,
    problems,
  };
}

// --- gh -------------------------------------------------------------------

function gh(ghArgs: string[], input?: string): { ok: boolean; stdout: string; stderr: string } {
  const r = spawnSync('gh', ghArgs, { encoding: 'utf8', input, env: process.env });
  if (r.error) return { ok: false, stdout: '', stderr: String(r.error.message) };
  return { ok: r.status === 0, stdout: r.stdout ?? '', stderr: (r.stderr ?? '').trim() };
}

interface IssueRow {
  number: number;
  title: string;
  state: string;
  url: string;
}

const titleHead = (n: number) => new RegExp(`^Episode ${n} production\\b`);

/** Every production issue, any state. `ok: false` when gh could not answer. */
function listProductionIssues(): { ok: boolean; why?: string; rows: IssueRow[] } {
  const r = gh(['issue', 'list', '--label', LABEL, '--state', 'all', '--limit', '200', '--json', 'number,title,state,url']);
  if (!r.ok) return { ok: false, why: r.stderr || 'gh failed', rows: [] };
  try {
    return { ok: true, rows: JSON.parse(r.stdout) as IssueRow[] };
  } catch {
    return { ok: false, why: 'gh returned something that is not JSON', rows: [] };
  }
}

/** Episode numbers in `EPISODES` in lib/stories/index.ts (the registry). */
function registeredEpisodes(): number[] {
  const src = readFileSync(join(ROOT, 'lib/stories/index.ts'), 'utf8');
  const list = /export const EPISODES: readonly Episode\[\] = \[([^\]]*)\]/.exec(src);
  if (!list) die('cannot find the EPISODES array in lib/stories/index.ts');
  return [...list![1].matchAll(/EP(\d+)/g)].map(m => Number(m[1]));
}

interface SeasonEntry {
  n: number;
  slug: string;
  theme_en: string;
  theme_ja: string;
  focus: string[];
}

function seasonEntry(n: number): SeasonEntry | null {
  // STRIPS_DIR, when set, is the only place looked in (an explicit override, and the seam a test uses).
  const roots = process.env.STRIPS_DIR
    ? [process.env.STRIPS_DIR]
    : [join(homedir(), 'Documents/Claude/Projects/Michikanji/strips'), join(ROOT, '..', 'Michikanji', 'strips')];
  const file = roots.map(r => join(r, 'season-01.json')).find(f => existsSync(f));
  if (!file) return null;
  try {
    const season = JSON.parse(readFileSync(file, 'utf8')) as { episodes: SeasonEntry[] };
    return season.episodes.find(e => e.n === n) ?? null;
  } catch {
    return null;
  }
}

// --- create ---------------------------------------------------------------

function create() {
  const dry = has('--dry-run');
  let n = positional ? Number(positional) : NaN;
  const listed = listProductionIssues();

  if (has('--next')) {
    if (!listed.ok) {
      if (!dry) die(`cannot list the production issues (${listed.why}); refusing to guess the next episode`);
      log(`note: could not list issues (${listed.why}); --next is computed from the registry alone`);
    }
    const issueNumbers = listed.rows
      .map(r => /^Episode (\d+) production\b/.exec(r.title)?.[1])
      .filter((x): x is string => !!x)
      .map(Number);
    const registered = registeredEpisodes();
    const highest = Math.max(0, ...registered, ...issueNumbers);
    n = highest + 1;
    const unshipped = issueNumbers.filter(i => !registered.includes(i)).length;
    const cap = Number(flag('--max-unshipped') ?? 2);
    if (n > SEASON_LAST) return out({ action: 'skipped', reason: `the season has ${SEASON_LAST} episodes and ${highest} exist or are in production`, episode: null });
    if (unshipped >= cap) {
      return out({
        action: 'skipped',
        reason: `${unshipped} production issues are for episodes not yet registered (cap ${cap}): production is that far behind, so no more are opened`,
        episode: n,
      });
    }
  }
  if (!Number.isInteger(n) || n < 1) die('usage: episode-issue <n> | --next   (see the header of this file)');
  if (n > SEASON_LAST) die(`episode ${n} is past the season (${SEASON_LAST})`);

  const season = seasonEntry(n);
  const meta: Meta = {
    episode: n,
    slug: flag('--slug') ?? season?.slug ?? '',
    title: flag('--title') ?? season?.theme_en ?? `Episode ${n}`,
    theme: flag('--theme') ?? season?.theme_ja ?? '',
    focus: flag('--focus') ?? (season ? season.focus.join(' ') : ''),
    release: flag('--release') ?? releaseSaturday(n),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.release)) die(`--release must be YYYY-MM-DD, not ${meta.release}`);
  if (new Date(`${meta.release}T00:00:00Z`).getUTCDay() !== config.newsletter.sendDay) {
    die(`${meta.release} is not a send day (config.newsletter.sendDay is ${config.newsletter.sendDay})`);
  }
  const title = issueTitle(meta);
  const body = buildBody(meta);
  const source = season ? 'strips/season-01.json' : has('--title') ? 'flags' : 'fallback (no season file on this machine, no --title)';

  const dup = listed.rows.find(r => titleHead(n).test(r.title));
  if (dup) return out({ action: 'exists', episode: n, number: dup.number, state: dup.state, url: dup.url, title: dup.title });

  if (dry) {
    return out({
      action: 'dry-run',
      episode: n,
      title,
      label: LABEL,
      metaSource: source,
      duplicateCheck: listed.ok ? 'no existing issue' : `skipped: ${listed.why}`,
      body,
    });
  }
  if (!listed.ok) die(`cannot check for an existing issue (${listed.why}); refusing to create a possible duplicate`);

  // `gh issue create --label X` hard-fails on a label that does not exist. Create it on demand; ignore "already exists".
  gh(['label', 'create', LABEL, '--color', '0E8A16', '--description', 'Weekly episode production ledger']);
  const r = gh(['issue', 'create', '--title', title, '--label', LABEL, '--body-file', '-'], body);
  if (!r.ok) die(`gh issue create failed: ${r.stderr}`);
  const url = r.stdout.trim().split('\n').pop() ?? '';
  out({ action: 'created', episode: n, number: Number(url.split('/').pop()), url, title });
}

// --- status ---------------------------------------------------------------

function status() {
  const n = positional ? Number(positional) : NaN;
  const now = flag('--now') ? new Date(flag('--now') as string) : new Date();
  if (Number.isNaN(now.getTime())) die(`--now is not a time: ${flag('--now')}`);

  const bodyFile = flag('--body-file');
  if (bodyFile) {
    const comments: Comment[] = flag('--comments-file') ? JSON.parse(readFileSync(flag('--comments-file') as string, 'utf8')) : [];
    return out(computeStatus(readFileSync(bodyFile, 'utf8'), comments, now, null));
  }
  if (!Number.isInteger(n)) die('usage: episode-status <n> [--now ISO] [--body-file F [--comments-file F]]');

  const listed = listProductionIssues();
  if (!listed.ok) die(`cannot list the production issues: ${listed.why}`);
  const hits = listed.rows.filter(r => titleHead(n).test(r.title)).sort((a, b) => a.number - b.number);
  if (!hits.length) {
    out({ schema: SCHEMA, episode: n, issue: null, problems: [`no "Episode ${n} production" issue exists; run: pnpm stories:episode-issue ${n}`] });
    process.exit(2);
  }
  const r = gh(['issue', 'view', String(hits[0].number), '--json', 'number,title,state,url,body,comments']);
  if (!r.ok) die(`gh issue view failed: ${r.stderr}`);
  const j = JSON.parse(r.stdout) as { number: number; title: string; state: string; url: string; body: string; comments: { body: string; createdAt: string }[] };
  const st = computeStatus(j.body, j.comments, now, { number: j.number, url: j.url, state: j.state, title: j.title });
  if (hits.length > 1) st.problems.push(`more than one production issue matches episode ${n} (${hits.map(h => `#${h.number}`).join(', ')}); using #${hits[0].number}`);
  out(st);
}

if (require.main === module) {
  const command = cmd ?? 'create';
  if (command === 'create') create();
  else if (command === 'status') status();
  else die(`unknown command "${command}" (create | status)`);
}
