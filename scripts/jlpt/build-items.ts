/**
 * scripts/jlpt/build-items.ts
 *
 *   npx tsx --tsconfig tsconfig.json scripts/jlpt/build-items.ts [--force]
 *
 * Builds the review file for the "JLPT format" quiz: 5 sets x (7 Mondai 1 + 5 Mondai 2)
 * items, from the reviewed N5 example sentences.
 *
 *   Mondai 1  kanji reading      the word is underlined in kanji; pick its kana
 *   Mondai 2  orthography        the word is underlined in kana;  pick its kanji
 *
 * The stem and the right answer come from `data/sentences/published/N5.json`, whose
 * readings a human has already reviewed. The only new, unreviewed thing is the three
 * distractors per item, and they are generated here from JLPT-style confusions:
 *
 *   Mondai 1  long vowel, dakuten, small っ, small ゃゅょ, on/kun swap
 *   Mondai 2  a look-alike or same-reading N5 kanji in place of one character
 *
 * This script NEVER approves anything: every item is written `pending`. Nothing reaches
 * the site until Ari flips it to `approved` and `publish-items.ts` compiles it. Because
 * the review file holds those verdicts, an existing file is never overwritten without
 * `--force`.
 *
 * Output:
 *   data/jlpt/review/N5.json   the machine-readable review file
 *   data/jlpt/review/N5.csv    the same, one row per item, for reading in a spreadsheet
 *
 * Deterministic: no clock, no Math.random. Re-running yields byte-identical files.
 *
 * Provenance: the pool of words below is hand-picked from the targets of reviewed
 * sentences. It is deliberately NOT filtered through a third-party JLPT vocabulary list
 * (the content-provenance rule excludes those). Words I think may be above N5 are listed
 * under `excluded` in the output instead of being used, so the call is Ari's.
 */

import fs from 'node:fs';
import path from 'node:path';
import { N5_KANJI } from '../../lib/constants/n5-kanji';
import { parseReadingField } from '../../lib/romaji/readings';
import { ALSO_VALID } from '../../lib/jlpt/also-valid';
import type {
  DistractorRule,
  ItemSource,
  MondaiNumber,
  ReviewDistractor,
  ReviewFile,
  ReviewItem,
} from '../../lib/jlpt/types';

const ROOT = path.resolve(__dirname, '../..');
const PUBLISHED = path.join(ROOT, 'data/sentences/published/N5.json');
const OUT_DIR = path.join(ROOT, 'data/jlpt/review');
const OUT_JSON = path.join(OUT_DIR, 'N5.json');
const OUT_CSV = path.join(OUT_DIR, 'N5.csv');

const SETS = 5;
const M1_PER_SET = 7;
const M2_PER_SET = 5;

/* ───────────────────────────── Source sentences ───────────────────────────── */

interface Tok { surface: string; reading?: string }
interface Sentence {
  id: string;
  japanese: string;
  english: string;
  tokens: Tok[];
  source: { japanese: { sentenceId: number; contributor: string | null; license: ItemSource['license']; url: string } };
}

const sentences: Sentence[] = JSON.parse(fs.readFileSync(PUBLISHED, 'utf8'));

const KANJI_RE = /[一-鿿]/;
const isKanji = (c: string) => KANJI_RE.test(c);

/* ─────────────────────────────── The word pool ─────────────────────────────── */

/**
 * Words eligible as a target, as `surface:reading`. Each must appear as a single token
 * with exactly that reviewed reading in a published sentence. Inflected fragments the
 * tokenizer produces (読ん, 食べ, 行っ …) are left out: a learner reads 読んで, not 読ん.
 */
