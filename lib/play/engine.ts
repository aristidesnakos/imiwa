/**
 * Tan Dash's canvas engine: the loop, the physics, the sprites, the scene, the
 * HUD and the chiptune. Ported from the playtested prototype (claude.ai
 * artifact, 2026-10-11) with its numbers unchanged: gravity 900, jumps
 * -330/-290 (super -430/-370), the speed curves, the spawn spacing.
 *
 * Framework-free, and it owns nothing outside its canvas. The island
 * (components/play/TanDash.tsx) owns the DOM overlays, the input, storage and
 * the goals, and hears about the game through `hooks`.
 *
 * CONTENT comes only from lib/play/rules.ts (what the sign asks, which decoys
 * roll in, how many tiles a wave holds, when a world opens) and from POWERS /
 * MYSTERY_POWER in lib/play/signs.ts, over the PlayData the server built. Never
 * import lib/play/build.ts or a lib/constants kanji list here: this module is
 * in the /play client bundle, and either import puts the dictionary in it.
 *
 * Browser-only: call createTanDash from an effect, never during render.
 */

import { PLAY_PALETTE as COL } from './palette';
import {
  CATCHES_PER_WORLD,
  chooseDecoys,
  chooseOrder,
  placeWave,
  stumpFits,
  kanjiMap,
  waveSize,
  type Order,
  type SignSetting,
} from './rules';
import { MYSTERY_POWER, POWERS, type PowerKanji } from './signs';
import type { PlayData, PlayKanji, PlayWorld } from './types';

export type PlayState = 'title' | 'play' | 'paused' | 'dying' | 'over';
export type Speed = 'normal' | 'chill';

export interface GameOptions {
  speed: Speed;
  sign: SignSetting;
  sound: boolean;
}

/** Resolved CSS font-family lists (next/font's hashed names plus fallbacks). */
export interface EngineFonts {
  /** DotGothic16, for kanji, kana and English on the canvas. */
  dot: string;
  /** Press Start 2P, for the HUD. */
  pix: string;
}

export interface EngineConfig extends GameOptions {
  fonts: EngineFonts;
}

export interface MixUp {
  /** The tile the player grabbed. */
  got: string;
  /** The kanji the sign asked for. */
  want: string;
}

export interface RunResult {
  score: number;
  catches: number;
  bestCombo: number;
  world: number;
  /** Distinct kanji caught, in catch order, at most 16. */
  caught: string[];
  /** Distinct look-alike confusions, the last three. */
  mix: MixUp[];
}

/* eslint-disable no-unused-vars -- .eslintrc.json runs the base rule, which reports every
   parameter NAME in a TypeScript method signature as an unused variable. */
export interface EngineHooks {
  onState?(state: PlayState): void;
  /** Every correct catch, before the next sign is chosen. */
  onCatch?(c: string): void;
  /** At the moment of death (state 'dying'); 'over' follows 900 ms later. */
  onRunEnd?(result: RunResult): void;
  /** Text for an aria-live region: each sign, each world. */
  onAnnounce?(text: string): void;
  /** The Kanji-dex, read whenever a sign is chosen (kana signs wait for a known kanji). */
  getDex?(): Readonly<Record<string, number>>;
  /**
   * Every sound cue by name as it plays, whether or not sound is on. The iOS
   * app (tan-dash) turns these into haptics; the island does not listen.
   */
  onSfx?(name: SfxName): void;
}

export interface TanDashEngine {
  readonly state: PlayState;
  /** From 'title' or 'over'. Call from a user gesture: it unlocks the audio. */
  start(): void;
  /** Call from a user gesture. */
  jump(): void;
  pause(): void;
  /** Call from a user gesture. */
  resume(): void;
  setOptions(options: Partial<GameOptions>): void;
  /** The stage's CSS size and the device pixel ratio; sizes the backing store. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** False while the stage is off screen or the tab is hidden: stops the loop. */
  setVisible(visible: boolean): void;
  /** A short chime, from a user gesture (the sound toggle). */
  chime(): void;
  /**
   * From a user gesture: create or resume the AudioContext. On touch screens a
   * pointerdown is not a user activation (pointerup is), so the island calls
   * this on pointerup too, or the first run on a phone would be silent.
   */
  unlockAudio(): void;
  destroy(): void;
}
/* eslint-enable no-unused-vars */

// ---------------------------------------------------------------------------
// The game's own numbers (the prototype's, unchanged)
// ---------------------------------------------------------------------------

/** The screen, in game pixels. */
export const GAME_W = 180;
export const GAME_H = 320;
const W = GAME_W;
const H = GAME_H;
const GY = 280;
const GRAV = 900;
const JUMP_V = -330;
const DOUBLE_V = -290;
const SUPER_JUMP_V = -430;
const SUPER_DOUBLE_V = -370;
const GIANT_SECONDS = 6;
const SUPER_SECONDS = 8;
const INVULNERABLE_SECONDS = 1.2;
const DEATH_TO_RESULTS_MS = 900;
/** Tile rows: on the ground, mid-air, high (double jump). */
const ROW = { g: GY - 20, m: 220, h: 176 } as const;
type RowKey = keyof typeof ROW;

