/**
 * Validator for Tan Dash (/play): the data it plays on, the rules that pick
 * what it asks, and the return-visit model its six-week test is decided on.
 *
 * Run: pnpm validate:play
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * A learning game makes one promise per wave: exactly one tile answers the
 * sign. Nothing on screen tells a second right answer from a decoy, so a
 * player who catches it loses a heart for being right, and learns that the
 * game is wrong. The promise depends on data the game does not own: the N5
 * list's meanings and the readings layer (lib/romaji/readings.ts). An edited
 * gloss or a new reading can break it without anyone touching lib/play/. So
 * this replays the rules over every world, every kanji and both sign modes,
 * and checks each decoy against a predicate written here, not the one the
 * rules use, so a gap in `clashes()` shows up as a failure rather than as
 * agreement with itself.
 *
 * The return-visit model is replayed the way scripts/announcements/validate.ts
 * replays the banner's: against synthetic browsers and dates. Its promises
 * ("at most two events per browser", "a player is counted from the day of the
 * catch") decide the test on 7 Dec 2026 and are asserted nowhere else.
 *
 * Relative imports, not `@/`: scripts/ is outside tsconfig.json, and this runs
 * under tsx (lib/play/build.ts and lib/stories/index.ts import the same way).
 */

import fs from 'node:fs';
import path from 'node:path';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { EPISODES } from '../lib/stories';
import { buildPlayData, episodeWorldCount } from '../lib/play/build';
import { EXTRA_WORLDS, LOOK_ALIKES, MYSTERY_POWER, PLAY_SIGNS, POWERS } from '../lib/play/signs';
import {
  chooseDecoys,
  chooseOrder,
  clashes,
  kanjiMap,
  pool,
  type Order,
  type OrderContext,
  type SignMode,
  type SignSetting,
} from '../lib/play/rules';
import {
  CATCH_MILESTONES,
  PLAY_GOALS,
  PLAY_STORAGE_KEY,
  RETURN_WINDOW_DAYS,
  SITE_RETURN_GOAL,
  VISIT_STORAGE_KEY,
  daysBetween,
  localDay,
  onCatch,
  onPageView,
  parseVisitState,
  readVisit,
  writeVisit,
  type VisitState,
} from '../lib/play/measure';
import type { PlayData, PlayKanji } from '../lib/play/types';

const ROOT = path.resolve(__dirname, '..');

/** The English sign must fit a 180px-wide stage and be read at a run. */
const EN_MAX = 14;
/** Decoys asked for per wave in the replay: the largest wave (4 tiles) needs 3. */
const DECOYS = 3;
/** Seeds per world × kanji × sign mode for the decoy replay. */
const DECOY_SEEDS = 200;
/** Seeds per world × setting for random order contexts. */
const ORDER_SEEDS = 300;
/** Seeds per world × setting for whole runs, and the waves in each. */
const RUN_SEEDS = 40;
const RUN_WAVES = 60;
/** Synthetic browsers in the return-visit random walk, and the days each lives. */
const WALKERS = 2000;
const WALK_DAYS = 90;

const HIRAGANA = /^[ぁ-ゖ]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SNAKE = /^[a-z]+(_[a-z]+)*$/;
const SIGN_MODES: SignMode[] = ['en', 'kana'];
const SETTINGS: SignSetting[] = ['mix', 'en', 'kana'];

