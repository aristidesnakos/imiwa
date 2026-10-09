/**
 * Validator for the weekly broadcast job's decisions.
 *
 * Run: pnpm validate:broadcast
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The weekly job (scripts/stories/schedule-weekly-broadcast.ts) books a real
 * send to every subscriber, unattended, twice a week. Its two decisions, when
 * and which episode, are pure functions (lib/email/send-schedule.ts and
 * lib/email/broadcast-queue.ts), so they are asserted here against a synthetic
 * clock and fake Resend broadcast lists, the way `validate:announcements`
 * replays its model against synthetic visitors. Nothing here needs a
 * credential or touches the network.
 *
 * The promises it pins down:
 *
 *   - the slot is always the send day at `sendTimeUtc`, never less than
 *     half an hour ahead and never more than a week and a half-hour ahead,
 *     on every weekday and on both sides of the send time;
 *   - the queue runs in episode order, from `firstBroadcastEpisode`, and never
 *     picks an episode that is booked, going out, or gone;
 *   - one broadcast per send day, and a cancelled Saturday stays cancelled;
 *   - anything ambiguous (two drafts, a near-miss name that went out, a status
 *     the code does not know) stops the job instead of guessing;
 *   - an episode's broadcast is recognised by its exact name and nothing else;
 *   - a new subscriber's welcome email never carries an episode whose broadcast
 *     has not gone out, because that broadcast would send it to them again;
 *   - the email it builds is the weekly one: `utm_content=weekly` on its
 *     content links, Resend's unsubscribe placeholder bare, no `send` or
 *     `scheduled_at` on creation.
 */
import config from '../config';
import { postalAddressLine } from '../lib/business/postal-address';
import {
  RESEND_UNSUBSCRIBE_URL,
  broadcastName,
  draftDifferences,
  episodeBroadcast,
  mentionedEpisodeNumber,
  parseBroadcastName,
} from '../lib/email/broadcast';
import {
  COMMITTED_STATUSES,
  nothingQueuedIssueTitle,
  parseResendTimestamp,
  parseReviewIssueTitle,
  planWeeklyBroadcast,
  reviewIssueTitle,
  summariseBroadcast,
} from '../lib/email/broadcast-queue';
import type { BroadcastSummary, Plan, PlanInput, QueueEpisode, ReviewRecord } from '../lib/email/broadcast-queue';
import { GONE_OUT_STATUSES, welcomeEpisode } from '../lib/email/welcome-episode';
import type { WelcomeEpisodeInput } from '../lib/email/welcome-episode';
import { quizEmailHtml, quizEmailText } from '../lib/email/quiz-email';
import {
  MIN_SCHEDULE_LEAD_MINUTES,
  formatUtcInstant,
  nextSendAt,
  nextSendDate,
  sendDayName,
} from '../lib/email/send-schedule';
import { withNewsletterUtm } from '../lib/email/utm';
import { EPISODES, episodesNewestFirst } from '../lib/stories';

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) passed += 1;
  else failures.push(name);
}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const at = (iso: string) => new Date(iso);

// --- The configuration the job reads ------------------------------------------

const newsletter = config.newsletter;
check('the send day is a weekday index, 0 to 6', Number.isInteger(newsletter.sendDay) && newsletter.sendDay >= 0 && newsletter.sendDay <= 6);
check('the send time is HH:MM in UTC', /^([01]\d|2[0-3]):[0-5]\d$/.test(newsletter.sendTimeUtc));
check('the first broadcast episode is a positive integer', Number.isInteger(newsletter.firstBroadcastEpisode) && newsletter.firstBroadcastEpisode > 0);
check(
  'the first broadcast episode is registered, so the queue starts at a real episode',
  EPISODES.some(episode => episode.number === newsletter.firstBroadcastEpisode)
);
check('the minimum lead is half an hour', MIN_SCHEDULE_LEAD_MINUTES === 30);

// --- When: the send slot ---------------------------------------------------------
//
// These cases assume the configured Saturday 13:00 UTC; the sweep below and
// the reconfigured case after it prove the helper follows the config rather
// than the numbers written here.

const SATURDAY = '2026-10-03T13:00:00.000Z';
const NEXT_SATURDAY = '2026-10-10T13:00:00.000Z';

