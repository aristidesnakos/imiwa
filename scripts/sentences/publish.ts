/**
 * scripts/sentences/publish.ts
 *
 * The last step of the layer-4 pipeline: queue ∩ decisions → what the site
 * renders.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/publish.ts --level N5
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/publish.ts --level N5 --dry-run
 *
 * Reads `data/sentences/queue/<level>.json` and
 * `data/sentences/decisions/<level>.json`, and writes
 * `data/sentences/published/<level>.json` as `ExampleSentence[]`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT REFUSES TO WRITE INVALID OUTPUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `lib/sentences/validate.ts` runs on the assembled set before anything touches
 * disk. If any check fails, nothing is written and the process exits non-zero.
 * This is the enforcement point the data contract kept promising: a token whose
 * reading the tokenizer never resolved renders as a silent, plausible-looking
 * error, which is the worst failure mode for a site whose whole claim is
 * accuracy. It must not be possible to ship one by accident.
 *
 * The same validator backs `pnpm validate:sentences`, so CI checks exactly what
 * publish enforced rather than a second, drifting copy of the rules.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SELECTION: RANK, BUT SPREAD SENSES FIRST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A kanji may have more accepted sentences than `targetPerKanji`. Taking the
 * top 3 by rank would ship three sentences that all demonstrate the same sense —
 * 今日 / 毎日 / 先日 are three words and one meaning of 日, and a learner who
 * sees only those never learns that 日 is the 日 of 日本.
 *
 * So the first pass takes the best-ranked accepted sentence for each DISTINCT
 * `senseTag`, and only then fills remaining slots by rank. `senseTag` is the
 * REVIEWER's judgement, not the ranker's `senseHint` — the hint assigns a sense
 * to only ~22% of candidates and abstains exactly where polysemy matters most
 * (see the essay in select.ts). Untagged accepted sentences are not penalised;
 * they simply carry no spread information and fill by rank.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORPHANED DECISIONS ARE REPORTED, NEVER DELETED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A decision whose candidate is no longer in the queue — because selection was
 * re-run with a different ranker — cannot be published: the queue is the only
 * place the sentence TEXT lives. But it is not an error and it is not deleted.
 * It is evidence about the ranker (the human accepted something the new ranker
 * no longer surfaces), so it is counted and printed, and the decision log is
 * left untouched.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { validatePublished, formatIssues } from '../../lib/sentences/validate';
import type {
  DecisionLog,
  ExampleSentence,
  Level,
  ReviewDecision,
  ReviewQueue,
  SentenceCandidate,
  Token,
} from '../../lib/sentences/types';

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const ROOT = resolve(__dirname, '..', '..');
const QUEUE_DIR = join(ROOT, 'data', 'sentences', 'queue');
const DECISIONS_DIR = join(ROOT, 'data', 'sentences', 'decisions');
const PUBLISHED_DIR = join(ROOT, 'data', 'sentences', 'published');

/* ────────────────────────────────── CLI ──────────────────────────────────── */

function parseArgs(argv: string[]): { level: Level; dryRun: boolean } {
  const levelFlag = argv.indexOf('--level');
  const raw = levelFlag === -1 ? 'N5' : argv[levelFlag + 1];
  if (!raw || !(LEVELS as string[]).includes(raw)) {
    throw new Error(`--level must be one of ${LEVELS.join(', ')} (got ${raw ?? 'nothing'})`);
  }
  return { level: raw as Level, dryRun: argv.includes('--dry-run') };
}

/* ──────────────────────────────── Assembly ───────────────────────────────── */

/**
 * Applies the reviewer's reading corrections to a candidate's tokens.
 *
 * `readingCorrections` is the ONLY thing a reviewer may edit. `surface` is never
 * touched, so the concatenation still reconstructs the verbatim source sentence
 * — the validator re-checks that afterwards regardless. Correcting a token also
 * clears `readingUnknown`: the human supplied the reading the tokenizer could
 * not, which is precisely what that flag was waiting for.
 */
function applyCorrections(tokens: Token[], corrections?: Record<number, string>): Token[] {
  if (!corrections || Object.keys(corrections).length === 0) return tokens;

  return tokens.map((token, index) => {
    const corrected = corrections[index]?.trim();
    if (!corrected) return token;
    return { surface: token.surface, reading: corrected };
  });
}

function toExampleSentence(
  candidate: SentenceCandidate,
  decision: ReviewDecision,
  reviewedFor: string[]
): ExampleSentence {
  return {
    id: candidate.id,
    kanji: candidate.kanji,
    targets: candidate.targets,
    reviewedFor,
    japanese: candidate.japanese,
    tokens: applyCorrections(candidate.tokens, decision.readingCorrections),
    english: candidate.english,
    level: candidate.level,
    source: candidate.source,
    signals: candidate.signals,
    review: {
      kind: 'human-reviewed',
      reviewer: decision.reviewer,
      date: decision.decidedAt,
    },
  };
}

/**
 * Best-ranked accepted sentence per distinct sense first, then fill by rank.
 * See the header for why the tag and not the hint decides this.
 */
function selectForKanji(
  accepted: { candidate: SentenceCandidate; decision: ReviewDecision }[],
  limit: number
): { candidate: SentenceCandidate; decision: ReviewDecision }[] {
  const byRank = [...accepted].sort((a, b) => a.candidate.rank - b.candidate.rank);

  const chosen: typeof byRank = [];
  const seenSenses = new Set<string>();

  for (const item of byRank) {
    if (chosen.length >= limit) break;
    const tag = item.decision.senseTag?.trim();
    if (!tag || seenSenses.has(tag)) continue;
    seenSenses.add(tag);
    chosen.push(item);
  }

  for (const item of byRank) {
    if (chosen.length >= limit) break;
    if (chosen.includes(item)) continue;
    chosen.push(item);
  }

  return chosen.sort((a, b) => a.candidate.rank - b.candidate.rank);
}

