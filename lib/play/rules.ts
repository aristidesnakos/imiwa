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
 * Picks the next target. Every unlocked kanji is asked once before any is asked
 * a second time, then twice, and so on: the candidates are the ones caught
 * fewest times this run (a kanji the player missed has been caught zero times,
 * so it comes round again before a repeat), never the previous target, and the
 * current world's new kanji count double. Until 2026-10-12 a catch only
 * halved a kanji's weight, so a kanji just caught came back about as often as
 * one the player had not met, and 77% of first-world runs asked a caught kanji
 * again while others were still unmet. The one repeat that cannot be avoided
 * is world 1, which has 5 kanji and opens the next world after 6 catches.
 *
 * Kana signs only from world 3, and in `mix` only for a kanji the player has
 * already caught, so a reading is never the first thing they meet.
 */
export function chooseOrder(data: PlayData, km: Map<string, PlayKanji>, ctx: OrderContext, rng: Rng): Order {
  const p = pool(data, ctx.world);
  const fresh = new Set(data.worlds[ctx.world - 1]?.kanji ?? []);
  const caught = (c: string) => ctx.seen.get(c) ?? 0;
  const eligible = p.length > 1 ? p.filter(c => c !== ctx.last) : p;
  const fewest = Math.min(...eligible.map(caught));
  const bag = eligible.filter(c => caught(c) === fewest);
  const weights = bag.map(c => (fresh.has(c) ? 2 : 1));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  let c = bag[bag.length - 1];
  for (let i = 0; i < bag.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      c = bag[i];
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

// ---------------------------------------------------------------------------
// The lane: where tiles may sit relative to stumps and gold boxes
// ---------------------------------------------------------------------------

/** The rows a tile can sit on: the ground, mid-air, high (a double jump). */
export type LaneRow = 'g' | 'm' | 'h';

/** Game pixels two things in the lane keep between their left edges, so neither is drawn over the other. */
export const LANE_PAD = 34;

/**
 * The run-up a ground tile needs behind a stump: room to clear it and land on
 * the tile. A jump lasts 0.73 s, and a tile sitting on the ground is touched
 * (and caught) the moment Tan is within 15px of the floor, which a jump over
 * a stump only is again as it lands. Replaying the engine's jump against a
 * stump and then a ground tile, the window of jump timings that catches the
 * tile without touching the stump is
 *
 *   gap (px)     0     20     34     48     63     80
 *   at 72 px/s   0.13s 0.34s  0.40s  0.40s  0.40s  0.40s
 *   at 158 px/s  0.07s 0.17s  0.25s  0.34s  0.43s  0.54s
 *
 * so the old 34px was a coin flip at full speed, and 0 (a tile on the stump)
 * was a lost heart. 40% of the speed keeps at least 0.42 s at every speed.
 */
export function runUp(speed: number): number {
  return Math.max(48, Math.round(speed * 0.4));
}

/**
 * True when a stump at `stumpX` and a tile at `tileX` in `row` cannot both be
 * played: the tile is drawn over the stump, or it is a ground tile with no room
 * to clear the stump first. A stump just after a tile is fine (catch, then jump).
 * `speed` is the run's current speed in game px/s.
 */
export function stumpBlocksTile(stumpX: number, tileX: number, row: LaneRow, speed: number): boolean {
  const ahead = tileX - stumpX; // > 0: the stump reaches Tan first
  if (Math.abs(ahead) < LANE_PAD) return true;
  return row === 'g' && ahead > 0 && ahead < runUp(speed);
}

/** True when a stump at `stumpX` leaves every tile and gold box in the lane playable and undrawn-over. */
export function stumpFits(
  stumpX: number,
  tiles: readonly { x: number; row: LaneRow }[],
  powers: readonly number[],
  speed: number,
): boolean {
  return (
    !tiles.some(t => stumpBlocksTile(stumpX, t.x, t.row, speed)) && !powers.some(px => Math.abs(px - stumpX) < LANE_PAD)
  );
}

/** A tile's place in a wave: its offset from the first tile and its row. */
export interface LaneSlot {
  dx: number;
  row: LaneRow;
}

/**
 * Where a wave's first tile goes: `from` if no tile of the wave would sit on a
 * stump or a gold box, otherwise the first x to the right of `from` where none
 * does. Moving the whole wave keeps its spacing, and only ever delays it by
 * the width of the obstacle. Both lists hold x positions in the lane, which
 * are all at or left of the spawn point, so the search ends.
 */
export function placeWave(
  slots: readonly LaneSlot[],
  stumps: readonly number[],
  powers: readonly number[],
  speed: number,
  from: number,
): number {
  const blocked = (x0: number) =>
    slots.some(
      s =>
        stumps.some(sx => stumpBlocksTile(sx, x0 + s.dx, s.row, speed)) ||
        powers.some(px => Math.abs(x0 + s.dx - px) < LANE_PAD),
    );
  let x = from;
  while (blocked(x)) x++;
  return x;
}
