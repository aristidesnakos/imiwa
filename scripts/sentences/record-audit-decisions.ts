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
 * Entries live in AUDIT and IDIOM_CLASS below with their reasoning attached.
 * Re-running is safe: a candidate that already carries a decision is reported
 * and skipped, never silently overwritten.
 *
 * "Safe" has to include the DORMANT case, and it did not. `recordDecision`
 * validates against the queue before it checks for an existing decision, so a
 * candidate that was decided and has since fallen out of the queue — a
 * regeneration with a different ranker is all it takes — comes back `invalid`
 * rather than `conflict`. Three of these entries are in that state today, and
 * the script exited 1 on a re-run that had nothing left to do. The decision log
 * is therefore consulted first here: an entry already on file is skipped on its
 * own evidence, and only a genuinely undecided candidate is asked of the queue.
 */

import { recordDecision } from '../../lib/sentences/record-decision';
import { decisionsById } from '../../lib/sentences/store';
import type { Level, RejectReason } from '../../lib/sentences/types';

interface AuditEntry {
  candidateId: string;
  targetKanji: string;
  rejectReason: RejectReason;
  note: string;
  /**
   * Who made the call. Defaults to the audit tag, which is deliberately not a
   * person — those entries are English-side defects anyone can verify against
   * the source text. An entry that records a REVIEWER'S judgement rather than a
   * defect must name the reviewer, because the two carry different authority
   * and a future reader has to be able to tell them apart.
   */
  reviewer?: string;
}

/** English-side defects: verifiable against the source, no judgement required. */
const AUDIT_REVIEWER = 'audit-2026-08-25';

/** The idiom-class ruling of 2026-08-25. A judgement, and it has an author. */
const IDIOM_REVIEWER = 'ari';

/**
 * Findings from the 2026-08-25 audit's third pass. English-side and
 * Japanese-side defects in verbatim licensed source text: none of these can be
 * repaired, so rejection is the only move available.
 *
 * Deliberately excluded, because they are judgement calls for the Japanese
 * reviewer rather than defects:
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

/**
 * THE NON-COMPOSITIONAL IDIOM CLASS — a reviewer's ruling, 2026-08-25.
 *
 * These are not defects. The Japanese is natural, the English is accurate, and
 * a translator would not change a word of either. They fail on a different
 * axis: the target kanji has no counterpart in the translation, because the
 * word it sits in is non-compositional. 「あのレースは八百長だった」 is exactly
 * "The race was fixed" — and a learner on /kanji/八 reads it looking for the
 * eight and finds nothing. 八百 is not eight hundred of anything.
 *
 * The ruling: reject them, reason `target-kanji-unused`. That reason exists in
 * the contract for precisely this — "kanji present but not meaningfully
 * demonstrated" — and `ExampleSentence.reviewedFor` already encodes the
 * principle that acceptance is per-character, not per-sentence.
 *
 * The precedent was already on file and only half-articulated. Five substituted
 * proverbs (三, 七, 百, 木, 万) and two dropped compounds (東西 → "transcends
 * time", 楽しく読めます → "great pleasure") were rejected as `bad-translation`
 * on the grounds that the target kanji had no counterpart in the English. That
 * is the same failure, and in this class the label `bad-translation` would be
 * a lie about the translator — hence a different reason for an identical fault.
 *
 * WHAT THIS COSTS, stated rather than buried: 山, 上 and 何 lose a rank-1..3
 * candidate each and their pools are not deep in good alternatives. 何 in
 * particular is hard to exemplify at all. The alternative — publishing 山ほど
 * on the 山 page — teaches a learner that 山 means "plenty", which is worse
 * than publishing nothing, and `ExampleSentencesSection` renders nothing at all
 * for a kanji with no sentences.
 *
 * NOT ruled on, and deliberately left in the queue: 「何とかそれをやって…」
 * ("somehow") and 「何となくはわかりました」 ("I sort of understand"). 何's
 * indefinite sense does survive into "some-how" and "sort of", so these are
 * arguable rather than clear, and they sit at 何#4 and 何#6 where they cost
 * nothing. A reviewer should look at them; a batch should not pre-empt one.
 */
