/**
 * lib/sentences/reject-reasons.ts
 *
 * The reject-reason enum and its labels, in the order the reviewer UI binds
 * number keys 1–8 to.
 *
 * Deliberately its own module with NO imports beyond the type contract:
 * `record-decision.ts` reaches for `node:fs` through the store, and a client
 * component that needs these eight strings must not drag the filesystem into
 * the browser bundle. Server and client therefore share one definition of what
 * a valid reason is, without sharing a runtime dependency.
 */

import type { RejectReason } from './types';

export const REJECT_REASONS: RejectReason[] = [
  'unnatural-japanese',
  'bad-translation',
  'wrong-reading',
  'target-kanji-unused',
  'too-hard',
  'too-simple',
  'inappropriate-content',
  'other',
];

/** Short human labels for the reject-reason picker. */
export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  'unnatural-japanese': 'Unnatural Japanese',
  'bad-translation': 'Bad translation',
  'wrong-reading': 'Wrong reading (furigana)',
  'target-kanji-unused': 'Target kanji not demonstrated',
  'too-hard': 'Too hard',
  'too-simple': 'Too simple',
  'inappropriate-content': 'Inappropriate content',
  other: 'Other',
};