let checks = 0;
let failures = 0;

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function check(label: string, problems: string[], okMessage: string): void {
  checks += 1;
  if (problems.length === 0) {
    console.log(`  ok    ${okMessage}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL  ${label}: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 25)) console.error(`          ${p}`);
  if (problems.length > 25) console.error(`          ... and ${problems.length - 25} more`);
}

/** mulberry32: small, seedable, good enough to replay a failing draw. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

let data: PlayData;
try {
  data = buildPlayData();
} catch (error) {
  // build.ts throws on a missing sign or a kanji in no world; say so, not a stack trace.
  console.error(`  FAIL  buildPlayData() threw: ${(error as Error).message}`);
  console.error('\nFAIL: the game data does not build');
  process.exit(1);
}
const km = kanjiMap(data);
const N5 = N5_KANJI.map(k => k.kanji);
const N5_SET = new Set(N5);

/**
 * Every sense of a kanji as a player would read it: the dictionary's meaning
 * split on both `,` and `;` ("male; man"), lowercased, without a leading
 * "to"/"the" or a trailing "(weather)". Stricter than lib/play/build.ts, which
 * splits on `,` only; the replay below asserts `clashes()` catches every tile
 * this says answers an English sign.
 */
const sense = (m: string) =>
  m
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^(to|the) /, '')
    .trim();
const SENSES = new Map(
  N5_KANJI.map(k => [k.kanji, new Set(k.meaning.split(/[,;]/).map(sense).filter(Boolean))]),
);

/** Does `tile` answer `order`? Written from the sign's meaning, not from rules.ts. */
function answers(tile: PlayKanji, order: Order): boolean {
  if (order.mode === 'kana') return tile.kana === order.text || tile.readings.includes(order.text);
  return (
    tile.en === order.text ||
    tile.meanings.includes(order.text) ||
    (SENSES.get(tile.c)?.has(sense(order.text)) ?? false)
  );
}

const orderFor = (c: string, mode: SignMode): Order => {
  const k = km.get(c)!;
  return { c, mode, text: mode === 'en' ? k.en : k.kana };
};

// ---------------------------------------------------------------------------

section('1. Signs: one per N5 kanji, short, and a real reading');
{
  const keys = Object.keys(PLAY_SIGNS);
  check(
    'sign keys',
    [
      ...N5.filter(c => !(c in PLAY_SIGNS)).map(c => `${c} is on the N5 list but has no sign`),
      ...keys.filter(c => !N5_SET.has(c)).map(c => `${c} has a sign but is not on the N5 list`),
    ],
    `${keys.length} signs, exactly the ${N5.length} N5 kanji`,
  );

  const en: string[] = [];
  let longest = '';
  for (const [c, s] of Object.entries(PLAY_SIGNS)) {
    if (s.en.trim() === '') en.push(`${c}: the English sign is empty`);
    if (s.en !== s.en.trim()) en.push(`${c}: "${s.en}" has leading or trailing space`);
    // clashes() compares the sign with lowercased meanings; a capital would hide a clash.
    if (s.en !== s.en.toLowerCase()) en.push(`${c}: "${s.en}" is not lowercase`);
    if (s.en.length > EN_MAX) en.push(`${c}: "${s.en}" is ${s.en.length} characters, the cap is ${EN_MAX}`);
    if (s.en.length > longest.length) longest = s.en;
  }
  check('English signs', en, `every English sign is non-empty, lowercase and at most ${EN_MAX} characters (longest "${longest}")`);

  const kana: string[] = [];
  for (const [c, s] of Object.entries(PLAY_SIGNS)) {
    if (!HIRAGANA.test(s.kana)) kana.push(`${c}: kana sign "${s.kana}" is not hiragana only`);
    const k = km.get(c);
    if (k && !k.readings.includes(s.kana)) {
      kana.push(`${c}: kana sign "${s.kana}" is none of its readings (${k.readings.join(' ')})`);
    }
  }
  check('kana signs', kana, 'every kana sign is hiragana and one of its own kanji\'s readings');

  // A shared English word is two right answers on an English sign, and
  // clashes() would quietly drop each as the other's decoy instead of saying so.
  const byEn = new Map<string, string[]>();
  for (const [c, s] of Object.entries(PLAY_SIGNS)) byEn.set(s.en, [...(byEn.get(s.en) ?? []), c]);
  check(
    'English signs are unique',
    Array.from(byEn).filter(([, cs]) => cs.length > 1).map(([w, cs]) => `"${w}" is the sign for ${cs.join(' and ')}`),
    `${byEn.size} different English words for ${keys.length} kanji`,
  );

  // The same, against every sense of every other kanji: a sign word another
  // kanji also means is a second right answer outside the sign list.
  const shared: string[] = [];
  for (const [c, s] of Object.entries(PLAY_SIGNS)) {
    const others = N5.filter(o => o !== c && SENSES.get(o)?.has(sense(s.en)));
    if (others.length) shared.push(`${c} "${s.en}" is also a meaning of ${others.join(' ')}`);
  }
  check('English signs vs. other kanji\'s meanings', shared, 'no English sign is a meaning of another N5 kanji');

  const built: string[] = [];
  for (const k of data.kanji) {
    if (Array.from(k.c).length !== 1) built.push(`${k.c}: not one code point`);
    if (k.meanings.length === 0) built.push(`${k.c}: no meanings`);
    if (k.readings.length === 0) built.push(`${k.c}: no readings`);
    for (const r of k.readings) if (!HIRAGANA.test(r)) built.push(`${k.c}: reading "${r}" is not hiragana, so a kana sign cannot match it`);
  }
  check('built kanji records', built, 'every built record is one code point with meanings and hiragana-only readings');
}

section('2. Worlds: the episodes in order, then the game-only worlds, every N5 kanji once');
{
  const problems: string[] = [];
  if (data.kanji.length !== N5.length) problems.push(`the game holds ${data.kanji.length} kanji, the N5 list ${N5.length}`);
  const inGame = new Set(data.kanji.map(k => k.c));
  for (const c of N5) if (!inGame.has(c)) problems.push(`${c} is on the N5 list but not in the game`);

  const worldOf = new Map<string, number[]>();
  data.worlds.forEach((w, i) => {
    if (w.n !== i + 1) problems.push(`world at position ${i + 1} is numbered ${w.n}`);
    if (w.kanji.length === 0) problems.push(`world ${w.n} "${w.title}" is empty`);
    if (!w.title.trim() || !w.titleJa.trim()) problems.push(`world ${w.n} has no title or no Japanese title`);
    for (const c of w.kanji) {
      if (!N5_SET.has(c)) problems.push(`world ${w.n} holds ${c}, which is not N5`);
      worldOf.set(c, [...(worldOf.get(c) ?? []), w.n]);
    }
  });
  for (const c of N5) {
    const ws = worldOf.get(c) ?? [];
    if (ws.length !== 1) problems.push(`${c} is in ${ws.length} worlds${ws.length ? ` (${ws.join(', ')})` : ''}`);
  }
  check('worlds cover N5', problems, `${data.worlds.length} worlds numbered 1-${data.worlds.length}, none empty, every one of the ${N5.length} N5 kanji in exactly one`);

  // Episodes first, in `number` order, each adding the focus kanji no earlier
  // episode taught; an episode that adds none is not a world. Then the
  // game-only worlds, never carrying an episode slug.
  const order: string[] = [];
  const firstGameOnly = data.worlds.findIndex(w => w.episodeSlug === null);
  const leading = firstGameOnly === -1 ? data.worlds : data.worlds.slice(0, firstGameOnly);
  const trailing = firstGameOnly === -1 ? [] : data.worlds.slice(firstGameOnly);
  for (const w of trailing) {
    if (w.episodeSlug !== null) order.push(`world ${w.n} is episode ${w.episodeSlug} but comes after a game-only world`);
  }
  const taught = new Set<string>();
  const episodeWorlds: string[] = [];
  let next = 0;
  for (const ep of [...EPISODES].sort((a, b) => a.number - b.number)) {
    const fresh = ep.focusKanji.filter(c => N5_SET.has(c) && !taught.has(c));
    const w = leading[next];
    if (fresh.length === 0) {
      if (w?.episodeSlug === ep.slug) order.push(`episode ${ep.number} adds no new kanji but is world ${w.n}`);
      continue;
    }
    if (!w || w.episodeSlug !== ep.slug) {
      order.push(`episode ${ep.number} (${ep.slug}) adds ${fresh.join('')} but world ${next + 1} is ${w ? w.episodeSlug ?? `"${w.title}"` : 'missing'}`);
      break;
    }
    if (w.title !== ep.titleEn || w.titleJa !== ep.titleJa) {
      order.push(`world ${w.n} is titled "${w.title}" / ${w.titleJa}, episode ${ep.number} "${ep.titleEn}" / ${ep.titleJa}`);
    }
    if (w.kanji.join('') !== fresh.join('')) {
      order.push(`world ${w.n} holds ${w.kanji.join('')}, episode ${ep.number}'s new focus kanji are ${fresh.join('')}`);
    }
    fresh.forEach(c => taught.add(c));
    episodeWorlds.push(`${w.n}=ep${ep.number}`);
    next += 1;
  }
  if (next !== leading.length) order.push(`${leading.length - next} leading world(s) carry an episode slug no registered episode explains`);

  let extra = 0;
  for (const w of trailing) {
    while (extra < EXTRA_WORLDS.length && EXTRA_WORLDS[extra].title !== w.title) extra += 1;
    const def = EXTRA_WORLDS[extra];
    if (!def) {
      order.push(`game-only world ${w.n} "${w.title}" is not in EXTRA_WORLDS, or is out of its order`);
      continue;
    }
    if (w.titleJa !== def.titleJa) order.push(`world ${w.n}: Japanese title ${w.titleJa}, EXTRA_WORLDS says ${def.titleJa}`);
    for (const c of w.kanji) if (!def.kanji.includes(c)) order.push(`world ${w.n} holds ${c}, which its EXTRA_WORLDS entry does not list`);
    extra += 1;
  }
  if (episodeWorldCount(data) !== next) order.push(`episodeWorldCount() says ${episodeWorldCount(data)}, the worlds say ${next}`);
  check(
    'world order',
    order,
    `${next} episode world(s) in number order (${episodeWorlds.join(' ')}), titles and new kanji matching the registry; ${trailing.length} game-only world(s) with no slug`,
  );
}