if (newsletter.sendDay === 6 && newsletter.sendTimeUtc === '13:00') {
  const week = [
    ['Sunday', '2026-09-27'],
    ['Monday', '2026-09-28'],
    ['Tuesday', '2026-09-29'],
    ['Wednesday', '2026-09-30'],
    ['Thursday', '2026-10-01'],
    ['Friday', '2026-10-02'],
    ['Saturday', '2026-10-03'],
  ] as const;
  for (const [day, date] of week) {
    check(`a run on ${day} at 12:00 UTC schedules for Sat 2026-10-03 13:00 UTC`, nextSendAt(at(`${date}T12:00:00Z`)) === SATURDAY);
  }
  check('a run on Sunday just after midnight schedules for that Saturday', nextSendAt(at('2026-09-27T00:00:00Z')) === SATURDAY);
  check('a run on Friday just before midnight schedules for the next day', nextSendAt(at('2026-10-02T23:59:59Z')) === SATURDAY);

  check('Saturday at 12:29 UTC is still today: 31 minutes of lead', nextSendAt(at('2026-10-03T12:29:00Z')) === SATURDAY);
  check('Saturday at exactly 12:30 UTC is still today: exactly the minimum lead', nextSendAt(at('2026-10-03T12:30:00Z')) === SATURDAY);
  check('Saturday a millisecond after 12:30 UTC rolls to next week', nextSendAt(at('2026-10-03T12:30:00.001Z')) === NEXT_SATURDAY);
  check('Saturday at 12:45 UTC rolls to next week: never an immediate send', nextSendAt(at('2026-10-03T12:45:00Z')) === NEXT_SATURDAY);
  check('Saturday at 13:00 UTC rolls to next week', nextSendAt(at('2026-10-03T13:00:00Z')) === NEXT_SATURDAY);
  check('Saturday after 13:00 UTC rolls to next week', nextSendAt(at('2026-10-03T13:01:00Z')) === NEXT_SATURDAY);
  check('late on Saturday rolls to next week', nextSendAt(at('2026-10-03T23:59:00Z')) === NEXT_SATURDAY);
  check('the slot crosses a year boundary', nextSendAt(at('2026-12-31T12:00:00Z')) === '2027-01-02T13:00:00.000Z');
  check('the slot reads as a title would print it', formatUtcInstant(SATURDAY) === 'Sat 2026-10-03 13:00 UTC');
}

// Every 7 minutes for three weeks: whatever the clock says, the slot is the
// configured weekday and time, at least the minimum lead ahead, at most a week
// plus that lead ahead, written as ISO 8601 in UTC, and the day `nextSendDate`
// names unless that day's slot is already too close.
{
  const [hours, minutes] = newsletter.sendTimeUtc.split(':').map(Number);
  let sweepFailures = 0;
  const start = Date.parse('2026-09-27T00:00:00Z');
  for (let t = start; t < start + 21 * DAY; t += 7 * MINUTE) {
    const from = new Date(t);
    const slot = nextSendAt(from);
    const date = new Date(slot);
    const lead = date.getTime() - t;
    const sameDay = `${nextSendDate(from)}T${newsletter.sendTimeUtc}:00.000Z`;
    const ok =
      date.toISOString() === slot &&
      date.getUTCDay() === newsletter.sendDay &&
      date.getUTCHours() === hours &&
      date.getUTCMinutes() === minutes &&
      lead >= MIN_SCHEDULE_LEAD_MINUTES * MINUTE &&
      lead <= 7 * DAY + MIN_SCHEDULE_LEAD_MINUTES * MINUTE &&
      (slot === sameDay || (Date.parse(sameDay) - t < MIN_SCHEDULE_LEAD_MINUTES * MINUTE && slot === new Date(Date.parse(sameDay) + 7 * DAY).toISOString()));
    if (!ok) sweepFailures += 1;
  }
  check('across three weeks of clock, every slot is the send day and time, 30 minutes to a week ahead', sweepFailures === 0);
}

// The helper reads the config, not a constant: move the send to Wednesday
// 09:05 and it follows. Restored afterwards whatever happens.
{
  const saved = { ...newsletter };
  try {
    newsletter.sendDay = 3;
    newsletter.sendTimeUtc = '09:05';
    check('a Wednesday 09:05 send day is honoured on the Monday before', nextSendAt(at('2026-09-28T10:00:00Z')) === '2026-09-30T09:05:00.000Z');
    check('on the send day, 5 minutes before the send rolls a week', nextSendAt(at('2026-09-30T09:00:00Z')) === '2026-10-07T09:05:00.000Z');
    check('the day name follows the config', sendDayName() === 'Wednesday');
    for (const bad of ['13:00 ', '1300', '24:00', '13:60', '1:00', '']) {
      newsletter.sendTimeUtc = bad;
      let threw = false;
      try {
        nextSendAt(at('2026-09-28T10:00:00Z'));
      } catch {
        threw = true;
      }
      check(`a malformed send time (${JSON.stringify(bad)}) is refused rather than guessed`, threw);
    }
  } finally {
    Object.assign(newsletter, saved);
  }
}