/* ──────────────────────────────── Main ───────────────────────────────────── */

function main(): void {
  const { level, dryRun } = parseArgs(process.argv.slice(2));

  const queueFile = join(QUEUE_DIR, `${level}.json`);
  if (!existsSync(queueFile)) {
    throw new Error(
      `no queue at ${queueFile} — run scripts/sentences/select.ts --level ${level} first`
    );
  }
  const queue = JSON.parse(readFileSync(queueFile, 'utf8')) as ReviewQueue;

  const decisionsFile = join(DECISIONS_DIR, `${level}.json`);
  const log: DecisionLog = existsSync(decisionsFile)
    ? (JSON.parse(readFileSync(decisionsFile, 'utf8')) as DecisionLog)
    : { level, decisions: [] };

  const decisionsById = new Map<string, ReviewDecision>(
    log.decisions.map((d) => [d.candidateId, d])
  );

  // A CandidateId is a JP/EN pair id — it carries no kanji — so the SAME id
  // appears in several kanji's candidate lists, and one decision covers all of
  // them. Building an id → candidate map and reading `candidate.targetKanji`
  // back off it is therefore wrong: the map is last-write-wins and the answer
  // is whichever entry happened to be written last. Walk the queue's own
  // structure instead, which is the only place the kanji ↔ candidate relation
  // is unambiguous.
  const idsInQueue = new Set<string>();
  for (const entry of queue.entries) {
    for (const candidate of entry.candidates) idsInQueue.add(candidate.id);
  }

  const rejected = log.decisions.filter((d) => d.verdict === 'rejected').length;
  const accepted = log.decisions.filter((d) => d.verdict === 'accepted');
  // Retained in the log, absent from the queue. Evidence about the ranker, not
  // an error — but unpublishable, because the queue is where the text lives.
  const orphaned = accepted.filter((d) => !idsInQueue.has(d.candidateId)).length;

  // The OUTPUT is a flat set keyed by sentence id: a sentence accepted while
  // reviewing 日 and again while reviewing 今 is emitted once, carrying both
  // kanji in `reviewedFor`. Emitting it twice would put two identical cards on
  // one page and duplicate its attribution.
  const published = new Map<string, ExampleSentence>();
  let kanjiWithFull = 0;
  let kanjiWithSome = 0;
  let shared = 0;

  for (const entry of queue.entries) {
    const acceptedHere = entry.candidates
      .map((candidate) => ({ candidate, decision: decisionsById.get(candidate.id) }))
      .filter(
        (x): x is { candidate: SentenceCandidate; decision: ReviewDecision } =>
          // `decision.targetKanji` is the kanji the reviewer had ON SCREEN. A
          // decision is keyed by the JP/EN pair alone, so the same accepted
          // sentence also sits in other kanji's candidate lists — but nobody
          // judged it as an example of THOSE characters, and publishing it
          // there would invent a review that never happened. See
          // `ExampleSentence.reviewedFor`.
          x.decision?.verdict === 'accepted' && x.decision.targetKanji === entry.kanji
      );
    if (acceptedHere.length === 0) continue;

    const chosen = selectForKanji(acceptedHere, queue.targetPerKanji);
    for (const { candidate, decision } of chosen) {
      const existing = published.get(candidate.id);
      if (existing) {
        // Cannot happen while one decision carries one targetKanji, but the
        // field is an array because the cardinality is genuinely many, and a
        // future "also good for 今?" confirmation step would populate it.
        existing.reviewedFor.push(entry.kanji);
        shared += 1;
        continue;
      }
      published.set(candidate.id, toExampleSentence(candidate, decision, [entry.kanji]));
    }
    if (chosen.length >= queue.targetPerKanji) kanjiWithFull += 1;
    else kanjiWithSome += 1;
  }

  const sentences = [...published.values()];

  // Nothing reaches disk until every check passes. See the header.
  const issues = validatePublished(sentences, { queue });
  if (issues.length > 0) {
    console.error(formatIssues(issues));
    console.error(
      `\nRefusing to write ${level}: ${issues.length} validation ` +
        `${issues.length === 1 ? 'failure' : 'failures'}. Nothing was changed.`
    );
    process.exit(1);
  }

  console.log(`publish ${level}`);
  console.log(`  decisions read            ${log.decisions.length}`);
  console.log(`    accepted                ${accepted.length}`);
  console.log(`    rejected                ${rejected}`);
  console.log(`    orphaned (kept in log)  ${orphaned}`);
  console.log(`  kanji with ${queue.targetPerKanji} sentences     ${kanjiWithFull}`);
  console.log(`  kanji with fewer          ${kanjiWithSome}`);
  console.log(`  reviewed for >1 kanji     ${shared} (emitted once, shown on each)`);
  console.log(`  sentences published       ${sentences.length}`);
  console.log(`  validation                ${sentences.length} checked, 0 issues`);

  if (dryRun) {
    console.log('\n--dry-run: nothing written.');
    return;
  }

  mkdirSync(PUBLISHED_DIR, { recursive: true });
  const out = join(PUBLISHED_DIR, `${level}.json`);
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(sentences, null, 2)}\n`, 'utf8');
  renameSync(tmp, out);
  console.log(`\nwrote ${out}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
