/**
 * Validator for the kanji corpus (`lib/constants/n{1..5}-kanji.ts`).
 *
 * Run: pnpm validate:kanji-data
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Five level lists are merged into one character lookup at **six** call sites,
 * and every one of them hand-rolls the merge differently:
 *
 *   app/kanji/[character]/page.tsx     concat N5→N1, then `.find`
 *   app/kanji/KanjiSearchClient.tsx    Map N5→N1 with an `if (!has)` guard
 *   components/kanji/PopularKanjiLinks  `add()` N5→N1
 *   app/kanji/review/ReviewClient.tsx  Map N1→N5, later writes overwrite
 *   app/api/kanji-sheets/route.ts      Map N1→N5, later writes overwrite
 *   app/sitemap.xml/route.ts           plain concat, **no dedup at all**
 *
 * Three of those iterate N5→N1 and keep the *first* hit; two iterate N1→N5 and
 * keep the *last*; one does not dedup. They all land on the same answer today
 * for exactly one reason: no character appears in two lists. The stated rule —
 * *a character in more than one level list resolves to the lowest level* — is
 * documented in CLAUDE.md and enforced in precisely zero lines of code.
 *
 * The moment one character lands in two lists, all of that comes apart at once
 * and mostly silently: the sitemap emits a duplicate URL for it, `app/page.tsx`
 * and `app/kanji/page.tsx` inflate the site's advertised kanji total (both add
 * up list *lengths* rather than counting distinct characters), and the six
 * lookups start disagreeing about which level the character belongs to — with
 * the answer decided by iteration order rather than by anything anyone chose.
 *
 * This is not hypothetical. `scripts/find-duplicates.js`,
 * `scripts/cleanup-duplicates.js` and `scripts/fix-n2-duplicates.js` existed
 * because duplicates *were* introduced and *were* swept out by hand, one
 * regex at a time, after the fact. This validator replaces those three one-off
 * scripts with a gate that runs before the merge instead of after the damage.
 *
 * It also checks the field-level invariants the render path assumes without
 * asking: one code point per `kanji` (the SVG proxy in
 * `app/api/kanji-svg/[hex]/route.ts` derives its hex from `codePointAt(0)`, so
 * a two-character entry silently requests the wrong diagram), a meaning, and at
 * least one reading.
 *
 * ---------------------------------------------------------------------------
 * Two allowlists, both empty
 * ---------------------------------------------------------------------------
 *
 * The corpus used to carry 39 N1 entries with neither onyomi nor kunyomi, 38
 * of them with no meaning either: a `/kanji/X` page that was a character and
 * nothing else. They were enumerated here so the validator could be turned on
 * while the debt stood, with a new one a hard failure. All 39 were filled from
 * KANJIDIC2 on 2026-10-03 (scripts/kanjidic-fill.ts, reviewed by hand), and
 * both lists are now empty. Keep them empty: an entry needs a reason that
 * survives review, not a gap in the data.
 *
 * ---------------------------------------------------------------------------
 * NON_JLPT_KANJI is checked, but it is not on the site
 * ---------------------------------------------------------------------------
 *
 * `lib/constants/non-jlpt-kanji.ts` has **zero importers**. Its 102 entries are
 * dead data — no page, route or sitemap entry renders them. The disjointness
 * and field checks run against it anyway, so that whenever somebody does wire
 * it up they inherit a clean file rather than a merge conflict with the JLPT
 * lists. Nothing this validator says about it describes a live surface.
 */

import { N1_KANJI } from '../lib/constants/n1-kanji';
import { N2_KANJI } from '../lib/constants/n2-kanji';
import { N3_KANJI } from '../lib/constants/n3-kanji';
import { N4_KANJI } from '../lib/constants/n4-kanji';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { NON_JLPT_KANJI } from '../lib/constants/non-jlpt-kanji';
import { N5_SEQUENCE } from '../lib/levels/n5-sequence';
import { kanjiReadings } from '../lib/romaji/readings';