// --- Resend's timestamps -----------------------------------------------------------

const instant = (value: string) => parseResendTimestamp(value)?.toISOString() ?? null;
check("Resend's own format parses: 2026-11-01 15:13:31.723+00", instant('2026-11-01 15:13:31.723+00') === '2026-11-01T15:13:31.723Z');
check('a whole-second Resend timestamp parses', instant('2026-10-03 13:00:00+00') === SATURDAY);
check('ISO 8601 parses', instant('2026-10-03T13:00:00.000Z') === SATURDAY);
check('an offset with minutes parses', instant('2026-10-03 18:30:00+05:30') === SATURDAY);
check('microseconds parse', instant('2026-10-03 13:00:00.000123+00') === SATURDAY);
check('a timestamp with no zone is read as UTC', instant('2026-10-03 13:00:00') === SATURDAY);
for (const bad of ['', 'tomorrow', '2026-10-03', 'in 1 min', '03/10/2026 13:00']) {
  check(`an unreadable timestamp (${JSON.stringify(bad)}) is null, not a guess`, parseResendTimestamp(bad) === null);
}
check('a missing timestamp is null', parseResendTimestamp(null) === null && parseResendTimestamp(undefined) === null);

// --- Names: the ledger key -------------------------------------------------------------

for (const episode of EPISODES) {
  const parsed = parseBroadcastName(broadcastName(episode));
  check(
    `${episode.slug}: its broadcast name reads back as Episode ${episode.number}, title intact`,
    parsed?.number === episode.number && parsed?.title === episode.titleEn
  );
}
check('a two-digit episode parses', parseBroadcastName('Episode 12: A long title: with a colon')?.number === 12);
check('the title after the first colon is kept whole', parseBroadcastName('Episode 12: A long title: with a colon')?.title === 'A long title: with a colon');

const NEAR_MISSES = [
  'Episode 06: Tan',
  'episode 6: Tan',
  'EPISODE 6: Tan',
  'Episode 6 - Tan',
  'Episode 6 — Tan',
  'Episode 6:Tan',
  'Episode  6: Tan',
  'Episode 6 : Tan',
  'Episode 6:  Tan',
  'Ep 6: Tan',
  'Ep. 6: Tan',
  'EP06 Tan',
  'Episode #6: Tan',
  'Episode 6',
  'Episode 6:',
  'Episode 6: ',
  ' Episode 6: Tan',
  'Episode 6: Tan ',
  'Draft Episode 6: Tan',
  'Episode 6.5: Tan',
  'Episode 6a: Tan',
  'Episode -6: Tan',
  'Episode 0: Tan',
  'Episode six: Tan',
  'Episode ６: Tan',
  'Episode 6: Tan\nsecond line',
  'Episode 90071992547409931: Tan',
];
for (const name of NEAR_MISSES) {
  check(`a near-miss name (${JSON.stringify(name)}) is not an episode broadcast`, parseBroadcastName(name) === null);
}
check('no name is not an episode broadcast', parseBroadcastName(null) === null && parseBroadcastName(undefined) === null);
for (const name of ['Episode 06: Tan', 'episode 6: Tan', 'Episode 6 - Tan', 'EP06 Tan', 'Ep. 6: Tan', 'Episode #6: Tan']) {
  check(`a near-miss (${JSON.stringify(name)}) is still spotted as mentioning episode 6`, mentionedEpisodeNumber(name) === 6);
}
for (const name of ['Autumn survey', 'Step 6 of the plan', 'Keep 6 in mind', 'Deep 6']) {
  check(`a name that does not mention an episode (${JSON.stringify(name)}) is not one`, mentionedEpisodeNumber(name) === null);
}

// --- Which: the queue ----------------------------------------------------------------------

const SEGMENT = 'seg-weekly-stories';
const OTHER_SEGMENT = 'seg-owner-tests';

const EPISODE_TITLES: Record<number, string> = {
  1: 'Tan climbs the mountain',
  2: 'Tan finds the river',
  3: 'Tan goes to school',
  4: 'A rainy day off',
  5: 'The train east',
  6: "Tan's family and friends",
  7: 'Tan at the market',
  8: 'How much is it?',
  9: 'Tan takes the bus',
};
const fakeEpisodes = (...numbers: number[]): QueueEpisode[] =>
  numbers.map(number => ({ number, slug: `episode-${number}`, titleEn: EPISODE_TITLES[number] }));
