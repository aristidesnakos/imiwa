/**
 * Validator for the /kanji search (`lib/kanji-search.ts`), run against every
 * kanji the site has.
 *
 * Run: pnpm validate:search
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Search is how returning visitors reach a kanji, and it fails silently. A
 * query that stops matching renders "No kanji found", which looks exactly like
 * a character the dictionary does not have. That is how "mizu" found nothing
 * for as long as the site existed, and how すい missed every onyomi stored in
 * katakana: nothing on the page could show either.
 *
 * So this sweeps the promises across all ~1,900 kanji rather than spot-checking:
 *
 *   1. Every romaji spelling lib/romaji/readings.ts derives for a kanji finds it.
 *   2. Every reading finds its kanji in hiragana and in katakana, as a stem and
 *      as a whole word (た and たべる).
 *   3. Every meaning finds its kanji.
 *   4. Nothing the old predicate found is lost: it matched meanings and the raw
 *      reading fields by substring, and every query a person could type (plain
 *      kana as stored, a meaning, a word of one) must still find what it found.
 *
 * Then the named cases a learner would try, where the order matters too.
 */

import { N5_KANJI } from '../lib/constants/n5-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { N3_KANJI } from '../lib/constants/n3-kanji';
import { N2_KANJI } from '../lib/constants/n2-kanji';
import { N1_KANJI } from '../lib/constants/n1-kanji';
import { kanjiReadings, splitReadingField } from '../lib/romaji/readings';
import { searchKanji, type SearchableKanji } from '../lib/kanji-search';

type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
interface Entry extends SearchableKanji {
  level: Level;
}

// The merge app/kanji/KanjiSearchClient.tsx does: N5 first, and a character on
// two lists stays at the lower level.
const ALL: Entry[] = (() => {
  const byKanji = new Map<string, Entry>();
  const lists: [Level, readonly SearchableKanji[]][] = [
    ['N5', N5_KANJI], ['N4', N4_KANJI], ['N3', N3_KANJI], ['N2', N2_KANJI], ['N1', N1_KANJI],
  ];
  for (const [level, list] of lists) {
    for (const k of list) if (!byKanji.has(k.kanji)) byKanji.set(k.kanji, { ...k, level });
  }
  return Array.from(byKanji.values());
})();

let checks = 0;
let failures = 0;

function section(title: string) {
  console.log(`\n${title}`);
}

function check(name: string, problems: string[], description: string) {
  checks++;
  if (problems.length === 0) {
    console.log(`  ✓ ${name}: ${description}`);
    return;
  }
  failures++;
  console.log(`  ✗ ${name}: ${problems.length} problem(s)`);
  for (const problem of problems.slice(0, 12)) console.log(`      ${problem}`);
  if (problems.length > 12) console.log(`      … and ${problems.length - 12} more`);
}

/** Does `query` find `k`? Asked of a one-kanji list, so the sweeps stay fast. */
const finds = (k: Entry, query: string) => searchKanji([k], query).length === 1;

const toKatakana = (kana: string) =>
  kana.replace(/[ぁ-ゖ]/g, c => String.fromCodePoint((c.codePointAt(0) ?? 0) + 0x60));

const results = (query: string) => searchKanji(ALL, query).map(k => k.kanji);

console.log(`Kanji search: ${ALL.length} kanji`);

