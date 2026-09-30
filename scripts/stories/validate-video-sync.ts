/**
 * scripts/stories/validate-video-sync.ts
 *
 *   pnpm validate:video-sync
 *
 * Asserts the rules of `video-sync-core.ts` against fixtures: the four real
 * channel titles, and every way a title must NOT be matched. No network. The
 * sync job commits to main with no human looking, so its matching rule is held
 * to the same standard as the data it writes.
 */
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
  <published>2026-09-28T20:21:57+00:00</published>
  <media:group><media:title>not this one</media:title></media:group>
 </entry>
 <entry>
  <yt:videoId>not-an-id</yt:videoId>
  <title>bad id</title>
  <published>2026-09-01T00:00:00+00:00</published>
 </entry>
</feed>`;
const parsed = parseFeed(feedXml);
eq(parsed.length, 1, 'parseFeed drops an entry with a malformed id');
eq(
  parsed[0],
  { videoId: 'AAAAAAAAAAA', title: 'Read 雨 天 気 & more | Story #3', published: '2026-09-28T20:21:57+00:00' },
  'parseFeed reads id/title/published, decodes entities, ignores media:title',
);
eq(parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>'), [], 'an empty feed is valid');
check(throws(() => parseFeed('<html><body>429 Too Many Requests</body></html>')), 'parseFeed throws on a response that is not a feed');

// --- planning: add-only, earliest wins, never overwrite ------------------------
const v = (videoId: string, title: string, published: string): FeedEntry => ({ videoId, title, published });
const entries = [
  v('LATER_____1', 'Read 山 木 大 | x', '2026-09-20T00:00:00+00:00'),
  v('EARLY_____1', 'Read 山 木 大 | x', '2026-09-10T00:00:00+00:00'),
  v('THREE_____1', 'Read 雨 天 気 | x', '2026-09-11T00:00:00+00:00'),
  v('SECOND____1', 'Read 雨 天 気 | x', '2026-09-12T00:00:00+00:00'),
  v('FOREIGN___1', 'Read 雨 天 犬 | x', '2026-09-13T00:00:00+00:00'),
];
const plan = planSync(entries, fx, {});
eq(plan.additions, { one: 'EARLY_____1', three: 'THREE_____1' }, 'duplicate for one episode: the earliest upload wins');
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
const filled = renderVideosFile(empty, { three: 'THREE_____1', one: 'EARLY_____1' }, fx);
check(filled.startsWith(header), 'the header is kept byte for byte');
eq(
  filled.slice(header.length),
  `export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  'one': { youtubeId: 'EARLY_____1' },\n  'three': { youtubeId: 'THREE_____1' },\n};\n`,
  'entries are written sorted by episode number, one per line',
);
eq(
  parseVideosFile(filled).entries.map(e => [e.slug, e.youtubeId]),
  [
    ['one', 'EARLY_____1'],
    ['three', 'THREE_____1'],
  ],
  'the written file parses back',
);

const withComment = `${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  // fixed by hand: the upload was re-done\n  'three': { youtubeId: 'HANDFIX___1' },\n};\n`;
const merged = renderVideosFile(withComment, { one: 'EARLY_____1' }, fx);
check(
  merged.includes(`  // fixed by hand: the upload was re-done\n  'three': { youtubeId: 'HANDFIX___1' },`),
  'an existing entry and the comment above it survive, unchanged',
);
check(merged.indexOf("'one'") < merged.indexOf("'three'"), 'a new earlier episode sorts above an existing later one');
eq(renderVideosFile(merged, {}, fx), merged, 'rewriting with no additions is a no-op');
check(throws(() => renderVideosFile(withComment, { three: 'OTHER_____1' }, fx)), 'the writer refuses to overwrite an entry');
check(
  throws(() => parseVideosFile(`${header}export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {\n  ...SPREAD,\n};\n`)),
  'a body the writer does not understand is an error, not a silent rewrite',
);

if (issues.length > 0) {
  console.error(`\n${issues.length} issue(s):\n`);
  for (const i of issues) console.error(`  ✗ ${i}`);
  process.exit(1);
}
console.log('video-sync: matching, planning, feed parsing and file rewriting — 0 issues.');