const ONE_TO_SIX = fakeEpisodes(1, 2, 3, 4, 5, 6);
const ONE_TO_SEVEN = fakeEpisodes(1, 2, 3, 4, 5, 6, 7);

let nextId = 0;
function broadcast(overrides: Partial<BroadcastSummary> & { episode?: number }): BroadcastSummary {
  const { episode, ...rest } = overrides;
  nextId += 1;
  return {
    id: `bc-${nextId}`,
    name: episode ? `Episode ${episode}: ${EPISODE_TITLES[episode]}` : null,
    status: 'draft',
    segmentId: SEGMENT,
    scheduledAt: null,
    createdAt: '2026-09-27 10:00:00+00',
    sentAt: null,
    ...rest,
  };
}

function plan(overrides: Partial<PlanInput>): Plan {
  return planWeeklyBroadcast({
    episodes: ONE_TO_SIX,
    broadcasts: [],
    segmentId: SEGMENT,
    firstBroadcastEpisode: 6,
    slot: SATURDAY,
    reviews: [],
    ...overrides,
  });
}

const creates = (result: Plan, number: number) =>
  result.decision.kind === 'create' && result.decision.episode.number === number;
const stops = (result: Plan, ...mentions: string[]) =>
  result.decision.kind === 'stop' && mentions.every(text => (result.decision as { reason: string }).reason.includes(text));

// None.
check('with no broadcasts at all, Episode 6 is built and scheduled', creates(plan({}), 6));
check('with no broadcasts at all, this is the list\'s first send', plan({}).firstSend === true);

// Episodes below firstBroadcastEpisode.
check(
  'episodes 1 to 5 are never queued: with only those registered, nothing is',
  plan({ episodes: fakeEpisodes(1, 2, 3, 4, 5) }).decision.kind === 'nothing-queued'
);
check(
  'an unsent episode 3 does not jump the queue: Episode 6 is next',
  creates(plan({ broadcasts: [broadcast({ episode: 3 })] }), 6)
);
check(
  'a sent episode 3 changes nothing for Episode 6',
  creates(plan({ broadcasts: [broadcast({ episode: 3, status: 'sent', sentAt: '2026-09-19 13:00:00+00' })] }), 6)
);
check('the queue starts wherever the config says', creates(plan({ firstBroadcastEpisode: 4 }), 4));

// One draft.
{
  const draft = broadcast({ episode: 6 });
  const result = plan({ broadcasts: [draft] });
  check(
    'exactly one draft for Episode 6 is scheduled, not duplicated',
    result.decision.kind === 'schedule-draft' && result.decision.draft.id === draft.id && result.decision.episode.number === 6
  );
}

// Scheduled.
{
  const booked = broadcast({ episode: 6, status: 'scheduled', scheduledAt: '2026-10-03 13:00:00+00' });
  const result = plan({ broadcasts: [booked], episodes: ONE_TO_SEVEN });
  check(
    'Episode 6 already scheduled for the slot: nothing else happens',
    result.decision.kind === 'already-scheduled' && result.decision.scheduled.map(e => e.number).join() === '6'
  );
  const later = plan({
    broadcasts: [broadcast({ episode: 6, status: 'scheduled', scheduledAt: '2026-10-10 13:00:00+00' })],
    episodes: ONE_TO_SEVEN,
  });
  check(
    'Episode 6 moved to a later Saturday by hand: Episode 7 does not jump ahead of it',
    later.decision.kind === 'already-scheduled'
  );
}

// Sent, and the other statuses that mean gone out.
check(
  'Episode 6 sent: Episode 7 is next',
  creates(plan({ episodes: ONE_TO_SEVEN, broadcasts: [broadcast({ episode: 6, status: 'sent', sentAt: '2026-09-26 13:00:00+00' })] }), 7)
);
{
  const result = plan({ broadcasts: [broadcast({ episode: 6, status: 'sent', sentAt: '2026-09-26 13:00:00+00' })] });
  check(
    'Episode 6 sent and nothing after it: nothing queued, and the newest is 6',
    result.decision.kind === 'nothing-queued' && result.decision.newest === 6
  );
  check('once one has gone out, it is no longer the first send', result.firstSend === false);
}
for (const status of ['queued', 'sending', 'canceled']) {
  check(
    `Episode 6 ${status}: it is never sent again, and Episode 7 is next`,
    creates(plan({ episodes: ONE_TO_SEVEN, broadcasts: [broadcast({ episode: 6, status })] }), 7)
  );
}
check(
  'every committed status is one Resend documents, plus sending',
  ['scheduled', 'queued', 'sending', 'sent', 'canceled'].every(status => COMMITTED_STATUSES.includes(status)) &&
    COMMITTED_STATUSES.length === 5
);

