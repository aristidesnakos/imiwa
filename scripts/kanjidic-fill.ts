/**
 * Compare the kanji lists' readings against KANJIDIC2 and write a proposal for
 * a person to review. It never edits `lib/constants/*`.
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json scripts/kanjidic-fill.ts \
 *     --kanjidic <path/to/kanjidic2.xml[.gz]> --out <proposal.csv>
 *
 * KANJIDIC2 is not committed. It is 15 MB, and nothing at build or run time
 * needs it. Download it from http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz.
 * It is © EDRDG under CC BY-SA 4.0, so every reading copied from it into the
 * level lists is CC BY-SA-derived. The acknowledgement already ships in the
 * footer, About and Terms.
 *
 * ---------------------------------------------------------------------------
 * Categories, one per CSV row
 * ---------------------------------------------------------------------------
 *
 *   empty         no onyomi and no kunyomi. Fill both, and the meaning if blank.
 *   kun-in-on     a kun reading stored in the onyomi field (源 みなもと, 皿 さら).
 *                 Move it to kunyomi and give the onyomi field KANJIDIC2's on.
 *   on-in-kun     the reverse.
 *   bad-on        an onyomi item KANJIDIC2 does not list for the character
 *                 (葉 こう). Drop it. KANJIDIC2's on fills the field if nothing
 *                 is left.
 *   missing-on    blank onyomi where KANJIDIC2 has one (払, 皆). Kokuji with
 *                 no on reading (込 峠) are not flagged, because KANJIDIC2 has
 *                 none for them either.
 *   bad-kun       a kunyomi item unrelated to every KANJIDIC2 kun reading
 *                 (訪 とおず for おとず(れる), 具 つばさ). Spelling-style
 *                 differences are not flagged: the comparison strips
 *                 okurigana markers and accepts a stem or prefix match.
 *   missing-kun   blank kunyomi where KANJIDIC2 has one. KANJIDIC2 includes
 *                 archaic and name-only readings (党 なかま), so these rows
 *                 are the ones a reviewer has to judge one at a time.
 *   dialect       the entry's fields are correct but written in KANJIDIC's
 *                 notation (`しげ.る`, `, `, katakana onyomi). The homepage,
 *                 the printable sheets and the review page print the raw
 *                 fields, so the dot shows. Conversion is mechanical.
 *
 * Everything proposed is written in the site's dialect: onyomi in hiragana,
 * items joined with `、`, okurigana in `（）`. `lib/romaji/readings.ts` parses
 * both, so this is for the people reading the raw fields, not the romaji.
 *
 * The `proposed_*` columns hold the whole field as it would be written, so an
 * approved row is applied by replacing that field. `decision` is empty for the
 * reviewer to fill.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { N1_KANJI } from '../lib/constants/n1-kanji';
import { N2_KANJI } from '../lib/constants/n2-kanji';
import { N3_KANJI } from '../lib/constants/n3-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { splitReadingField } from '../lib/romaji/readings';
import { katakanaToHiragana } from '../lib/romaji/hepburn';

interface Entry {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

interface KdChar {
  on: string[];
  kun: string[];
  meanings: string[];
  grade: number | null;
  freq: number | null;
}

type Category =
  | 'empty'
  | 'kun-in-on'
  | 'on-in-kun'
  | 'bad-on'
  | 'missing-on'
  | 'bad-kun'
  | 'missing-kun'
  | 'dialect';

interface Row {
  level: string;
  kanji: string;
  category: Category;
  note: string;
  site_onyomi: string;
  site_kunyomi: string;
  site_meaning: string;
  proposed_onyomi: string;
  proposed_kunyomi: string;
  proposed_meaning: string;
  kd_on: string;
  kd_kun: string;
  kd_meaning: string;
  kd_grade: string;
  kd_freq: string;
  decision: string;
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const kanjidicPath = arg('kanjidic');
const outPath = arg('out');
if (!kanjidicPath || !outPath) {
  console.error('usage: kanjidic-fill.ts --kanjidic <kanjidic2.xml[.gz]> --out <proposal.csv>');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// KANJIDIC2
// ---------------------------------------------------------------------------
// The file's structure is flat and stable, so a regex per <character> block is
// enough; no XML dependency.

function loadKanjidic(path: string): Map<string, KdChar> {
  const raw = readFileSync(path);
  const xml = (path.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8');
  const out = new Map<string, KdChar>();
  const all = (block: string, re: RegExp) => [...block.matchAll(re)].map((m) => decode(m[1]));
  for (const [, block] of xml.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
    const literal = block.match(/<literal>(.*?)<\/literal>/)?.[1];
    if (!literal) continue;
    const grade = block.match(/<grade>(\d+)<\/grade>/)?.[1];
    const freq = block.match(/<freq>(\d+)<\/freq>/)?.[1];
    out.set(literal, {
      on: all(block, /<reading r_type="ja_on"[^>]*>(.*?)<\/reading>/g),
      kun: all(block, /<reading r_type="ja_kun"[^>]*>(.*?)<\/reading>/g),
      // English meanings carry no m_lang attribute.
      meanings: all(block, /<meaning>(.*?)<\/meaning>/g),
      grade: grade ? Number(grade) : null,
      freq: freq ? Number(freq) : null,
    });
  }
  return out;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ---------------------------------------------------------------------------
// Normalising readings for comparison
// ---------------------------------------------------------------------------

/** A reading item's stem and whole word, in hiragana, with every marker stripped. */
function parts(item: string): { stem: string; full: string; affix: boolean } {
  const affix = item.startsWith('-') || item.endsWith('-');
  const bare = katakanaToHiragana(item.replace(/^-|-$/g, '').trim());
  const paren = bare.match(/^(.*?)（(.+?)）$/);
  if (paren) return { stem: paren[1], full: paren[1] + paren[2], affix };
  const dot = bare.match(/^([^.]*)\.(.+)$/);
  if (dot) return { stem: dot[1], full: dot[1] + dot[2], affix };
  return { stem: bare, full: bare, affix };
}