// The `KanjiData` type is deliberately not imported — only the values are — so
// this script survives the type moving between modules.
interface Entry {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

/** Ordered lowest level first: this is the precedence the six lookups must agree on. */
const JLPT: ReadonlyArray<readonly [string, string, readonly Entry[]]> = [
  ['N5', 'lib/constants/n5-kanji.ts', N5_KANJI],
  ['N4', 'lib/constants/n4-kanji.ts', N4_KANJI],
  ['N3', 'lib/constants/n3-kanji.ts', N3_KANJI],
  ['N2', 'lib/constants/n2-kanji.ts', N2_KANJI],
  ['N1', 'lib/constants/n1-kanji.ts', N1_KANJI],
];

const NON_JLPT: readonly [string, string, readonly Entry[]] = [
  'non-JLPT',
  'lib/constants/non-jlpt-kanji.ts',
  NON_JLPT_KANJI,
];

const ALL = [...JLPT, NON_JLPT];

/**
 * Entries with neither onyomi nor kunyomi. Empty since 2026-10-03.
 *
 * A reading-less entry renders a kanji page with no readings at all: no romaji
 * (`lib/romaji/readings.ts` produces an empty set), so no romaji in the title,
 * none in the JSON-LD, and no search key. The character is unreachable by any
 * query except the character itself, which is the query a learner cannot type.
 */
const NO_READINGS_ALLOWED: ReadonlySet<string> = new Set<string>([]);

/**
 * Entries with an empty meaning. Empty since 2026-10-03.
 *
 * A meaning-less entry is worse than a reading-less one for the same reason it
 * is easier to miss: the page still renders, the heading still says the
 * character, and the description simply is not there.
 */
const NO_MEANING_ALLOWED: ReadonlySet<string> = new Set<string>([]);

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let checks = 0;
let failures = 0;
const warnings: string[] = [];

/** One assertion. `problems` empty means pass; every entry is printed on failure. */
function check(label: string, problems: readonly string[], okMessage: string): void {
  checks++;
  if (problems.length === 0) {
    console.log(`  OK   ${okMessage}`);
    return;
  }
  failures++;
  console.error(`  FAIL ${label} — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`       ${p}`);
  if (problems.length > 40) console.error(`       … and ${problems.length - 40} more`);
}

function warn(message: string): void {
  warnings.push(message);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const trimmed = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');

// ---------------------------------------------------------------------------
// 1. No duplicate character within a single list
// ---------------------------------------------------------------------------

section('1. Duplicates within a list');
{
  const problems: string[] = [];
  for (const [level, file, list] of ALL) {
    const firstIndex = new Map<string, number>();
    list.forEach((entry, index) => {
      const seen = firstIndex.get(entry.kanji);
      if (seen === undefined) {
        firstIndex.set(entry.kanji, index);
      } else {
        problems.push(
          `${file}: ${entry.kanji} appears twice in ${level} (index ${seen} and ${index})`
        );
      }
    });
  }
  check(
    'duplicate character within a list',
    problems,
    `${ALL.reduce((n, [, , l]) => n + l.length, 0)} entries across 6 files, none repeated within its own file`
  );
}

// ---------------------------------------------------------------------------
// 2. No duplicate character across the five JLPT lists
// ---------------------------------------------------------------------------
// This is the one that breaks six call sites at once. See the header.

section('2. Duplicates across the JLPT levels');

/**
 * character → each *distinct* level it was found in, in N5→N1 order.
 *
 * Distinct so that a character duplicated inside one list is reported by check 1
 * only, rather than showing up here as the nonsense "appears in N3 and N3".
 */
const levelsOf = new Map<string, string[]>();
for (const [level, , list] of JLPT) {
  for (const entry of list) {
    const seen = levelsOf.get(entry.kanji);
    if (!seen) levelsOf.set(entry.kanji, [level]);
    else if (!seen.includes(level)) seen.push(level);
  }
}
{
  const problems: string[] = [];
  for (const [kanji, levels] of levelsOf) {
    if (levels.length > 1) {
      problems.push(
        `${kanji} appears in ${levels.join(' and ')} — CLAUDE.md says it must resolve to ${levels[0]}, ` +
          `but ReviewClient.tsx and app/api/kanji-sheets/route.ts iterate N1→N5 and will resolve it to ${levels[levels.length - 1]}; ` +
          `app/sitemap.xml/route.ts will emit ${levels.length} URLs for it`
      );
    }
  }
  check(
    'character in more than one JLPT level',
    problems,
    `${levelsOf.size} characters, each in exactly one level list`
  );
}

// ---------------------------------------------------------------------------
// 3. NON_JLPT_KANJI is disjoint from the JLPT lists
// ---------------------------------------------------------------------------
// Guarding a future wiring-up, not a live surface: this file has no importers.

section('3. non-jlpt-kanji.ts vs the JLPT lists  [dead data — no importers, nothing renders it]');
{
  const problems: string[] = [];
  for (const entry of NON_JLPT_KANJI) {
    const levels = levelsOf.get(entry.kanji);
    if (levels) {
      problems.push(
        `${NON_JLPT[1]}: ${entry.kanji} is also in ${levels.join(' and ')} — it is not "non-JLPT"`
      );
    }
  }
  check(
    'non-JLPT character also in a JLPT list',
    problems,
    `${NON_JLPT_KANJI.length} non-JLPT entries, disjoint from all five JLPT lists (still unreferenced by any page)`
  );
}

// ---------------------------------------------------------------------------
// 4. `kanji` is exactly one code point
// ---------------------------------------------------------------------------
// `[...str].length`, never `.length`: kanji above U+FFFF are surrogate pairs
// and `.length` reports 2 for a perfectly valid single character. The SVG proxy
// at app/api/kanji-svg/[hex]/route.ts keys on `codePointAt(0)`, so anything but
// one code point here fetches the diagram for the wrong character — or none.

section('4. One code point per kanji field');
{
  const problems: string[] = [];
  for (const [level, file, list] of ALL) {
    for (const entry of list) {
      const value = typeof entry.kanji === 'string' ? entry.kanji : '';
      const points = [...value];
      if (points.length === 1) continue;
      problems.push(
        points.length === 0
          ? `${file}: ${level} entry has an empty kanji field`
          : `${file}: ${level} entry "${value}" is ${points.length} code points ` +
            `(${points.map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase()}`).join(' ')}) — ` +
            `kanji-svg would request only U+${points[0].codePointAt(0)!.toString(16).toUpperCase()}`
      );
    }
  }
  check('kanji field is not a single code point', problems, 'every entry is exactly one code point');
}

