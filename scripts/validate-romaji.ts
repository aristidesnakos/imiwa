/**
 * Validator for the romaji subsystem (`lib/romaji/`).
 *
 * Two halves, and the second is the one that matters:
 *
 *   1. **Golden cases** — hand-checked kana→Hepburn pairs pinning the rules that
 *      a naive implementation gets wrong (gemination, tch, long vowels, the
 *      ei/ii carve-out, moraic n).
 *   2. **A full-corpus sweep** — every reading of every one of the ~1,896 kanji
 *      is romanised and checked for *leakage*: annotation syntax, unconverted
 *      kana, or empty output reaching the romaji. This is the real contract.
 *      Romaji feeds page titles, JSON-LD and the search index, so a single
 *      field the parser does not understand becomes a visible `ゆ（でる）` in a
 *      <title> or a dead search key.
 *
 * Run: pnpm validate:romaji
 */

import {
  toRomaji,
  toRomajiAll,
  katakanaToHiragana,
} from '../lib/romaji/hepburn';
import {
  parseReading,
  parseReadingField,
  kanjiReadings,
  primaryRomaji,
  romajiLabel,
  romajiSearchKeys,
} from '../lib/romaji/readings';
import { N1_KANJI } from '../lib/constants/n1-kanji';
import { N2_KANJI } from '../lib/constants/n2-kanji';
import { N3_KANJI } from '../lib/constants/n3-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { N5_KANJI } from '../lib/constants/n5-kanji';

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`  FAIL ${label}\n       expected ${e}\n       actual   ${a}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// 1. Golden kana → Hepburn cases
// ---------------------------------------------------------------------------

section('Core syllables and yōon');
check('みち', toRomaji('みち'), 'michi');
check('つき', toRomaji('つき'), 'tsuki');
check('ふじ', toRomaji('ふじ'), 'fuji');
check('しごと', toRomaji('しごと'), 'shigoto');
check('きゃく', toRomaji('きゃく'), 'kyaku');
check('ちゃ', toRomaji('ちゃ'), 'cha');
check('りょかん', toRomaji('りょかん'), 'ryokan');

section('Long vowels — three renderings from one parse');
check('どう', toRomajiAll('どう'), { macron: 'dō', doubled: 'dou', collapsed: 'do' });
check('しょう', toRomajiAll('しょう'), { macron: 'shō', doubled: 'shou', collapsed: 'sho' });
check('しゅう', toRomajiAll('しゅう'), { macron: 'shū', doubled: 'shuu', collapsed: 'shu' });
check('おう', toRomajiAll('おう'), { macron: 'ō', doubled: 'ou', collapsed: 'o' });
check('おおせ', toRomajiAll('おおせ'), { macron: 'ōse', doubled: 'oose', collapsed: 'ose' });

section('The ei / ii carve-out — modified Hepburn does NOT macronise these');
check('えい', toRomaji('えい'), 'ei');
check('せんせい', toRomaji('せんせい'), 'sensei');
check('おおきい', toRomaji('おおきい'), 'ōkii');
check('あい', toRomaji('あい'), 'ai');
check('あおい', toRomaji('あおい'), 'aoi');

section('Gemination (sokuon)');
check('おっと', toRomaji('おっと'), 'otto');
check('もって', toRomaji('もって'), 'motte');
check('かえって', toRomaji('かえって'), 'kaette');
check('やっこ', toRomaji('やっこ'), 'yakko');
check('がっこう', toRomajiAll('がっこう'), { macron: 'gakkō', doubled: 'gakkou', collapsed: 'gakko' });
// ch doubles to tch, not cch. No such reading exists in our data today, which is
// exactly why it needs pinning here rather than being discovered later.
check('まっちゃ', toRomaji('まっちゃ'), 'matcha');
check('こっち', toRomaji('こっち'), 'kotchi');

section('Moraic n');
check('かんむり', toRomaji('かんむり'), 'kanmuri');
check('もんめ', toRomaji('もんめ'), 'monme');
check('おもんぱか', toRomaji('おもんぱか'), 'omonpaka');
check('しんぶん', toRomaji('しんぶん'), 'shinbun');
check('なんじ', toRomaji('なんじ'), 'nanji');
// Apostrophe: without it しんいち and しにち would collide.
check("しんいち", toRomaji('しんいち'), "shin'ichi");
check("きんようび", toRomaji('きんようび'), "kin'yōbi");
check('ん final', toRomaji('かん'), 'kan');

section('Katakana normalisation (137 onyomi are stored in katakana)');
check('ジョ', toRomaji('ジョ'), 'jo');
check('シュウ', toRomaji('シュウ'), 'shū');
check('チョウ', toRomaji('チョウ'), 'chō');
check('ヘキ', toRomaji('ヘキ'), 'heki');
check('katakanaToHiragana', katakanaToHiragana('シュウ'), 'しゅう');

// ---------------------------------------------------------------------------
// 2. Reading-field parsing — both annotation dialects
// ---------------------------------------------------------------------------

section('Okurigana — native （） dialect');
{
  const r = parseReading('ゆ（でる）', 'kunyomi')!;
  check('ゆ（でる） kana', r.kana, 'ゆ');
  check('ゆ（でる） okurigana', r.okurigana, 'でる');
  check('ゆ（でる） romaji', r.romaji, 'yu');
  check('ゆ（でる） romajiFull', r.romajiFull, 'yuderu');
  check('ゆ（でる） display', r.display, 'yu(deru)');
}
{
  // The sokuon sits on the stem/okurigana boundary — only correct if the two
  // are romanised together.
  const r = parseReading('も（って）', 'kunyomi')!;
  check('も（って） romajiFull', r.romajiFull, 'motte');
  const k = parseReading('かえ（って）', 'kunyomi')!;
  check('かえ（って） romajiFull', k.romajiFull, 'kaette');
}
{
  const r = parseReading('ひと（つ）', 'kunyomi')!;
  check('ひと（つ） romajiFull', r.romajiFull, 'hitotsu');
  check('ひと（つ） searchKeys has both',
    [r.searchKeys.includes('hito'), r.searchKeys.includes('hitotsu')], [true, true]);
}

section('Okurigana — KANJIDIC . dialect');
{
  const r = parseReading('しげ.る', 'kunyomi')!;
  check('しげ.る kana', r.kana, 'しげ');
  check('しげ.る romajiFull', r.romajiFull, 'shigeru');
  const m = parseReading('むつ.まじい', 'kunyomi')!;
  check('むつ.まじい romajiFull', m.romajiFull, 'mutsumajii');
}

section('Affix hyphens — positional metadata, must not reach the romaji');
{
  const suffix = parseReading('-たち', 'kunyomi')!;
  check('-たち affix', suffix.affix, 'suffix');
  check('-たち romaji', suffix.romaji, 'tachi');
  const prefix = parseReading('かざ-', 'kunyomi')!;
  check('かざ- affix', prefix.affix, 'prefix');
  check('かざ- romaji', prefix.romaji, 'kaza');
  // Hyphen and okurigana in the same item.
  const both = parseReading('ほし-', 'kunyomi')!;
  check('ほし- romaji', both.romaji, 'hoshi');
}

section('Field splitting — both separators, and empty fields');
check('、 separator', parseReadingField('ひ、-び、-か', 'kunyomi').map(r => r.romaji), ['hi', 'bi', 'ka']);
check(', separator', parseReadingField('くさ.る, くさ.れる', 'kunyomi').map(r => r.romajiFull), ['kusaru', 'kusareru']);
check('empty field', parseReadingField('', 'onyomi'), []);
check('whitespace field', parseReadingField('   ', 'onyomi'), []);

section('Kanji-level accessors');
{
  // 道 — the character that started this: N4, onyomi どう, kunyomi みち.
  const michi = kanjiReadings({ onyomi: 'どう', kunyomi: 'みち' });
  check('道 primaryRomaji', primaryRomaji(michi), 'michi');
  check('道 label', romajiLabel({ onyomi: 'どう', kunyomi: 'みち' }), 'michi / dō');
  const keys = romajiSearchKeys({ onyomi: 'どう', kunyomi: 'みち' });
  check('道 search keys', keys.sort(), ['do', 'dou', 'dō', 'michi'].sort());
}
{
  // 日 — multiple readings, affix hyphens, a long vowel, and rendaku.
  const hi = kanjiReadings({ onyomi: 'にち、じつ', kunyomi: 'ひ、-び、-か' });
  check('日 onyomi', hi.onyomi.map(r => r.romaji), ['nichi', 'jitsu']);
  check('日 kunyomi', hi.kunyomi.map(r => r.romaji), ['hi', 'bi', 'ka']);
  check('日 primaryRomaji', primaryRomaji(hi), 'hi');
}
{
  // No readings at all — 3 entries in the corpus. Must not throw.
  const none = kanjiReadings({ onyomi: '', kunyomi: '' });
  check('empty kanji all', none.all, []);
  check('empty kanji primary', primaryRomaji(none), undefined);
  check('empty kanji label', romajiLabel({ onyomi: '', kunyomi: '' }), '');
}

section('Search-index spelling variants');
{
  const keys = parseReading('しんぶん', 'onyomi')!.searchKeys;
  check('shinbun + traditional shimbun',
    [keys.includes('shinbun'), keys.includes('shimbun')], [true, true]);
  const apo = parseReading('しんいち', 'kunyomi')!.searchKeys;
  check("shin'ichi + apostrophe-free",
    [apo.includes("shin'ichi"), apo.includes('shinichi')], [true, true]);
}

// ---------------------------------------------------------------------------
// 3. Full-corpus sweep — the contract that actually protects the site
// ---------------------------------------------------------------------------

section('Full corpus sweep');

const CORPUS = [
  ['N5', N5_KANJI], ['N4', N4_KANJI], ['N3', N3_KANJI],
  ['N2', N2_KANJI], ['N1', N1_KANJI],
] as const;

/** Romaji may contain ASCII letters, the five macrons, an apostrophe, parens (display only). */
const CLEAN_ROMAJI = /^[a-zāīūēō'()]+$/;
/** Anything that means the parser did not understand the input. */
const LEAKED = /[ぁ-ゖァ-ヺー、，,．.\-（）]/;

let entries = 0;
let readingCount = 0;
let withRomaji = 0;
let noReadings = 0;
const leaks: string[] = [];
const allKeys = new Set<string>();

for (const [level, list] of CORPUS) {
  for (const k of list) {
    entries++;
    const readings = kanjiReadings(k);
    if (readings.all.length === 0) {
      noReadings++;
      continue;
    }
    withRomaji++;

    for (const r of readings.all) {
      readingCount++;
      const fields: Array<[string, string]> = [
        ['romaji', r.romaji],
        ['romajiFull', r.romajiFull],
        ['romajiAscii', r.romajiAscii],
        ['display', r.display],
      ];
      for (const [name, value] of fields) {
        if (!value) {
          leaks.push(`${k.kanji} (${level}) ${r.kind} "${r.raw}" → ${name} is EMPTY`);
        } else if (LEAKED.test(value) || !CLEAN_ROMAJI.test(value)) {
          leaks.push(`${k.kanji} (${level}) ${r.kind} "${r.raw}" → ${name}="${value}"`);
        }
      }
      // kanaFull must be pure kana — proves annotations were stripped, not romanised.
      if (/[^ぁ-ゖ]/.test(r.kanaFull)) {
        leaks.push(`${k.kanji} (${level}) ${r.kind} "${r.raw}" → kanaFull="${r.kanaFull}" not pure hiragana`);
      }
      for (const key of r.searchKeys) {
        allKeys.add(key);
        if (!CLEAN_ROMAJI.test(key) || key.includes('(')) {
          leaks.push(`${k.kanji} (${level}) ${r.kind} "${r.raw}" → searchKey="${key}"`);
        }
      }
    }
  }
}

checks++;
if (leaks.length) {
  failures++;
  console.error(`  FAIL ${leaks.length} reading(s) leaked annotation or unconverted kana:`);
  for (const leak of leaks.slice(0, 40)) console.error(`       ${leak}`);
  if (leaks.length > 40) console.error(`       … and ${leaks.length - 40} more`);
} else {
  console.log(`  OK   ${readingCount} readings across ${entries} kanji romanised cleanly`);
}

console.log(`\n  entries              ${entries}`);
console.log(`  with ≥1 reading      ${withRomaji}`);
console.log(`  with no readings     ${noReadings}`);
console.log(`  reading items        ${readingCount}`);
console.log(`  distinct search keys ${allKeys.size}`);

// A sanity floor: if a refactor silently stops producing keys, the sweep above
// would still pass (no leaks in an empty set). This catches that.
check('search keys are plentiful', allKeys.size > 1000, true);
check('every kanji with a reading produced romaji', withRomaji + noReadings, entries);

// ---------------------------------------------------------------------------

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