section('Sweeps over every kanji');
{
  const problems: string[] = [];
  let keys = 0;
  for (const k of ALL) {
    for (const key of kanjiReadings(k).all.flatMap(r => r.searchKeys)) {
      keys++;
      if (!finds(k, key)) problems.push(`${k.kanji}: "${key}"`);
      const capitalised = key.charAt(0).toUpperCase() + key.slice(1);
      if (!finds(k, capitalised)) problems.push(`${k.kanji}: "${capitalised}"`);
    }
  }
  check('romaji', problems, `all ${keys} romaji spellings find their kanji, capitalised or not`);
}
{
  const problems: string[] = [];
  let forms = 0;
  for (const k of ALL) {
    for (const r of kanjiReadings(k).all) {
      for (const form of new Set([r.kana, r.kanaFull])) {
        if (!form) continue;
        forms++;
        if (!finds(k, form)) problems.push(`${k.kanji}: ${form}`);
        if (!finds(k, toKatakana(form))) problems.push(`${k.kanji}: ${toKatakana(form)}`);
      }
    }
  }
  check('kana', problems, `all ${forms} readings find their kanji in hiragana and in katakana`);
}
{
  const problems: string[] = [];
  let meanings = 0;
  for (const k of ALL) {
    for (const meaning of k.meaning.split(',').map(m => m.trim()).filter(Boolean)) {
      meanings++;
      if (!finds(k, meaning)) problems.push(`${k.kanji}: "${meaning}"`);
    }
  }
  check('meanings', problems, `all ${meanings} meanings find their kanji`);
}
{
  // The predicate this replaced, verbatim.
  const oldFinds = (k: Entry, search: string) => {
    const lower = search.toLowerCase();
    return (
      k.kanji.includes(search) ||
      k.meaning.toLowerCase().includes(lower) ||
      k.onyomi.toLowerCase().includes(lower) ||
      k.kunyomi.toLowerCase().includes(lower)
    );
  };
  // What a person could type: readings as stored when they are plain kana (not
  // the annotated た（べる）, which nobody types), meanings, and their words.
  const queries = new Set<string>();
  for (const k of ALL) {
    for (const item of [...splitReadingField(k.onyomi), ...splitReadingField(k.kunyomi)]) {
      if (/^-?[ぁ-ゟ゠-ヿ]+-?$/.test(item)) queries.add(item);
    }
    for (const meaning of k.meaning.split(',').map(m => m.trim()).filter(Boolean)) {
      queries.add(meaning);
      for (const word of meaning.split(/\s+/)) if (word) queries.add(word);
    }
  }
  const problems: string[] = [];
  let pairs = 0;
  for (const query of queries) {
    for (const k of ALL) {
      if (!oldFinds(k, query)) continue;
      pairs++;
      if (!finds(k, query)) problems.push(`"${query}" no longer finds ${k.kanji}`);
    }
  }
  check('nothing lost', problems, `${queries.size} queries: all ${pairs} old matches still match`);
}

section('What a learner would type');
{
  const problems: string[] = [];
  const expectFirst = (query: string, kanji: string) => {
    const got = results(query);
    if (got[0] !== kanji) problems.push(`"${query}": expected ${kanji} first, got ${got.slice(0, 5).join(' ') || 'nothing'}`);
  };
  const expectWithin = (query: string, kanji: string, top: number) => {
    const at = results(query).indexOf(kanji);
    if (at === -1 || at >= top) problems.push(`"${query}": expected ${kanji} in the first ${top}, got position ${at === -1 ? 'none' : at + 1}`);
  };

  expectFirst('mizu', '水');
  expectFirst('  Mizu ', '水');
  expectFirst('mizu kanji', '水');
  expectFirst('kanji mizu', '水');
  expectFirst('water', '水');
  expectFirst('水', '水');
  expectWithin('sui', '水', 10);
  expectWithin('すい', '水', 10);
  expectWithin('スイ', '水', 10);
  expectWithin('たべる', '食', 5);
  expectWithin('taberu', '食', 5);
  expectWithin('tabe', '食', 5);
  expectWithin('michi', '道', 5);
  for (const spelling of ['dō', 'dou', 'do']) expectWithin(spelling, '道', 40);
  expectWithin('hi', '日', 10);
  expectWithin('hi', '火', 10);

  const pasted = results('日本');
  if (pasted.join('') !== '日本') problems.push(`"日本": expected exactly 日 本, got ${pasted.join(' ')}`);
  const reversed = results('本日');
  if (reversed.join('') !== '本日') problems.push(`"本日": expected exactly 本 日, got ${reversed.join(' ')}`);

  const hiragana = results('すい').join('');
  const katakana = results('スイ').join('');
  if (hiragana !== katakana) problems.push('すい and スイ return different results');

  for (const blank of ['', '   ']) {
    if (searchKanji(ALL, blank) !== ALL) problems.push(`${JSON.stringify(blank)}: a blank search must return the list itself`);
  }

  check('named cases', problems, 'romaji, both kana scripts, okurigana, pasted words, order and blank searches');
}

section('Timing (informational)');
{
  const started = performance.now();
  for (const query of ['a', 'mizu', 'すい', 'water', '日本']) searchKanji(ALL, query);
  console.log(`  five searches over all ${ALL.length} kanji, index warm: ${(performance.now() - started).toFixed(1)} ms`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