// ---------------------------------------------------------------------------
// 5. Every entry has a meaning
// ---------------------------------------------------------------------------

section('5. Meanings');
{
  const problems: string[] = [];
  const empty = new Set<string>();
  for (const [level, file, list] of ALL) {
    for (const entry of list) {
      if (trimmed(entry.meaning)) continue;
      empty.add(entry.kanji);
      if (NO_MEANING_ALLOWED.has(entry.kanji)) continue;
      problems.push(
        `${file}: ${entry.kanji} (${level}) has no meaning — its page would render the character and nothing else. ` +
          `Add one, or add it to NO_MEANING_ALLOWED with a reason.`
      );
    }
  }
  check('entry with no meaning', problems, `${empty.size} entries lack a meaning, all of them allowlisted`);

  for (const kanji of NO_MEANING_ALLOWED) {
    if (empty.has(kanji)) continue;
    warn(
      levelsOf.has(kanji)
        ? `stale NO_MEANING_ALLOWED entry: ${kanji} now has a meaning — remove it from the allowlist`
        : `stale NO_MEANING_ALLOWED entry: ${kanji} is no longer in the corpus — remove it from the allowlist`
    );
  }
}

// ---------------------------------------------------------------------------
// 6. Every entry has at least one reading
// ---------------------------------------------------------------------------
// An empty onyomi, or an empty kunyomi, is normal and common on its own —
// plenty of characters genuinely have only one kind, and across the JLPT lists
// alone 22 entries have no onyomi and 561 have no kunyomi (2026-10-03). Only *neither* is a
// defect. (The tallies printed below span all six files, non-JLPT included, so
// they run a little higher than those two figures.)