const IDIOM_CLASS: AuditEntry[] = [
  {
    candidateId: 'tatoeba-231233-68601',
    targetKanji: '八',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「あのレースは八百長だった」 / "The race was fixed". 八百長 is fixing a match; neither 八 nor 百 nor 長 has a counterpart in the English. Held three publishing slots at once — 八#2, 百#2, 長#3.',
  },
  {
    candidateId: 'tatoeba-223820-61156',
    targetKanji: '八',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「このゲームは八百長だ」 / "This game is fixed". The same idiom as tatoeba-231233-68601 and rejected for the same reason. It sits at 八#8 and 百#6 today rather than in a publishing slot, but keeping one 八百長 while rejecting the other would be incoherent, and a regenerated queue can promote it.',
  },
  {
    candidateId: 'tatoeba-148059-266500',
    targetKanji: '九',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「十中八九ジェーンは来るだろう」 / "It is probable that Jane will come". 十中八九 is "in all likelihood"; the English carries none of the three numerals. Held 九#2 and 十#3.',
  },
  {
    candidateId: 'tatoeba-9250570-3405512',
    targetKanji: '四',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「トムが四六時中電話してくるの」 / "Tom calls me all the time". 四六時中 is "around the clock" (4 × 6 = 24); "all the time" contains neither number. Held 四#2 and 六#2.',
  },
  {
    candidateId: 'tatoeba-2170253-7766958',
    targetKanji: '六',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: 'The second 四六時中 sentence, "…only thinks about work all the time". Same idiom and same ruling as tatoeba-9250570-3405512; at 六#8 today, but rejected with its sibling so a regeneration cannot promote it into a publishing slot.',
  },
  {
    candidateId: 'tatoeba-11013735-10022868',
    targetKanji: '山',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「時間なんて山ほどあった」 / "We had plenty of time". 山ほど is a quantity idiom — the English says "plenty", never "mountain". Rank 1 for 山, so this is the most expensive entry in the class.',
  },
  {
    candidateId: 'tatoeba-2527114-1164166',
    targetKanji: '千',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「トムはレタスを千切りにした」 / "Tom shredded the lettuce". 千切り is julienne; the thousand is figurative and absent from the English. Rank 3 for 千.',
  },
  {
    candidateId: 'tatoeba-149063-265494',
    targetKanji: '上',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「車のバッテリーが上がってるよ」 / "My car battery is dead". バッテリーが上がる is a battery going flat — the one sense of 上 in which nothing goes up. Rank 2 for 上.',
  },
  {
    candidateId: 'tatoeba-187801-24940',
    targetKanji: '何',
    rejectReason: 'target-kanji-unused',
    reviewer: IDIOM_REVIEWER,
    note: '「何とおっしゃいましたか」 / "I beg your pardon?". 何 is doing its ordinary "what" job in the Japanese, but the idiomatic English paraphrases it away entirely, so the pair teaches the reader nothing about the character. Rank 3 for 何.',
  },
];

/** Everything this run writes, defects first. */
const ENTRIES: AuditEntry[] = [...AUDIT, ...IDIOM_CLASS];

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
  let dormant = 0;
  let failed = 0;

  // Read once, before the loop: `recordDecision` writes the log per call, but
  // nothing here re-decides an entry it already skipped, so a stale snapshot
  // cannot mislead us.
  const alreadyDecided = decisionsById(level);

  console.log(
    `\nRecording ${ENTRIES.length} decision(s) for ${level}` +
      ` (${AUDIT.length} audit · ${IDIOM_CLASS.length} idiom-class)${dryRun ? ' (dry run)' : ''}\n`
  );

  for (const entry of ENTRIES) {
    if (dryRun) {
      console.log(
        `  would reject  ${entry.targetKanji}  ${entry.candidateId}  (${entry.rejectReason})` +
          ` — ${entry.reviewer ?? AUDIT_REVIEWER}`
      );
      continue;
    }
    // Consulted before the queue. See the header: an entry whose candidate has
    // left the queue is dormant, not invalid, and re-running must not fail on it.
    const existing = alreadyDecided.get(entry.candidateId);
    if (existing) {
      dormant += 1;
      console.log(
        `  · already decided  ${entry.targetKanji}  ${entry.candidateId} ` +
          `(${existing.verdict} by ${existing.reviewer}) — left alone`
      );
      continue;
    }

    const result = recordDecision(level, {
      candidateId: entry.candidateId,
      targetKanji: entry.targetKanji,
      verdict: 'rejected',
      rejectReason: entry.rejectReason,
      note: entry.note,
      reviewer: entry.reviewer ?? AUDIT_REVIEWER,
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
    console.log(
      `\n  written ${written} · already decided ${dormant + skipped} · invalid ${failed}\n`
    );
  }
  if (failed > 0) process.exit(1);
}

main();
