/**
 * scripts/stories/validate-video-sync.ts
 *
 *   pnpm validate:video-sync
 *
 * Asserts the rules of `video-sync-core.ts` against fixtures: the four real
 * channel titles, and every way a title must NOT be matched. No network. The
 * sync job commits to main with no human looking, so its matching rule is held
 * to the same standard as the data it writes. Also asserts the job's schedule
 * (see the end of this file).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import config from '../../config';
import { EPISODES } from '../../lib/stories';
import {
  matchEpisode,
  parseFeed,
  parseVideosFile,
  planSync,
  renderVideosFile,
  titleKanji,
  type FeedEntry,
  type SyncEpisode,
  type VideoAspect,
} from './video-sync-core';

const issues: string[] = [];
function check(cond: boolean, msg: string): void {
  if (!cond) issues.push(msg);
}
function eq(actual: unknown, expected: unknown, msg: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) issues.push(`${msg}: expected ${e}, got ${a}`);
}
function throws(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

// --- the registry: matching only works if focus kanji stay unambiguous ------
const real: SyncEpisode[] = EPISODES.map(e => ({ slug: e.slug, number: e.number, focusKanji: e.focusKanji }));
for (const e of real) {
  const m = matchEpisode(`N5 Kanji Quiz: Can You Read ${e.focusKanji.slice(0, 3).join(' ')}? | x`, real);
  check(
    m.kind === 'matched' && m.slug === e.slug,
    `registry: the first three focus kanji of ${e.slug} do not identify it alone (${JSON.stringify(m)}); ` +
      'another episode shares them, so a video titled that way would be skipped as ambiguous',
  );
}

// --- the four real titles ----------------------------------------------------
const real4: Array<[string, string]> = [
  ['N5 Kanji Quiz: Can You Read 雨 天 気 休 日? | Japanese Story for Beginners #4', 'a-rainy-day-off'],
  ['N5 Kanji Quiz: Can You Read 学 校 先 生 語? | Japanese Story for Beginners #3', 'tan-goes-to-school'],
  ['N5 Kanji Quiz: Can You Read 川 水 下 小 白? | Japanese Story for Beginners #2', 'tan-finds-the-river'],
  ['N5 Kanji Quiz: Can You Read 山 木 上 見 大? | Japanese Story for Beginners', 'tan-climbs-the-mountain'],
];
for (const [title, slug] of real4) {
  const m = matchEpisode(title, real);
  check(m.kind === 'matched' && m.slug === slug, `real title "${title}" should match ${slug}, got ${JSON.stringify(m)}`);
}

// --- synthetic registry for the refusals -------------------------------------
const fx: SyncEpisode[] = [
  { slug: 'one', number: 1, focusKanji: [...'山木上見大'] },
  { slug: 'two', number: 2, focusKanji: [...'山木上見小'] },
  { slug: 'three', number: 3, focusKanji: [...'雨天気休日'] },
];
const kind = (title: string) => matchEpisode(title, fx);

eq(kind('Read 雨 天 気 | Story'), { kind: 'matched', slug: 'three' }, 'a 3-kanji subset of one episode matches it');
check(kind('Read 雨 天 気 犬 | Story').kind === 'unmatched', 'a foreign kanji is skipped');
check(kind('Read 山 木 上 | Story').kind === 'unmatched', 'a set inside two episodes is skipped');
check(kind('Read 山 木 大 | Story').kind === 'matched', 'a set that only one episode holds matches');
check(kind('Read 雨 天 | Story').kind === 'unmatched', 'fewer than 3 kanji is skipped');
check(kind('Read 雨 | Story').kind === 'unmatched', 'one kanji is skipped');
check(kind('No kanji at all | Story').kind === 'unmatched', 'no kanji is skipped');
check(kind('Read 雨 | 天 気 休 日').kind === 'unmatched', 'kanji after the "|" do not count');
check(kind('Read 雨 天 天 天 | x').kind === 'unmatched', 'repeats do not inflate the count');
check(kind('雨天気 - a story with no bar').kind === 'matched', 'a title with no "|" is read whole');
eq(titleKanji('N5 Quiz 雨 天 気 休 日? | 学校'), [...'雨天気休日'], 'titleKanji reads only the head, deduplicated');

// --- the feed -----------------------------------------------------------------
const feedXml = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Channel</title>
 <published>2026-09-16T09:16:47+00:00</published>
 <entry>
  <id>yt:video:AAAAAAAAAAA</id>
  <yt:videoId>AAAAAAAAAAA</yt:videoId>
  <title>Read 雨 天 気 &amp; more | Story #3</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/AAAAAAAAAAA"/>
  <published>2026-09-28T20:21:57+00:00</published>
  <media:group><media:title>not this one</media:title></media:group>
 </entry>
 <entry>
  <yt:videoId>BBBBBBBBBBB</yt:videoId>
  <title>A horizontal upload</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=BBBBBBBBBBB"/>
  <published>2026-09-27T00:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>CCCCCCCCCCC</yt:videoId>
  <title>A short, href before rel</title>
  <link href="https://www.youtube.com/shorts/CCCCCCCCCCC" rel="alternate"/>
  <published>2026-09-26T00:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>DDDDDDDDDDD</yt:videoId>
  <title>No link at all</title>
  <published>2026-09-25T00:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>not-an-id</yt:videoId>
  <title>bad id</title>
  <published>2026-09-01T00:00:00+00:00</published>
 </entry>
</feed>`;
const parsed = parseFeed(feedXml);
eq(parsed.length, 4, 'parseFeed drops an entry with a malformed id');
eq(
  parsed[0],
  {
    videoId: 'AAAAAAAAAAA',
    title: 'Read 雨 天 気 & more | Story #3',
    published: '2026-09-28T20:21:57+00:00',
    aspect: 'portrait',
  },
  'parseFeed reads id/title/published, decodes entities, ignores media:title, and marks a /shorts/ link portrait',
);
eq(
  parsed.map(p => [p.videoId, p.aspect]),
  [
    ['AAAAAAAAAAA', 'portrait'],
    ['BBBBBBBBBBB', 'landscape'],
    ['CCCCCCCCCCC', 'portrait'],
    ['DDDDDDDDDDD', 'landscape'],
  ],
  'aspect: /shorts/ is portrait (either attribute order); /watch?v= or no link is landscape',
);
eq(parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>'), [], 'an empty feed is valid');
check(throws(() => parseFeed('<html><body>429 Too Many Requests</body></html>')), 'parseFeed throws on a response that is not a feed');

// --- planning: add-only, earliest wins, never overwrite ------------------------
const v = (videoId: string, title: string, published: string, aspect?: VideoAspect): FeedEntry => ({
  videoId,
  title,
  published,
  aspect,
});
const entries = [
  v('LATER_____1', 'Read 山 木 大 | x', '2026-09-20T00:00:00+00:00'),
  v('EARLY_____1', 'Read 山 木 大 | x', '2026-09-10T00:00:00+00:00', 'portrait'),
  v('THREE_____1', 'Read 雨 天 気 | x', '2026-09-11T00:00:00+00:00', 'landscape'),
  v('SECOND____1', 'Read 雨 天 気 | x', '2026-09-12T00:00:00+00:00'),
  v('FOREIGN___1', 'Read 雨 天 犬 | x', '2026-09-13T00:00:00+00:00'),
];
const plan = planSync(entries, fx, {});
eq(
  plan.additions,
  { one: { youtubeId: 'EARLY_____1', aspect: 'portrait' }, three: { youtubeId: 'THREE_____1', aspect: 'landscape' } },
  'duplicate for one episode: the earliest upload wins, and its aspect comes with it',
);
eq(
  planSync([v('NOASPECT__1', 'Read 雨 天 気 | x', '2026-09-11T00:00:00+00:00')], fx, {}).additions,
  { three: { youtubeId: 'NOASPECT__1', aspect: 'landscape' } },
  'an entry with no aspect is landscape',
);
check(plan.report.some(l => l.startsWith('duplicate:') && l.includes('LATER_____1')), 'the later duplicate is reported');
check(plan.report.some(l => l.startsWith('duplicate:') && l.includes('SECOND____1')), 'a second upload for another episode is reported');
check(plan.report.some(l => l.startsWith('unmatched:') && l.includes('FOREIGN___1')), 'an unmatched title is reported, not mapped');

const hand = planSync(entries, fx, { three: { youtubeId: 'HANDFIX___1' } });
check(!('three' in hand.additions), 'an existing entry is never overwritten (a hand fix sticks)');
check(hand.report.some(l => l.startsWith('kept: three')), 'the kept entry is reported');
const idTaken = planSync([v('EARLY_____1', 'Read 山 木 大 | x', '2026-09-10T00:00:00+00:00')], fx, {
  two: { youtubeId: 'EARLY_____1' },
});
eq(idTaken.additions, {}, 'an id already mapped to another episode is never mapped twice');
eq(planSync([], fx, {}).additions, {}, 'no videos, no additions');

// --- rewriting the file ---------------------------------------------------------
const header = `/** doc comment with 'quotes': { youtubeId: 'x' }, kept verbatim */
export interface EpisodeVideo {
  youtubeId: string;
}

