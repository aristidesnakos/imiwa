/**
 * Which episode a new subscriber's welcome email carries.
 *
 * Pure: no I/O, no clock. The confirm route (app/api/subscribe/confirm/route.ts)
 * reads Resend's broadcast list and hands it in; `pnpm validate:broadcast` hands
 * in fake lists and checks the answer.
 *
 * ---------------------------------------------------------------------------
 * The rule: the broadcast is the first email to carry an episode
 * ---------------------------------------------------------------------------
 *
 * An episode the weekly job will broadcast (`number` from
 * `config.newsletter.firstBroadcastEpisode` up) is held back from the welcome
 * email until its broadcast to the weekly-stories segment has gone out. Until
 * then a new subscriber gets the newest episode that has gone out, and gets the
 * held one with everyone else on Saturday. The page itself is public from the
 * day it is registered; only the email waits.
 *
 * Why: an episode is registered, and so live on the site, on the Wednesday it is
 * built, three days before its Saturday send. Until 2026-10-09 the welcome email
 * carried the newest registered episode, so everyone who confirmed in those
 * three days got it twice, once as their welcome and again in the broadcast.
 * Episode 7 reached two subscribers twice that way, and Episode 8 went early
 * to two more.
 *
 * A signup from an episode's own page asks for that episode and gets it when it
 * has gone out, or never will (below `firstBroadcastEpisode`). Otherwise it is
 * treated like a signup with no episode. The page promises "this episode's quiz
 * card"; the broadcast delivers it.
 *
 * Resend is the ledger, exactly as for the weekly job (lib/email/broadcast-queue.ts):
 * an episode's broadcast is the one named `Episode N: <title>`, and only sends
 * to the weekly-stories segment count. Gone out means queued, sending, sent or
 * canceled: every committed status but `scheduled`. Counting `queued` and
 * `sending` means someone confirming in the minute the send is going out, too
 * late to be in it, still gets the episode.
 *
 * Not ordered by `publishedAt`, and not derived from the send calendar: a week
 * with nothing queued, or two episodes registered in one week, moves every later
 * send, and only Resend knows where they landed.
 *
 * When Resend cannot be asked (`broadcasts: null`), nothing the job broadcasts
 * can be shown to have gone out, so only episodes below `firstBroadcastEpisode`
 * are sent. An older episode is the safe failure; a second copy is not.
 */
import { parseBroadcastName } from './broadcast';
import { COMMITTED_STATUSES, isToSegment } from './broadcast-queue';
import type { BroadcastSummary } from './broadcast-queue';

/** Statuses meaning a broadcast has started going out, or has gone out. */
export const GONE_OUT_STATUSES: readonly string[] = COMMITTED_STATUSES.filter(status => status !== 'scheduled');

export interface WelcomeEpisodeInput<E extends { number: number; slug: string }> {
  /** The registered episodes, in any order. */
  episodes: readonly E[];
  /** The slug the confirm token carries, if any. Unknown slugs are ignored. */
  requested?: string;
  /** Every broadcast on the account, or null when Resend could not be asked. */
  broadcasts: readonly BroadcastSummary[] | null;
  /** The weekly-stories segment, or null when unknown (then nothing is filtered out). */
  segmentId: string | null;
  firstBroadcastEpisode: number;
}

export interface WelcomeEpisode<E> {
  /** The episode to send, or undefined when none may be sent yet. */
  episode: E | undefined;
  /** Episodes held back because their broadcast has not gone out, newest first. For the log. */
  held: number[];
}

export function welcomeEpisode<E extends { number: number; slug: string }>(
  input: WelcomeEpisodeInput<E>
): WelcomeEpisode<E> {
  const goneOut = new Set(
    (input.broadcasts ?? []).flatMap(broadcast => {
      if (!isToSegment(broadcast, input.segmentId) || !GONE_OUT_STATUSES.includes(broadcast.status)) return [];
      const parsed = parseBroadcastName(broadcast.name);
      return parsed ? [parsed.number] : [];
    })
  );
  const mayBeSent = (episode: E) => episode.number < input.firstBroadcastEpisode || goneOut.has(episode.number);

  const newestFirst = [...input.episodes].sort((a, b) => b.number - a.number);
  const held = newestFirst.filter(episode => !mayBeSent(episode)).map(episode => episode.number);

  const requested = input.requested ? newestFirst.find(episode => episode.slug === input.requested) : undefined;
  if (requested && mayBeSent(requested)) return { episode: requested, held };
  return { episode: newestFirst.find(mayBeSent), held };
}