// Two drafts for one episode.
{
  const a = broadcast({ episode: 6 });
  const b = broadcast({ episode: 6 });
  check('two drafts for Episode 6: stop and name both, never guess', stops(plan({ broadcasts: [a, b] }), a.id, b.id));
}

// A second queued episode waits a week.
{
  const booked = broadcast({ episode: 6, status: 'scheduled', scheduledAt: '2026-10-03 13:00:00+00' });
  const thisWeek = plan({ episodes: ONE_TO_SEVEN, broadcasts: [booked], reviews: [{ day: '2026-10-03', episode: 6 }] });
  check('with 6 booked for Saturday, 7 is not booked the same week', thisWeek.decision.kind === 'already-scheduled');

  const sent = { ...booked, status: 'sent', sentAt: '2026-10-03 13:00:05+00' };
  const nextWeek = plan({
    episodes: ONE_TO_SEVEN,
    broadcasts: [sent],
    slot: NEXT_SATURDAY,
    reviews: [{ day: '2026-10-03', episode: 6 }],
  });
  check('once 6 has gone out, 7 is booked for the Saturday after', creates(nextWeek, 7));
}

// One broadcast per send day.
{
  const survey = broadcast({ name: 'Autumn survey', status: 'scheduled', scheduledAt: '2026-10-03 09:00:00+00' });
  const result = plan({ broadcasts: [survey] });
  check('another broadcast booked for Saturday: nothing else is booked for it', result.decision.kind === 'slot-taken');
  check(
    'another broadcast booked for a different day leaves Saturday free',
    creates(plan({ broadcasts: [{ ...survey, scheduledAt: '2026-10-05 09:00:00+00' }] }), 6)
  );
  check(
    'another broadcast already sent on Saturday morning also takes the day',
    plan({ broadcasts: [{ ...survey, status: 'sent', sentAt: '2026-10-03 08:00:00+00', scheduledAt: null }] }).decision.kind === 'slot-taken'
  );
  check(
    'a booked broadcast whose date cannot be read is assumed to be on Saturday',
    plan({ broadcasts: [{ ...survey, scheduledAt: 'sometime' }] }).decision.kind === 'slot-taken'
  );
  check(
    'a broadcast to another segment does not take the day',
    creates(plan({ broadcasts: [{ ...survey, segmentId: OTHER_SEGMENT }] }), 6)
  );
}

// A cancelled Saturday stays cancelled.
{
  const cancelled = broadcast({ episode: 6 }); // a cancelled scheduled broadcast is a draft again
  const reviews: ReviewRecord[] = [{ day: '2026-10-03', episode: 6 }];
  const held = plan({ broadcasts: [cancelled], reviews });
  check(
    'scheduled by the job for Saturday, then cancelled: held, not rescheduled',
    held.decision.kind === 'held' && held.decision.episode === 6
  );
  check('scheduled by the job for Saturday, then deleted: held too', plan({ broadcasts: [], reviews }).decision.kind === 'held');
  const following = plan({ broadcasts: [cancelled], reviews, slot: NEXT_SATURDAY });
  check(
    'the Saturday after, the cancelled draft is scheduled again',
    following.decision.kind === 'schedule-draft' && following.decision.draft.id === cancelled.id
  );
  check(
    'with GitHub unreadable (a dry run), the hold is not assumed either way',
    plan({ broadcasts: [cancelled], reviews: null }).decision.kind === 'schedule-draft'
  );
}

