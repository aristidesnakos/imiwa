/**
 * scripts/announcements/validate.ts
 *
 * CI entry point:  pnpm validate:announcements
 *
 * The announcement bar is the one component on the site that renders to users
 * we have no other channel to. There is no staging cohort and no kill switch
 * short of a deploy, so every property we can check before merge, we check
 * before merge.
 *
 * Two halves:
 *
 *   1. **Contract** — the queue in lib/announcements/config.ts is well-formed:
 *      unique stable ids, real dates, runs that do not overlap, copy that fits
 *      the bar, and CTA links that resolve to routes which actually exist in
 *      `app/`. A dead CTA is worse than no banner: it teaches people our
 *      announcements are not worth clicking.
 *
 *   2. **Behaviour** — a replay of the acknowledgement model against synthetic
 *      visitors and dates. The repo has no test runner, and the promise we are
 *      making to users ("dismiss once and it's gone", "first-time visitors see
 *      nothing") is exactly the kind that rots silently. This is the only place
 *      it is asserted.
 *
 * Exits non-zero on the first category with failures, printing all of them.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ANNOUNCEMENT_QUEUE } from '../../lib/announcements/config';
import { isLive, overlaps, parseDay, selectAnnouncement } from '../../lib/announcements/select';
import {
  emptyState,
  isAcknowledged,
  withAck,
  withImpression,
} from '../../lib/announcements/state';
import {
  CONSENT_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  SRS_STORAGE_KEY,
} from '../../lib/announcements/signals';
import {
  CTA_MAX_LENGTH,
  MAX_IMPRESSIONS,
  MAX_RUN_DAYS,
  MESSAGE_MAX_LENGTH,
  type Announcement,
  type AnnouncementState,
  type LearnerSignals,
} from '../../lib/announcements/types';

const ROOT = resolve(__dirname, '..', '..');
const APP_DIR = join(ROOT, 'app');
const DAY_MS = 24 * 60 * 60 * 1000;

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

// ─── 1. Contract ───────────────────────────────────────────────────────────

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Does this path resolve to something the app router actually serves?
 *
 * Deliberately conservative: it only understands static segments, which is all
 * a CTA should ever be. A dynamic route would pass through the route-group
 * fallback and we would rather occasionally over-accept than block a valid
 * link on a naive path check.
 */