section('3. Look-alikes and powers');
{
  const problems: string[] = [];
  for (const [key, value] of Object.entries(LOOK_ALIKES)) {
    if (!N5_SET.has(key)) problems.push(`look-alike key ${key} is not N5`);
    const chars = Array.from(value);
    if (chars.length === 0) problems.push(`${key} has no look-alikes`);
    if (new Set(chars).size !== chars.length) problems.push(`${key}: "${value}" repeats a character`);
    for (const c of chars) {
      if (c === key) problems.push(`${key} lists itself as a look-alike`);
      if (!N5_SET.has(c)) problems.push(`${key} lists ${c}, which is not N5`);
    }
  }
  check('look-alikes', problems, `${Object.keys(LOOK_ALIKES).length} look-alike sets, every key and value an N5 kanji, none listing itself`);

  const powers: string[] = [];
  for (const [c, p] of Object.entries(POWERS)) {
    if (!N5_SET.has(c)) powers.push(`power ${c} is not N5`);
    // A power teaches its kanji by what it does; the word must be the one the sign uses.
    if (PLAY_SIGNS[c] && p.en !== PLAY_SIGNS[c].en) powers.push(`power ${c} says "${p.en}", its sign says "${PLAY_SIGNS[c].en}"`);
  }
  if (!N5_SET.has(MYSTERY_POWER)) powers.push(`the mystery power ${MYSTERY_POWER} is not N5`);
  if (MYSTERY_POWER in POWERS) powers.push(`the mystery power ${MYSTERY_POWER} is also an ordinary power`);
  check('powers', powers, `${Object.keys(POWERS).join('')} and the mystery box ${MYSTERY_POWER} are N5 kanji, each power's word its sign's word`);
}