// Near-misses, unknown statuses, and what does not count.
check(
  'a near-miss name that went out: stop, because Episode 6 may already have reached subscribers',
  stops(plan({ broadcasts: [broadcast({ name: "Episode 6 - Tan's family", status: 'sent', sentAt: '2026-09-26 13:00:00+00' })] }), 'Episode 6')
);
{
  const result = plan({ broadcasts: [broadcast({ name: 'Ep 6 test', status: 'draft' })] });
  check('a near-miss draft is not Episode 6\'s draft: a fresh one is built', creates(result, 6));
  check('and the near-miss draft is named in the notes', result.notes.some(note => note.includes('Ep 6 test')));
}
check(
  'a status this code does not know stops the job rather than guessing',
  stops(plan({ broadcasts: [broadcast({ episode: 6, status: 'failed' })] }), 'failed')
);
check(
  'a sent Episode 6 to another segment is not a send to subscribers',
  creates(plan({ broadcasts: [broadcast({ episode: 6, status: 'sent', segmentId: OTHER_SEGMENT })] }), 6)
);
check(
  'a sent Episode 6 whose segment Resend does not report counts, to be safe',
  creates(plan({ episodes: ONE_TO_SEVEN, broadcasts: [broadcast({ episode: 6, status: 'sent', segmentId: null })] }), 7)
);
{
  const renamed = broadcast({ name: 'Episode 6: An older title', status: 'sent', sentAt: '2026-09-26 13:00:00+00' });
  const result = plan({ episodes: ONE_TO_SEVEN, broadcasts: [renamed] });
  check('an episode renamed after it went out still counts as sent: the number is the identity', creates(result, 7));
  check('and the older title is noted', result.notes.some(note => note.includes('older title')));
}
{
  const leftover = broadcast({ episode: 6 });
  const result = plan({
    episodes: ONE_TO_SEVEN,
    broadcasts: [broadcast({ episode: 6, status: 'sent', sentAt: '2026-09-26 13:00:00+00' }), leftover],
  });
  check('a leftover draft of a sent episode is ignored, and 7 is next', creates(result, 7));
}
check(
  'a draft named for an unregistered episode changes nothing',
  creates(plan({ broadcasts: [broadcast({ name: 'Episode 99: Someday' })] }), 6)
);
check(
  'the queue is ordered by number, whatever order the registry lists episodes in',
  creates(plan({ episodes: fakeEpisodes(7, 6, 5) }), 6)
);

// Resend unknown: a dry run with no key.
{
  const result = plan({ broadcasts: null });
  check('with Resend unknown, the queue starts at the first broadcast episode', creates(result, 6));
  check('with Resend unknown, whether this is the first send is unknown', result.firstSend === null);
  check(
    'with Resend unknown and nothing registered from 6 up, nothing is queued',
    plan({ broadcasts: null, episodes: fakeEpisodes(1, 2) }).decision.kind === 'nothing-queued'
  );
}

// --- Which: the welcome email ---------------------------------------------------------------
//
// The week of 2026-10-07, replayed. Episode 7 went out on Sat 10-03; Episode 8
// was registered on Wed 10-07 and booked for Sat 10-10; two subscribers who
// confirmed in between were sent Episode 8 as their welcome, three days before
// the broadcast would send it to them again.

const ONE_TO_EIGHT = fakeEpisodes(1, 2, 3, 4, 5, 6, 7, 8);
const SENT_7 = broadcast({
  episode: 7,
  status: 'sent',
  scheduledAt: '2026-10-03 13:00:00+00',
  sentAt: '2026-10-03 13:01:07+00',
});
const BOOKED_8 = broadcast({ episode: 8, status: 'scheduled', scheduledAt: '2026-10-10 13:00:00+00' });
const SENT_8 = { ...BOOKED_8, status: 'sent', sentAt: '2026-10-10 13:01:00+00' };

function welcome(overrides: Partial<WelcomeEpisodeInput<QueueEpisode>>): number | undefined {
  return welcomeEpisode({
    episodes: ONE_TO_EIGHT,
    broadcasts: [BOOKED_8, SENT_7],
    segmentId: SEGMENT,
    firstBroadcastEpisode: 7,
    ...overrides,
  }).episode?.number;
}

