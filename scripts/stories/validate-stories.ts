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

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { EPISODES } from '../../lib/stories';
import type { Episode } from '../../lib/stories/types';
import { N5_KANJI } from '../../lib/constants/n5-kanji';
import { N4_KANJI } from '../../lib/constants/n4-kanji';
import { N3_KANJI } from '../../lib/constants/n3-kanji';
import { N2_KANJI } from '../../lib/constants/n2-kanji';
import { N1_KANJI } from '../../lib/constants/n1-kanji';

const ROOT = resolve(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT, 'public');

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

  // 6. Slug shape. These are URL segments and they are ASCII on purpose, so
  //    nothing in the story routes ever needs encoding.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episode.slug)) {
    fail(episode, `slug "${episode.slug}" is not lowercase-hyphen ASCII`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(episode.publishedAt)) {
    fail(episode, `publishedAt "${episode.publishedAt}" is not an ISO date`);
  }

  // 7. The art exists. A generated data file referencing a panel nobody
  //    imported renders a broken image, and `next build` does not check
  //    `public/` paths.
  for (const panel of episode.panels) {
    if (!existsSync(join(PUBLIC_DIR, panel.art))) {
      fail(episode, `${panel.id} points at ${panel.art}, which is not in public/`);
    }
  }
  if (!existsSync(join(PUBLIC_DIR, episode.ogImage))) {
    fail(episode, `ogImage ${episode.ogImage} is not in public/`);
  }
}

function main(): void {
  if (EPISODES.length === 0) {
    console.log('No episodes registered yet — nothing to validate.');
    return;
  }

  for (const episode of EPISODES) validate(episode);

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
      `${taught.size} kanji taught — 0 issues.`,
  );
}

main();