const POOL: string[] = `
一円:いちえん 七時:しちじ 三時:さんじ 九時:くじ 三百:さんびゃく 三十分:さんじゅっぷん
中国:ちゅうごく 中国人:ちゅうごくじん 中国語:ちゅうごくご 二人:ふたり 五月:ごがつ
人間:にんげん 今年:ことし 今日:きょう 今月:こんげつ 先月:せんげつ 先生:せんせい
八日:ようか 八月:はちがつ 六月:ろくがつ 十一月:じゅういちがつ 十分:じゅうぶん
午前:ごぜん 午後:ごご 半分:はんぶん 半年:はんとし 名前:なまえ 四月:しがつ
外国:がいこく 大学:だいがく 大学生:だいがくせい 天気:てんき 学校:がっこう 学生:がくせい
小学校:しょうがっこう 日本:にほん 日本人:にほんじん 日本語:にほんご 時間:じかん
来年:らいねん 毎年:まいとし 気分:きぶん 電気:でんき 電話:でんわ 電車:でんしゃ 高校:こうこう
校長:こうちょう 白い:しろい 長い:ながい 高い:たかい
三つ:みっつ 六つ:むっつ 八つ:やっつ 休み:やすみ 下さい:ください 友だち:ともだち
子ども:こども 小さい:ちいさい 出かける:でかける 話す:はなす 読む:よむ 後ろ:うしろ
母さん:かあさん 父さん:とうさん
水:みず 山:やま 川:かわ 雨:あめ 車:くるま 右:みぎ 左:ひだり 東:ひがし 西:にし
南:みなみ 北:きた 母:はは 父:ちち 男:おとこ 女:おんな 月:つき 刀:かたな 国:くに
`.trim().split(/\s+/);

/**
 * Words in the corpus's targets that I would NOT put in front of an N5 candidate without
 * Ari's say-so. Not used; reported in the output. The reasons are my judgement, not a
 * vocabulary list's.
 */
const INCLUDED_BUT_FLAGGED: Record<string, string> = {
  校長: 'word may be above N5 (kept so Mondai 2 has 25 usable words): your call',
};

const EXCLUDED: Record<string, string> = {
  '本気:ほんき': 'colloquial; likely above N5',
  '一生:いっしょう': 'abstract; likely above N5',
  '万一:まんいち': 'likely above N5',
  '一雨:ひとあめ': 'literary; likely above N5',
  '中小:ちゅうしょう': 'business term; likely above N5',
  '北国:きたぐに': 'literary; likely above N5',
  '南北:なんぼく': 'likely above N5',
  '天国:てんごく': 'likely above N5',
  '年上:としうえ': 'possibly N4',
  '人前:ひとまえ': 'possibly N4',
  '時半:じはん': 'a fragment of 〜時半, not a word on its own',
  '一千:いっせん': 'unnatural; 千 alone is the usual spelling',
  '山分け:やまわけ': 'colloquial; likely above N5',
  '友人:ゆうじん': 'possibly N4',
  '外出:がいしゅつ': 'possibly N4',
  '読書:どくしょ': 'possibly N4',
  '休日:きゅうじつ': 'possibly N4',
  '先日:せんじつ': 'possibly N4',
  '半日:はんにち': 'also valid as はんじつ',
  '女子:じょし': 'possibly N4',
  '男子:だんし': 'possibly N4',
  '電子:でんし': 'likely above N5',
  '火山:かざん': 'possibly N4',
  '二十四時間:にじゅうよじかん': 'long; the reading is a chain of exceptions',
  '何:なに': 'the reading depends on the next word (なに/なん); no single right answer',
  '十:じゅう': 'とお is also valid in many contexts',
  '上:うえ': 'のぼ・あ・かみ are valid in other words; the stem alone is ambiguous',
  '下:した': 'same ambiguity as 上',
};

/* ───────────────────────────── Deterministic PRNG ───────────────────────────── */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A stable pseudo-random number in [0,1) for a string key. */
const rnd = (key: string) => hash(key) / 4294967296;

function seededOrder<T>(items: T[], key: (t: T) => string, salt: string): T[] {
  return [...items].sort((a, b) => rnd(salt + key(a)) - rnd(salt + key(b)) || key(a).localeCompare(key(b)));
}

/* ─────────────────────────── Kana-level distractors ─────────────────────────── */

const VOICE_PAIRS: [string, string][] = [
  ['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'],
  ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'],
  ['た', 'だ'], ['て', 'で'], ['と', 'ど'],
  ['は', 'ば'], ['ひ', 'び'], ['ふ', 'ぶ'], ['へ', 'べ'], ['ほ', 'ぼ'],
  ['ば', 'ぱ'], ['び', 'ぴ'], ['ぶ', 'ぷ'], ['べ', 'ぺ'], ['ぼ', 'ぽ'],
];
const VOICING = new Map<string, string[]>();
for (const [a, b] of VOICE_PAIRS) {
  VOICING.set(a, [...(VOICING.get(a) ?? []), b]);
  VOICING.set(b, [...(VOICING.get(b) ?? []), a]);
}

