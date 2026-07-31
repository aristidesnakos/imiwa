/**
 * lib/announcements/state.ts
 *
 * Read/write for the `mk-announcements` localStorage key, plus the pure
 * transitions over it.
 *
 * The transitions are deliberately separated from the storage calls: every
 * decision about whether a user has "registered" an announcement is a pure
 * function of (state, id, now), which is the part worth reasoning about, and
 * the only part `scripts/announcements/validate.ts` can exercise in Node.
 */

import {
  ANNOUNCEMENTS_STORAGE_KEY,
  MAX_IMPRESSIONS,
  STATE_VERSION,
  type AckVia,
  type AnnouncementRecord,
  type AnnouncementState,
} from './types';

export function emptyState(): AnnouncementState {
  return { v: STATE_VERSION, seen: {} };
}

const emptyRecord = (): AnnouncementRecord => ({
  impressions: 0,
  ackAt: null,
  ackVia: null,
});

/**
 * Parse whatever is in storage into a state we can trust.
 *
 * Anything unrecognised — a different version, a hand-edited blob, a key
 * collision — degrades to the empty state rather than throwing. The cost of
 * being wrong here is one extra banner impression; the cost of throwing is a
 * white screen on every page of the site, because this runs in the layout.
 */
export function parseState(raw: string | null): AnnouncementState {
  if (!raw) return emptyState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return emptyState();

    const candidate = parsed as Partial<AnnouncementState>;
    if (candidate.v !== STATE_VERSION) return emptyState();
    if (!candidate.seen || typeof candidate.seen !== 'object') return emptyState();

    // Rebuild rather than trust: a record missing `impressions` would make
    // `impressions + 1` produce NaN, which never reaches the cap, which means
    // a banner that can never auto-acknowledge itself.
    const seen: Record<string, AnnouncementRecord> = {};
    for (const [id, value] of Object.entries(candidate.seen)) {
      const record = value as Partial<AnnouncementRecord> | null;
      if (!record || typeof record !== 'object') continue;
      seen[id] = {
        impressions: typeof record.impressions === 'number' && record.impressions >= 0
          ? record.impressions
          : 0,
        ackAt: typeof record.ackAt === 'number' ? record.ackAt : null,
        ackVia: typeof record.ackVia === 'string' ? (record.ackVia as AckVia) : null,
      };
    }

    return { v: STATE_VERSION, seen };
  } catch {
    return emptyState();
  }
}

export function recordFor(state: AnnouncementState, id: string): AnnouncementRecord {
  return state.seen[id] ?? emptyRecord();
}

/**
 * Acknowledgement is write-once. Once `ackAt` is set, that id is dead forever
 * regardless of impressions — no re-engagement pass, no "maybe they forgot".
 * Respecting the dismissal is the entire reason this pattern is tolerable.
 */
export function isAcknowledged(state: AnnouncementState, id: string): boolean {
  return recordFor(state, id).ackAt !== null;
}

export function withImpression(state: AnnouncementState, id: string): AnnouncementState {
  const record = recordFor(state, id);
  return {
    ...state,
    seen: { ...state.seen, [id]: { ...record, impressions: record.impressions + 1 } },
  };
}

export function withAck(
  state: AnnouncementState,
  id: string,
  via: AckVia,
  now: number,
): AnnouncementState {
  const record = recordFor(state, id);
  // First acknowledgement wins. A CTA click followed by an impression-cap
  // write must not overwrite `cta` with the weaker signal.
  if (record.ackAt !== null) return state;
  return {
    ...state,
    seen: { ...state.seen, [id]: { ...record, ackAt: now, ackVia: via } },
  };
}

/** True once this id has been shown enough times that silence is an answer. */
export function hasHitImpressionCap(state: AnnouncementState, id: string): boolean {
  return recordFor(state, id).impressions >= MAX_IMPRESSIONS;
}

// ─── Storage edge ──────────────────────────────────────────────────────────
// The only two functions in this module that know localStorage exists. Both
// are total: storage can throw (Safari private mode, quota, disabled cookies)
// and an announcement bar is never worth breaking a page over.

export function loadState(): AnnouncementState {
  if (typeof window === 'undefined') return emptyState();
  try {
    return parseState(window.localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY));
  } catch {
    return emptyState();
  }
}

export function saveState(state: AnnouncementState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable. The banner degrades to "shows every load until
    // dismissed in this session", which is the correct failure direction —
    // annoying at worst, never broken.
  }
}
