/**
 * lib/announcements/types.ts
 *
 * The contract for the returning-user announcement bar. Everything here is
 * plain data or pure functions over plain data — no `window`, no React — so
 * that `scripts/announcements/validate.ts` can import the queue in Node and
 * check it in CI before it ever reaches a browser.
 *
 * See docs/3rdVersion/announcement-banner-roadmap.md for the reasoning.
 */

/** How a user came to have "registered" an announcement. Write-once. */
export type AckVia =
  /** Clicked the X, or pressed Escape. Explicit. */
  | 'dismiss'
  /** Clicked the CTA. They went to the feature; re-showing it is nagging. */
  | 'cta'
  /** Shown MAX_IMPRESSIONS times without interaction. Ignoring it is an answer. */
  | 'impression-cap'
  /** They already use the feature, so it was never shown at all. */
  | 'precondition';

/**
 * What we know about this visitor, read once from localStorage.
 *
 * Passed *into* the predicates rather than read by them, so every targeting
 * decision is a pure function of a value we can construct in a test.
 */
export interface LearnerSignals {
  /** Entries in `kanji-progress`. Our evidence of actual use, not mere visits. */
  learnedCount: number;
  /** Cards in `kanji-srs`. Non-zero means they already found the review feature. */
  srsCardCount: number;
  /** `cookie-consent` has been answered either way. */
  hasResolvedConsent: boolean;
}

export interface AnnouncementCta {
  /** Short verb phrase. Kept under CTA_MAX_LENGTH so the bar stays one line. */
  label: string;
  /** Internal path only — validated against the app router in CI. */
  href: string;
}

export interface Announcement {
  /** Stable, unique, kebab-case. Changing it re-shows the banner to everyone. */
  id: string;
  /** Inclusive UTC start date, `YYYY-MM-DD`. */
  startsAt: string;
  /**
   * Inclusive UTC end date, `YYYY-MM-DD`. The run ends because the config says
   * so, never because someone remembered to delete it.
   */
  expiresAt: string;
  /** One sentence. No exclamation-mark stacking, no "NEW!!!". */
  message: string;
  cta: AnnouncementCta;
  /**
   * Optional precondition. Return false to skip a user who already uses the
   * feature — announcing something to the people who found it is the fastest
   * way to make the bar read as an ad.
   */
  shouldShow?: (signals: LearnerSignals) => boolean;
  /**
   * Why this entry exists, in one line. Not rendered — it is for whoever reads
   * the config in six months, and the CI status report prints it.
   */
  note?: string;
}

/** Per-announcement record. Absent means never seen. */
export interface AnnouncementRecord {
  impressions: number;
  /** Epoch ms of acknowledgement, or null while still live for this user. */
  ackAt: number | null;
  ackVia: AckVia | null;
}

export interface AnnouncementState {
  v: 1;
  seen: Record<string, AnnouncementRecord>;
}

/** localStorage key. Deliberately separate from `kanji-progress`/`kanji-srs`
 *  so clearing announcement state never touches someone's learning data. */
export const ANNOUNCEMENTS_STORAGE_KEY = 'mk-announcements';

export const STATE_VERSION = 1 as const;

/**
 * Impressions before we auto-acknowledge. Three passes with no click is a
 * decision; waiting for a fourth is just wearing the user down.
 */
export const MAX_IMPRESSIONS = 3;

/** Copy limits. Enforced in CI so a long message can never wrap the bar to
 *  three lines on a phone and eat the fold on a kanji page. */
export const MESSAGE_MAX_LENGTH = 110;
export const CTA_MAX_LENGTH = 28;

/** No run may be longer than this. A "temporary" bar that lives for a month
 *  stops being temporary. */
export const MAX_RUN_DAYS = 14;