section('6. Readings');
{
  const problems: string[] = [];
  const none = new Set<string>();
  let noOnyomi = 0;
  let noKunyomi = 0;

  for (const [level, file, list] of ALL) {
    for (const entry of list) {
      const on = trimmed(entry.onyomi);
      const kun = trimmed(entry.kunyomi);
      if (!on) noOnyomi++;
      if (!kun) noKunyomi++;
      if (on || kun) continue;

      none.add(entry.kanji);
      if (NO_READINGS_ALLOWED.has(entry.kanji)) continue;
      problems.push(
        `${file}: ${entry.kanji} (${level}) has neither onyomi nor kunyomi — its page renders with no readings, ` +
          `no romaji, and no search key, so nobody can reach it. ` +
          `Add a reading, or add it to NO_READINGS_ALLOWED with a reason.`
      );
    }
  }

  check(
    'entry with no readings at all',
    problems,
    `${none.size} entries have no readings, all of them allowlisted ` +
      `(${noOnyomi} lack onyomi and ${noKunyomi} lack kunyomi, which is normal)`
  );

  for (const kanji of NO_READINGS_ALLOWED) {
    if (none.has(kanji)) continue;
    warn(
      levelsOf.has(kanji)
        ? `stale NO_READINGS_ALLOWED entry: ${kanji} now has a reading — remove it from the allowlist`
        : `stale NO_READINGS_ALLOWED entry: ${kanji} is no longer in the corpus — remove it from the allowlist`
    );
  }
}

// ---------------------------------------------------------------------------
// 6b. Every onyomi item has the shape of an on reading
// ---------------------------------------------------------------------------
// Check 6 counts a field as "has a reading" whatever is in it, so for years it
// passed 130-odd entries whose onyomi field held a native word: 源 みなもと,
// 皿 さら, 翼 つばさ. Those pages taught a kun reading as the on reading, and
// the romaji, the JSON-LD and the search keys all followed it.
//
// Sino-Japanese readings are one mora, or two where the second is い, う, ん,
// き, く, ち or つ (っ covers the clipped forms がっ, かっ). A yōon is one
// mora. When this check was written it flagged 137 entries and every one was
// a real misfiling, with no false positives. It cannot see a one-mora kun such
// as 矢 や, or a typo with a plausible shape (葉 こう); scripts/kanjidic-fill.ts
// compares against KANJIDIC2 and catches those.

section('6b. Onyomi shape');
{
  const SMALL = /[ゃゅょぁぃぅぇぉ]/;
  const morae = (kana: string): string[] => {
    const out: string[] = [];
    for (const ch of kana) {
      if (SMALL.test(ch) && out.length) out[out.length - 1] += ch;
      else out.push(ch);
    }
    return out;
  };
  const onShaped = (kana: string): boolean => {
    const m = morae(kana);
    return m.length === 1 || (m.length === 2 && /^[いうんきくちつっ]$/.test(m[1]));
  };

  const problems: string[] = [];
  let items = 0;
  for (const [level, file, list] of ALL) {
    for (const entry of list) {
      for (const reading of kanjiReadings(entry).onyomi) {
        items++;
        if (onShaped(reading.kanaFull)) continue;
        problems.push(
          `${file}: ${entry.kanji} (${level}) has "${reading.raw}" as an onyomi, but no on reading has that shape — ` +
            `it is probably a kun reading or a word. Move it to kunyomi and check the onyomi against KANJIDIC2.`
        );
      }
    }
  }
  check('onyomi item that cannot be an on reading', problems, `${items} onyomi items, each shaped like an on reading`);
}

