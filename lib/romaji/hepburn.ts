/**
 * Kana → Hepburn romaji.
 *
 * This is the lowest layer of the romaji subsystem: it knows about kana and
 * nothing about MichiKanji's data format. `lib/romaji/readings.ts` sits on top
 * and deals with our annotation syntax (okurigana parens, affix hyphens, …).
 *
 * ## Why three renderings instead of one
 *
 * A long vowel has no single correct spelling in Latin script, and the three
 * spellings are used by different people for different reasons:
 *
 *   どう →  dō    (macron)     scholarly / dictionary convention
 *           dou   (doubled)    what a learner with an IME types
 *           do    (collapsed)  what a learner without one types
 *
 * All three are legitimate and all three get searched. Picking one and calling
 * it "the" romaji is the mistake — so `parseKana` parses once and the caller
 * renders whichever style that surface needs. Display copy wants `macron`;
 * a search index wants all three.
 *
 * ## Which Hepburn
 *
 * Modified (revised) Hepburn, matching Jisho and Wikipedia — the spelling a
 * learner will have seen elsewhere:
 *   - じ/ぢ → ji, ず/づ → zu
 *   - を → o
 *   - moraic ん → n always, never m (しんぶん → shinbun, not shimbun)
 *   - ん before a vowel or y takes an apostrophe (しんいち → shin'ichi)
 *   - えい stays ei and いい stays ii — they are NOT macronised
 *
 * The traditional-Hepburn `m` spelling and the apostrophe-free spelling are
 * real things people type, so they are generated as *search variants* in
 * `readings.ts` rather than being folded in here. This module has one job and
 * returns one canonical answer per style.
 */

/** How a long vowel is spelled out. See the module comment. */
export type RomajiStyle = 'macron' | 'doubled' | 'collapsed';

/** Digraphs (yōon and loanword combos). Matched before single kana. */
const DIGRAPHS: Readonly<Record<string, string>> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', しぇ: 'she',
  じゃ: 'ja',  じゅ: 'ju',  じょ: 'jo',  じぇ: 'je',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ちぇ: 'che',
  ぢゃ: 'ja',  ぢゅ: 'ju',  ぢょ: 'jo',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  // Loanword digraphs. No JLPT reading uses these, but they cost one line each
  // and stop the fallback path from emitting mojibake if data ever grows.
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', ふゅ: 'fyu',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  くぁ: 'kwa', ぐぁ: 'gwa',
};

/** Single kana. */
const MORA: Readonly<Record<string, string>> = {
  あ: 'a',  い: 'i',   う: 'u',   え: 'e',  お: 'o',
  か: 'ka', き: 'ki',  く: 'ku',  け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi',  ぐ: 'gu',  げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su',  せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji',  ず: 'zu',  ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji',  づ: 'zu',  で: 'de', ど: 'do',
  な: 'na', に: 'ni',  ぬ: 'nu',  ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi',  ふ: 'fu',  へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi',  ぶ: 'bu',  べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi',  ぷ: 'pu',  ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi',  む: 'mu',  め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu',  よ: 'yo',
  ら: 'ra', り: 'ri',  る: 'ru',  れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i',   ゑ: 'e',   を: 'o',
  ゔ: 'vu',
  // Small kana that survived to standalone position (i.e. did not form a
  // digraph above). Romanised as their full-size equivalent.
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa',
};

const MACRON: Readonly<Record<string, string>> = {
  a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō',
};

/**
 * Vowel pairs that form a long vowel in modified Hepburn.
 *
 * Deliberately absent: `ei` and `ii`. Modified Hepburn writes せんせい as
 * "sensei" and おおきい as "ōkii" — macronising those would produce spellings
 * ("sensē", "ōkī") that no learner has ever typed into a search box.
 */
const LONG_VOWEL_PAIRS: ReadonlySet<string> = new Set([
  'aa', 'uu', 'ee', 'oo', 'ou',
]);

/** One romanised mora, plus whatever attached to it. */
interface Chunk {
  /** Romaji for the mora itself, with no long-vowel lengthener applied. */
  r: string;
  /**
   * Set when a following vowel mora lengthened this one.
   * `vowel` is the vowel being lengthened; `written` is the kana that did the
   * lengthening — おう and おお are both long "o" but spell out differently.
   */
  long?: { vowel: string; written: string };
  /** Moraic ん, which needs contextual treatment at render time. */
  isMoraicN?: boolean;
  /** Kana we have no mapping for, passed through untouched. */
  isUnknown?: boolean;
}

const KATAKANA_START = 0x30a1; // ァ
const KATAKANA_END = 0x30f6;   // ヶ
const KANA_OFFSET = 0x30a1 - 0x3041;

/**
 * Fold katakana to hiragana so one table serves both scripts.
 *
 * This is load-bearing, not defensive: 137 of our 1,896 onyomi are stored in
 * katakana and 1,714 in hiragana, with no apparent rule behind which is which.
 * Anything reading those fields has to normalise rather than trust them.
 */
export function katakanaToHiragana(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    out += code >= KATAKANA_START && code <= KATAKANA_END
      ? String.fromCodePoint(code - KANA_OFFSET)
      : ch;
  }
  return out;
}

