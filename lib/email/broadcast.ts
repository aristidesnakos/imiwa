/**
 * The weekly episode broadcast, as the payload Resend's Broadcast API takes.
 *
 * One builder for both broadcast scripts: the weekly job
 * (scripts/stories/schedule-weekly-broadcast.ts) and the manual, draft-only
 * fallback (scripts/stories/create-broadcast.ts). A draft made by hand and one
 * made by the job are therefore the same email, byte for byte, which is also
 * how the job can tell whether a draft it finds is still what it would build
 * today (`draftDifferences`).
 *
 * The body is `lib/email/quiz-email.ts` with `kind: 'weekly'`, so a broadcast's
 * content links carry `utm_content=weekly` and its arrivals are never filed
 * under the welcome card. Until 2026-09-27 the draft script omitted `kind`,
 * and the renderer's default would have tagged a broadcast as the welcome card.
 *
 * ---------------------------------------------------------------------------
 * The name is the ledger key
 * ---------------------------------------------------------------------------
 *
 * There is no repo state file. Resend is the only record of which episodes
 * have gone out, and a broadcast belongs to episode N when, and only when, its
 * name is exactly `Episode N: <title>`. The number is the identity; the title
 * is for people, so an episode renamed after its broadcast still counts as
 * sent. `parseBroadcastName` is strict on purpose: `Episode 06: …`, `episode
 * 6: …` or `Episode 6 - …` are near-misses, never episode 6. A near-miss that
 * has gone out is the one case the job cannot settle alone, so
 * `mentionedEpisodeNumber` finds them and the job stops and asks rather than
 * risk sending an episode twice (lib/email/broadcast-queue.ts).
 *
 * Relative imports, not `@/`: the scripts and `pnpm validate:broadcast` run
 * this under tsx from `scripts/`.
 */
import config from '../../config';
import type { Episode } from '../stories/types';
import { quizEmailHtml, quizEmailSubject, quizEmailText } from './quiz-email';

/**
 * Resend's per-recipient unsubscribe link. Only the Broadcast product resolves
 * it; the welcome card, a direct send, gets a signed URL instead. It is never
 * tagged (lib/email/utm.ts), and `pnpm validate:broadcast` asserts that.
 */
export const RESEND_UNSUBSCRIBE_URL = '{{{RESEND_UNSUBSCRIBE_URL}}}';

/**
 * The body of `POST /broadcasts`. Deliberately without `send` or
 * `scheduled_at`: a broadcast is always created as a draft, and scheduling is
 * a separate call the weekly job makes after its guards pass.
 */
export interface BroadcastPayload {
  segment_id: string;
  from: string;
  reply_to?: string;
  name: string;
  subject: string;
  html: string;
  text: string;
}

/** `Episode 6: Tan's family and friends`. The only name the job recognises. */
export function broadcastName(episode: Pick<Episode, 'number' | 'titleEn'>): string {
  return `Episode ${episode.number}: ${episode.titleEn}`;
}

// `Episode`, one space, a positive integer with no leading zero, a colon, one
// space, then a title with no leading or trailing whitespace: exactly what
// `broadcastName` writes. `.` does not match a line break, so a multi-line
// name is refused too.
const EPISODE_NAME = /^Episode ([1-9]\d*): (\S(?:.*\S)?)$/;

/** The episode a broadcast name claims, or null unless it is exactly `Episode N: <title>`. */
export function parseBroadcastName(name: string | null | undefined): { number: number; title: string } | null {
  if (typeof name !== 'string') return null;
  const match = EPISODE_NAME.exec(name);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isSafeInteger(number) ? { number, title: match[2] } : null;
}

// "Episode 6 - …", "EP06", "Ep. 6", "episode #6", "Episodes 6": anything a
// person might have typed for an episode. Loose on purpose; it only ever
// raises a question, never answers one.
const MENTIONS_EPISODE = /\bep(?:isodes?)?\.?\s*#?\s*0*(\d+)/i;

/** The episode number a name mentions in any spelling, or null. For spotting near-misses. */
export function mentionedEpisodeNumber(name: string | null | undefined): number | null {
  if (typeof name !== 'string') return null;
  const match = MENTIONS_EPISODE.exec(name);
  return match ? Number(match[1]) : null;
}

/** The broadcast for one episode, addressed to the weekly-stories segment. */
export function episodeBroadcast(episode: Episode, segmentId: string): BroadcastPayload {
  return {
    segment_id: segmentId,
    from: config.resend.fromAdmin,
    reply_to: config.resend.supportEmail,
    name: broadcastName(episode),
    subject: quizEmailSubject(episode),
    html: quizEmailHtml(episode, RESEND_UNSUBSCRIBE_URL, 'weekly'),
    text: quizEmailText(episode, RESEND_UNSUBSCRIBE_URL, 'weekly'),
  };
}

/** The fields of a broadcast Resend returns from `GET /broadcasts/{id}` that the builder sets. */
export interface StoredBroadcast {
  segment_id?: string | null;
  audience_id?: string | null;
  from?: string | null;
  reply_to?: string | string[] | null;
  name?: string | null;
  subject?: string | null;
  html?: string | null;
  text?: string | null;
}

function replyTo(value: string | readonly string[] | null | undefined): string {
  const list = typeof value === 'string' ? [value] : [...(value ?? [])];
  return list.map(address => address.trim()).sort().join(',');
}

/**
 * Which fields of a stored broadcast differ from what the builder makes now.
 * Empty means the draft is exactly this build and can be scheduled as it is.
 * Anything else is a draft edited by hand, built from older episode data, or
 * built by an older builder (one without the postal address, or tagging its
 * links as the welcome card), and a person should decide what happens to it.
 */
export function draftDifferences(stored: StoredBroadcast, fresh: BroadcastPayload): string[] {
  const differences: string[] = [];
  const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? '') === (b ?? '');
  if (!same(stored.segment_id ?? stored.audience_id, fresh.segment_id)) differences.push('segment');
  if (!same(stored.from?.trim(), fresh.from.trim())) differences.push('from');
  if (replyTo(stored.reply_to) !== replyTo(fresh.reply_to)) differences.push('reply_to');
  if (!same(stored.name, fresh.name)) differences.push('name');
  if (!same(stored.subject, fresh.subject)) differences.push('subject');
  if (!same(stored.html, fresh.html)) differences.push('html');
  if (!same(stored.text, fresh.text)) differences.push('text');
  return differences;
}