section(`4. One right answer: every world × kanji × sign mode, ${DECOY_SEEDS} draws each`);
{
  // First without randomness: every tile that answers a sign must be one
  // clashes() rules out, or chooseDecoys() can offer it as a decoy.
  const gaps: string[] = [];
  for (const w of data.worlds) {
    const p = pool(data, w.n);
    for (const c of p) {
      for (const mode of SIGN_MODES) {
        const order = orderFor(c, mode);
        for (const x of p) {
          if (x !== c && answers(km.get(x)!, order) && !clashes(km, x, order)) {
            gaps.push(`world ${w.n} ${c}/${mode} "${order.text}": ${x} also answers it, and clashes() lets it be a decoy`);
          }
        }
      }
    }
  }
  check('clashes() catches every second answer', gaps, 'every tile that answers a sign is one clashes() rules out, in every world');

  const problems: string[] = [];
  let waves = 0;
  let fewest = { n: Infinity, where: '' };
  let lookAliked = 0;
  let lookAlikeChances = 0;
  for (const w of data.worlds) {
    const p = pool(data, w.n);
    const inPool = new Set(p);
    for (const c of p) {
      for (const mode of SIGN_MODES) {
        const order = orderFor(c, mode);
        const eligible = p.filter(x => !clashes(km, x, order)).length;
        if (eligible < fewest.n) fewest = { n: eligible, where: `world ${w.n} ${c}/${mode}` };
        const expected = Math.min(DECOYS, eligible);
        const look = Array.from(LOOK_ALIKES[c] ?? '').filter(x => inPool.has(x) && !clashes(km, x, order));
        for (let seed = 1; seed <= DECOY_SEEDS; seed++) {
          const decoys = chooseDecoys(data, km, order, w.n, DECOYS, seeded(seed * 7919 + c.codePointAt(0)! + w.n * 131 + (mode === 'kana' ? 17 : 0)));
          const where = `world ${w.n} ${c}/${mode} "${order.text}" seed ${seed}`;
          waves += 1;
          if (decoys.length === 0) problems.push(`${where}: no decoy at all`);
          else if (decoys.length !== expected) problems.push(`${where}: ${decoys.length} decoys, ${expected} were available`);
          if (new Set(decoys).size !== decoys.length) problems.push(`${where}: a decoy twice (${decoys.join('')})`);
          for (const d of decoys) {
            if (d === c) problems.push(`${where}: the target is its own decoy`);
            if (!inPool.has(d)) problems.push(`${where}: decoy ${d} is not unlocked by world ${w.n}`);
            if (clashes(km, d, order)) problems.push(`${where}: decoy ${d} clashes with the sign`);
            if (answers(km.get(d)!, order)) problems.push(`${where}: decoy ${d} also answers the sign`);
          }
          if (w.n >= 2 && look.length > 0) {
            lookAlikeChances += 1;
            if (look.includes(decoys[0])) lookAliked += 1;
          }
        }
      }
    }
  }
  check(
    'decoys',
    problems,
    `${waves} waves: at least one decoy each (fewest available ${fewest.n}, ${fewest.where}), all distinct, unlocked, never the target, none answering the sign`,
  );
  console.log(`        a look-alike led ${Math.round((lookAliked / Math.max(1, lookAlikeChances)) * 100)}% of the waves from world 2 that had one unlocked`);
}