check('Episode 8 booked for Saturday: a signup with no episode is welcomed with Episode 7, not 8', welcome({}) === 7);
check("Episode 8 booked: a signup from Episode 8's own page gets Episode 7 now and 8 on Saturday", welcome({ requested: 'episode-8' }) === 7);
check("a signup from Episode 7's page gets Episode 7", welcome({ requested: 'episode-7' }) === 7);
check("a signup from Episode 3's page gets Episode 3, which is below the queue", welcome({ requested: 'episode-3' }) === 3);
check('a retired slug is treated as no episode', welcome({ requested: 'episode-99' }) === 7);
check('Episode 8 registered before the job has booked it is held too', welcome({ broadcasts: [SENT_7] }) === 7);
check('a leftover draft of Episode 8 does not release it', welcome({ broadcasts: [broadcast({ episode: 8 }), SENT_7] }) === 7);
check('once Episode 8 has gone out, it is the welcome', welcome({ broadcasts: [SENT_8, SENT_7] }) === 8);
check("once Episode 8 has gone out, a signup from its page gets it", welcome({ broadcasts: [SENT_8, SENT_7], requested: 'episode-8' }) === 8);
check('gone out is every committed status but scheduled', GONE_OUT_STATUSES.join() === 'queued,sending,sent,canceled');
for (const status of ['queued', 'sending', 'canceled']) {
  check(`an Episode 8 broadcast that is ${status} has gone out`, welcome({ broadcasts: [{ ...BOOKED_8, status }, SENT_7] }) === 8);
}
check(
  'Episode 8 sent to another segment, a test send, does not release it',
  welcome({ broadcasts: [{ ...SENT_8, segmentId: OTHER_SEGMENT }, SENT_7] }) === 7
);
check(
  'a send whose segment Resend did not report counts',
  welcome({ broadcasts: [{ ...SENT_8, segmentId: null }, SENT_7] }) === 8
);
check(
  'a near-miss name that went out does not release Episode 8',
  welcome({ broadcasts: [broadcast({ name: 'Episode 8 - How much is it?', status: 'sent' }), SENT_7] }) === 7
);
check(
  'a backlog: Episode 9 registered while 8 still waits, both are held',
  welcome({ episodes: fakeEpisodes(1, 2, 3, 4, 5, 6, 7, 8, 9) }) === 7
);
check('Resend unreachable: the newest episode the job never broadcasts, Episode 6', welcome({ broadcasts: null }) === 6);
check("Resend unreachable: a signup from Episode 3's page still gets 3", welcome({ broadcasts: null, requested: 'episode-3' }) === 3);
check("Resend unreachable: a signup from Episode 7's page gets Episode 6", welcome({ broadcasts: null, requested: 'episode-7' }) === 6);
check(
  'nothing that may be sent yet means no welcome email, not an early one',
  welcomeEpisode({ episodes: fakeEpisodes(7, 8), broadcasts: [BOOKED_8], segmentId: SEGMENT, firstBroadcastEpisode: 7 })
    .episode === undefined
);
check(
  'the held list names what is held, newest first, for the log',
  welcomeEpisode({ episodes: fakeEpisodes(1, 2, 3, 4, 5, 6, 7, 8, 9), broadcasts: [SENT_7], segmentId: SEGMENT, firstBroadcastEpisode: 7 })
    .held.join() === '9,8'
);
{
  // The real registry and config, with nothing broadcast: whatever is welcomed
  // is never an episode the queue still has to send.
  const real = welcomeEpisode({ episodes: EPISODES, broadcasts: [], segmentId: SEGMENT, firstBroadcastEpisode: newsletter.firstBroadcastEpisode });
  check(
    'the real registry, nothing broadcast: the welcome is below the queue',
    real.episode === undefined || real.episode.number < newsletter.firstBroadcastEpisode
  );
}

// How both readers of the ledger see Resend's list.
check('a listed segment_id is kept', summariseBroadcast({ id: 'x', status: 'sent', segment_id: SEGMENT }).segmentId === SEGMENT);
check('a legacy audience_id is read as the segment', summariseBroadcast({ id: 'x', status: 'sent', audience_id: SEGMENT }).segmentId === SEGMENT);
check('a listed broadcast with no segment reads as null', summariseBroadcast({ id: 'x', status: 'sent' }).segmentId === null);

// --- The job's issue titles --------------------------------------------------------------

check(
  'the review issue title is the one the runbook names',
  reviewIssueTitle(6, SATURDAY) === 'Weekly story scheduled: Episode 6 for Sat 2026-10-03 13:00 UTC'
);
{
  const record = parseReviewIssueTitle(reviewIssueTitle(6, SATURDAY));
  check('a review title reads back as its episode and send day', record?.episode === 6 && record?.day === '2026-10-03');
}
for (const title of [
  'Weekly story scheduled: Episode 6 for Fri 2026-10-03 13:00 UTC',
  'Weekly story scheduled: Episode 06 for Sat 2026-10-03 13:00 UTC',
  'Weekly story scheduled: Episode 6 for Sat 2026-10-03 13:00',
  'Weekly story scheduled: Episode 6 for Sat 2026-10-03 13:00 UTC (copy)',
  'Re: Weekly story scheduled: Episode 6 for Sat 2026-10-03 13:00 UTC',
  'Weekly story scheduled: Episode 6 for Sat 2026-02-30 13:00 UTC',
]) {
  check(`an issue title the job did not write (${JSON.stringify(title)}) is not a review record`, parseReviewIssueTitle(title) === null);
}
check(
  'the write-by reminder title is the one the runbook names',
  nothingQueuedIssueTitle(NEXT_SATURDAY) === 'No episode queued for Saturday 2026-10-10 — import one by Friday'
);

