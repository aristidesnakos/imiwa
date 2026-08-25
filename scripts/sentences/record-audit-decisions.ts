/**
 * scripts/sentences/record-audit-decisions.ts
 *
 * A one-shot CLI for writing the rejections found by a corpus-wide audit pass,
 * rather than clicking 20-odd of them through /admin/review one at a time.
 *
 * It exists so that a batch still goes through `recordDecision` — the single
 * validated write path — instead of hand-editing decisions/<level>.json. The
 * module header on record-decision.ts is explicit that the terminal and the
 * browser must not disagree about what a valid decision is, and a batch is
 * exactly the moment that temptation shows up.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/record-audit-decisions.ts --level N5 [--dry-run]
 *
 * Entries live in AUDIT below with their reasoning attached. Re-running is
 * safe: a candidate that already carries a decision is reported and skipped,
 * never silently overwritten.
 */

import { recordDecision } from '../../lib/sentences/record-decision';
import type { Level, RejectReason } from '../../lib/sentences/types';

interface AuditEntry {
  candidateId: string;
  targetKanji: string;
  rejectReason: RejectReason;
  note: string;
}

/**
 * Findings from the 2026-08-25 audit's third pass. English-side and
 * Japanese-side defects in verbatim licensed source text: none of these can be
 * repaired, so rejection is the only move available.
 *
 * Deliberately excluded, because they are judgement calls for the Japanese
 * reviewer rather than defects:
 *   · the non-compositional idiom class (山ほど, 十中八九, 四六時中, 八百長,
 *     千切り, 上がってる, 何と) — correct English, but the target kanji has no
 *     counterpart in it. `target-kanji-unused` is the right reason if the call
 *     goes that way, and it affects ~12 publishing slots at once.
 *   · the two 北 "above London" rejections already on file, which are arguably
 *     over-rejections.
 */
const AUDIT: AuditEntry[] = [
  {
    candidateId: 'tatoeba-11044887-12613072',
    targetKanji: '入',
    rejectReason: 'bad-translation',
    note: 'English invents "the porch door", absent from the Japanese, and reverses the direction: the cat entered the veranda, it did not come in from it. Rank 1 for 入.',
  },
  {
    candidateId: 'tatoeba-122693-281309',
    targetKanji: '十',
    rejectReason: 'bad-translation',
    note: 'Subject mismatch: 「日本に来てから十年になります」 is first person, rendered "since he came to Japan". tatoeba-122378-281625 renders the identical construction correctly with "I". Rank 1 for 十.',
  },
  {
    candidateId: 'tatoeba-198679-35872',
    targetKanji: '雨',
    rejectReason: 'bad-translation',
    note: '"rainshower" is not a word — "rain shower" or "shower". Same class of source typo as the 食 "ths" rejection.',
  },
  {
    candidateId: 'tatoeba-142612-271958',
    targetKanji: '西',
    rejectReason: 'bad-translation',
    note: '西洋人 is "Westerner", not "European". The mistranslation lands directly on the sense of 西 this slot is teaching.',
  },
  {
    candidateId: 'tatoeba-9606290-10063648',
    targetKanji: '白',
    rejectReason: 'bad-translation',
    note: 'Dangling "it" with no antecedent, and a meaning inversion: 白日の下に晒される is exposure to public scrutiny, whereas "see the light of day" is being finally realised.',
  },
  {
    candidateId: 'tatoeba-3402115-3402100',
    targetKanji: '三',
    rejectReason: 'unnatural-japanese',
    note: 'Typo in the JAPANESE source: 「電話をかけなくてははらない」 should be ならない. Verbatim licensed text, so it cannot be corrected.',
  },
  {
    candidateId: 'tatoeba-10049868-61015',
    targetKanji: '半',
    rejectReason: 'bad-translation',
    note: '「約半リットル」 rendered "one pint": drops 半 — the target kanji — and silently changes the unit.',
  },
  {
    candidateId: 'tatoeba-218421-55732',
    targetKanji: '東',
    rejectReason: 'bad-translation',
    note: '古今東西 rendered "a universal truth that transcends time": 東西 is dropped entirely, so the target kanji has no counterpart in the English.',
  },
  {
    candidateId: 'tatoeba-2280800-2280778',
    targetKanji: '友',
    rejectReason: 'bad-translation',
    note: '「トムは高校時代の友人です」 rendered "Tom and I went to the same high school" — 友人 is dropped and the English asserts something the Japanese does not.',
  },
  {
    candidateId: 'tatoeba-219694-57015',
    targetKanji: '読',
    rejectReason: 'bad-translation',
    note: '「楽しく読めます」 rendered "This book will give you great pleasure" — the target kanji 読 has no counterpart in the English.',
  },
];

function parseArgs(): { level: Level; dryRun: boolean } {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--level');
  const level = (at !== -1 ? argv[at + 1] : 'N5') as Level;
  return { level, dryRun: argv.includes('--dry-run') };
}

function main(): void {
  const { level, dryRun } = parseArgs();
  let written = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nRecording ${AUDIT.length} audit decision(s) for ${level}${dryRun ? ' (dry run)' : ''}\n`);

  for (const entry of AUDIT) {
    if (dryRun) {
      console.log(`  would reject  ${entry.targetKanji}  ${entry.candidateId}  (${entry.rejectReason})`);
      continue;
    }
    const result = recordDecision(level, {
      candidateId: entry.candidateId,
      targetKanji: entry.targetKanji,
      verdict: 'rejected',
      rejectReason: entry.rejectReason,
      note: entry.note,
      reviewer: 'audit-2026-08-25',
    });

    if (result.code === 'ok') {
      written += 1;
      console.log(`  ✓ rejected    ${entry.targetKanji}  ${entry.candidateId}`);
    } else if (result.code === 'conflict') {
      skipped += 1;
      console.log(`  · already decided  ${entry.targetKanji}  ${entry.candidateId} — left alone`);
    } else {
      failed += 1;
      console.error(`  ✗ invalid     ${entry.targetKanji}  ${entry.candidateId}: ${result.message}`);
    }
  }

  if (!dryRun) {
    console.log(`\n  written ${written} · already decided ${skipped} · invalid ${failed}\n`);
  }
  if (failed > 0) process.exit(1);
}

main();