section('5. Which kanji the sign asks for, and in which script');
{
  const problems: string[] = [];
  let mixKana = 0;
  let mixEn = 0;
  let asked = 0;

  const orderProblems = (o: Order, ctx: OrderContext, where: string): void => {
    asked += 1;
    const p = pool(data, ctx.world);
    const k = km.get(o.c);
    if (!p.includes(o.c) || !k) {
      problems.push(`${where}: asked ${o.c}, which world ${ctx.world} has not unlocked`);
      return;
    }
    if (ctx.last !== null && p.length > 1 && o.c === ctx.last) problems.push(`${where}: asked ${o.c} twice in a row`);
    if (ctx.setting === 'en' && o.mode !== 'en') problems.push(`${where}: a kana sign under the English setting`);
    if (ctx.setting === 'kana' && o.mode !== 'kana') problems.push(`${where}: an English sign under the kana setting`);
    if (ctx.setting === 'mix' && o.mode === 'kana') {
      if (ctx.world < 3) problems.push(`${where}: a kana sign in world ${ctx.world}, before world 3`);
      if ((ctx.seen.get(o.c) ?? 0) === 0 && (ctx.dex[o.c] ?? 0) === 0) {
        problems.push(`${where}: a kana sign for ${o.c}, never caught this run or before`);
      }
    }
    if (ctx.setting === 'mix' && ctx.world >= 3) {
      if (o.mode === 'kana') mixKana += 1;
      else mixEn += 1;
    }
    if (o.text !== (o.mode === 'en' ? k.en : k.kana)) problems.push(`${where}: sign text "${o.text}" is not ${o.c}'s ${o.mode} sign`);
  };

  // Random contexts: any mix of catches this run, Kanji-dex and previous target.
  for (const w of data.worlds) {
    const p = pool(data, w.n);
    for (const setting of SETTINGS) {
      for (let seed = 1; seed <= ORDER_SEEDS; seed++) {
        const r = seeded(seed * 104729 + w.n * 31 + SETTINGS.indexOf(setting));
        const seen = new Map<string, number>();
        for (const c of p) if (r() < 0.3) seen.set(c, 1 + Math.floor(r() * 3));
        const dex: Record<string, number> = {};
        if (r() >= 0.3) for (const c of N5) if (r() < 0.4) dex[c] = 1 + Math.floor(r() * 5);
        const last = r() < 0.2 ? null : p[Math.floor(r() * p.length)];
        const ctx: OrderContext = { world: w.n, setting, seen, dex, last };
        orderProblems(chooseOrder(data, km, ctx, seeded(seed)), ctx, `world ${w.n} ${setting} seed ${seed}`);
      }
    }
  }

  // Whole runs: each target becomes `last`, most get caught. Half the runs are
  // a first-ever player (empty Kanji-dex), whose first sign is never kana.
  for (const w of data.worlds) {
    for (const setting of SETTINGS) {
      for (let seed = 1; seed <= RUN_SEEDS; seed++) {
        const r = seeded(seed * 65537 + w.n * 7 + SETTINGS.indexOf(setting));
        const dex: Record<string, number> = {};
        if (seed % 2 === 0) for (const c of N5) if (r() < 0.5) dex[c] = 1;
        const seen = new Map<string, number>();
        let last: string | null = null;
        for (let wave = 0; wave < RUN_WAVES; wave++) {
          const ctx: OrderContext = { world: w.n, setting, seen: new Map(seen), dex, last };
          const o = chooseOrder(data, km, ctx, r);
          orderProblems(o, ctx, `run world ${w.n} ${setting} seed ${seed} wave ${wave + 1}`);
          if (r() < 0.7) seen.set(o.c, (seen.get(o.c) ?? 0) + 1);
          last = o.c;
        }
      }
    }
  }

  if (mixKana === 0) problems.push('the mix setting never asked in kana, even for kanji already caught from world 3');
  if (mixEn === 0) problems.push('the mix setting never asked in English from world 3');
  check(
    'chooseOrder()',
    problems,
    `${asked} targets: always unlocked, never twice in a row, English/kana settings obeyed, mix kana only from world 3 for a kanji already caught (${Math.round((mixKana / Math.max(1, mixKana + mixEn)) * 100)}% kana there)`,
  );
}

