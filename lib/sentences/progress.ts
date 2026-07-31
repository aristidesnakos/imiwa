/**
 * lib/sentences/progress.ts
 *
 * Pure functions that turn (queue, decisions) into the counters the dashboard
 * shows. No I/O — the caller supplies both halves — so the overview page, the
 * reviewer header and any future CLI report all compute progress identically.
 */

import type {
  CandidateId,
  KanjiQueueEntry,
  Level,
  ReviewDecision,
  ReviewQueue,
} from './types';

export type CandidateStatus = 'undecided' | 'accepted' | 'rejected';

export interface ProgressCounts {
  total: number;
  accepted: number;
  rejected: number;
  undecided: number;
  /** accepted + rejected */
  decided: number;
}

export function statusOf(
  candidateId: CandidateId,
  decisions: Map<CandidateId, ReviewDecision> | Record<CandidateId, ReviewDecision>
): CandidateStatus {
  const decision =
    decisions instanceof Map ? decisions.get(candidateId) : decisions[candidateId];
  if (!decision) return 'undecided';
  return decision.verdict === 'accepted' ? 'accepted' : 'rejected';
}

export function countEntry(
  entry: KanjiQueueEntry,
  decisions: Map<CandidateId, ReviewDecision> | Record<CandidateId, ReviewDecision>
): ProgressCounts {
  const counts: ProgressCounts = {
    total: entry.candidates.length,
    accepted: 0,
    rejected: 0,
    undecided: 0,
    decided: 0,
  };
  for (const candidate of entry.candidates) {
    counts[statusOf(candidate.id, decisions)] += 1;
  }
  counts.decided = counts.accepted + counts.rejected;
  return counts;
}

export function sumCounts(all: ProgressCounts[]): ProgressCounts {
  return all.reduce<ProgressCounts>(
    (acc, c) => ({
      total: acc.total + c.total,
      accepted: acc.accepted + c.accepted,
      rejected: acc.rejected + c.rejected,
      undecided: acc.undecided + c.undecided,
      decided: acc.decided + c.decided,
    }),
    { total: 0, accepted: 0, rejected: 0, undecided: 0, decided: 0 }
  );
}

export function percent(counts: ProgressCounts): number {
  if (counts.total === 0) return 0;
  return Math.round((counts.decided / counts.total) * 100);
}

/**
 * Progress over DISTINCT candidates rather than per-kanji slots.
 *
 * A sentence that usefully demonstrates two kanji is ranked under both, so the
 * same `candidateId` occupies more than one slot — in the N5 queue, 650 slots
 * are only 514 distinct candidates. Decisions are keyed by `candidateId`, so
 * one judgement resolves every slot that shares it.
 *
 * The overall counter therefore has to count distinct candidates, or the
 * reviewer makes one decision and watches the number jump by two. Per-kanji
 * counts stay slot-based, because a kanji's own list is what the reviewer is
 * looking at.
 */
export function countDistinct(
  entries: KanjiQueueEntry[],
  decisions: Map<CandidateId, ReviewDecision> | Record<CandidateId, ReviewDecision>
): ProgressCounts {
  const seen = new Set<CandidateId>();
  const counts: ProgressCounts = {
    total: 0,
    accepted: 0,
    rejected: 0,
    undecided: 0,
    decided: 0,
  };
  for (const entry of entries) {
    for (const candidate of entry.candidates) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      counts.total += 1;
      counts[statusOf(candidate.id, decisions)] += 1;
    }
  }
  counts.decided = counts.accepted + counts.rejected;
  return counts;
}

/** Per-level and overall totals for the queue overview. */
export interface QueueSummary {
  level: Level;
  queue: ReviewQueue;
  counts: ProgressCounts;
  perKanji: { entry: KanjiQueueEntry; counts: ProgressCounts }[];
}

export function summarise(
  queue: ReviewQueue,
  decisions: Map<CandidateId, ReviewDecision>
): QueueSummary {
  const perKanji = queue.entries.map((entry) => ({
    entry,
    counts: countEntry(entry, decisions),
  }));
  return {
    level: queue.level,
    queue,
    counts: sumCounts(perKanji.map((p) => p.counts)),
    perKanji,
  };
}
