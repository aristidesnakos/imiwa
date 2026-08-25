/**
 * lib/sentences/record-decision.ts
 *
 * THE one place a review decision is written. The API route at
 * `app/api/admin/sentences/decisions/[level]/route.ts` calls it, and any CLI
 * path must call it too rather than reimplementing the rules — otherwise the
 * terminal and the browser can disagree about what a valid decision is, and the
 * decision log stops being a trustworthy audit trail.
 *
 * It returns a discriminated result rather than throwing. HTTP status codes are
 * the route's business; validation outcomes are this module's.
 *
 * Node-only (writes with `fs`).
 */

import type {
  CandidateId,
  DecisionVerdict,
  Level,
  RejectReason,
  ReviewDecision,
  Token,
} from './types';
import { describeUnresolvedKey, resolveCorrectionKey } from './correction-keys';
import { REJECT_REASONS } from './reject-reasons';
import {
  currentReviewer,
  decisionsPath,
  readDecisionLog,
  readQueue,
  writeDecisionLog,
} from './store';

// Re-exported so server-side callers have one import for the whole contract.
// The definitions live in a filesystem-free module because the reviewer UI
// needs them in the browser — see the note at the top of reject-reasons.ts.
export { REJECT_REASONS, REJECT_REASON_LABELS } from './reject-reasons';

export interface DecisionInput {
  candidateId: CandidateId;
  targetKanji: string;
  verdict: DecisionVerdict;
  rejectReason?: RejectReason;
  note?: string;
  readingCorrections?: Record<string, string>;
  senseTag?: string;
  reviewer?: string;
  /** Explicit consent to replace an existing decision. Defaults to false. */
  overwrite?: boolean;
}

/**
 * Discriminated on a STRING tag, not on `ok: boolean`. This project compiles
 * with `strictNullChecks: false` (see tsconfig.json), under which TypeScript
 * will not narrow a union by a boolean literal discriminant — a `code` tag
 * narrows correctly in both modes.
 */
export type RecordDecisionResult =
  | { code: 'ok'; decision: ReviewDecision; replaced: ReviewDecision | null; file: string }
  | { code: 'invalid'; message: string }
  | { code: 'conflict'; message: string; existing: ReviewDecision };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the reviewer's reading corrections against the candidate's tokens.
 *
 * Reading corrections are the ONLY field a reviewer may edit — `japanese` and
 * `english` are verbatim licensed text (CC BY 2.0 FR), and editing them would
 * both break the licence's no-modification posture and make the per-contributor
 * attribution a lie. See docs/prd/example-sentences-phase0-findings.md §3.
 *
 * Keys are `<surface>#<occurrence>` and are validated against the real token
 * array when the queue is present, so a correction can never be written for a
 * token that does not exist. That check is the front door of the loud-failure
 * design in `correction-keys.ts`: a key rejected here never reaches the log, so
 * publish never has to refuse it later.
 *
 * When the queue file is absent there is nothing to validate against, and the
 * corrections pass through unchecked — the same posture the rest of this
 * function takes toward a missing queue.
 */
function validateReadingCorrections(
  raw: unknown,
  tokens: Token[] | null
):
  | { code: 'ok'; value: Record<string, string> | undefined }
  | { code: 'invalid'; message: string } {
  if (raw === undefined || raw === null) return { code: 'ok', value: undefined };
  if (!isPlainObject(raw)) {
    return {
      code: 'invalid',
      message: 'readingCorrections must be an object keyed <surface>#<occurrence>, e.g. 日#2',
    };
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (tokens !== null && resolveCorrectionKey(tokens, key) < 0) {
      return {
        code: 'invalid',
        message: `readingCorrections key ${describeUnresolvedKey(key)}`,
      };
    }
    if (typeof value !== 'string' || value.trim() === '') {
      return {
        code: 'invalid',
        message: `readingCorrections["${key}"] must be a non-empty string`,
      };
    }
    out[key] = value.trim();
  }

  return { code: 'ok', value: Object.keys(out).length > 0 ? out : undefined };
}

/**
 * Records one decision into `data/sentences/decisions/<level>.json`.
 *
 * Optimistic-concurrency guard: a candidate that already has a decision is
 * rejected with `conflict` unless `overwrite` is explicitly true. Two browser
 * tabs (or a tab and a terminal) reviewing the same queue must not silently
 * clobber each other's judgements — the second writer is told, and decides.
 */