/** True if the string contains at least one hiragana or katakana character. */
export function containsKana(input: string): boolean {
  return /[ぁ-ゖァ-ヺ]/.test(input);
}

function isVowel(ch: string): boolean {
  return ch === 'a' || ch === 'i' || ch === 'u' || ch === 'e' || ch === 'o';
}

/**
 * Apply a sokuon (っ) to the syllable that follows it.
 *
 * The rule is "double the following consonant", with one exception that trips
 * up naive implementations: ch doubles to *tch*, not cch — まっちゃ is
 * "matcha". A sokuon before a vowel-initial syllable has nothing to double and
 * is dropped.
 */
function geminate(syllable: string): string {
  if (!syllable || isVowel(syllable[0])) return syllable;
  if (syllable.startsWith('ch')) return `t${syllable}`;
  return syllable[0] + syllable;
}

/**
 * Parse kana into chunks: mora lookup, gemination, and long-vowel folding.
 *
 * Exported so a caller that needs several styles pays the parse once.
 */
export function parseKana(input: string): Chunk[] {
  const kana = katakanaToHiragana(input);
  const chunks: Chunk[] = [];
  let pendingSokuon = false;

  const push = (r: string, flags: Partial<Chunk> = {}) => {
    chunks.push({ r: pendingSokuon ? geminate(r) : r, ...flags });
    pendingSokuon = false;
  };

  for (let i = 0; i < kana.length; i++) {
    const ch = kana[i];
    const pair = kana.slice(i, i + 2);

    if (ch === 'っ') {
      pendingSokuon = true;
      continue;
    }

    if (ch === 'ん') {
      push('n', { isMoraicN: true });
      continue;
    }

    // Prolonged sound mark: lengthen whatever vowel came before it.
    if (ch === 'ー') {
      const prev = chunks[chunks.length - 1];
      const vowel = prev?.r.slice(-1);
      if (prev && !prev.long && vowel && isVowel(vowel)) {
        prev.long = { vowel, written: vowel };
      }
      continue;
    }

    if (DIGRAPHS[pair]) {
      push(DIGRAPHS[pair]);
      i++;
      continue;
    }

    if (MORA[ch]) {
      push(MORA[ch]);
      continue;
    }

    // Not kana (or kana we have no mapping for). Pass it through rather than
    // dropping it — a visible oddity is debuggable, a silent deletion is not.
    push(ch, { isUnknown: true });
  }

  return foldLongVowels(chunks);
}

/**
 * Merge a bare-vowel mora into the preceding chunk when the pair spells a long
 * vowel. Runs as a second pass because the decision needs the previous chunk's
 * final vowel, which gemination may have already altered.
 */
function foldLongVowels(chunks: Chunk[]): Chunk[] {
  const folded: Chunk[] = [];

  for (const chunk of chunks) {
    const prev = folded[folded.length - 1];
    const isBareVowel = !chunk.isMoraicN && !chunk.isUnknown && chunk.r.length === 1 && isVowel(chunk.r);
    const prevVowel = prev?.r.slice(-1) ?? '';

    // `!prev.long` stops a third vowel folding into an already-long one.
    if (
      prev && isBareVowel && !prev.long && !prev.isMoraicN && !prev.isUnknown &&
      isVowel(prevVowel) && LONG_VOWEL_PAIRS.has(prevVowel + chunk.r)
    ) {
      prev.long = { vowel: prevVowel, written: chunk.r };
      continue;
    }

    folded.push({ ...chunk });
  }

  return folded;
}

/** Render one parsed chunk in the requested style. */
function renderChunk(chunk: Chunk, style: RomajiStyle): string {
  if (!chunk.long) return chunk.r;
  switch (style) {
    case 'macron':
      return chunk.r.slice(0, -1) + (MACRON[chunk.long.vowel] ?? chunk.long.vowel);
    case 'doubled':
      return chunk.r + chunk.long.written;
    case 'collapsed':
      return chunk.r;
  }
}

/** Join rendered chunks, inserting the moraic-n apostrophe where required. */
function joinChunks(chunks: Chunk[], style: RomajiStyle): string {
  const parts = chunks.map(c => renderChunk(c, style));
  let out = '';

  for (let i = 0; i < parts.length; i++) {
    out += parts[i];
    // shin'ichi, not shinichi — without the apostrophe しんいち and しにち
    // romanise identically.
    if (chunks[i].isMoraicN) {
      const next = parts[i + 1];
      if (next && (isVowel(next[0]) || next[0] === 'y')) out += "'";
    }
  }

  return out;
}

/**
 * Romanise a kana string.
 *
 * Non-kana characters pass through untouched, so this is safe to call on a
 * value that may already contain annotation syntax — though `readings.ts`
 * strips that first, which is what callers should normally use.
 */
export function toRomaji(kana: string, style: RomajiStyle = 'macron'): string {
  return joinChunks(parseKana(kana), style);
}

/** All three renderings from a single parse. */
export function toRomajiAll(kana: string): Record<RomajiStyle, string> {
  const chunks = parseKana(kana);
  return {
    macron: joinChunks(chunks, 'macron'),
    doubled: joinChunks(chunks, 'doubled'),
    collapsed: joinChunks(chunks, 'collapsed'),
  };
}
