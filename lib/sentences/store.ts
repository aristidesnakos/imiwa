/**
 * lib/sentences/store.ts
 *
 * Flat-file persistence for the review pipeline. michikanji has no database;
 * every durable artefact in this repo is a JSON file on disk, and the sentence
 * pipeline follows that.
 *
 * Two directories, deliberately separate (see the essay at the top of
 * `types.ts`):
 *
 *   data/sentences/queue/<level>.json      ReviewQueue   — REGENERABLE, read-only here
 *   data/sentences/decisions/<level>.json  DecisionLog   — human work, append-mostly
 *
 * Nothing in this file ever writes to the queue directory. Re-running
 * `scripts/sentences/select.ts` must be a no-op as far as review work is
 * concerned; the only thing that couples the two is the stable `CandidateId`.
 *
 * Node-only (uses `fs`). Import from route handlers, server components and
 * CLI scripts — never from a client component.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import type {
  CandidateId,
  DecisionLog,
  KanjiQueueEntry,
  Level,
  ReviewDecision,
  ReviewQueue,
  SentenceCandidate,
} from './types';

export const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function isLevel(value: string): value is Level {
  return (LEVELS as string[]).includes(value);
}

const DATA_ROOT = path.join(process.cwd(), 'data', 'sentences');

export const QUEUE_DIR = path.join(DATA_ROOT, 'queue');
export const DECISIONS_DIR = path.join(DATA_ROOT, 'decisions');

export function queuePath(level: Level): string {
  return path.join(QUEUE_DIR, `${level}.json`);
}

export function decisionsPath(level: Level): string {
  return path.join(DECISIONS_DIR, `${level}.json`);
}

/* ────────────────────────────── Reading the queue ─────────────────────────── */

/**
 * Reads one level's queue. Returns `null` when the file does not exist — that
 * is the NORMAL state before `select.ts` has been run, not an error, and the
 * UI renders an empty state for it.
 *
 * A malformed file, by contrast, IS an error and is allowed to throw: silently
 * treating corrupt JSON as "no queue" would look identical to "not generated
 * yet" and would send the reviewer hunting in the wrong place.
 */
export function readQueue(level: Level): ReviewQueue | null {
  const file = queuePath(level);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ReviewQueue;
  return parsed;
}

/** Every level that currently has a queue file on disk, in JLPT order. */
export function readAllQueues(): ReviewQueue[] {
  return LEVELS.map(readQueue).filter((q): q is ReviewQueue => q !== null);
}

/** Finds the queue entry for a kanji across all levels. */
export function findKanjiEntry(
  kanji: string
): { queue: ReviewQueue; entry: KanjiQueueEntry } | null {
  for (const queue of readAllQueues()) {
    const entry = queue.entries.find((e) => e.kanji === kanji);
    if (entry) return { queue, entry };
  }
  return null;
}

/** Ordered list of kanji across all queues — drives prev/next-kanji navigation. */
export function kanjiOrder(): { kanji: string; level: Level }[] {
  return readAllQueues().flatMap((q) =>
    q.entries.map((e) => ({ kanji: e.kanji, level: e.level }))
  );
}

/* ─────────────────────────── Reading/writing decisions ────────────────────── */

/** An absent decision file means "nobody has reviewed this level yet". */
export function readDecisionLog(level: Level): DecisionLog {
  const file = decisionsPath(level);
  if (!fs.existsSync(file)) return { level, decisions: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8')) as DecisionLog;
}

/**
 * Atomic write: temp file in the same directory, then rename. A half-written
 * decision log would lose review work that cannot be regenerated, which is
 * exactly the thing this whole two-file split exists to protect.
 *
 * Mirrors the write-then-rename already used by `scripts/submit-indexnow.ts`
 * (see the `/data/*.json.tmp` entry in .gitignore).
 */
export function writeDecisionLog(log: DecisionLog): void {
  fs.mkdirSync(DECISIONS_DIR, { recursive: true });
  const file = decisionsPath(log.level);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

/** Decisions for a level, indexed by candidate id. */
export function decisionsById(level: Level): Map<CandidateId, ReviewDecision> {
  const log = readDecisionLog(level);
  return new Map(log.decisions.map((d) => [d.candidateId, d]));
}

/** Decisions across every level, indexed by candidate id. */
export function allDecisionsById(): Map<CandidateId, ReviewDecision> {
  const map = new Map<CandidateId, ReviewDecision>();
  for (const level of LEVELS) {
    for (const d of readDecisionLog(level).decisions) map.set(d.candidateId, d);
  }
  return map;
}

/* ─────────────────────────────────── Misc ─────────────────────────────────── */

/**
 * Who gets recorded as `reviewer`. There are no user accounts anywhere in this
 * project, so the OS user is the honest answer; `SENTENCE_REVIEWER` overrides
 * it when the machine account name is not the name you want in an audit trail.
 */
export function currentReviewer(): string {
  const override = process.env.SENTENCE_REVIEWER?.trim();
  if (override) return override;
  try {
    return os.userInfo().username;
  } catch {
    return 'unknown';
  }
}

/** Flattens every candidate in a queue, preserving kanji then rank order. */
export function allCandidates(queue: ReviewQueue): SentenceCandidate[] {
  return queue.entries.flatMap((e) => e.candidates);
}