const SMALL = new Set('ゃゅょ'.split(''));
const O_ROW = new Set('おこそとのほもよろをごぞどぼぽょ'.split(''));
const U_ROW = new Set('うくすつぬふむゆるぐずづぶぷゅ'.split(''));
const E_ROW = new Set('えけせてねへめれげぜでべぺ'.split(''));
const KANA_BASE_OF_SMALL: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };

type Cand = { text: string; rule: DistractorRule; /** lower is preferred within a rule */ pri?: number };

function dakutenCands(r: string): Cand[] {
  const out: Cand[] = [];
  [...r].forEach((c, i) => {
    for (const v of VOICING.get(c) ?? []) {
      // 'は' and the particle-like は are fine; keep the first mora untouched only when the
      // word is a single mora, otherwise any position is a plausible slip.
      out.push({ text: r.slice(0, i) + v + r.slice(i + 1), rule: 'dakuten' });
    }
  });
  return out;
}

function smallTsuCands(r: string): Cand[] {
  const out: Cand[] = [];
  const chars = [...r];
  chars.forEach((c, i) => {
    if (c === 'っ') out.push({ text: chars.slice(0, i).concat(chars.slice(i + 1)).join(''), rule: 'small-tsu' });
  });
  if (!r.includes('っ')) {
    const SOKUON_NEXT = new Set('かきくけこさしすせそたちつてとぱぴぷぺぽ'.split(''));
    for (let i = 1; i < chars.length; i++) {
      // Never after ん, っ or the second mora of a long vowel: "とうっさん" is not a slip anyone makes.
      if ('んっうい'.includes(chars[i - 1]) || SMALL.has(chars[i])) continue;
      if (SOKUON_NEXT.has(chars[i])) {
        out.push({ text: chars.slice(0, i).join('') + 'っ' + chars.slice(i).join(''), rule: 'small-tsu' });
      }
    }
  }
  return out;
}

function smallKanaCands(r: string): Cand[] {
  const out: Cand[] = [];
  [...r].forEach((c, i) => {
    if (SMALL.has(c)) {
      for (const o of SMALL) if (o !== c) out.push({ text: r.slice(0, i) + o + r.slice(i + 1), rule: 'small-kana' });
      out.push({ text: r.slice(0, i) + KANA_BASE_OF_SMALL[c] + r.slice(i + 1), rule: 'small-kana' });
    }
  });
  return out;
}

function longVowelCands(r: string): Cand[] {
  const out: Cand[] = [];
  const chars = [...r];
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1];
    const c = chars[i];
    // Drop a long-vowel mora: おう, ゆう, えい, おお ...
    const isLong =
      (c === 'う' && (O_ROW.has(prev) || U_ROW.has(prev))) ||
      (c === 'い' && E_ROW.has(prev)) ||
      (c === 'お' && prev === 'お');
    if (isLong) out.push({ text: chars.slice(0, i).concat(chars.slice(i + 1)).join(''), rule: 'long-vowel' });
  }
  // Add a long vowel inside the word (never at the very end: "きたう" is noise, not a slip).
  for (let i = 0; i < chars.length - 1; i++) {
    const c = chars[i];
    const nxt = chars[i + 1];
    if (nxt === 'う' || nxt === 'い' || nxt === 'ー' || nxt === 'ん' || nxt === 'っ') continue;
    if (c === 'っ' || c === 'ん') continue;
    if (O_ROW.has(c) || U_ROW.has(c)) {
      out.push({ text: chars.slice(0, i + 1).join('') + 'う' + chars.slice(i + 1).join(''), rule: 'long-vowel', pri: 1 });
    } else if (E_ROW.has(c)) {
      out.push({ text: chars.slice(0, i + 1).join('') + 'い' + chars.slice(i + 1).join(''), rule: 'long-vowel', pri: 1 });
    }
  }
  return out;
}

/* ───────────────────────── Per-kanji readings and alignment ───────────────────── */

interface KanjiInfo { on: string[]; kun: string[] }
const INFO = new Map<string, KanjiInfo>();
for (const k of N5_KANJI) {
  const on = parseReadingField(k.onyomi, 'onyomi').filter(r => r.affix === 'none').map(r => r.kana);
  const kun = parseReadingField(k.kunyomi, 'kunyomi').filter(r => r.affix !== 'prefix').map(r => r.kana);
  INFO.set(k.kanji, { on: [...new Set(on)], kun: [...new Set(kun)] });
}
const N5_SET = new Set(INFO.keys());