`;
const empty = `${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {};\n`;
const filled = renderVideosFile(
  empty,
  {
    three: { youtubeId: 'THREE_____1', aspect: 'landscape' },
    one: { youtubeId: 'EARLY_____1', aspect: 'portrait' },
  },
  fx,
);
check(filled.startsWith(header), 'the header is kept byte for byte');
eq(
  filled.slice(header.length),
  `export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  'one': { youtubeId: 'EARLY_____1', aspect: 'portrait' },\n  'three': { youtubeId: 'THREE_____1' },\n};\n`,
  'entries are written sorted by episode number, one per line; portrait adds aspect, landscape (the default) writes none',
);
eq(
  parseVideosFile(filled).entries.map(e => [e.slug, e.youtubeId, e.aspect]),
  [
    ['one', 'EARLY_____1', 'portrait'],
    ['three', 'THREE_____1', undefined],
  ],
  'the written file parses back',
);

const withComment = `${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  // fixed by hand: the upload was re-done\n  'three': { youtubeId: 'HANDFIX___1' },\n};\n`;
const merged = renderVideosFile(withComment, { one: { youtubeId: 'EARLY_____1', aspect: 'landscape' } }, fx);
check(
  merged.includes(`  // fixed by hand: the upload was re-done\n  'three': { youtubeId: 'HANDFIX___1' },`),
  'an existing entry and the comment above it survive, unchanged',
);
check(merged.indexOf("'one'") < merged.indexOf("'three'"), 'a new earlier episode sorts above an existing later one');
eq(renderVideosFile(merged, {}, fx), merged, 'rewriting with no additions is a no-op');
check(
  throws(() => renderVideosFile(withComment, { three: { youtubeId: 'OTHER_____1', aspect: 'portrait' } }, fx)),
  'the writer refuses to overwrite an entry',
);

// An existing line's aspect (set by hand, in any of its three states) survives a
// rewrite byte for byte: the sync never edits an entry it did not create.
const aspects = `${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  'one': { youtubeId: 'ONE_______1', aspect: 'landscape' },\n  'two': { youtubeId: 'TWO_______1', aspect: 'portrait' },\n  'three': { youtubeId: 'THREE_____1' },\n};\n`;
eq(renderVideosFile(aspects, {}, fx), aspects, 'explicit landscape, portrait and no aspect all survive a no-op rewrite');
eq(
  parseVideosFile(aspects).entries.map(e => e.aspect),
  ['landscape', 'portrait', undefined],
  'parseVideosFile reads the aspect of each line',
);
const aspectHand = planSync(
  [v('FEEDSHORT_1', 'Read 雨 天 気 | x', '2026-09-11T00:00:00+00:00', 'portrait')],
  fx,
  { three: { youtubeId: 'HANDFIX___1' } },
);
eq(aspectHand.additions, {}, 'a Short in the feed does not change the aspect of an episode that already has a line');
check(
  renderVideosFile(aspects, { ...aspectHand.additions }, fx).includes("'three': { youtubeId: 'THREE_____1' },"),
  'a line with no aspect stays without one',
);
check(
  throws(() => parseVideosFile(`${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  ...SPREAD,\n};\n`)),
  'a body the writer does not understand is an error, not a silent rewrite',
);

// --- the schedule ----------------------------------------------------------------
// YouTube's feed endpoint is down for hours every day: 00:35-07:00 UTC when
// measured from a GitHub runner on 2026-10-07, every feed URL at once (the
// workflow header has the numbers). A cron inside it fails nearly every day, as
// 05:17 did. It must also run after the Saturday release (the Short goes public
// at the newsletter send time), or a Short waits a day to be linked. The outage
// bound keeps an hour of margin each side. If the outage moves, re-measure it and
// move both this window and the cron.
const OUTAGE_UTC = { from: '00:35', to: '07:00' };
const MARGIN_MINUTES = 60;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** What is wrong with one cron line of the sync job; empty when nothing is. */
function scheduleProblems(cron: string, releaseUtc: string): string[] {
  const [min, hour, dom, month, dow] = cron.trim().split(/\s+/);
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour) || dom !== '*' || month !== '*' || dow !== '*') {
    return [`'${cron}' must run daily at one fixed minute and hour`];
  }
  const at = Number(hour) * 60 + Number(min);
  const clock = `${hour.padStart(2, '0')}:${min.padStart(2, '0')} UTC`;
  const problems: string[] = [];
  // The window plus its margins, on a 24-hour circle (it may start before midnight).
  const from = minutes(OUTAGE_UTC.from) - MARGIN_MINUTES;
  const span = minutes(OUTAGE_UTC.to) + MARGIN_MINUTES - from;
  if ((at - from + 1440) % 1440 <= span) {
    problems.push(`${clock} is within an hour of YouTube's daily feed outage (${OUTAGE_UTC.from}-${OUTAGE_UTC.to} UTC)`);
  }
  if (at <= minutes(releaseUtc)) {
    problems.push(`${clock} is not after the Saturday release (${releaseUtc} UTC), so a Short would wait a day`);
  }
  return problems;
}