// ---------------------------------------------------------------------------
// 7. Distinct total == sum of list lengths
// ---------------------------------------------------------------------------
// app/page.tsx:17 and app/kanji/page.tsx:12 advertise the site's kanji count as
// a sum of list lengths. That number is only the truth while these two agree.
// Check 2 is what keeps them agreeing; this states the consequence out loud so
// the failure message points at the headline the user actually sees.

section('7. Advertised kanji total');
{
  const sum = JLPT.reduce((n, [, , list]) => n + list.length, 0);
  const distinct = levelsOf.size;
  check(
    'advertised total does not match the distinct character count',
    sum === distinct
      ? []
      : [
          `app/page.tsx and app/kanji/page.tsx advertise ${sum} kanji (sum of list lengths) ` +
            `but there are only ${distinct} distinct characters — the headline overstates the corpus by ${sum - distinct}, ` +
            `and app/sitemap.xml/route.ts emits ${sum - distinct} duplicate URL(s)`,
        ],
    `${distinct} distinct characters === ${sum} advertised`
  );

  console.log(`\n  JLPT entries          ${sum}`);
  for (const [level, , list] of JLPT) {
    console.log(`    ${level}                  ${list.length}`);
  }
  console.log(`  distinct characters   ${distinct}`);
  console.log(`  non-JLPT entries      ${NON_JLPT_KANJI.length}  (unreferenced — nothing renders these)`);
}

// ---------------------------------------------------------------------------
// 8. The N5 learning sequence covers the N5 list exactly
// ---------------------------------------------------------------------------
// /kanji/n5 renders the list in the order lib/levels/n5-sequence.ts gives it.
// The page never drops an entry the sequence misses (it falls into a trailing
// group), but a list page that quietly grows an "also on the list" bin has
// lost its teaching order, so both directions fail here.

section('8. N5 learning sequence');
{
  const n5 = new Set(N5_KANJI.map((k) => k.kanji));
  const seen = new Map<string, string>();
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const theme of N5_SEQUENCE) {
    if (ids.has(theme.id)) problems.push(`theme id "${theme.id}" is used twice — it is the page's anchor`);
    ids.add(theme.id);
    if (theme.kanji.length === 0) problems.push(`theme "${theme.id}" is empty`);
    for (const kanji of theme.kanji) {
      if (!n5.has(kanji)) problems.push(`${kanji} (theme "${theme.id}") is not on the N5 list`);
      const earlier = seen.get(kanji);
      if (earlier) problems.push(`${kanji} appears in theme "${earlier}" and again in "${theme.id}"`);
      seen.set(kanji, theme.id);
    }
  }
  for (const kanji of n5) {
    if (!seen.has(kanji)) {
      problems.push(`${kanji} is on the N5 list but in no theme — add it to lib/levels/n5-sequence.ts`);
    }
  }

  check(
    'N5 learning sequence does not match the N5 list',
    problems,
    `${N5_SEQUENCE.length} themes place all ${n5.size} N5 kanji exactly once`
  );

  // One order, two surfaces: /kanji/n5 lists the sequence, and the
  // previous/next strip on every N5 character page walks the data file. If the
  // two orders drift, "next" on 水 stops being the card after 水 on the list.
  const sequenceOrder = N5_SEQUENCE.flatMap((theme) => theme.kanji).join('');
  const fileOrder = N5_KANJI.map((k) => k.kanji).join('');
  check(
    'N5 teaching order differs between the sequence and the data file',
    problems.length === 0 && sequenceOrder !== fileOrder
      ? [
          'lib/levels/n5-sequence.ts and lib/constants/n5-kanji.ts list the N5 kanji in different orders — ' +
            'reorder one to match the other, so the list page and the character pages agree on what comes next',
        ]
      : [],
    'the sequence and lib/constants/n5-kanji.ts give the same teaching order'
  );
}

// ---------------------------------------------------------------------------

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s) — not fatal, but the allowlists should shrink:`);
  for (const w of warnings) console.log(`  WARN ${w}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