/** Spellings one reading stem takes inside a compound (rendaku, gemination, handakuten). */
function sandhi(stem: string): string[] {
  const out = new Set<string>([stem]);
  const first = [...stem][0];
  for (const v of VOICING.get(first) ?? []) out.add(v + stem.slice(first.length));
  const last = [...stem].pop() as string;
  if (stem.length > 1 && 'つくちき'.includes(last)) out.add(stem.slice(0, -1) + 'っ');
  return [...out];
}

/** Candidate surface forms of one kanji as it appears in `reading`, tagged with their stem. */
function kanjiForms(k: string): { form: string; stem: string; kind: 'on' | 'kun' }[] {
  const info = INFO.get(k);
  if (!info) return [];
  const forms: { form: string; stem: string; kind: 'on' | 'kun' }[] = [];
  for (const s of info.on) for (const f of sandhi(s)) forms.push({ form: f, stem: s, kind: 'on' });
  for (const s of info.kun) for (const f of sandhi(s)) forms.push({ form: f, stem: s, kind: 'kun' });
  // Numerals and a few others take a long-vowel or ん-final shape we do not store.
  return forms;
}

interface Seg { form: string; stem: string; kind: 'on' | 'kun' }

/** Split `reading` into one segment per kanji, or null if our data cannot explain it. */
function align(kanjiChars: string[], reading: string): Seg[] | null {
  const walk = (i: number, pos: number): Seg[] | null => {
    if (i === kanjiChars.length) return pos === reading.length ? [] : null;
    const forms = kanjiForms(kanjiChars[i]).sort((a, b) => b.form.length - a.form.length);
    for (const f of forms) {
      if (reading.startsWith(f.form, pos)) {
        const rest = walk(i + 1, pos + f.form.length);
        if (rest) return [f, ...rest];
      }
    }
    return null;
  };
  return walk(0, 0);
}

function onKunCands(surface: string, reading: string): Cand[] {
  // Split the kanji stem from trailing okurigana; the okurigana is common to both strings.
  const m = surface.match(/^([一-鿿]+)([぀-ゟ]*)$/);
  if (!m) return [];
  const [, kanjiPart, tail] = m;
  if (!reading.endsWith(tail)) return [];
  const stemReading = reading.slice(0, reading.length - tail.length);
  const kanjiChars = [...kanjiPart];
  const segs = align(kanjiChars, stemReading);
  if (!segs) return [];
  const out: Cand[] = [];
  kanjiChars.forEach((k, i) => {
    const used = segs[i];
    const info = INFO.get(k)!;
    const alts = [...info.on, ...info.kun].filter(s => s !== used.stem && [...s].length >= 2);
    for (const alt of alts) {
      // The swap that matters is the *other* reading type, which is the genuine confusion.
      const altKind: 'on' | 'kun' = info.on.includes(alt) ? 'on' : 'kun';
      if (altKind === used.kind && info.on.length + info.kun.length > 4) continue;
      const next = segs.map((s, j) => (j === i ? alt : s.form)).join('') + tail;
      out.push({ text: next, rule: 'on-kun' });
    }
  });
  return out;
}

/* ──────────────────────────── Kanji-level distractors ────────────────────────── */

/** Groups of N5 kanji that are easy to mistake for one another by shape. */
const LOOKALIKE_GROUPS = [
  '日白百月円', '木本来', '人入八', '千午十', '小水', '左右友', '母毎女', '話語読',
  '間聞', '四西', '山出', '三川', '大天', '上土', '七九', '東来',
];

const LOOKALIKE = new Map<string, string[]>();
for (const g of LOOKALIKE_GROUPS) {
  for (const c of g) {
    if (!N5_SET.has(c)) continue;
    LOOKALIKE.set(c, [...(LOOKALIKE.get(c) ?? []), ...[...g].filter(o => o !== c && N5_SET.has(o))]);
  }
}

/** N5 kanji that share an onyomi with `k` (so they are heard the same in a compound). */
const SAME_SOUND = new Map<string, string[]>();
{
  const byOn = new Map<string, string[]>();
  for (const [k, info] of INFO) for (const s of info.on) byOn.set(s, [...(byOn.get(s) ?? []), k]);
  for (const ks of byOn.values()) {
    for (const k of ks) SAME_SOUND.set(k, [...new Set([...(SAME_SOUND.get(k) ?? []), ...ks.filter(o => o !== k)])]);
  }
}

