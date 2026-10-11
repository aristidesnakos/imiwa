/**
 * The rules that decide what Tan Dash asks and what it offers: which kanji the
 * sign asks for, and which decoys roll in beside it. Pure, with the random
 * source passed in, so `pnpm validate:play` replays them over every kanji,
 * world and sign mode and asserts the one promise a learning game cannot
 * break: exactly one tile in a wave answers the sign.
 *
 * Ported from the prototype's chooseOrder / clashes / chooseDecoys. The canvas
 * engine (lib/play/engine.ts) calls these and nothing else to pick content.
 */

import { LOOK_ALIKES } from './signs';
import type { PlayData, PlayKanji } from './types';

export type Rng = () => number;
export type SignMode = 'en' | 'kana';
/** The player's setting: always English, always kana, or a mix once they know a kanji. */
export type SignSetting = 'mix' | 'en' | 'kana';

export interface Order {
  /** The kanji the sign asks for. */
  c: string;
  mode: SignMode;
  /** What the sign shows: the English word or the kana reading. */
  text: string;
}

export function kanjiMap(data: PlayData): Map<string, PlayKanji> {
  return new Map(data.kanji.map(k => [k.c, k]));
}

/** Every kanji unlocked by world `world` (1-based): its own and all before it. */
export function pool(data: PlayData, world: number): string[] {
  return data.worlds.slice(0, world).flatMap(w => w.kanji);
}

/**
 * True when tile `c` would also answer `order`: the target itself, a kanji
 * with the same reading on a kana sign, or a kanji whose meanings include the
 * sign's word on an English sign. Such a tile is never a decoy.
 */
export function clashes(km: Map<string, PlayKanji>, c: string, order: Order): boolean {
  if (c === order.c) return true;
  const k = km.get(c);
  const t = km.get(order.c);
  if (!k || !t) return true;
  if (order.mode === 'kana') return k.readings.includes(order.text) || k.kana === order.text;
  return k.en === order.text || k.meanings.includes(order.text);
}

export interface OrderContext {
  world: number;
  setting: SignSetting;
  /** Times each kanji has been caught this run. */
  seen: ReadonlyMap<string, number>;
  /** Times each kanji has ever been caught in this browser (the Kanji-dex). */
  dex: Readonly<Record<string, number>>;
  /** The previous target, never asked twice in a row. */
  last: string | null;
}

/**
 * Picks the next target: weighted towards kanji caught less this run and
 * doubled for the current world's new kanji. Kana signs only from world 3, and
 * in `mix` only for a kanji the player has already caught, so a reading is
 * never the first thing they meet.
 */
export function chooseOrder(data: PlayData, km: Map<string, PlayKanji>, ctx: OrderContext, rng: Rng): Order {
  const p = pool(data, ctx.world);
  const fresh = new Set(data.worlds[ctx.world - 1]?.kanji ?? []);
  const weights = p.map(
    c => (c === ctx.last && p.length > 1 ? 0 : 1) * (1 / (1 + (ctx.seen.get(c) ?? 0))) * (fresh.has(c) ? 2 : 1),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  let c = p[0];
  for (let i = 0; i < p.length; i++) {
    r -= weights[i];
    if (r <= 0 && weights[i] > 0) {
      c = p[i];
      break;
    }
  }
  const k = km.get(c)!;
  let mode: SignMode = 'en';
  if (ctx.setting === 'kana') mode = 'kana';
  else if (
    ctx.setting === 'mix' &&
    ctx.world >= 3 &&
    ((ctx.seen.get(c) ?? 0) > 0 || (ctx.dex[c] ?? 0) > 0) &&
    rng() < 0.5
  ) {
    mode = 'kana';
  }
  return { c, mode, text: mode === 'en' ? k.en : k.kana };
}

/**
 * Up to `n` decoys from the unlocked pool, none of which answers the sign.
 * From world 2, 60% of waves lead with a look-alike when one is unlocked.
 */
export function chooseDecoys(
  data: PlayData,
  km: Map<string, PlayKanji>,
  order: Order,
  world: number,
  n: number,
  rng: Rng,
): string[] {
  const cand = pool(data, world).filter(c => !clashes(km, c, order));
  const out: string[] = [];
  const look = LOOK_ALIKES[order.c];
  if (world >= 2 && look && rng() < 0.6) {
    const options = [...look].filter(c => cand.includes(c));
    if (options.length) out.push(options[Math.floor(rng() * options.length)]);
  }
  const rest = cand.filter(c => !out.includes(c));
  while (out.length < n && rest.length) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  return out;
}

/** Tiles in a wave: 2 in world 1, then 2-3, then 3-4 from world 4. */
export function waveSize(world: number, rng: Rng): number {
  if (world === 1) return 2;
  if (world < 4) return rng() < 0.5 ? 2 : 3;
  return rng() < 0.6 ? 3 : 4;
}

/** Correct catches that open the next world. */
export const CATCHES_PER_WORLD = 6;
