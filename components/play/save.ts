/**
 * Tan Dash's progress in this browser: best score, games played, the Kanji-dex
 * (times each kanji was ever caught), the daily streak and the three options.
 * Stored under PLAY_STORAGE_KEY (`mk-play`), the prototype's `tandash.v1` shape
 * under the site's key.
 *
 * CLAUDE.md, "No server-side user state": a stored blob is shape-checked on
 * read and NEVER overwritten or deleted when it is not recognised. An
 * unrecognised blob (a later version's, or a hand edit) means this page plays
 * with defaults and writes nothing for the rest of the page view. Every access
 * is wrapped, because storage throws in some private modes and when full.
 */

import { localDay, PLAY_STORAGE_KEY } from '@/lib/play/measure';
import type { Speed } from '@/lib/play/engine';
import type { SignSetting } from '@/lib/play/rules';

export interface PlayOptions {
  speed: Speed;
  sign: SignSetting;
  sound: boolean;
}

export interface PlaySave {
  best: number;
  games: number;
  dex: Record<string, number>;
  /** `last` is the local day (YYYY-MM-DD) of the last finished run, '' before any. */
  streak: { last: string; n: number };
  opt: PlayOptions;
}

export const DEFAULT_SAVE: PlaySave = {
  best: 0,
  games: 0,
  dex: {},
  streak: { last: '', n: 0 },
  opt: { speed: 'normal', sign: 'mix', sound: true },
};

export type SaveRead =
  | { kind: 'none' }
  | { kind: 'ok'; save: PlaySave; raw: Record<string, unknown> }
  | { kind: 'unknown' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const count = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Pure: the stored string, or null for nothing stored. */
export function parsePlaySave(raw: string | null): SaveRead {
  if (raw === null) return { kind: 'none' };
  let s: unknown;
  try {
    s = JSON.parse(raw);
  } catch {
    return { kind: 'unknown' };
  }
  if (!record(s) || !count(s.best) || !count(s.games)) return { kind: 'unknown' };
  if (!record(s.dex) || !Object.values(s.dex).every(count)) return { kind: 'unknown' };
  const st = s.streak;
  if (!record(st) || typeof st.last !== 'string' || (st.last !== '' && !DAY.test(st.last)) || !count(st.n)) {
    return { kind: 'unknown' };
  }
  const o = s.opt;
  if (
    !record(o) ||
    (o.speed !== 'normal' && o.speed !== 'chill') ||
    (o.sign !== 'mix' && o.sign !== 'en' && o.sign !== 'kana') ||
    typeof o.sound !== 'boolean'
  ) {
    return { kind: 'unknown' };
  }
  return {
    kind: 'ok',
    raw: s,
    save: {
      best: s.best,
      games: s.games,
      dex: { ...(s.dex as Record<string, number>) },
      streak: { last: st.last, n: st.n },
      opt: { speed: o.speed, sign: o.sign, sound: o.sound },
    },
  };
}

export function readPlaySave(): SaveRead {
  try {
    return parsePlaySave(window.localStorage.getItem(PLAY_STORAGE_KEY));
  } catch {
    return { kind: 'unknown' };
  }
}

/**
 * Writes `save`, unless what is stored NOW is unrecognised (another tab, a
 * later version): that blob is left exactly as it is. Fields this version does
 * not know are carried over rather than dropped.
 */
export function writePlaySave(save: PlaySave): boolean {
  try {
    const current = parsePlaySave(window.localStorage.getItem(PLAY_STORAGE_KEY));
    if (current.kind === 'unknown') return false;
    const base = current.kind === 'ok' ? current.raw : {};
    window.localStorage.setItem(PLAY_STORAGE_KEY, JSON.stringify({ ...base, ...save }));
    return true;
  } catch {
    return false;
  }
}

/** The local day before `today`'s date, by calendar arithmetic (safe across DST). */
export function yesterday(now: Date = new Date()): string {
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

/** The streak to show: alive if the last run was today or yesterday. */
export function streakNow(save: PlaySave, now: Date = new Date()): number {
  const { last, n } = save.streak;
  return last === localDay(now) || last === yesterday(now) ? n : 0;
}

/** The streak after a run finishes now: +1 on a new consecutive day, 1 after a gap. */
export function streakAfterRun(save: PlaySave, now: Date = new Date()): PlaySave['streak'] {
  const today = localDay(now);
  const s = save.streak;
  if (s.last === today) return s;
  return { last: today, n: s.last === yesterday(now) ? s.n + 1 : 1 };
}

/** Distinct kanji ever caught, counting only kanji the game still has. */
export function dexCount(save: PlaySave, known: ReadonlySet<string>): number {
  return Object.keys(save.dex).filter(c => known.has(c) && save.dex[c] > 0).length;
}
