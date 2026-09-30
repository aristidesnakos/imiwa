/**
 * scripts/stories/validate-stories.ts
 *
 * CI entry point:  pnpm validate:stories
 *
 * This repo has no unit test runner; correctness lives in targeted validators,
 * each guarding one subsystem's contract. This is the stories one, and its job
 * is to turn the rules in `episode-spec.md` from a document someone remembers
 * to follow into a build failure.
 *
 * The highest-value assertion here is the first one: every kanji in the
 * dialogue is on the N5 list. That is the promise the whole `/stories` section
 * makes to a beginner — "you can read all of this" — and it is also the rule
 * most likely to slip at 11pm when an episode is being written. The strip
 * pipeline's own `validate.py` checks it before the art is generated; this
 * checks it again after the import, because the two can diverge (a script edit
 * that never got re-imported, a hand-edit of a generated file) and the site is
 * what the reader sees.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { EPISODES, UPCOMING } from '../../lib/stories';
import type { Episode, EpisodeReadings } from '../../lib/stories/types';
import { EPISODE_VIDEOS } from '../../data/stories/videos';
import {
  YOUTUBE_ID_RE,
  videoForSlug,
  videoObjectJsonLd,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from '../../lib/stories/videos';
import { READINGS, readingsForSlug } from '../../lib/stories/readings';
import { isKanaSubsequence, readingProblems } from '../../lib/stories/reading-check';
import { N5_KANJI } from '../../lib/constants/n5-kanji';
import { N4_KANJI } from '../../lib/constants/n4-kanji';
import { N3_KANJI } from '../../lib/constants/n3-kanji';
import { N2_KANJI } from '../../lib/constants/n2-kanji';
import { N1_KANJI } from '../../lib/constants/n1-kanji';

const ROOT = resolve(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'data', 'stories');
const ART_DIR = join(PUBLIC_DIR, 'stories');

const N5 = new Set(N5_KANJI.map(k => k.kanji));
const ALL_LEVELS = new Set(
  [...N5_KANJI, ...N4_KANJI, ...N3_KANJI, ...N2_KANJI, ...N1_KANJI].map(k => k.kanji),
);

/** CJK Unified Ideographs. Kana and punctuation are not level-gated. */
const KANJI_RE = /[一-鿿]/gu;

const issues: string[] = [];

function fail(episode: Episode, message: string): void {
  issues.push(`ep-${String(episode.number).padStart(2, '0')} (${episode.slug}): ${message}`);
}