const NUMERALS = new Set('一二三四五六七八九十百千万'.split(''));

function kanjiCands(surface: string, reading: string): Cand[] {
  const out: Cand[] = [];
  const chars = [...surface];
  const kanjiChars = chars.filter(isKanji);
  const segs = chars.every(isKanji) ? align(kanjiChars, reading) : null;
  const swap = (i: number, alt: string, rule: DistractorRule) => {
    // "午午", "高高": a doubled character reads as a typo, not a confusion.
    if (chars.includes(alt)) return;
    // Digits swapped for digits are arithmetic, not orthography — unless the word is one.
    if (NUMERALS.has(alt) && !NUMERALS.has(chars[i])) return;
    out.push({ text: chars.slice(0, i).join('') + alt + chars.slice(i + 1).join(''), rule });
  };
  chars.forEach((c, i) => {
    if (!isKanji(c)) return;
    for (const alt of LOOKALIKE.get(c) ?? []) swap(i, alt, 'look-alike');
    // Same reading only where the data explains this character's sound in this word,
    // and only an onyomi: that is the sound a replacement can share.
    const seg = segs?.[i];
    if (seg && seg.kind === 'on') {
      for (const alt of SAME_SOUND.get(c) ?? []) {
        if (INFO.get(alt)?.on.includes(seg.stem)) swap(i, alt, 'same-reading');
      }
    }
  });
  return out;
}

/* ───────────────────────────── Validity of distractors ───────────────────────── */

/** Every (surface, reading) a human reviewed in the published sentences. */
const KNOWN = new Map<string, Set<string>>();
for (const s of sentences) {
  for (const t of s.tokens) {
    if (t.reading) KNOWN.set(t.surface, (KNOWN.get(t.surface) ?? new Set()).add(t.reading));
  }
}
/** reading -> surfaces that a reviewer saw with that reading. */
const SURFACES_BY_READING = new Map<string, Set<string>>();
for (const [surface, rs] of KNOWN) {
  for (const r of rs) SURFACES_BY_READING.set(r, (SURFACES_BY_READING.get(r) ?? new Set()).add(surface));
}

function validReadings(surface: string, reading: string): Set<string> {
  return new Set([reading, ...(KNOWN.get(surface) ?? []), ...(ALSO_VALID[surface] ?? [])]);
}

/** Pick 3 distractors, preferring three different rules, deterministically. */
function pickThree(cands: Cand[], answer: string, taken: Set<string>, key: string): ReviewDistractor[] | null {
  const seen = new Set<string>([answer, ...taken]);
  const unique: Cand[] = [];
  for (const c of seededOrder(cands, c => c.text, key)) {
    if (c.text.length === 0 || seen.has(c.text)) continue;
    seen.add(c.text);
    unique.push(c);
  }
  const rules = seededOrder([...new Set(unique.map(c => c.rule))], r => r, key + 'rules');
  const picked: Cand[] = [];
  // First pass: one per rule. Second pass: fill from whatever is left.
  for (const rule of rules) {
    const c = unique.filter(u => u.rule === rule && !picked.includes(u)).sort((a, b) => (a.pri ?? 0) - (b.pri ?? 0))[0];
    if (c && picked.length < 3) picked.push(c);
  }
  for (const c of unique) if (picked.length < 3 && !picked.includes(c)) picked.push(c);
  return picked.length === 3 ? picked.map(p => ({ text: p.text, rule: p.rule })) : null;
}

/* ───────────────────────────── Building the items ───────────────────────────── */

interface Built {
  surface: string;
  reading: string;
  mondai: MondaiNumber;
  sentence: Sentence;
  before: string;
  target: string;
  after: string;
  answerText: string;
  distractors: ReviewDistractor[];
  kind: 'jukugo' | 'single' | 'okurigana';
  distinctRules: number;
}

const kindOf = (surface: string): Built['kind'] =>
  /^[一-鿿]{2,}$/.test(surface) ? 'jukugo' : /^[一-鿿]$/.test(surface) ? 'single' : 'okurigana';