function routeExists(href: string): boolean {
  const pathname = href.split(/[?#]/)[0];
  const segments = pathname.split('/').filter(Boolean);

  const direct = join(APP_DIR, ...segments);
  if (existsSync(join(direct, 'page.tsx')) || existsSync(join(direct, 'route.ts'))) return true;

  // Route groups — `app/(marketing)/pricing/page.tsx` serves `/pricing`.
  if (segments.length > 0) {
    const [head, ...rest] = segments;
    for (const group of ['(marketing)', '(app)', '(site)']) {
      const grouped = join(APP_DIR, group, head, ...rest);
      if (existsSync(join(grouped, 'page.tsx')) || existsSync(join(grouped, 'route.ts'))) {
        return true;
      }
    }
  }

  return false;
}

function validateContract(queue: readonly Announcement[]): void {
  check(queue.length > 0, 'The queue is empty. If that is intentional, say so in a comment.');

  const seenIds = new Set<string>();

  for (const a of queue) {
    const where = `[${a.id}]`;

    check(KEBAB.test(a.id), `${where} id must be kebab-case.`);
    check(!seenIds.has(a.id), `${where} duplicate id — dismissing one would kill the other.`);
    seenIds.add(a.id);

    const start = parseDay(a.startsAt);
    const end = parseDay(a.expiresAt);
    check(!Number.isNaN(start), `${where} startsAt "${a.startsAt}" is not a real YYYY-MM-DD day.`);
    check(!Number.isNaN(end), `${where} expiresAt "${a.expiresAt}" is not a real YYYY-MM-DD day.`);

    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      check(start <= end, `${where} startsAt is after expiresAt.`);
      const days = Math.round((end - start) / DAY_MS) + 1;
      check(
        days <= MAX_RUN_DAYS,
        `${where} runs ${days} days; the cap is ${MAX_RUN_DAYS}. A "temporary" bar that lives a month is not temporary.`,
      );
    }

    const message = a.message.trim();
    check(message.length > 0, `${where} message is empty.`);
    check(
      a.message === message,
      `${where} message has leading or trailing whitespace — it will render as a gap.`,
    );
    check(
      message.length <= MESSAGE_MAX_LENGTH,
      `${where} message is ${message.length} chars; the cap is ${MESSAGE_MAX_LENGTH}. Longer wraps the bar to three lines on a phone and eats the fold.`,
    );
    check(
      !/!{2,}|\bNEW!\B/i.test(message),
      `${where} message reads like an ad. One sentence, no shouting.`,
    );

    check(a.cta.label.trim().length > 0, `${where} cta.label is empty.`);
    check(
      a.cta.label.length <= CTA_MAX_LENGTH,
      `${where} cta.label is ${a.cta.label.length} chars; the cap is ${CTA_MAX_LENGTH}.`,
    );
    check(
      a.cta.href.startsWith('/'),
      `${where} cta.href "${a.cta.href}" must be an internal path — we do not send our own users off-site from a banner.`,
    );
    check(
      routeExists(a.cta.href),
      `${where} cta.href "${a.cta.href}" does not resolve to a page or route under app/. A dead CTA is worse than no banner.`,
    );
  }

  // One bar at a time, or it stops being a bar.
  for (let i = 0; i < queue.length; i += 1) {
    for (let j = i + 1; j < queue.length; j += 1) {
      check(
        !overlaps(queue[i], queue[j]),
        `[${queue[i].id}] and [${queue[j].id}] have overlapping run windows. Only the first would ever show.`,
      );
    }
  }

  // Chronological order is not required by the selection logic — it takes the
  // first live entry — but an out-of-order queue is how someone eventually
  // ships two live entries by accident.
  for (let i = 1; i < queue.length; i += 1) {
    check(
      parseDay(queue[i - 1].startsAt) <= parseDay(queue[i].startsAt),
      `[${queue[i].id}] is scheduled before [${queue[i - 1].id}]. Keep the queue chronological.`,
    );
  }
}

/**
 * The targeting keys are duplicated in lib/announcements/signals.ts because the
 * hooks keep theirs private. If a hook renames its key, the banner does not
 * break — it silently stops targeting, and we would find out from a flat
 * conversion chart weeks later. Assert the strings still exist at the source.
 */
function validateStorageKeys(): void {
  const pairs: [string, string][] = [
    [join(ROOT, 'hooks', 'useKanjiProgress.ts'), PROGRESS_STORAGE_KEY],
    [join(ROOT, 'hooks', 'useKanjiSRS.ts'), SRS_STORAGE_KEY],
    [join(ROOT, 'components', 'CookieConsent.tsx'), CONSENT_STORAGE_KEY],
  ];

  for (const [file, key] of pairs) {
    if (!existsSync(file)) {
      failures.push(`Expected ${file} to exist so the "${key}" storage key could be verified.`);
      continue;
    }
    check(
      readFileSync(file, 'utf8').includes(`'${key}'`),
      `Storage key "${key}" no longer appears in ${file.replace(`${ROOT}/`, '')}. The banner's audience gate is reading a key nobody writes — update lib/announcements/signals.ts.`,
    );
  }
}

// ─── 2. Behaviour replay ───────────────────────────────────────────────────

const RETURNING: LearnerSignals = {
  learnedCount: 40,
  srsCardCount: 0,
  hasResolvedConsent: true,
};

function eachRunDay(a: Announcement): number[] {
  const days: number[] = [];
  for (let t = parseDay(a.startsAt); t <= parseDay(a.expiresAt); t += DAY_MS) {
    days.push(t + 12 * 60 * 60 * 1000); // midday, to stay clear of boundaries
  }
  return days;
}

function show(now: number, signals: LearnerSignals, state: AnnouncementState) {
  return selectAnnouncement({ queue: ANNOUNCEMENT_QUEUE, now, signals, state });
}

function validateBehaviour(): void {
  const queue = ANNOUNCEMENT_QUEUE;
  if (queue.length === 0) return;

  const everyRunDay = queue.flatMap(eachRunDay);

  // First-time visitors, and anyone arriving from search with no history, see
  // nothing at all. This is the whole basis for calling it a returning-user
  // surface rather than an interstitial on a search landing.
  for (const now of everyRunDay) {
    const stranger = { learnedCount: 0, srsCardCount: 0, hasResolvedConsent: true };
    check(
      show(now, stranger, emptyState()).kind === 'none',
      `A visitor with no learned kanji would be shown a banner on ${new Date(now).toISOString().slice(0, 10)}.`,
    );

    const unconsented = { ...RETURNING, hasResolvedConsent: false };
    check(
      show(now, unconsented, emptyState()).kind === 'none',
      `A visitor who has not answered the cookie bar would get a second bar stacked on it on ${new Date(now).toISOString().slice(0, 10)}.`,
    );
  }

  // Never two at once.
  for (const now of everyRunDay) {
    const live = queue.filter((a) => isLive(a, now));
    check(
      live.length <= 1,
      `${live.length} announcements are live at ${new Date(now).toISOString()}: ${live.map((a) => a.id).join(', ')}.`,
    );
  }

  // Every entry is reachable by somebody. An entry nobody can ever see is a
  // config bug that no other check catches.
  for (const a of queue) {
    const reachable = eachRunDay(a).some((now) => {
      const selection = show(now, RETURNING, emptyState());
      return selection.kind === 'show' && selection.announcement.id === a.id;
    });
    check(reachable, `[${a.id}] is never shown to a plain returning learner on any day of its run.`);
  }

  // Dismissal is permanent, and scoped to one id. Dismissing the reviews bar
  // must not suppress the one three weeks later.
  for (const a of queue) {
    let state = withAck(emptyState(), a.id, 'dismiss', parseDay(a.startsAt));
    for (const now of eachRunDay(a)) {
      const selection = show(now, RETURNING, state);
      check(
        !(selection.kind === 'show' && selection.announcement.id === a.id),
        `[${a.id}] came back after being dismissed.`,
      );
    }

    for (const other of queue) {
      if (other.id === a.id) continue;
      const reachable = eachRunDay(other).some((now) => {
        const selection = show(now, RETURNING, state);
        return selection.kind === 'show' && selection.announcement.id === other.id;
      });
      check(reachable, `Dismissing [${a.id}] also suppressed [${other.id}].`);
    }

    // A CTA click counts as acknowledgement too — they went to the feature.
    state = withAck(emptyState(), a.id, 'cta', parseDay(a.startsAt));
    check(
      eachRunDay(a).every((now) => {
        const selection = show(now, RETURNING, state);
        return !(selection.kind === 'show' && selection.announcement.id === a.id);
      }),
      `[${a.id}] came back after the user clicked through to the feature.`,
    );
  }

  // The impression cap: shown exactly MAX_IMPRESSIONS times, then retired
  // without ever needing a click.
  for (const a of queue) {
    const days = eachRunDay(a);
    if (days.length < MAX_IMPRESSIONS + 1) {
      failures.push(
        `[${a.id}] runs ${days.length} days, fewer than MAX_IMPRESSIONS + 1 — the impression cap can never be exercised. Lengthen the run or lower the cap.`,
      );
      continue;
    }

    let state = emptyState();
    let shown = 0;
    for (const now of days) {
      const selection = show(now, RETURNING, state);
      if (selection.kind === 'show') {
        shown += 1;
        state = withImpression(state, a.id);
      } else if (selection.kind === 'auto-ack') {
        state = withAck(state, a.id, selection.via, now);
      }
    }

    check(
      shown === MAX_IMPRESSIONS,
      `[${a.id}] was shown ${shown} times to a user who never interacted; expected exactly ${MAX_IMPRESSIONS}.`,
    );
    check(isAcknowledged(state, a.id), `[${a.id}] never auto-acknowledged at the impression cap.`);
  }

  // Preconditions: a user who already has the feature is never told about it.
  const alreadyReviewing: LearnerSignals = { ...RETURNING, srsCardCount: 25 };
  for (const a of queue) {
    if (!a.shouldShow) continue;
    if (a.shouldShow(alreadyReviewing)) continue;
    check(
      eachRunDay(a).every((now) => {
        const selection = show(now, alreadyReviewing, emptyState());
        return !(selection.kind === 'show' && selection.announcement.id === a.id);
      }),
      `[${a.id}] was shown to a user its own precondition excludes.`,
    );
  }

  // Nothing survives its own expiry. A stale bar advertising an August feature
  // in October is worse than no bar.
  for (const a of queue) {
    const afterExpiry = parseDay(a.expiresAt) + DAY_MS;
    check(!isLive(a, afterExpiry), `[${a.id}] is still live the day after it expires.`);
    check(
      !isLive(a, parseDay(a.startsAt) - 1),
      `[${a.id}] is live before its start date.`,
    );
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────

function main(): void {
  validateContract(ANNOUNCEMENT_QUEUE);
  validateStorageKeys();

  if (failures.length > 0) {
    console.error(`\nAnnouncement queue: ${failures.length} contract failure(s)\n`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error('\nSee lib/announcements/config.ts.\n');
    process.exit(1);
  }

  validateBehaviour();

  if (failures.length > 0) {
    console.error(`\nAnnouncement queue: ${failures.length} behaviour failure(s)\n`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error(
      '\nThese are promises we make to users — see the acknowledgement model in\n' +
        'docs/3rdVersion/announcement-banner-roadmap.md before relaxing any of them.\n',
    );
    process.exit(1);
  }

  console.log(
    `Announcement queue OK — ${ANNOUNCEMENT_QUEUE.length} entries, ` +
      `contract and acknowledgement model both verified.`,
  );
  for (const a of ANNOUNCEMENT_QUEUE) {
    console.log(`  · ${a.id.padEnd(20)} ${a.startsAt} → ${a.expiresAt}  ${a.cta.href}`);
  }
}

main();