function speedAt(t: number, speed: Speed): number {
  return speed === 'chill' ? Math.min(112, 58 + t * 0.8) : Math.min(158, 72 + t * 1.5);
}

/** The combo multiplier: x2 from the 4th catch in a row, up to x5. */
function multiplier(combo: number): number {
  return Math.min(5, 1 + Math.floor(Math.max(0, combo - 1) / 3));
}

/** For promises whose failure changes nothing (a font that never loads, an audio context that will not resume). */
const noop = (): void => {};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const POWER_KEYS = Object.keys(POWERS) as PowerKanji[];

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

const PIX: Record<string, string> = {
  k: COL.ink,
  b: COL.brown,
  f: COL.fur,
  c: COL.cream,
  r: COL.terra,
  w: COL.cream,
  p: COL.pink,
  s: COL.stick,
  g: COL.gold,
  e: COL.heartEmpty,
};

function sprite(rows: readonly string[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const x = c.getContext('2d');
  if (!x) return c;
  rows.forEach((r, y) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch !== '.') {
        x.fillStyle = PIX[ch];
        x.fillRect(i, y, 1, 1);
      }
    }
  });
  return c;
}

const HEAD = [
  '..kk........kk..',
  '.kbbk......kbbk.',
  '.kbfkkkkkkkkfbk.',
  'krrrrrrrrrrrrrrk',
  'krrrrrrwwrrrrrrk',
  'kffffffffffffffk',
  'kffbbbbffbbbbffk',
  'kfbbkbbffbbkbbfk',
  'kffbbbccccbbbffk',
  '.kpffcckkccffpk.',
  '..kkfcccccccfkk.',
];

function makeSprites() {
  return {
    tanA: sprite(HEAD.concat(['ks.kfccccccfk...', 'ksskffccccffkk..', '.kskfffffffffk..', '..kkbbk...kbbk..', '...kkk.....kkk..'])),
    tanB: sprite(HEAD.concat(['ks.kfccccccfk...', 'ksskffccccffkk..', '.kskfffffffffk..', '...kbbkkkbbk....', '....kkk.kkk.....'])),
    tanJ: sprite(HEAD.concat(['ks.kfccccccfkk..', 'ksskffccccffbk..', '.kskfffffffffk..', '..kbbk...kbbk...', '..kkk.....kkk...'])),
    heart: sprite(['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...']),
    heartEmpty: sprite(['.kk.kk.', 'keekeek', 'keeeeek', '.keeek.', '..kek..', '...k...']),
    stump: sprite(
      [
        '..kkkkkkkk..',
        '.kccccccccck',
        'kcbbbbbbbbck',
        'kcbccccccbck',
        '.kcbbbbbbck.',
        '.kffffffffk.',
        '.kfbffbfffk.',
        '.kffffbfbfk.',
        '.kfbfffffbk.',
        'kkffbffffkkk',
        'kffkkffkkffk',
        'kkk..kk..kkk',
      ].map(r => r.padEnd(12, '.').slice(0, 12)),
    ),
  };
}

// ---------------------------------------------------------------------------
// Sound: tiny square/triangle/saw tones. The AudioContext is created only from
// a user gesture (start, jump, resume, the sound toggle), never from the loop.
// ---------------------------------------------------------------------------

export type SfxName = 'jump' | 'dbl' | 'good' | 'wrong' | 'hit' | 'miss' | 'power' | 'smash' | 'level' | 'over';