export function recordDecision(level: Level, input: DecisionInput): RecordDecisionResult {
  /* ── validate the shape ────────────────────────────────────────────────── */

  if (typeof input.candidateId !== 'string' || input.candidateId.trim() === '') {
    return { code: 'invalid', message: 'candidateId is required' };
  }
  if (typeof input.targetKanji !== 'string' || input.targetKanji.trim() === '') {
    return { code: 'invalid', message: 'targetKanji is required' };
  }
  if (input.verdict !== 'accepted' && input.verdict !== 'rejected') {
    return { code: 'invalid', message: "verdict must be 'accepted' or 'rejected'" };
  }

  // Required on reject, and — unlike the tool this is ported from — actually
  // persisted below. A validated-then-discarded reason is worse than none: it
  // makes the log look complete while destroying the reject-reason
  // distribution, which is the signal that tells us whether the ranker or the
  // corpus is at fault.
  if (input.verdict === 'rejected') {
    if (!input.rejectReason) {
      return { code: 'invalid', message: 'rejectReason is required when rejecting' };
    }
    if (!REJECT_REASONS.includes(input.rejectReason)) {
      return {
        code: 'invalid',
        message: `rejectReason must be one of: ${REJECT_REASONS.join(', ')}`,
      };
    }
  }
  if (input.verdict === 'accepted' && input.rejectReason) {
    return { code: 'invalid', message: 'rejectReason is not allowed on an accept' };
  }
  if (input.note !== undefined && typeof input.note !== 'string') {
    return { code: 'invalid', message: 'note must be a string' };
  }

  // Free-text rather than an enum: the sense vocabulary is the kanji's own
  // `meaning` string, which differs per kanji, so there is nothing global to
  // validate against. Absent is meaningful — it records that the reviewer did
  // not adjudicate the sense, which must stay distinguishable from "the
  // heuristic guessed and nobody checked".
  if (input.senseTag !== undefined && typeof input.senseTag !== 'string') {
    return { code: 'invalid', message: 'senseTag must be a string' };
  }

  /* ── validate against the queue, when there is one ─────────────────────── */

  const queue = readQueue(level);
  const candidate = queue
    ? queue.entries
        .flatMap((e) => e.candidates)
        .find((c) => c.id === input.candidateId)
    : undefined;

  if (queue && !candidate) {
    return {
      code: 'invalid',
      message: `candidate ${input.candidateId} is not in the ${level} queue`,
    };
  }

  const corrections = validateReadingCorrections(
    input.readingCorrections,
    candidate ? candidate.tokens : null
  );
  if (corrections.code === 'invalid') {
    return { code: 'invalid', message: corrections.message };
  }

  /* ── optimistic-concurrency guard ──────────────────────────────────────── */

  const log = readDecisionLog(level);
  const existingIndex = log.decisions.findIndex((d) => d.candidateId === input.candidateId);
  const existing = existingIndex >= 0 ? log.decisions[existingIndex] : null;

  if (existing && input.overwrite !== true) {
    return {
      code: 'conflict',
      message: `${input.candidateId} was already ${existing.verdict} by ${existing.reviewer} at ${existing.decidedAt}; resend with overwrite:true to replace it`,
      existing,
    };
  }

  /* ── persist ───────────────────────────────────────────────────────────── */

  const note = input.note?.trim();
  const senseTag = input.senseTag?.trim();
  const decision: ReviewDecision = {
    candidateId: input.candidateId,
    targetKanji: input.targetKanji,
    verdict: input.verdict,
    ...(input.verdict === 'rejected' ? { rejectReason: input.rejectReason } : {}),
    ...(note ? { note } : {}),
    ...(corrections.value ? { readingCorrections: corrections.value } : {}),
    ...(senseTag ? { senseTag } : {}),
    reviewer: input.reviewer?.trim() || currentReviewer(),
    decidedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    log.decisions[existingIndex] = decision;
  } else {
    log.decisions.push(decision);
  }

  log.level = level;
  writeDecisionLog(log);

  return { code: 'ok', decision, replaced: existing, file: decisionsPath(level) };
}

/**
 * Clears a decision, returning the candidate to undecided. Separate from
 * `recordDecision` because "I mis-keyed, put it back" is a different intent
 * from "I judged it the other way", and the audit trail should not record a
 * verdict nobody meant.
 */
export function clearDecision(
  level: Level,
  candidateId: CandidateId
): { removed: ReviewDecision | null } {
  const log = readDecisionLog(level);
  const index = log.decisions.findIndex((d) => d.candidateId === candidateId);
  if (index < 0) return { removed: null };
  const [removed] = log.decisions.splice(index, 1);
  writeDecisionLog(log);
  return { removed };
}