/** Does a site kun item plausibly name one of KANJIDIC2's kun readings? */
function kunRelated(siteItem: string, kdKun: string[]): boolean {
  const s = parts(siteItem);
  return kdKun.some((k) => {
    const d = parts(k);
    return (
      s.full === d.full ||
      s.stem === d.stem ||
      s.full === d.stem ||
      s.stem === d.full ||
      // Site `あや` for KANJIDIC2 `あや.しい`, or site `たのしい` for `たの.しい`.
      d.full.startsWith(s.full) ||
      s.full.startsWith(d.full)
    );
  });
}

function onMatches(siteItem: string, kdOn: string[]): boolean {
  const s = parts(siteItem).full;
  return kdOn.some((o) => parts(o).full === s);
}

function kunMatchesExactly(siteItem: string, kdKun: string[]): boolean {
  const s = parts(siteItem);
  return kdKun.some((k) => {
    const d = parts(k);
    return s.full === d.full || s.stem === d.full;
  });
}

// ---------------------------------------------------------------------------
// Writing readings in the site's dialect
// ---------------------------------------------------------------------------

const join = (items: string[]) => [...new Set(items)].join('、');

function siteOn(item: string): string {
  return katakanaToHiragana(item.trim());
}

function siteKun(item: string): string {
  const t = item.trim();
  const dot = t.match(/^(-?)([^.]*)\.(.+?)(-?)$/);
  if (dot) return `${dot[1]}${dot[2]}（${dot[3]}）${dot[4]}`;
  return t;
}

/**
 * KANJIDIC2's kun list in the site's dialect, affix forms dropped when a free
 * form of the same word exists (it lists `-び` beside `ひ`, and the site does
 * not print both).
 */
function kdKunForSite(kun: string[]): string[] {
  const free = new Set(kun.filter((k) => !parts(k).affix).map((k) => parts(k).full));
  return kun.filter((k) => !parts(k).affix || !free.has(parts(k).full)).map(siteKun);
}

const kdOnForSite = (on: string[]) => on.map(siteOn);