function createAudio(isOn: () => boolean) {
  let ac: AudioContext | null = null;

  function context(fromGesture: boolean): AudioContext | null {
    if (!isOn()) return null;
    if (!ac) {
      if (!fromGesture) return null;
      try {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ac = new Ctor();
      } catch {
        return null;
      }
    }
    if (ac.state === 'suspended' && fromGesture) void ac.resume().catch(noop);
    return ac;
  }

  function tone(f: number, d: number, type: OscillatorNode['type'] = 'square', vol = 0.05, f2?: number | null, delay = 0) {
    const a = context(false);
    if (!a || a.state !== 'running') return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + d + 0.03);
  }

  const sfx: Record<SfxName, () => void> = {
    jump: () => tone(420, 0.09, 'square', 0.035, 760),
    dbl: () => tone(620, 0.09, 'square', 0.035, 1040),
    good: () => [784, 988, 1319].forEach((f, i) => tone(f, 0.07, 'square', 0.045, null, i * 0.05)),
    wrong: () => tone(190, 0.24, 'sawtooth', 0.05, 80),
    hit: () => tone(130, 0.2, 'square', 0.06, 55),
    miss: () => tone(330, 0.14, 'triangle', 0.05, 200),
    power: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.08, 'triangle', 0.07, null, i * 0.06)),
    smash: () => tone(160, 0.1, 'square', 0.05, 320),
    level: () => [659, 784, 988, 1319, 988, 1319].forEach((f, i) => tone(f, 0.09, 'square', 0.04, null, i * 0.08)),
    over: () => [523, 392, 330, 262, 196].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, null, i * 0.15)),
  };

  return {
    /** From a user gesture: create or resume the context. */
    unlock: (): void => {
      context(true);
    },
    play: (name: SfxName) => sfx[name](),
    close: () => {
      if (ac) void ac.close().catch(noop);
      ac = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Game objects
// ---------------------------------------------------------------------------

interface Wave {
  target: Item | null;
  done: boolean;
  items: Item[];
}
interface Item {
  c: string;
  role: 'target' | 'decoy';
  row: RowKey;
  x: number;
  y: number;
  w: number;
  h: number;
  ph: number;
  dead: boolean;
  fade: number;
  wave: Wave;
}
interface Stump {
  x: number;
  y: number;
  w: number;
  h: number;
  dead: boolean;
}
interface Power {
  c: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ph: number;
  dead: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
interface FloatText {
  text: string;
  x: number;
  y: number;
  color: string;
  font: 'pix' | 'dot';
  life: number;
  t: number;
}
interface Toast {
  t: number;
  life: number;
  world: PlayWorld;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Game {
  t: number;
  dist: number;
  speed: number;
  score: number;
  hearts: number;
  maxHearts: number;
  combo: number;
  bestCombo: number;
  world: number;
  inWorld: number;
  catches: number;
  caught: string[];
  mix: MixUp[];
  seen: Map<string, number>;
  order: Order | null;
  wave: Wave | null;
  items: Item[];
  stumps: Stump[];
  powers: Power[];
  parts: Particle[];
  floats: FloatText[];
  nextWaveAt: number;
  nextStumpAt: number;
  nextPowerAt: number;
  pauseUntil: number;
  toast: Toast | null;
  shake: number;
  lastTarget: string | null;
}

function freshGame(speed: Speed): Game {
  const chill = speed === 'chill';
  return {
    t: 0,
    dist: 0,
    speed: 0,
    score: 0,
    hearts: chill ? 5 : 3,
    maxHearts: chill ? 6 : 4,
    combo: 0,
    bestCombo: 0,
    world: 1,
    inWorld: 0,
    catches: 0,
    caught: [],
    mix: [],
    seen: new Map(),
    order: null,
    wave: null,
    items: [],
    stumps: [],
    powers: [],
    parts: [],
    floats: [],
    nextWaveAt: 70,
    nextStumpAt: 420,
    nextPowerAt: 16,
    pauseUntil: 0,
    toast: null,
    shake: 0,
    lastTarget: null,
  };
}

function overlap(a: Box, b: Box, padA: number, padB: number): boolean {
  return (
    a.x + padA < b.x + b.w - padB &&
    a.x + a.w - padA > b.x + padB &&
    a.y + padA < b.y + b.h - padB &&
    a.y + a.h - padA > b.y + padB
  );
}

/** The run's summary for the results card. Pure, so it is easy to check. */
export function summarise(g: Pick<Game, 'score' | 'catches' | 'bestCombo' | 'world' | 'caught' | 'mix'>): RunResult {
  const pairs = new Set<string>();
  const mix = g.mix.filter(m => {
    const key = m.got + m.want;
    if (pairs.has(key)) return false;
    pairs.add(key);
    return true;
  });
  return {
    score: g.score,
    catches: g.catches,
    bestCombo: g.bestCombo,
    world: g.world,
    caught: [...new Set(g.caught)].slice(0, 16),
    mix: mix.slice(-3),
  };
}

/** Every glyph a world can put on the canvas in DotGothic16: its kanji, their kana, its Japanese title. */
export function worldGlyphs(data: PlayData, km: Map<string, PlayKanji>, world: number): string {
  const w = data.worlds[world - 1];
  if (!w) return '';
  return w.titleJa + w.kanji.map(c => c + (km.get(c)?.kana ?? '')).join('');
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export function createTanDash(
  canvas: HTMLCanvasElement,
  data: PlayData,
  config: EngineConfig,
  hooks: EngineHooks = {},
): TanDashEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tan Dash needs a 2D canvas context');

  const km = kanjiMap(data);
  const worlds = data.worlds;
  const opts: GameOptions = { speed: config.speed, sign: config.sign, sound: config.sound };
  const FONT_DOT = config.fonts.dot;
  const FONT_PIX = config.fonts.pix;
  const SPR = makeSprites();
  const audio = createAudio(() => opts.sound);
  const sfx = (name: SfxName) => {
    audio.play(name);
    hooks.onSfx?.(name);
  };
  const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!motion?.matches;

  let G = freshGame(opts.speed);
  const tan = { x: 34, y: GY - 16, vy: 0, ground: true, jumps: 2, giant: 0, sup: 0, inv: 0, anim: 0 };
  let state: PlayState = 'title';
  let scroll = 0;
  let PX = 1;
  let raf = 0;
  let last = 0;
  let visible = true;
  let destroyed = false;
  let overTimer: ReturnType<typeof setTimeout> | null = null;

  const setState = (s: PlayState) => {
    state = s;
    hooks.onState?.(s);
  };
  const announce = (text: string) => hooks.onAnnounce?.(text);
  const tanH = () => (tan.giant > 0 ? 32 : 16);

  // Fonts: DotGothic16's Japanese arrives in unicode-range slices, and canvas
  // text drawn before its slice loads falls back to a system face. So the
  // glyphs a world needs are requested a world ahead of drawing them.
  const fontsRequested = new Set<number>();
  function loadGlyphs(text: string) {
    if (!text || typeof document === 'undefined' || !document.fonts?.load) return;
    document.fonts.load(`16px ${FONT_DOT}`, text).catch(noop);
  }
  function loadWorldGlyphs(world: number) {
    if (fontsRequested.has(world) || world > worlds.length) return;
    fontsRequested.add(world);
    loadGlyphs(worldGlyphs(data, km, world));
  }
  if (typeof document !== 'undefined' && document.fonts?.load) {
    document.fonts.load(`8px ${FONT_PIX}`, 'A0').catch(noop);
    // Gold boxes, the mystery label and the marks the floats use.
    loadGlyphs(MYSTERY_POWER + POWER_KEYS.join('') + '✗→·×');
  }
  loadWorldGlyphs(1);
  loadWorldGlyphs(2);

  function reset() {
    G = freshGame(opts.speed);
    Object.assign(tan, { y: GY - 16, vy: 0, ground: true, jumps: 2, giant: 0, sup: 0, inv: 0 });
  }

  function worldIntro(w: PlayWorld): string {
    return `World ${w.n}: ${w.title}. New kanji: ${w.kanji.join(' ')}. `;
  }

  function nextOrder(prefix = '') {
    const order = chooseOrder(
      data,
      km,
      { world: G.world, setting: opts.sign, seen: G.seen, dex: hooks.getDex?.() ?? {}, last: G.lastTarget },
      Math.random,
    );
    G.order = order;
    G.lastTarget = order.c;
    announce(
      prefix + (order.mode === 'en' ? `Find the kanji that means ${order.text}.` : `Find the kanji read ${order.text}.`),
    );
  }

  // ----- spawning -----

  function spawnWave() {
    const order = G.order;
    if (!order) return;
    let n = waveSize(G.world, Math.random);
    const decoys = chooseDecoys(data, km, order, G.world, n - 1, Math.random);
    n = decoys.length + 1;
    const ti = Math.floor(Math.random() * n);
    const spacing = Math.max(62, G.speed * 0.82);
    const wave: Wave = { target: null, done: false, items: [] };
    const rows = Array.from(
      { length: n },
      (): RowKey => pick(G.world === 1 ? ['g', 'm'] : Math.random() < 0.22 ? ['h'] : ['g', 'm']),
    );
    // Slide the whole wave right of any stump or gold box it would land on.
    const x0 = placeWave(
      rows.map((row, i) => ({ dx: i * spacing, row })),
      G.stumps.filter(s => !s.dead).map(s => s.x),
      G.powers.filter(p => !p.dead).map(p => p.x),
      G.speed,
      W + 12,
    );
    let di = 0;
    for (let i = 0; i < n; i++) {
      const isTarget = i === ti;
      const it: Item = {
        c: isTarget ? order.c : decoys[di++],
        role: isTarget ? 'target' : 'decoy',
        row: rows[i],
        x: x0 + i * spacing,
        y: ROW[rows[i]],
        w: 20,
        h: 20,
        ph: Math.random() * 6,
        dead: false,
        fade: 0,
        wave,
      };
      if (isTarget) wave.target = it;
      wave.items.push(it);
      G.items.push(it);
    }
    G.wave = wave;
  }

  function clearAhead(x: number, pad: number) {
    return !G.items.some(it => !it.fade && Math.abs(it.x - x) < pad) && !G.powers.some(p => Math.abs(p.x - x) < pad);
  }
  /** False (and no stump) while a tile or a gold box sits where this one would be unfair or drawn over. */
  function spawnStump(): boolean {
    const x = W + 14;
    const tiles = G.items.filter(it => !it.fade);
    if (!stumpFits(x, tiles, G.powers.map(p => p.x), G.speed)) return false;
    G.stumps.push({ x, y: GY - 12, w: 12, h: 12, dead: false });
    return true;
  }
  function spawnPower() {
    const c = pick<string>([...POWER_KEYS, MYSTERY_POWER]);
    G.powers.push({ c, x: W + 14, y: Math.random() < 0.5 ? ROW.m : ROW.h, w: 20, h: 20, ph: Math.random() * 6, dead: false });
  }

  // ----- effects -----

  function burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      G.parts.push({ x, y, vx: rand(-60, 60), vy: rand(-110, -20), life: rand(0.35, 0.7), color });
    }
  }
  function float(text: string, x: number, y: number, color: string = COL.ink, font: 'pix' | 'dot' = 'pix', life = 1) {
    G.floats.push({ text, x, y, color, font, life, t: 0 });
  }
  function shake(s: number) {
    if (!reduced()) G.shake = Math.max(G.shake, s);
  }
  function fadeWave(wave: Wave) {
    wave.done = true;
    wave.items.forEach(it => {
      if (!it.dead) it.fade = 0.001;
    });
    if (G.wave === wave) G.wave = null;
  }

  // ----- what happens -----

  function goodCatch(it: Item) {
    it.dead = true;
    G.combo++;
    G.bestCombo = Math.max(G.bestCombo, G.combo);
    const mult = multiplier(G.combo);
    const pts = 100 * mult;
    G.score += pts;
    G.catches++;
    G.caught.push(it.c);
    G.seen.set(it.c, (G.seen.get(it.c) ?? 0) + 1);
    hooks.onCatch?.(it.c);
    const k = km.get(it.c);
    burst(it.x + 10, it.y + 10, COL.gold, 14);
    if (k) float(`${it.c} ${k.kana} · ${k.en}`, it.x + 10, it.y - 6, COL.ink, 'dot', 1.3);
    float(mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, tan.x + 8, tan.y - 14, COL.terraDeep, 'pix', 0.9);
    sfx('good');
    fadeWave(it.wave);
    G.nextWaveAt = G.dist + rand(46, 90);
    G.inWorld++;
    if (G.inWorld >= CATCHES_PER_WORLD && G.world < worlds.length) levelUp();
    else nextOrder();
  }

  function wrongCatch(it: Item) {
    it.dead = true;
    const k = km.get(it.c);
    if (G.order) G.mix.push({ got: it.c, want: G.order.c });
    G.combo = 0;
    burst(it.x + 10, it.y + 10, COL.terra, 10);
    if (k) float(`✗ ${it.c} = ${k.en}`, it.x + 10, it.y - 6, COL.terraDeep, 'dot', 1.4);
    hurt(true);
    sfx('wrong');
  }

  function hurt(silent = false) {
    if (tan.inv > 0) return;
    G.hearts--;
    G.combo = 0;
    tan.inv = INVULNERABLE_SECONDS;
    shake(3);
    if (!silent) sfx('hit');
    if (G.hearts <= 0) gameOver();
  }

  function missOrder(wave: Wave) {
    const k = wave.target ? km.get(wave.target.c) : undefined;
    G.combo = 0;
    if (k) float(`missed ${k.c} · ${k.en}`, 60, 96, COL.terraDeep, 'dot', 1.4);
    sfx('miss');
    fadeWave(wave);
    G.nextWaveAt = G.dist + rand(40, 80);
    nextOrder();
  }

  function takePower(p: Power) {
    p.dead = true;
    let c = p.c as PowerKanji;
    let label = '';
    if (p.c === MYSTERY_POWER) {
      c = pick(POWER_KEYS);
      label = `${MYSTERY_POWER} ${km.get(MYSTERY_POWER)?.en ?? 'what'}? → `;
    }
    const info = POWERS[c];
    if (c === '生') G.hearts = Math.min(G.maxHearts, G.hearts + 1);
    if (c === '大') {
      tan.giant = GIANT_SECONDS;
      tan.y = Math.min(tan.y, GY - 32);
    }
    if (c === '上') tan.sup = SUPER_SECONDS;
    if (c === '金') {
      G.score += 500;
      burst(p.x + 10, p.y + 10, COL.gold, 24);
    }
    burst(p.x + 10, p.y + 10, COL.gold, 16);
    float(`${label}${c} ${info.en}`, p.x + 10, p.y - 8, COL.goldDeep, 'dot', 1.4);
    float(info.fx, W / 2, 120, COL.terraDeep, 'pix', 1.2);
    sfx('power');
  }

  function levelUp() {
    G.world++;
    G.inWorld = 0;
    const w = worlds[G.world - 1];
    G.toast = { t: 0, life: 3.2, world: w };
    G.pauseUntil = G.t + 2.8;
    G.nextWaveAt = Math.max(G.nextWaveAt, G.dist + 40);
    sfx('level');
    loadWorldGlyphs(G.world);
    loadWorldGlyphs(G.world + 1);
    nextOrder(worldIntro(w));
  }

  function gameOver() {
    if (state !== 'play') return;
    setState('dying');
    sfx('over');
    hooks.onRunEnd?.(summarise(G));
    overTimer = setTimeout(() => {
      overTimer = null;
      if (!destroyed && state === 'dying') setState('over');
    }, DEATH_TO_RESULTS_MS);
  }

  // ----- update -----

  function update(dt: number) {
    tan.anim += dt;
    if (state === 'title' || state === 'over') {
      scroll += 40 * dt;
      return;
    }
    if (state === 'paused') return;
    if (state === 'dying') {
      G.t += dt;
      tickFx(dt);
      return;
    }

    G.t += dt;
    G.speed = speedAt(G.t, opts.speed);
    const dx = G.speed * dt;
    G.dist += dx;
    scroll += dx;

    // Tan
    tan.vy += GRAV * dt;
    tan.y += tan.vy * dt;
    const th = tanH();
    if (tan.y >= GY - th) {
      tan.y = GY - th;
      tan.vy = 0;
      tan.ground = true;
      tan.jumps = 2;
    }
    tan.giant = Math.max(0, tan.giant - dt);
    tan.sup = Math.max(0, tan.sup - dt);
    tan.inv = Math.max(0, tan.inv - dt);

    // The world scrolls
    for (const it of G.items) it.x -= dx;
    for (const s of G.stumps) s.x -= dx;
    for (const p of G.powers) p.x -= dx;

    // Spawns
    const calm = G.t < G.pauseUntil;
    if (!calm && !G.wave && G.dist >= G.nextWaveAt) spawnWave();
    if (!calm && G.dist >= G.nextStumpAt && G.t > 5 && spawnStump()) {
      G.nextStumpAt = G.dist + Math.max(110, rand(170, 300) - G.world * 8);
    }
    if (!calm && G.t >= G.nextPowerAt && !G.powers.length) {
      if (clearAhead(W + 14, 40)) {
        spawnPower();
        G.nextPowerAt = G.t + rand(18, 28);
      } else G.nextPowerAt = G.t + 1;
    }

    // Collisions
    const tb: Box = { x: tan.x, y: tan.y, w: tan.giant > 0 ? 32 : 16, h: th };
    for (const it of G.items) {
      if (it.dead || it.fade) continue;
      if (overlap(tb, it, 2, 3)) {
        if (it.role === 'target') goodCatch(it);
        else wrongCatch(it);
        if (state !== 'play') return;
      }
    }
    for (const s of G.stumps) {
      if (s.dead) continue;
      if (overlap(tb, s, 2, 2)) {
        s.dead = true;
        if (tan.giant > 0) {
          burst(s.x + 6, s.y + 4, COL.fur, 12);
          G.score += 50;
          float('+50', s.x + 6, s.y - 6, COL.terraDeep, 'pix', 0.8);
          sfx('smash');
          shake(2);
        } else {
          burst(s.x + 6, s.y + 4, COL.fur, 8);
          hurt();
          if (state !== 'play') return;
        }
      }
    }
    for (const p of G.powers) if (!p.dead && overlap(tb, p, 2, 2)) takePower(p);

    // A target that scrolled past Tan
    const wave = G.wave;
    if (wave && !wave.done && wave.target && wave.target.x + 20 < tan.x - 4 && !wave.target.dead) missOrder(wave);

    // Cleanup
    for (const it of G.items) if (it.fade) it.fade += dt;
    G.items = G.items.filter(it => it.x > -30 && !it.dead && it.fade < 0.5);
    G.stumps = G.stumps.filter(s => s.x > -20 && !s.dead);
    G.powers = G.powers.filter(p => p.x > -30 && !p.dead);
    tickFx(dt);
  }

  function tickFx(dt: number) {
    for (const p of G.parts) {
      p.life -= dt;
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    G.parts = G.parts.filter(p => p.life > 0);
    for (const f of G.floats) {
      f.t += dt;
      f.y -= 14 * dt;
    }
    G.floats = G.floats.filter(f => f.t < f.life);
    if (G.toast) {
      G.toast.t += dt;
      if (G.toast.t > G.toast.life) G.toast = null;
    }
    G.shake = Math.max(0, G.shake - dt * 12);
  }

  // ----- draw -----

  const px = (x: number) => Math.round(x);
  function rect(c: string, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = c;
    ctx.fillRect(px(x), px(y), w, h);
  }
  function disc(cx: number, cy: number, r: number, c: string) {
    ctx.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) {
      const h = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - h, cy + dy, h * 2, 1);
    }
  }
  const farH = (x: number) => {
    const m = ((x % 170) + 170) % 170;
    return Math.max(8, 66 - Math.abs(m - 85) * 0.8);
  };
  const midH = (x: number) => 20 + Math.round(8 * Math.sin(x / 34) + 5 * Math.sin(x / 13));

  function drawBG() {
    rect(COL.sky, 0, 0, W, H);
    disc(140, 78, 22, COL.sun);
    // Clouds
    for (let i = 0; i < 4; i++) {
      const base = i * 67 + 20;
      const cy = 62 + (i % 2) * 24;
      const x = (((base - scroll * 0.18) % (W + 60)) + (W + 60)) % (W + 60) - 30;
      rect(COL.cream, x, cy, 22, 4);
      rect(COL.cream, x + 5, cy - 3, 12, 3);
      rect(COL.cream, x + 3, cy + 4, 16, 1);
    }
    // Far mountains, Fuji-like, with snow
    const fy = GY - 22;
    for (let sx = 0; sx < W; sx += 2) {
      const h = Math.round(farH(sx + scroll * 0.08));
      rect(COL.far, sx, fy - h, 2, h + 22);
      if (h > 50) rect(COL.cream, sx, fy - h, 2, h - 50);
    }
    // Middle hills, and a torii on them
    const tx = (((330 - scroll * 0.4) % 380) + 380) % 380 - 40;
    for (let sx = 0; sx < W; sx += 2) {
      const h = midH(sx + scroll * 0.4);
      rect(COL.mid, sx, GY - h, 2, h);
    }
    if (tx > -30 && tx < W) {
      const by = GY - midH(tx + 10 + scroll * 0.4) + 2;
      rect(COL.terraDeep, tx, by - 24, 26, 3);
      rect(COL.terraDeep, tx - 2, by - 25, 30, 2);
      rect(COL.terraDeep, tx + 3, by - 18, 20, 2);
      rect(COL.terraDeep, tx + 5, by - 21, 3, 21);
      rect(COL.terraDeep, tx + 18, by - 21, 3, 21);
    }
    // Ground
    rect(COL.grassHi, 0, GY, W, 1);
    rect(COL.grass, 0, GY + 1, W, 3);
    rect(COL.dirt, 0, GY + 4, W, H - GY - 4);
    for (let i = 0; i < 16; i++) {
      const x = (((i * 23 - scroll) % 184) + 184) % 184 - 2;
      rect(COL.dirt2, x, GY + 9 + (i % 3) * 7, 3, 1);
      rect(COL.dirt2, x + 9, GY + 14 + (i % 2) * 9, 2, 1);
    }
  }

  function tile(x0: number, y0: number, c: string, gold: boolean, alpha: number) {
    const x = px(x0);
    const y = px(y0);
    ctx.globalAlpha = alpha;
    rect(COL.ink, x, y, 20, 20);
    rect(gold ? COL.gold : COL.cream, x + 1, y + 1, 18, 18);
    rect(gold ? COL.goldDeep : COL.cream2, x + 1, y + 17, 18, 2);
    rect(gold ? COL.goldDeep : COL.cream2, x + 17, y + 1, 2, 18);
    ctx.fillStyle = COL.ink;
    ctx.font = `16px ${FONT_DOT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c, x + 9.5, y + 10);
    ctx.globalAlpha = 1;
  }

  function drawTan() {
    const calm = reduced();
    // Invulnerable: the prototype blinks Tan; with reduced motion, a steady ghost.
    if (tan.inv > 0 && !calm && Math.floor(tan.inv * 16) % 2 === 0) return;
    const spr = !tan.ground ? SPR.tanJ : Math.floor(tan.anim * 10) % 2 ? SPR.tanA : SPR.tanB;
    const big = tan.giant > 0 && (calm || !(tan.giant < 1 && Math.floor(tan.giant * 10) % 2));
    const s = big ? 32 : 16;
    if (tan.sup > 0 && !tan.ground) {
      rect(COL.gold, tan.x + s / 2 - 1, tan.y + s, 2, 4);
      rect(COL.gold, tan.x + s / 2 - 4, tan.y + s + 2, 2, 2);
      rect(COL.gold, tan.x + s / 2 + 2, tan.y + s + 2, 2, 2);
    }
    if (tan.inv > 0 && calm) ctx.globalAlpha = 0.55;
    ctx.drawImage(spr, px(tan.x), px(tan.y), s, s);
    ctx.globalAlpha = 1;
  }

  function textPix(t: string, x: number, y: number, c: string, align: CanvasRenderingContext2D['textAlign'] = 'left', size = 8) {
    ctx.font = `${size}px ${FONT_PIX}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL.ink;
    ctx.fillText(t, x + 1, y + 1);
    ctx.fillStyle = c;
    ctx.fillText(t, x, y);
  }

  function drawHUD() {
    textPix(String(G.score).padStart(6, '0'), 6, 6, COL.cream, 'left');
    for (let i = 0; i < G.maxHearts; i++) {
      if (i < G.hearts || i < 3) ctx.drawImage(i < G.hearts ? SPR.heart : SPR.heartEmpty, W - 12 - i * 9, 6, 7, 6);
    }
    const mult = multiplier(G.combo);
    if (G.combo >= 2) textPix(`COMBO ${G.combo}${mult > 1 ? ' ×' + mult : ''}`, 6, 16, COL.gold, 'left');
    let iy = 16;
    if (tan.giant > 0) {
      textPix(`大 ${Math.ceil(tan.giant)}`, W - 6, iy, COL.gold, 'right');
      iy += 10;
    }
    if (tan.sup > 0) textPix(`上 ${Math.ceil(tan.sup)}`, W - 6, iy, COL.gold, 'right');
    // The sign
    if (G.order && !(G.toast && G.toast.t < 2.2)) {
      const by = 30;
      rect(COL.ink, 10, by, W - 20, 32);
      rect(COL.cream, 11, by + 1, W - 22, 30);
      rect(COL.terra, 11, by + 1, W - 22, 9);
      ctx.font = `8px ${FONT_PIX}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COL.cream;
      ctx.fillText(G.order.mode === 'en' ? 'MEANS' : 'READS', W / 2, by + 2);
      ctx.fillStyle = COL.ink;
      ctx.font = `16px ${FONT_DOT}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(G.order.text, W / 2, by + 21);
      // Posts
      rect(COL.ink, 26, by + 32, 3, 4);
      rect(COL.ink, W - 29, by + 32, 3, 4);
    }
  }

  function drawToast() {
    const T = G.toast;
    if (!T) return;
    const a = Math.min(1, T.t * 4, (T.life - T.t) * 3);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    const w = T.world;
    const ks = w.kanji;
    const rows = Math.ceil(ks.length / 5);
    const ph = 66 + rows * 34;
    const y0 = 64;
    rect(COL.ink, 8, y0, W - 16, ph);
    rect(COL.cream, 9, y0 + 1, W - 18, ph - 2);
    rect(COL.terra, 9, y0 + 1, W - 18, 11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL.cream;
    ctx.font = `8px ${FONT_PIX}`;
    ctx.fillText(`WORLD ${w.n}`, W / 2, y0 + 3);
    ctx.fillStyle = COL.ink;
    ctx.font = `12px ${FONT_DOT}`;
    ctx.fillText(w.title, W / 2, y0 + 16);
    ctx.fillStyle = COL.terraDeep;
    ctx.font = `12px ${FONT_DOT}`;
    ctx.fillText(w.titleJa, W / 2, y0 + 31);
    ctx.fillStyle = COL.ink;
    ctx.font = `8px ${FONT_PIX}`;
    ctx.fillText('NEW KANJI', W / 2, y0 + 49);
    ks.forEach((c, i) => {
      const r = Math.floor(i / 5);
      const inRow = Math.min(5, ks.length - r * 5);
      const col = i % 5;
      const x = W / 2 - (inRow * 32) / 2 + col * 32 + 6;
      const y = y0 + 60 + r * 34;
      tile(x, y, c, false, a);
      ctx.globalAlpha = a;
      ctx.fillStyle = COL.ink;
      ctx.font = `8px ${FONT_DOT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText((km.get(c)?.en ?? '').split(' ')[0], x + 10, y + 21);
    });
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.setTransform(PX, 0, 0, PX, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sx = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0;
    const sy = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    drawBG();
    if (state !== 'title') {
      for (const s of G.stumps) ctx.drawImage(SPR.stump, px(s.x), px(s.y), 12, 12);
      for (const it of G.items) {
        const bob = Math.round(Math.sin(G.t * 4 + it.ph) * 1.5);
        tile(it.x, it.y + bob, it.c, false, it.fade ? Math.max(0, 1 - it.fade * 2.5) : 1);
      }
      for (const p of G.powers) {
        const bob = Math.round(Math.sin(G.t * 5 + p.ph) * 2);
        tile(p.x, p.y + bob, p.c, true, 1);
        // The sparkle blinks; with reduced motion it stays lit.
        if (reduced() || Math.floor(G.t * 6) % 2) rect(COL.cream, p.x + 16, p.y + bob - 2, 2, 2);
      }
    }
    drawTan();
    for (const p of G.parts) rect(p.color, p.x, p.y, 2, 2);
    for (const f of G.floats) {
      ctx.globalAlpha = Math.min(1, (f.life - f.t) * 3);
      if (f.font === 'dot') {
        ctx.font = `12px ${FONT_DOT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const w = Math.min(W - 4, ctx.measureText(f.text).width + 8);
        const x = Math.max(w / 2 + 2, Math.min(W - w / 2 - 2, f.x));
        rect(COL.cream, x - w / 2, f.y - 8, w, 15);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, x, f.y);
      } else {
        const c = f.color === COL.ink ? COL.cream : f.color === COL.terraDeep ? COL.gold : f.color;
        textPix(f.text, Math.max(30, Math.min(W - 30, f.x)), f.y, c, 'center');
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (state === 'play' || state === 'paused' || state === 'dying') {
      drawHUD();
      drawToast();
    }
  }

  // ----- loop -----
  //
  // The prototype ran requestAnimationFrame forever. Here the loop runs only
  // while the stage is on screen and the run is not paused; a paused frame is
  // drawn once and held.

  const wantsLoop = () => !destroyed && visible && state !== 'paused';

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    draw();
    if (wantsLoop()) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || !wantsLoop()) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function halt() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  reset();
  draw();
  kick();

  return {
    get state() {
      return state;
    },
    start() {
      if (state !== 'title' && state !== 'over') return;
      audio.unlock();
      reset();
      setState('play');
      const w = worlds[0];
      G.toast = { t: 0, life: 3.2, world: w };
      G.pauseUntil = 1.6;
      nextOrder(worldIntro(w));
      kick();
    },
    jump() {
      if (state !== 'play') return;
      audio.unlock();
      if (tan.ground) {
        tan.vy = tan.sup > 0 ? SUPER_JUMP_V : JUMP_V;
        tan.ground = false;
        tan.jumps = 1;
        sfx('jump');
      } else if (tan.jumps > 0) {
        tan.vy = tan.sup > 0 ? SUPER_DOUBLE_V : DOUBLE_V;
        tan.jumps = 0;
        sfx('dbl');
        burst(tan.x + 8, tan.y + tanH(), COL.cream, 6);
      }
    },
    pause() {
      if (state !== 'play') return;
      setState('paused');
      halt();
      draw();
    },
    resume() {
      if (state !== 'paused') return;
      audio.unlock();
      setState('play');
      kick();
    },
    setOptions(next) {
      Object.assign(opts, next);
    },
    resize(cssWidth, cssHeight, dpr) {
      const ratio = Math.min(3, dpr || 1);
      const bw = Math.max(1, Math.round(cssWidth * ratio));
      const bh = Math.max(1, Math.round(cssHeight * ratio));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      PX = canvas.width / W;
      // Resizing the backing store clears it; repaint now, in case the loop is held.
      draw();
    },
    setVisible(v) {
      visible = v;
      if (v) kick();
      else halt();
    },
    chime() {
      audio.unlock();
      sfx('good');
    },
    unlockAudio() {
      audio.unlock();
    },
    destroy() {
      destroyed = true;
      halt();
      if (overTimer) clearTimeout(overTimer);
      overTimer = null;
      audio.close();
    },
  };
}