// --- What: the email it builds --------------------------------------------------------------

const newest = episodesNewestFirst()[0];
check('there is an episode to build', newest !== undefined);
if (newest) {
  for (const episode of EPISODES) {
    const payload = episodeBroadcast(episode, SEGMENT);
    check(
      `${episode.slug}: the broadcast is the weekly email, byte for byte`,
      payload.html === quizEmailHtml(episode, RESEND_UNSUBSCRIBE_URL, 'weekly') &&
        payload.text === quizEmailText(episode, RESEND_UNSUBSCRIBE_URL, 'weekly')
    );
    check(
      `${episode.slug}: the job would recognise its own broadcast next week`,
      parseBroadcastName(payload.name)?.number === episode.number
    );
  }

  const payload = episodeBroadcast(newest, SEGMENT);
  check('the broadcast is named for its episode', payload.name === broadcastName(newest));
  check('the broadcast goes to the segment it was given', payload.segment_id === SEGMENT);
  check('the broadcast is from the address subscribers know', payload.from === config.resend.fromAdmin);
  check('replies go to the inbox that is read', payload.reply_to === config.resend.supportEmail);
  check(
    'creation is draft-only: no send, no scheduled_at',
    !('send' in payload) && !('scheduled_at' in payload)
  );

  check('the HTML content links carry utm_content=weekly', payload.html.includes('utm_content=weekly'));
  check('the plain text carries utm_content=weekly', payload.text.includes('utm_content=weekly'));
  check(
    'nothing in the broadcast is filed under the welcome card',
    !payload.html.includes('utm_content=welcome') && !payload.text.includes('utm_content=welcome')
  );
  check('the HTML links the unsubscribe placeholder exactly', payload.html.includes(`href="${RESEND_UNSUBSCRIBE_URL}"`));
  check('the plain text carries the unsubscribe placeholder exactly', payload.text.split('\n').includes(`Unsubscribe: ${RESEND_UNSUBSCRIBE_URL}`));
  check(
    'the unsubscribe placeholder is never tagged',
    ![payload.html, payload.text].some(part => /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}[?&#]/.test(part)) &&
      withNewsletterUtm(RESEND_UNSUBSCRIBE_URL, newest.slug, 'weekly') === RESEND_UNSUBSCRIBE_URL
  );
  const address = config.business.postalAddress;
  if (address) {
    const line = `${config.business.legalName} · ${postalAddressLine(address)}`;
    check('the broadcast carries the postal address, as CAN-SPAM requires', payload.text.includes(line) && payload.html.includes(line));
  }

  // The check the job makes before it schedules a draft it did not just build.
  const stored = { ...payload, reply_to: [payload.reply_to as string] };
  check('a draft stored exactly as built has no differences', draftDifferences(stored, payload).length === 0);
  check(
    'a draft built with the welcome tagging differs, and is not scheduled as it is',
    draftDifferences(
      { ...payload, html: quizEmailHtml(newest, RESEND_UNSUBSCRIBE_URL), text: quizEmailText(newest, RESEND_UNSUBSCRIBE_URL) },
      payload
    ).join() === 'html,text'
  );
  check(
    'a draft edited by hand differs in what was edited',
    draftDifferences({ ...payload, subject: 'Edited' }, payload).join() === 'subject'
  );
  check(
    'a draft addressed to another segment differs',
    draftDifferences({ ...payload, segment_id: OTHER_SEGMENT }, payload).join() === 'segment'
  );
}

// --- Report ----------------------------------------------------------------------------------

const total = passed + failures.length;

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length}/${total} checks failed:\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error('');
  process.exit(1);
}

console.log(`
Weekly broadcast schedule verified.
  · the slot is ${sendDayName()} ${newsletter.sendTimeUtc} UTC on every weekday, at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes ahead,
    rolling a week once it is closer than that
  · the queue runs in episode order from Episode ${newsletter.firstBroadcastEpisode}, skipping anything booked, going out or gone
  · one broadcast per send day, and a Saturday the job booked and a person cancelled stays cancelled
  · two drafts, a near-miss name that went out, or an unknown status stop the job instead of guessing
  · a broadcast is an episode's only by its exact name, and every episode's name reads back
  · the welcome email never carries an episode before its broadcast has gone out
  · the broadcast is the weekly email: utm_content=weekly, the unsubscribe placeholder bare, draft-only

PASS — ${passed}/${total} checks passed
`);