function validate(episode: Episode): void {
  // 1. Strict N5 — the whole promise, mechanised.
  for (const panel of episode.panels) {
    for (const line of panel.lines) {
      for (const char of line.ja.match(KANJI_RE) ?? []) {
        if (!N5.has(char)) {
          fail(episode, `${panel.id} uses ${char}, which is not on the N5 list: "${line.ja}"`);
        }
      }
    }
  }

  // 2. Every line has both halves. The paired object makes drift impossible;
  //    this catches a blank, which it cannot.
  for (const panel of episode.panels) {
    if (panel.lines.length === 0) fail(episode, `${panel.id} has no lines`);
    for (const line of panel.lines) {
      if (!line.ja.trim()) fail(episode, `${panel.id} has a line with no Japanese`);
      if (!line.en.trim()) fail(episode, `${panel.id}: "${line.ja}" has no translation`);
    }
  }

  // 3. Bubble geometry stays on the panel. Percentages, so this is arithmetic
  //    rather than a render — an x+w over 100 is text hanging off the art, and
  //    at 1080px in the social export it is text hanging off the canvas.
  for (const panel of episode.panels) {
    for (const line of panel.lines) {
      const { x, y, w, tail } = line.bubble;
      if (x < 0 || y < 0 || w <= 0) fail(episode, `${panel.id}: bubble has a negative dimension`);
      if (x + w > 100) fail(episode, `${panel.id}: bubble runs off the right edge (${x}+${w})`);
      if (y > 92) fail(episode, `${panel.id}: bubble starts below the panel (y=${y})`);
      if (tail !== null && tail !== 'bl' && tail !== 'br') {
        fail(episode, `${panel.id}: unknown tail ${String(tail)}`);
      }
      // Narration is not speech. The distinction is carried entirely by a null
      // tail, so a `narration` line with a tail would render as someone talking.
      if (line.speaker === 'narration' && tail !== null) {
        fail(episode, `${panel.id}: narration must have no tail`);
      }
      if (line.speaker !== 'narration' && tail === null) {
        fail(episode, `${panel.id}: ${line.speaker} speaks, so the bubble needs a tail`);
      }
      // An aimed tail must stay on the bubble's straight bottom edge; past 8–92
      // it slides onto the rounded corner and floats.
      const { tailX } = line.bubble;
      if (tailX !== undefined) {
        if (tail === null) fail(episode, `${panel.id}: tailX set on a bubble with no tail`);
        if (!(tailX >= 8 && tailX <= 92)) fail(episode, `${panel.id}: tailX ${tailX} must lie in 8–92`);
      }
    }
  }

  // 4. Targets: 3–5 words, each linking one real character.
  if (episode.targets.length < 3 || episode.targets.length > 5) {
    fail(episode, `has ${episode.targets.length} target words; the format wants 3–5`);
  }
  for (const target of episode.targets) {
    if ([...target.kanji].length !== 1) {
      fail(episode, `target ${target.word} links "${target.kanji}", which is not one code point`);
    } else if (!ALL_LEVELS.has(target.kanji)) {
      // A link to a character with no page is a 404 in our own internal
      // linking, which is the one thing these pages are built to produce.
      fail(episode, `target ${target.word} links ${target.kanji}, which has no kanji page`);
    }
    if (!target.word.includes(target.kanji)) {
      fail(episode, `target ${target.word} does not contain the character it links (${target.kanji})`);
    }
    if (!episode.focusKanji.includes(target.kanji)) {
      fail(episode, `target ${target.word} links ${target.kanji}, which is not a focus kanji`);
    }
  }

  // 5. Quiz: three questions, an answer that indexes a real option, and no
  //    duplicate options — a distractor identical to the answer makes the
  //    question unanswerable rather than hard.
  if (episode.quiz.length !== 3) {
    fail(episode, `has ${episode.quiz.length} quiz questions; the card holds 3`);
  }
  episode.quiz.forEach((q, i) => {
    if (q.options.length < 2) fail(episode, `quiz ${i + 1} has fewer than two options`);
    if (q.answer < 0 || q.answer >= q.options.length) {
      fail(episode, `quiz ${i + 1}: answer index ${q.answer} is outside its options`);
    }
    if (new Set(q.options).size !== q.options.length) {
      fail(episode, `quiz ${i + 1} repeats an option`);
    }
    if (!q.askEn.trim()) fail(episode, `quiz ${i + 1} has no English question`);
  });

  // 5b. The answers are not all in the same position.
  //
  //     Every question in all six season-one scripts was authored with the
  //     correct option written first, which is the natural way to write one and
  //     produces a card answerable without reading a word of it. A learner
  //     notices that faster than we would, and the quiz is the one thing on the
  //     page claiming to test them. Position is not difficulty, so this asserts
  //     only that the episode does not hand out a single rule that solves it.
  if (episode.quiz.length > 1 && new Set(episode.quiz.map(q => q.answer)).size === 1) {
    fail(
      episode,
      `every quiz answer is option ${episode.quiz[0].answer + 1} — the card is ` +
        `guessable without reading it. Vary the position in script.json and re-import.`,
    );
  }

  // 6. Slug shape. These are URL segments and they are ASCII on purpose, so
  //    nothing in the story routes ever needs encoding.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episode.slug)) {
    fail(episode, `slug "${episode.slug}" is not lowercase-hyphen ASCII`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(episode.publishedAt)) {
    fail(episode, `publishedAt "${episode.publishedAt}" is not an ISO date`);
  } else if (episode.publishedAt > new Date().toISOString().slice(0, 10)) {
    // A future date does not hold an episode back — nothing gates on it, and
    // `dynamicParams = false` means the page is prerendered the moment it is in
    // the registry. What it does is put a future `lastmod` in the sitemap and a
    // future `datePublished` in the JSON-LD for a page that is already live,
    // which is a claim we cannot support. Order comes from `number`; the date
    // only ever records when the thing actually went up.
    fail(episode, `publishedAt "${episode.publishedAt}" is in the future, but the page is already live`);
  }

  // 7. The art exists. A generated data file referencing a panel nobody
  //    imported renders a broken image, and `next build` does not check
  //    `public/` paths.
  for (const panel of episode.panels) {
    if (!existsSync(join(PUBLIC_DIR, panel.art))) {
      fail(episode, `${panel.id} points at ${panel.art}, which is not in public/`);
    }
    const emailArt = panel.art.replace(/\.webp$/, '.jpg');
    if (!existsSync(join(PUBLIC_DIR, emailArt))) {
      fail(episode, `${panel.id} email art ${emailArt} is not in public/`);
    }
  }
  if (!existsSync(join(PUBLIC_DIR, episode.ogImage))) {
    fail(episode, `ogImage ${episode.ogImage} is not in public/`);
  }

  // 8. The email's bubbled panels. The weekly email shows e1..eN.jpg, the art
  //    with its bubbles baked in, because a mail client cannot lay text over an
  //    image. Nothing else notices a missing one: the email would go out with
  //    a broken image. Made by `pnpm stories:render-email-panels <slug>`.
  validateReadings(episode);

  episode.panels.forEach((_, i) => {
    const file = `e${i + 1}.jpg`;
    const path = join(ART_DIR, episode.slug, file);
    if (!existsSync(path)) {
      fail(
        episode,
        `email panel stories/${episode.slug}/${file} is missing; run pnpm stories:render-email-panels ${episode.slug}`,
      );
    } else if (statSync(path).size > EMAIL_PANEL_MAX_BYTES) {
      fail(
        episode,
        `email panel ${file} is ${Math.round(statSync(path).size / 1024)} kB, over the ${EMAIL_PANEL_MAX_BYTES / 1024} kB cap`,
      );
    }
  });
}

