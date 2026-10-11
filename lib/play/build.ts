/**
 * Builds Tan Dash's data from the N5 list, the readings layer and the stories
 * registry. SERVER ONLY: it imports the N5 data and every episode. Call it in a
 * server component and pass the result to the island as a prop; importing this
 * from a client component puts both into the /play bundle.
 *
 * Relative imports, not `@/`, so `pnpm validate:play` can run it under tsx
 * from scripts/ (the reason lib/stories/index.ts does the same).
 */

import { N5_KANJI } from '../constants/n5-kanji';
import { kanjiReadings } from '../romaji/readings';
import { EPISODES } from '../stories';
import { EXTRA_WORLDS, PLAY_SIGNS } from './signs';
import type { PlayData, PlayKanji, PlayWorld } from './types';

function playKanji(): PlayKanji[] {
  return N5_KANJI.map(entry => {
    const sign = PLAY_SIGNS[entry.kanji];
    if (!sign) throw new Error(`lib/play/signs.ts has no sign for N5 kanji ${entry.kanji}`);
    const r = kanjiReadings(entry);
    const readings = [...new Set(r.all.flatMap(x => [x.kana, x.kanaFull]).filter(Boolean))];
    const meanings = entry.meaning
      .split(',')
      .map(m => m.trim().toLowerCase())
      .filter(Boolean);
    return { c: entry.kanji, en: sign.en, kana: sign.kana, meanings, readings };
  });
}

/**
 * Episodes first, in `number` order (never `publishedAt`, CLAUDE.md), each
 * adding its focus kanji not already taught; then the game-only worlds with
 * every kanji an episode has since taught removed. A kanji is in exactly one
 * world. Throws if any N5 kanji is left out, so a gap fails the build rather
 * than shipping a game that never asks for it.
 */
function playWorlds(n5: ReadonlySet<string>): PlayWorld[] {
  const used = new Set<string>();
  const worlds: PlayWorld[] = [];
  const take = (kanji: readonly string[]) => {
    const fresh = kanji.filter(c => n5.has(c) && !used.has(c));
    fresh.forEach(c => used.add(c));
    return fresh;
  };

  for (const ep of [...EPISODES].sort((a, b) => a.number - b.number)) {
    const kanji = take(ep.focusKanji);
    if (kanji.length) {
      worlds.push({ n: worlds.length + 1, title: ep.titleEn, titleJa: ep.titleJa, kanji, episodeSlug: ep.slug });
    }
  }
  for (const extra of EXTRA_WORLDS) {
    const kanji = take(extra.kanji);
    if (kanji.length) {
      worlds.push({ n: worlds.length + 1, title: extra.title, titleJa: extra.titleJa, kanji, episodeSlug: null });
    }
  }

  const missing = [...n5].filter(c => !used.has(c));
  if (missing.length) {
    throw new Error(`Tan Dash worlds leave out N5 kanji: ${missing.join(' ')}. Add them to EXTRA_WORLDS in lib/play/signs.ts.`);
  }
  return worlds;
}

export function buildPlayData(): PlayData {
  const kanji = playKanji();
  return { kanji, worlds: playWorlds(new Set(kanji.map(k => k.c))) };
}

/** For the page copy: how many worlds are episodes. */
export function episodeWorldCount(data: PlayData): number {
  return data.worlds.filter(w => w.episodeSlug).length;
}