eq(scheduleProblems('17 14 * * *', '13:00'), [], 'schedule: 14:17 is clear of the outage and after a 13:00 release');
check(scheduleProblems('17 5 * * *', '13:00').length === 2, 'schedule: 05:17 (the old slot) is refused');
check(scheduleProblems('50 23 * * *', '13:00').length === 1, 'schedule: 23:50 is refused, the margin crosses midnight');
check(scheduleProblems('30 7 * * *', '13:00').length === 2, 'schedule: 07:30 is refused, inside the margin');
check(scheduleProblems('30 8 * * *', '13:00').length === 1, 'schedule: 08:30 clears the outage but precedes the release');
check(scheduleProblems('0 13 * * *', '13:00').length === 1, 'schedule: running at the release minute is too early');
check(scheduleProblems('*/30 * * * *', '13:00').length === 1, 'schedule: a non-daily cron is refused');

const workflow = readFileSync(resolve(__dirname, '../../.github/workflows/sync-story-videos.yml'), 'utf8');
const crons = [...workflow.matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map(m => m[1]);
check(crons.length > 0, 'schedule: no cron found in .github/workflows/sync-story-videos.yml');
for (const cron of crons) {
  for (const p of scheduleProblems(cron, config.newsletter.sendTimeUtc)) issues.push(`schedule: ${p}`);
}

if (issues.length > 0) {
  console.error(`\n${issues.length} issue(s):\n`);
  for (const i of issues) console.error(`  ✗ ${i}`);
  process.exit(1);
}
console.log(`video-sync: matching, planning, feed parsing, file rewriting and the schedule (${crons.join(', ')}) — 0 issues.`);