/**
 * 9. Readings. Every line has authored pronunciation kana (the romaji line in
 *    the email and on the page is derived from it), and it agrees with the
 *    dialogue. Only the Japanese reviewer can say a reading is right; this
 *    catches the ones that are plainly not.
 */
function validateReadings(episode: Episode): void {
  for (const problem of readingProblems(episode, readingsForSlug(episode.slug))) {
    fail(episode, `readings: ${problem}`);
  }
}

/**
 * A check nobody has seen fail is not known to work: feed the reading check
 * fixtures that are each wrong in one way and require that every one is caught,
 * and that a correct one passes.
 */
function selfTestReadingCheck(): void {
  const episode = EPISODES[0];
  if (!episode) return;
  const good = readingsForSlug(episode.slug);
  if (!good) return; // reported per episode
  const clone = (mutate: (panels: Record<string, string[]>) => void): EpisodeReadings => {
    const panels = JSON.parse(JSON.stringify(good.panels)) as Record<string, string[]>;
    mutate(panels);
    return { slug: good.slug, panels };
  };
  const firstPanel = episode.panels[0].id;
  const fixtures: [string, EpisodeReadings | undefined][] = [
    ['no readings file', undefined],
    ['a missing panel', clone(p => delete p[firstPanel])],
    ['an extra panel', clone(p => (p.P99 = ['あ']))],
    ['a missing line', clone(p => p[firstPanel].pop())],
    ['a kanji left in', clone(p => (p[firstPanel][0] = '大きい やまです。'))],
    ['Latin letters', clone(p => (p[firstPanel][0] = 'おおきい yama|です。'))],
    ['a dropped kana', clone(p => (p[firstPanel][0] = p[firstPanel][0].replace('です', '')))],
    // Only kana the dialogue spells out can be checked: a wrong reading of a
    // kanji (やま for 山 written かわ) is for the reviewer, not for this.
    ['a changed kana', clone(p => (p[firstPanel][0] = p[firstPanel][0].replace('です', 'だす')))],
  ];
  for (const [what, readings] of fixtures) {
    if (readingProblems(episode, readings).length === 0) {
      issues.push(`the readings check did not catch a fixture with ${what}`);
    }
  }
  if (readingProblems(episode, good).length > 0) {
    issues.push('the readings check rejected the real readings of the first episode');
  }
  // The particle rewrites it must accept: は~わ, へ~え, を~お.
  const accepts: [string, string][] = [
    ['タンは うちへ 行きます。', 'タン|わ うち|え いきます。'],
    ['ごはんを たべます。', 'ごはん|お たべます。'],
  ];
  for (const [ja, reading] of accepts) {
    if (!isKanaSubsequence(ja, reading)) issues.push(`the readings check rejected "${reading}" for "${ja}"`);
  }
}

/** An email panel is a 1040px JPEG; the render script aims under 150 kB. */
const EMAIL_PANEL_MAX_BYTES = 200 * 1024;