/** Shortest sentence in which `surface` is a single token with `reading`, and which is not yet used. */
function sentenceFor(surface: string, reading: string, used: Set<string>): { s: Sentence; idx: number } | null {
  const hits: { s: Sentence; idx: number }[] = [];
  for (const s of sentences) {
    if (used.has(s.id)) continue;
    const idxs = s.tokens.flatMap((t, i) => (t.surface === surface && t.reading === reading ? [i] : []));
    // A word that occurs twice would underline one and leave the other as a giveaway.
    if (idxs.length !== 1) continue;
    // If the same surface also appears inside another token, the kana-swap would be ambiguous.
    if (s.tokens.filter(t => t.surface.includes(surface)).length !== 1) continue;
    hits.push({ s, idx: idxs[0] });
  }
  hits.sort((a, b) => a.s.japanese.length - b.s.japanese.length || a.s.id.localeCompare(b.s.id));
  return hits[0] ?? null;
}

function build(surface: string, reading: string, mondai: MondaiNumber, used: Set<string>): Built | null {
  const found = sentenceFor(surface, reading, used);
  if (!found) return null;
  const { s, idx } = found;
  const key = `${mondai}|${surface}|${reading}`;

  let distractors: ReviewDistractor[] | null;
  let answerText: string;
  let targetText: string;
  if (mondai === 1) {
    answerText = reading;
    targetText = surface;
    const valid = validReadings(surface, reading);
    const cands = [
      ...dakutenCands(reading),
      ...smallTsuCands(reading),
      ...smallKanaCands(reading),
      ...longVowelCands(reading),
      ...onKunCands(surface, reading),
    ].filter(c => !valid.has(c.text));
    distractors = pickThree(cands, reading, new Set(), key);
  } else {
    answerText = surface;
    targetText = reading;
    // A swapped spelling that a reviewer has already seen with this reading would be a second right answer.
    const cands = kanjiCands(surface, reading).filter(c => !(SURFACES_BY_READING.get(reading)?.has(c.text)));
    distractors = pickThree(cands, surface, new Set(), key);
  }
  if (!distractors) return null;

  const before = s.tokens.slice(0, idx).map(t => t.surface).join('');
  const after = s.tokens.slice(idx + 1).map(t => t.surface).join('');
  return {
    surface, reading, mondai, sentence: s, before, target: targetText, after, answerText, distractors,
    kind: kindOf(surface),
    distinctRules: new Set(distractors.map(d => d.rule)).size,
  };
}

/* ─────────────────────────────────── Selection ───────────────────────────────── */

/** Per set, how many of each kind we want. Sums to 7 (Mondai 1) and 5 (Mondai 2). */
const QUOTA: Record<MondaiNumber, Record<Built['kind'], number>> = {
  1: { jukugo: 4, single: 1, okurigana: 2 },
  2: { jukugo: 5, single: 0, okurigana: 0 },
};

function select(): { m1: Built[][]; m2: Built[][] } {
  const used = new Set<string>();
  const usedWords = new Set<string>();
  const words = POOL.map(w => w.split(':') as [string, string]);

  const take = (mondai: MondaiNumber): Built[][] => {
    const sets: Built[][] = Array.from({ length: SETS }, () => []);
    const perSet = mondai === 1 ? M1_PER_SET : M2_PER_SET;
    // Mondai 2 is assigned first (below), so it gets first pick of the words whose kanji
    // have look-alikes; Mondai 1 takes the rest. Within a kind, prefer the words that can
    // show the most different distractor rules, then break ties by a stable hash.
    for (const kind of ['jukugo', 'okurigana', 'single'] as const) {
      const need = QUOTA[mondai][kind] * SETS;
      const built: Built[] = [];
      for (const [surface, reading] of words) {
        if (usedWords.has(surface) || kindOf(surface) !== kind) continue;
        const b = build(surface, reading, mondai, new Set(used));
        if (b) built.push(b);
      }
      built.sort((a, b) => b.distinctRules - a.distinctRules || rnd(`pick${mondai}${a.surface}`) - rnd(`pick${mondai}${b.surface}`));
      let n = 0;
      for (const cand of built) {
        if (n >= need) break;
        // Re-pick the sentence now so two items never share one.
        const fresh = build(cand.surface, cand.reading, mondai, used);
        if (!fresh) continue;
        used.add(fresh.sentence.id);
        usedWords.add(fresh.surface);
        sets[n % SETS].push(fresh);
        n++;
      }
      if (n < need) console.warn(`  ! Mondai ${mondai}: only ${n}/${need} "${kind}" items available`);
    }
    // Fill any shortfall from the rest of the pool, whatever its kind.
    for (const [surface, reading] of words) {
      const short = sets.findIndex(x => x.length < perSet);
      if (short < 0) break;
      if (usedWords.has(surface)) continue;
      const fresh = build(surface, reading, mondai, used);
      if (!fresh) continue;
      used.add(fresh.sentence.id);
      usedWords.add(fresh.surface);
      sets[short].push(fresh);
    }
    for (const s of sets) {
      if (s.length !== perSet) console.warn(`  ! Mondai ${mondai}: a set has ${s.length}/${perSet} items`);
    }
    return sets;
  };

  const m2 = take(2);
  const m1 = take(1);
  return { m1, m2 };
}