function toSiteDialect(field: string, kind: 'on' | 'kun'): string {
  return join(splitReadingField(field).map(kind === 'on' ? siteOn : siteKun));
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const LEVELS: ReadonlyArray<readonly [string, readonly Entry[]]> = [
  ['N5', N5_KANJI],
  ['N4', N4_KANJI],
  ['N3', N3_KANJI],
  ['N2', N2_KANJI],
  ['N1', N1_KANJI],
];

const kd = loadKanjidic(kanjidicPath);
const rows: Row[] = [];
const missingFromKd: string[] = [];

for (const [level, list] of LEVELS) {
  for (const e of list) {
    const k = kd.get(e.kanji);
    if (!k) {
      missingFromKd.push(`${level} ${e.kanji}`);
      continue;
    }
    const on = splitReadingField(e.onyomi);
    const kun = splitReadingField(e.kunyomi);

    const row = (category: Category, note: string, proposed: Partial<Row>): Row => ({
      level,
      kanji: e.kanji,
      category,
      note,
      site_onyomi: e.onyomi,
      site_kunyomi: e.kunyomi,
      site_meaning: e.meaning,
      proposed_onyomi: proposed.proposed_onyomi ?? e.onyomi,
      proposed_kunyomi: proposed.proposed_kunyomi ?? e.kunyomi,
      proposed_meaning: proposed.proposed_meaning ?? e.meaning,
      kd_on: k.on.join(' '),
      kd_kun: k.kun.join(' '),
      kd_meaning: k.meanings.join('; '),
      kd_grade: k.grade?.toString() ?? '',
      kd_freq: k.freq?.toString() ?? '',
      decision: '',
    });

    if (on.length === 0 && kun.length === 0) {
      rows.push(
        row('empty', 'no readings at all', {
          proposed_onyomi: join(kdOnForSite(k.on)),
          proposed_kunyomi: join(kdKunForSite(k.kun)),
          proposed_meaning: e.meaning.trim() ? e.meaning : k.meanings.join(', '),
        })
      );
      continue;
    }

    // Sort every site item into the field it belongs in.
    const onKeep: string[] = [];
    const onToKun: string[] = [];
    const onBad: string[] = [];
    for (const item of on) {
      if (onMatches(item, k.on)) onKeep.push(item);
      else if (kunRelated(item, k.kun)) onToKun.push(item);
      else onBad.push(item);
    }
    const kunKeep: string[] = [];
    const kunToOn: string[] = [];
    const kunBad: string[] = [];
    for (const item of kun) {
      if (kunRelated(item, k.kun)) kunKeep.push(item);
      else if (onMatches(item, k.on)) kunToOn.push(item);
      else kunBad.push(item);
    }

    // A misfiled kun takes KANJIDIC2's spelling, okurigana included, when one
    // matches it exactly (site `ひる` becomes `ひ（る）`).
    const moved = onToKun.map((item) => {
      const exact = k.kun.find((kk) => !parts(kk).affix && kunMatchesExactly(item, [kk]));
      return exact ?? item;
    });

    let newOn = [...onKeep, ...kunToOn].map(siteOn);
    let newKun = [...kunKeep, ...moved].map(siteKun);

    // One row per entry: every issue goes in the note, the first one found
    // names the category.
    const found: [Category, string][] = [];
    if (onToKun.length) found.push(['kun-in-on', `kun in onyomi: ${onToKun.join('、')}`]);
    if (kunToOn.length) found.push(['on-in-kun', `on in kunyomi: ${kunToOn.join('、')}`]);
    if (onBad.length) found.push(['bad-on', `onyomi not in KANJIDIC2: ${onBad.join('、')}`]);
    if (kunBad.length) found.push(['bad-kun', `kunyomi unrelated to KANJIDIC2: ${kunBad.join('、')}`]);
    if (newOn.length === 0 && k.on.length > 0) {
      if (on.length === 0) found.push(['missing-on', 'blank onyomi; KANJIDIC2 has one']);
      newOn = kdOnForSite(k.on);
    }
    if (newKun.length === 0 && k.kun.length > 0) {
      // A blank kunyomi with nothing else wrong is the reviewer's call; one
      // emptied by removing a bad item is refilled the same way.
      if (kun.length === 0 && found.length === 0) found.push(['missing-kun', 'blank kunyomi; KANJIDIC2 has one']);
      newKun = kdKunForSite(k.kun);
    }
    // Only a field with something wrong in it is rewritten from KANJIDIC2.
    if (kun.length === 0 && found.every(([c]) => c !== 'missing-kun') && moved.length === 0) newKun = [];

    if (found.length) {
      rows.push(
        row(found[0][0], found.map(([, n]) => n).join('; '), {
          proposed_onyomi: join(newOn),
          proposed_kunyomi: join(newKun),
        })
      );
      continue;
    }

    const onSite = toSiteDialect(e.onyomi, 'on');
    const kunSite = toSiteDialect(e.kunyomi, 'kun');
    if (onSite !== e.onyomi || kunSite !== e.kunyomi) {
      rows.push(row('dialect', 'notation only', { proposed_onyomi: onSite, proposed_kunyomi: kunSite }));
    }
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const COLUMNS: (keyof Row)[] = [
  'level', 'kanji', 'category', 'note',
  'site_onyomi', 'site_kunyomi', 'site_meaning',
  'proposed_onyomi', 'proposed_kunyomi', 'proposed_meaning',
  'kd_on', 'kd_kun', 'kd_meaning', 'kd_grade', 'kd_freq', 'decision',
];
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
writeFileSync(
  outPath,
  [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'
);

const counts = new Map<string, number>();
for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
console.log(`${rows.length} rows written to ${outPath}`);
for (const [c, n] of [...counts].sort()) console.log(`  ${c.padEnd(12)} ${n}`);
if (missingFromKd.length) console.log(`not in KANJIDIC2: ${missingFromKd.join(', ')}`);