/**
 * The disk against the registry. Every other check reads EPISODES, so an
 * episode that never made it into the list is invisible to all of them — and
 * that is how episode 6 shipped: its data file and art were committed, the
 * import line in lib/stories/index.ts was not, this validator stayed green,
 * and `/stories/tans-family-and-friends` was a 404 in production while the hub
 * went on listing it as coming soon.
 *
 * Reading the disk is right here and only here: the `fs` trap the registry
 * documents is about site code under Next's file tracing, and this is a script.
 */
function validateRegistryCoversDisk(): void {
  const dataFiles = existsSync(DATA_DIR)
    ? readdirSync(DATA_DIR).filter(f => /^ep-.*\.ts$/.test(f)).sort()
    : [];
  for (const file of dataFiles) {
    // `require`, not a regex over the source, and through the same module cache
    // the registry used: a registered file hands back the very object EPISODES
    // holds, so identity is the registration test. A file nobody imports, or a
    // stale copy of one that is, loads fresh and is not in the list.
    const { EPISODE: episode } = require(join(DATA_DIR, file)) as { EPISODE?: Episode };
    if (!episode) {
      issues.push(`data/stories/${file} does not export EPISODE`);
      continue;
    }
    // The importer names the file from the number it writes into it, so any
    // other name is a hand rename or a stale copy, not an episode to register.
    const expected = `ep-${String(episode.number).padStart(2, '0')}.ts`;
    if (file !== expected) {
      issues.push(
        `data/stories/${file} exports episode ${episode.number}, which the importer names ${expected}`,
      );
    } else if (!EPISODES.includes(episode)) {
      issues.push(
        `data/stories/${file} is not in EPISODES — import it in lib/stories/index.ts, ` +
          `or /stories/${episode.slug} is a 404`,
      );
    }
  }

  // Directories only. Finder leaves a .DS_Store at this level, and a file is
  // not an episode's art; nothing else legitimately lives here.
  const slugs = new Set(EPISODES.map(e => e.slug));
  const artDirs = existsSync(ART_DIR)
    ? readdirSync(ART_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    : [];
  for (const dir of artDirs) {
    if (!slugs.has(dir)) {
      issues.push(
        `public/stories/${dir}/ belongs to no registered episode — register its episode in ` +
          `lib/stories/index.ts, or the art ships with no page`,
      );
    }
  }
}

/** A readings file the registry does not import, or one for no episode, is dead weight that looks done. */
function validateReadingsCoverDisk(): void {
  const dir = join(DATA_DIR, 'readings');
  const files = existsSync(dir) ? readdirSync(dir).filter(f => /^ep-\d+\.ts$/.test(f)) : [];
  const expected = new Set(READINGS.map(r => EPISODES.find(e => e.slug === r.slug)).map(e => e && `ep-${String(e.number).padStart(2, '0')}.ts`));
  for (const file of files) {
    if (!expected.has(file)) {
      issues.push(`data/stories/readings/${file} is not imported by lib/stories/readings.ts (or matches no episode)`);
    }
  }
  for (const reading of READINGS) {
    if (!EPISODES.some(e => e.slug === reading.slug)) {
      issues.push(`readings for "${reading.slug}" match no registered episode`);
    }
  }
}

/**
 * Companion videos (`data/stories/videos.ts`). The empty map is valid: most
 * episodes will never have one. What it must not hold is an id that cannot be a
 * YouTube id (the page would embed a dead player), a slug no episode owns (a
 * video attached to nothing, invisibly), or one id on two episodes.
 *
 * Also replays the VideoObject builder against a fixture, because with an empty
 * map nothing else ever runs it: a typo in it would first show up the day the
 * first real id is added.
 */
function validateVideos(): void {
  const slugs = new Set(EPISODES.map(e => e.slug));
  const owner = new Map<string, string>();
  for (const [slug, video] of Object.entries(EPISODE_VIDEOS)) {
    if (!slugs.has(slug)) {
      issues.push(`videos: "${slug}" is not a registered episode slug`);
    }
    if (typeof video?.youtubeId !== 'string' || !YOUTUBE_ID_RE.test(video.youtubeId)) {
      issues.push(
        `videos: ${slug} has youtubeId ${JSON.stringify(video?.youtubeId)}, which is not 11 characters of [A-Za-z0-9_-] ` +
          `(the id only, not a URL)`,
      );
      continue;
    }
    // Optional; absent means landscape. Anything else would silently render as
    // landscape (videoForSlug falls back), so a typo in it must fail here.
    if (video.aspect !== undefined && video.aspect !== 'portrait' && video.aspect !== 'landscape') {
      issues.push(
        `videos: ${slug} has aspect ${JSON.stringify(video.aspect)}; it must be 'portrait', 'landscape' or omitted`,
      );
    }
    const other = owner.get(video.youtubeId);
    if (other) issues.push(`videos: ${video.youtubeId} is attached to both ${other} and ${slug}`);
    owner.set(video.youtubeId, slug);
  }

  // Fixture: the same builder the page calls, with a real-looking id injected
  // for the duration of the check.
  const episode = EPISODES[0];
  if (!episode) return;
  const FIXTURE_ID = 'dQw4w9WgXcQ';
  const pageUrl = `https://example.test/stories/${episode.slug}`;
  const had = Object.prototype.hasOwnProperty.call(EPISODE_VIDEOS, episode.slug);
  const saved = EPISODE_VIDEOS[episode.slug];
  try {
    if (!had) EPISODE_VIDEOS[episode.slug] = { youtubeId: FIXTURE_ID };
    const id = EPISODE_VIDEOS[episode.slug].youtubeId;
    const node = videoObjectJsonLd(episode, pageUrl);
    // The aspect: resolved by the lookup, and it picks the thumbnail. Replayed for
    // both shapes whatever the real map holds.
    const shaped = (aspect: 'portrait' | 'landscape' | undefined) => {
      EPISODE_VIDEOS[episode.slug] = { youtubeId: id, aspect };
      return { video: videoForSlug(episode.slug), node: videoObjectJsonLd(episode, pageUrl) };
    };
    const shapeProblem = (msg: string) => issues.push(`videos: aspect fixture: ${msg}`);
    const omitted = shaped(undefined);
    if (omitted.video?.aspect !== 'landscape') shapeProblem('an entry with no aspect must resolve to landscape');
    const wide = shaped('landscape');
    if (wide.video?.aspect !== 'landscape') shapeProblem("aspect 'landscape' must resolve to landscape");
    const tall = shaped('portrait');
    if (tall.video?.aspect !== 'portrait') shapeProblem("aspect 'portrait' must resolve to portrait");
    if (youtubeThumbnailUrl(id, 'landscape') !== `https://i.ytimg.com/vi/${id}/hqdefault.jpg`) {
      shapeProblem('the landscape thumbnail is not hqdefault');
    }
    if (youtubeThumbnailUrl(id, 'portrait') !== `https://i.ytimg.com/vi/${id}/oar2.jpg`) {
      shapeProblem('the portrait thumbnail is not the portrait oar2 frame');
    }
    if ((tall.node?.thumbnailUrl as string[] | undefined)?.[0] !== youtubeThumbnailUrl(id, 'portrait')) {
      shapeProblem('a portrait video\'s VideoObject must carry the portrait thumbnail');
    }
    if ((wide.node?.thumbnailUrl as string[] | undefined)?.[0] !== youtubeThumbnailUrl(id, 'landscape')) {
      shapeProblem('a landscape video\'s VideoObject must carry the landscape thumbnail');
    }
    if (had) EPISODE_VIDEOS[episode.slug] = saved;
    else EPISODE_VIDEOS[episode.slug] = { youtubeId: FIXTURE_ID };
    const problem = (msg: string) => issues.push(`videos: VideoObject fixture: ${msg}`);
    if (!node) {
      problem('builder returned nothing for a mapped episode');
      return;
    }
    if (node['@type'] !== 'VideoObject') problem('@type is not VideoObject');
    if (node['@id'] !== `${pageUrl}#video`) problem('@id is not <page>#video');
    if (node.uploadDate !== episode.publishedAt) problem('uploadDate is not the episode publishedAt');
    if (
      node.embedUrl !== youtubeEmbedUrl(id) ||
      !String(node.embedUrl).startsWith('https://www.youtube-nocookie.com/embed/')
    ) {
      problem('embedUrl is not the youtube-nocookie embed');
    }
    const thumbs = node.thumbnailUrl;
    const aspect = videoForSlug(episode.slug)?.aspect;
    if (!Array.isArray(thumbs) || thumbs[0] !== youtubeThumbnailUrl(id, aspect)) {
      problem('thumbnailUrl is not the ytimg thumbnail');
    }
    if (!String(node.name ?? '').trim() || !String(node.description ?? '').trim()) {
      problem('name or description is empty');
    }
  } finally {
    if (had) EPISODE_VIDEOS[episode.slug] = saved;
    else delete EPISODE_VIDEOS[episode.slug];
  }
  if (!had && videoObjectJsonLd(episode, pageUrl) !== undefined) {
    issues.push('videos: an episode with no mapped video must yield no VideoObject');
  }
}

function main(): void {
  // First, and before the early return: an empty registry with episode files
  // on disk is the episode 6 failure in its most complete form.
  validateRegistryCoversDisk();

  if (EPISODES.length === 0 && issues.length === 0) {
    console.log('No episodes registered yet — nothing to validate.');
    return;
  }

  for (const episode of EPISODES) validate(episode);
  selfTestReadingCheck();
  validateReadingsCoverDisk();
  validateVideos();

  // Cross-episode rules. Slugs are URLs and numbers are the season's spine, so
  // a collision in either is a routing bug rather than a content one.
  const slugs = new Map<string, number>();
  for (const e of EPISODES) {
    if (slugs.has(e.slug)) issues.push(`slug "${e.slug}" is used by episodes ${slugs.get(e.slug)} and ${e.number}`);
    slugs.set(e.slug, e.number);
  }

  const numbers = EPISODES.map(e => e.number).sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i + 1) issues.push(`episode numbers are not contiguous from 1: saw ${numbers.join(', ')}`);
  });

  // The season calendar's no-repeat rule: a character is *taught* once. It may
  // appear again in later dialogue — that is revision, and it is the point —
  // but two episodes claiming to teach the same character means the season no
  // longer partitions the level, and `check_season.py` upstream would have
  // been lying.
  const taught = new Map<string, number>();
  for (const e of EPISODES) {
    for (const t of e.targets) {
      const owner = taught.get(t.kanji);
      if (owner !== undefined) {
        issues.push(`${t.kanji} is taught by both episode ${owner} and episode ${e.number}`);
      } else {
        taught.set(t.kanji, e.number);
      }
    }
  }

  // The coming-soon list. It renders on the hub, so it is content, and the one
  // way it goes wrong is silently: an episode is imported and its placeholder
  // is left behind, so the hub advertises an episode it is already linking to.
  const published = new Set(EPISODES.map(e => e.number));
  const seen = new Set<number>();
  for (const u of UPCOMING) {
    if (published.has(u.number)) {
      issues.push(
        `episode ${u.number} is both published and listed as upcoming — ` +
          `delete its entry from UPCOMING in lib/stories/index.ts`,
      );
    }
    if (seen.has(u.number)) issues.push(`episode ${u.number} is listed twice in UPCOMING`);
    seen.add(u.number);
    if (!u.titleEn.trim() || !u.titleJa.trim()) {
      issues.push(`upcoming episode ${u.number} is missing a title`);
    }
    if (u.teaches.length === 0) {
      issues.push(`upcoming episode ${u.number} lists no words — the card would be a bare title`);
    }
  }

  // Published and upcoming together are one contiguous season. A gap means an
  // episode number nothing accounts for, which is the same defect the published
  // contiguity check catches, one list over.
  if (UPCOMING.length > 0) {
    const all = [...published, ...seen].sort((a, b) => a - b);
    all.forEach((n, i) => {
      if (n !== i + 1) {
        issues.push(
          `published and upcoming episodes do not form a contiguous season: saw ${all.join(', ')}`,
        );
      }
    });
  }

  const panels = EPISODES.reduce((n, e) => n + e.panels.length, 0);
  const lines = EPISODES.reduce(
    (n, e) => n + e.panels.reduce((m, p) => m + p.lines.length, 0),
    0,
  );

  if (issues.length > 0) {
    console.error(`\n${issues.length} issue(s):\n`);
    for (const issue of issues) console.error(`  ✗ ${issue}`);
    console.error('\nSee lib/stories/types.ts and docs/prd/episode-spec.md.');
    process.exit(1);
  }

  console.log(
    `${EPISODES.length} episode(s), ${panels} panels, ${lines} lines, ` +
      `${taught.size} kanji taught, ${UPCOMING.length} upcoming — 0 issues.`,
  );
}

main();
