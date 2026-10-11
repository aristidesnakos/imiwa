import type { EmailSignupSource } from '@/lib/analytics/email-signup-sources';

/**
 * The lists a confirmed signup can join, and which one each source joins.
 *
 * ---------------------------------------------------------------------------
 * Why two lists
 * ---------------------------------------------------------------------------
 *
 * Every form on the site offers the weekly Travels of Tan email, except one:
 * the Tan Dash results screen, where a player who has just asked for a phone
 * app is offered exactly that, one email if an app ships and nothing else.
 * Someone who wanted more of a game is not someone who asked for a weekly
 * Japanese comic, so they do not land on the story list. The weekly email
 * will announce an app too; this list is for the people who want only that.
 *
 * Each list is a Resend segment. Contacts are global in Resend and belong to
 * 0..n segments, so one address can be on both lists, and the weekly
 * broadcast only ever goes to the story segment. The list is not a claim in
 * the token: it follows from `source`, which the token already carries
 * authenticated, so a signup cannot ask for a list its form did not offer.
 *
 * Known and accepted: Resend's `unsubscribed` flag is per contact, not per
 * segment, so an address on both lists that unsubscribes from the weekly
 * email will not get the app email either. The weekly email announces the
 * app anyway. Resend Topics are the fix if that ever matters
 * (docs/prd/story-delivery-resend.md M7/M8).
 */
export const EMAIL_LISTS = {
  /** The weekly Travels of Tan email, and its welcome quiz card. */
  'weekly-stories': { segmentEnv: 'RESEND_WEEKLY_STORIES_SEGMENT_ID' },
  /** One email if a Tan Dash app ships. No welcome email, nothing weekly. */
  'play-app-waitlist': { segmentEnv: 'RESEND_PLAY_WAITLIST_SEGMENT_ID' },
} as const;

export type EmailList = keyof typeof EMAIL_LISTS;

/** The list a confirmed signup from `source` joins. */
export function emailListForSource(source: EmailSignupSource): EmailList {
  return source === 'play-app-waitlist' ? 'play-app-waitlist' : 'weekly-stories';
}

/**
 * The Resend segment id behind `list`, or `null` when its environment variable
 * is unset. Server only: it reads `process.env` at call time.
 */
export function segmentIdForList(list: EmailList): string | null {
  const value = process.env[EMAIL_LISTS[list].segmentEnv];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