/* ─────────────────────────────────────── Output ──────────────────────────────── */

function toReviewItem(b: Built, set: number, no: number): ReviewItem {
  const src = b.sentence.source.japanese;
  const flags: string[] = [];
  if (b.mondai === 2) flags.push('sentence text altered: target shown in hiragana (CC BY adaptation, change noted on screen)');
  if (INCLUDED_BUT_FLAGGED[b.surface]) flags.push(INCLUDED_BUT_FLAGGED[b.surface]);
  if (ALSO_VALID[b.surface]) flags.push(`other valid readings excluded from distractors: ${ALSO_VALID[b.surface].join('、')}`);
  if (b.mondai === 2 && b.kind !== 'jukugo') flags.push('weak: look-alikes of a single kanji or an okurigana word read as nonsense; consider replacing');
  if (b.mondai === 1 && b.reading.length <= 3) flags.push('very short word: check no distractor is a real word');
  return {
    id: `n5-s${set}-m${b.mondai}-${no}`,
    mondai: b.mondai,
    set,
    no,
    candidateId: b.sentence.id,
    surface: b.surface,
    reading: b.reading,
    before: b.before,
    target: b.target,
    after: b.after,
    english: b.sentence.english,
    answerText: b.answerText,
    distractors: b.distractors,
    source: {
      sentenceId: src.sentenceId,
      contributor: src.contributor,
      license: src.license,
      url: src.url,
    },
    flags,
    status: 'pending',
  };
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function toCsv(items: ReviewItem[]): string {
  const head = [
    'id', 'set', 'mondai', 'no', 'sentence (target in [ ])', 'english', 'answer',
    'distractor 1', 'rule 1', 'distractor 2', 'rule 2', 'distractor 3', 'rule 3',
    'flags', 'source', 'status', 'your edits',
  ];
  const rows = items.map(i => [
    i.id, String(i.set), `Mondai ${i.mondai}`, String(i.no),
    `${i.before}[${i.target}]${i.after}`, i.english, i.answerText,
    ...i.distractors.flatMap(d => [d.text, d.rule]),
    i.flags.join(' / '),
    `${i.source.contributor ?? 'unadopted'} · ${i.source.license} · ${i.source.url}`,
    i.status, '',
  ]);
  return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n';
}

function main() {
  const force = process.argv.includes('--force');
  if (fs.existsSync(OUT_JSON) && !force) {
    console.error(`${path.relative(ROOT, OUT_JSON)} already exists and may hold review verdicts. Re-run with --force to overwrite.`);
    process.exit(1);
  }
  const { m1, m2 } = select();
  const items: ReviewItem[] = [];
  for (let s = 0; s < SETS; s++) {
    m1[s].forEach((b, i) => items.push(toReviewItem(b, s + 1, i + 1)));
    m2[s].forEach((b, i) => items.push(toReviewItem(b, s + 1, i + 1)));
  }
  const file: ReviewFile = {
    level: 'N5',
    excluded: Object.entries(EXCLUDED).map(([k, reason]) => {
      const [surface, reading] = k.split(':');
      return { surface, reading, reason };
    }),
    items,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(file, null, 2) + '\n');
  fs.writeFileSync(OUT_CSV, toCsv(items));
  const ruleCount = new Map<DistractorRule, number>();
  for (const i of items) for (const d of i.distractors) ruleCount.set(d.rule, (ruleCount.get(d.rule) ?? 0) + 1);
  console.log(`wrote ${items.length} items (${items.filter(i => i.mondai === 1).length} Mondai 1, ${items.filter(i => i.mondai === 2).length} Mondai 2), ${items.length * 3} distractors`);
  console.log('distractor rules:', Object.fromEntries(ruleCount));
}

main();