section('6. The return-visit model (mk-visit)');
{
  const addDays = (day: string, n: number): string => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };

  /** One synthetic browser: its stored `mk-visit` string and the events it sent. */
  class Browser {
    fires: { day: string; played: 'yes' | 'no' }[] = [];
    writes = 0;
    stored: string | null;
    private problems: string[];
    constructor(stored: string | null, problems: string[]) {
      this.stored = stored;
      this.problems = problems;
    }
    view(day: string) {
      const step = onPageView(parseVisitState(this.stored), day);
      if (step.fire && !(step.write && step.write.done)) {
        this.problems.push(`${day}: fired without closing its cohort, so the next view could fire again`);
      }
      if (step.write) {
        this.stored = JSON.stringify(step.write);
        this.writes += 1;
      }
      if (step.fire) this.fires.push({ day, played: step.fire.played });
      return step;
    }
    catch(day: string) {
      const next = onCatch(parseVisitState(this.stored), day);
      if (next) {
        this.stored = JSON.stringify(next);
        this.writes += 1;
      }
      return next;
    }
    get state(): VisitState | null {
      const read = parseVisitState(this.stored);
      return read.kind === 'ok' ? read.state : null;
    }
  }

  // Month and year ends, a leap day, and both DST changes on both sides of the Atlantic.
  const ANCHORS = ['2026-10-11', '2026-10-25', '2026-11-01', '2026-12-28', '2027-02-25', '2027-03-14', '2027-03-28', '2028-02-26'];
  const expect = (problems: string[], label: string, actual: unknown, wanted: unknown) => {
    if (!same(actual, wanted)) problems.push(`${label}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
  };

  {
    const problems: string[] = [];
    for (const a of ANCHORS) {
      const b = new Browser(null, problems);
      expect(problems, `${a} first view`, b.view(a), { write: { v: 1, anchor: a, played: false, done: false }, fire: null });
      for (let i = 0; i < 3; i++) expect(problems, `${a} same-day view ${i + 2}`, b.view(a), { write: null, fire: null });
    }
    check('first view', problems, `the first view writes {anchor: today, played: false, done: false} and fires nothing; more views that day do nothing (${ANCHORS.length} anchors)`);
  }

  {
    const problems: string[] = [];
    for (const a of ANCHORS) {
      for (let k = 1; k <= RETURN_WINDOW_DAYS; k++) {
        const b = new Browser(null, problems);
        b.view(a);
        const back = addDays(a, k);
        expect(problems, `${a} back after ${k} day(s)`, b.view(back), { write: { v: 1, anchor: a, played: false, done: true }, fire: { played: 'no' } });
        b.view(back);
        for (let later = k + 1; later <= k + 40; later++) b.view(addDays(a, later));
        expect(problems, `${a} +${k}: events in the following 40 days`, b.fires.length, 1);
      }
    }
    check('visitor returns', problems, `a view 1-${RETURN_WINDOW_DAYS} days after the anchor fires played=no once and closes; nothing fires after it`);
  }

  {
    const problems: string[] = [];
    for (const a of ANCHORS) {
      for (let k = RETURN_WINDOW_DAYS + 1; k <= 30; k++) {
        const b = new Browser(null, problems);
        b.view(a);
        expect(problems, `${a} first back after ${k} days`, b.view(addDays(a, k)), { write: { v: 1, anchor: a, played: false, done: true }, fire: null });
        for (let later = k; later <= k + 20; later++) b.view(addDays(a, later));
        expect(problems, `${a} +${k}: events`, b.fires.length, 0);
      }
    }
    check('visitor never returns in time', problems, `${RETURN_WINDOW_DAYS + 1}+ days with no return closes the cohort with no event, and it stays closed`);
  }

  {
    const problems: string[] = [];
    for (const a of ANCHORS) {
      // From every visitor state: never seen, open, reported, timed out.
      const paths: [string, number[]][] = [
        ['never seen', []],
        ['open visitor', [0]],
        ['visitor that reported', [0, 1]],
        ['visitor that timed out', [0, 9]],
      ];
      for (const [label, views] of paths) {
        const b = new Browser(null, problems);
        for (const d of views) b.view(addDays(a, d));
        const before = b.fires.length;
        const catchDay = addDays(a, 10);
        expect(problems, `${a} ${label}: first catch`, b.catch(catchDay), { v: 1, anchor: catchDay, played: true, done: false });
        expect(problems, `${a} ${label}: a view on the catch day`, b.view(catchDay), { write: null, fire: null });
        expect(problems, `${a} ${label}: a second catch`, b.catch(addDays(catchDay, 1)), null);
        const back = addDays(catchDay, 3);
        expect(problems, `${a} ${label}: back 3 days after the catch`, b.view(back), { write: { v: 1, anchor: catchDay, played: true, done: true }, fire: { played: 'yes' } });
        for (let later = 4; later <= 40; later++) b.view(addDays(catchDay, later));
        expect(problems, `${a} ${label}: a catch after the player reported`, b.catch(addDays(catchDay, 41)), null);
        b.view(addDays(catchDay, 42));
        expect(problems, `${a} ${label}: played=yes events`, b.fires.slice(before).map(f => f.played), ['yes']);
      }
      for (let k = 1; k <= 30; k++) {
        const b = new Browser(null, problems);
        b.catch(a);
        b.view(addDays(a, k));
        expect(problems, `${a} player back after ${k} days`, b.fires.map(f => f.played), k <= RETURN_WINDOW_DAYS ? ['yes'] : []);
      }
    }
    check(
      'player cohort',
      problems,
      'the first catch re-anchors any visitor, even a closed one, on the catch day as a player; a view 1-7 days later fires played=yes once; a second catch changes nothing',
    );
  }

  {
    const problems: string[] = [];
    const UNKNOWN = [
      'not json', '', 'null', '[]', '1', '"2026-10-11"', '{}',
      '{"v":2,"anchor":"2026-10-11","played":false,"done":false}',
      '{"v":1,"anchor":"2026-1-1","played":false,"done":false}',
      '{"v":1,"anchor":"11/10/2026","played":false,"done":false}',
      '{"v":1,"anchor":"2026-10-11","played":"no","done":false}',
      '{"v":1,"anchor":"2026-10-11","played":false}',
    ];
    for (const raw of UNKNOWN) {
      if (parseVisitState(raw).kind !== 'unknown') problems.push(`${JSON.stringify(raw)} parses as ${parseVisitState(raw).kind}`);
      const b = new Browser(raw, problems);
      for (let k = 0; k <= 10; k++) b.view(addDays('2026-10-11', k));
      b.catch('2026-10-13');
      b.view('2026-10-15');
      if (b.stored !== raw || b.writes !== 0) problems.push(`${JSON.stringify(raw)} was overwritten`);
      if (b.fires.length) problems.push(`${JSON.stringify(raw)} fired ${b.fires.length} event(s)`);
    }
    if (parseVisitState(null).kind !== 'none') problems.push('a missing key does not parse as none');
    const s: VisitState = { v: 1, anchor: '2026-10-11', played: true, done: false };
    const round = parseVisitState(JSON.stringify(s));
    if (round.kind !== 'ok' || !same(round.state, s)) problems.push(`a written state does not read back: ${JSON.stringify(round)}`);
    check('unrecognised state', problems, `${UNKNOWN.length} unrecognised shapes are never overwritten and never fire; a written state reads back exactly`);
  }

  {
    // Synthetic browsers against the header's rules, restated here on day
    // numbers: anchor on the first view, re-anchor on the first catch, report
    // the first view 1-7 days after the anchor, close silently after 7.
    const problems: string[] = [];
    const BASE = '2026-10-12';
    let events = 0;
    let catchers = 0;
    for (let i = 1; i <= WALKERS; i++) {
      const r = seeded(i * 2654435761);
      const b = new Browser(null, problems);
      const model = { anchor: null as number | null, played: false, closed: false };
      const expected: { day: string; played: 'yes' | 'no' }[] = [];
      const visitRate = 0.05 + r() * 0.5;
      for (let d = 0; d < WALK_DAYS; d++) {
        if (r() >= visitRate) continue;
        const day = addDays(BASE, d);
        const views = 1 + Math.floor(r() * 3);
        for (let v = 0; v < views; v++) {
          if (model.anchor === null) {
            model.anchor = d;
          } else if (!model.closed && d > model.anchor) {
            if (d - model.anchor <= RETURN_WINDOW_DAYS) expected.push({ day, played: model.played ? 'yes' : 'no' });
            model.closed = true;
          }
          b.view(day);
          if (r() < 0.04) {
            if (!model.played) {
              model.played = true;
              model.anchor = d;
              model.closed = false;
              catchers += 1;
            }
            b.catch(day);
          }
        }
      }
      events += b.fires.length;
      if (!same(b.fires, expected)) problems.push(`browser ${i}: fired ${JSON.stringify(b.fires)}, the rules say ${JSON.stringify(expected)}`);
      if (b.fires.length > 2) problems.push(`browser ${i}: ${b.fires.length} events, the cap is two`);
      if (b.fires.filter(f => f.played === 'no').length > 1 || b.fires.filter(f => f.played === 'yes').length > 1) {
        problems.push(`browser ${i}: a cohort reported twice (${JSON.stringify(b.fires)})`);
      }
    }
    check(
      'random walks',
      problems,
      `${WALKERS} browsers over ${WALK_DAYS} days (${catchers} became players) sent exactly the events the rules predict: ${events} in all, never more than two per browser`,
    );
  }

  {
    const problems: string[] = [];
    const pairs: [string, string, number][] = [
      ['2026-10-11', '2026-10-11', 0],
      ['2026-10-11', '2026-10-18', 7],
      ['2026-10-18', '2026-10-11', -7],
      ['2026-01-31', '2026-02-01', 1],
      ['2026-04-30', '2026-05-01', 1],
      ['2026-12-31', '2027-01-01', 1],
      ['2026-12-28', '2027-01-04', 7],
      ['2027-02-28', '2027-03-01', 1],
      ['2028-02-28', '2028-03-01', 2],
      ['2028-02-29', '2028-03-07', 7],
      ['2026-03-07', '2026-03-09', 2], // US clocks forward 8 Mar
      ['2026-03-28', '2026-03-30', 2], // EU clocks forward 29 Mar
      ['2026-10-24', '2026-10-26', 2], // EU clocks back 25 Oct
      ['2026-10-31', '2026-11-02', 2], // US clocks back 1 Nov
      ['2026-04-04', '2026-04-06', 2], // Sydney clocks back 5 Apr
    ];
    for (const [a, b, n] of pairs) if (daysBetween(a, b) !== n) problems.push(`daysBetween(${a}, ${b}) = ${daysBetween(a, b)}, expected ${n}`);
    const base = '2025-12-30';
    for (let n = 0; n <= 800; n++) {
      const day = addDays(base, n);
      if (daysBetween(base, day) !== n || daysBetween(day, base) !== -n) problems.push(`daysBetween(${base}, ${day}) is not ${n}`);
    }
    check('daysBetween()', problems, `${pairs.length} pinned pairs across month and year ends, leap days and DST, and every day for 800 days, both ways`);
  }

  {
    // localDay() is the one function here that reads the clock's zone. Run it
    // in zones with DST at 02:00, at midnight (Santiago) and by 30 minutes
    // (Lord Howe), at 00:30, noon and 23:30 local, for every day of 2+ years.
    const problems: string[] = [];
    const ZONES = ['UTC', 'Europe/Athens', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Santiago', 'Australia/Lord_Howe', 'Pacific/Auckland', 'Asia/Tokyo'];
    const TIMES: [number, number][] = [[0, 30], [12, 0], [23, 30]];
    const original = process.env.TZ;
    const offsets = new Set<number>();
    const start = '2025-12-25';
    try {
      for (const zone of ZONES) {
        process.env.TZ = zone;
        offsets.add(new Date(2026, 0, 15, 12).getTimezoneOffset());
        let previous: string | null = null;
        for (let n = 0; n <= 830; n++) {
          const want = addDays(start, n);
          for (const [h, mi] of TIMES) {
            const got = localDay(new Date(2025, 11, 25 + n, h, mi));
            if (!DAY.test(got) || got !== want) problems.push(`${zone} ${want} ${h}:${String(mi).padStart(2, '0')}: localDay() = ${got}`);
          }
          const today = localDay(new Date(2025, 11, 25 + n, 12));
          if (previous !== null && daysBetween(previous, today) !== 1) problems.push(`${zone}: ${previous} -> ${today} is ${daysBetween(previous, today)} days`);
          previous = today;
        }
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
    if (offsets.size < 5) problems.push(`setting TZ changed the offset in only ${offsets.size} of ${ZONES.length} zones, so localDay() was not exercised across them`);
    check('localDay()', problems, `${ZONES.length} time zones, 831 consecutive days at 00:30, 12:00 and 23:30: one calendar day each, consecutive days 1 apart`);
  }

  {
    // The browser glue never throws: no window (server), storage that throws
    // on read (blocked) or on write (full), and a working store.
    const problems: string[] = [];
    const g = global as unknown as Record<string, unknown>;
    const hadWindow = 'window' in g;
    const savedWindow = g.window;
    const attempt = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (error) {
        problems.push(`${label} threw: ${(error as Error).message}`);
      }
    };
    const install = (localStorage: Pick<Storage, 'getItem' | 'setItem'>) => {
      g.window = { localStorage };
    };
    const fail =
      (message: string) =>
      (): never => {
        throw new Error(message);
      };
    try {
      delete g.window;
      attempt('readVisit() with no window', () => expect(problems, 'readVisit() with no window', readVisit().kind, 'unknown'));
      attempt('writeVisit() with no window', () => writeVisit({ v: 1, anchor: '2026-10-11', played: false, done: false }));

      const mem = new Map<string, string>();
      install({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
      const s: VisitState = { v: 1, anchor: '2026-10-11', played: false, done: false };
      attempt('a working store', () => {
        expect(problems, 'readVisit() on an empty store', readVisit().kind, 'none');
        writeVisit(s);
        expect(problems, 'what writeVisit() stored', mem.get(VISIT_STORAGE_KEY), JSON.stringify(s));
        expect(problems, 'readVisit() after writeVisit()', readVisit(), { kind: 'ok', state: s });
      });

      install({ getItem: fail('blocked'), setItem: fail('blocked') });
      attempt('readVisit() on blocked storage', () => expect(problems, 'readVisit() on blocked storage', readVisit().kind, 'unknown'));
      attempt('writeVisit() on blocked storage', () => writeVisit(s));

      install({ getItem: () => null, setItem: fail('QuotaExceededError') });
      attempt('writeVisit() on full storage', () => writeVisit(s));
    } finally {
      if (hadWindow) g.window = savedWindow;
      else delete g.window;
    }
    check('browser glue', problems, 'readVisit()/writeVisit() round-trip `mk-visit` and never throw: no window, blocked storage, full storage');
  }
}

section('7. Goal names, storage keys, and the tracker mount');
{
  const problems: string[] = [];
  const goals = [...Object.values(PLAY_GOALS), SITE_RETURN_GOAL];
  for (const g of goals) if (!SNAKE.test(g)) problems.push(`goal "${g}" is not snake_case`);
  if (new Set(goals).size !== goals.length) problems.push(`goal names repeat: ${goals.join(', ')}`);
  if (!same(CATCH_MILESTONES, [1, 3])) problems.push(`CATCH_MILESTONES is ${JSON.stringify(CATCH_MILESTONES)}; the pre-registered engagement bar counts the 1st and 3rd catch`);
  // The pass mark is "come back within 7 days", and the privacy policy says "within a week".
  if (RETURN_WINDOW_DAYS !== 7) problems.push(`RETURN_WINDOW_DAYS is ${RETURN_WINDOW_DAYS}; the pre-registered window is 7 days`);
  check('goals', problems, `${goals.length} distinct snake_case goals (${goals.join(', ')}), catch milestones [1, 3], a 7-day window`);

  const keys: string[] = [];
  const taken = ['kanji-progress', 'kanji-srs', 'mk-announcements', 'cookie-consent'];
  if (PLAY_STORAGE_KEY !== 'mk-play' || VISIT_STORAGE_KEY !== 'mk-visit') {
    keys.push(`storage keys are ${PLAY_STORAGE_KEY} and ${VISIT_STORAGE_KEY}; the privacy policy header names mk-play and mk-visit`);
  }
  for (const k of [PLAY_STORAGE_KEY, VISIT_STORAGE_KEY]) if (taken.includes(k)) keys.push(`${k} is already another feature's key`);
  check('storage keys', keys, `${PLAY_STORAGE_KEY} and ${VISIT_STORAGE_KEY}, clear of ${taken.join(', ')}`);

  // Without the site-wide mount nothing fires site_visit_return, and the test
  // would read a 0% return rate for both cohorts with no error anywhere.
  const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
  check(
    'tracker mount',
    layout.includes('<ReturnVisitTracker') ? [] : ['app/layout.tsx does not render <ReturnVisitTracker />, so site_visit_return never fires'],
    'app/layout.tsx renders <ReturnVisitTracker /> on every page',
  );
}

section('The worlds');
for (const w of data.worlds) {
  console.log(`  ${String(w.n).padStart(2)}  ${(w.episodeSlug ? `ep  ${w.title}` : `    ${w.title}`).padEnd(36)} ${w.kanji.join('')}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
