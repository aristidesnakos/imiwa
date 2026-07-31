/**
 * scripts/announcements/status.ts
 *
 * Run by .github/workflows/announcements-status.yml every morning, and by hand
 * with `pnpm announcements:status`.
 *
 * This is the piece that makes the queue *managed* rather than merely
 * configured. Every entry carries an `expiresAt`, so a run always ends on
 * time — but nothing in the app tells anyone that a run is about to start
 * (and its pre-flight gate has not been checked), or that four expired entries
 * are still sitting in the config, or that the queue has run dry. Those are
 * calendar facts, and a calendar job is the right thing to notice them.
 *
 * It never fails the build. A red check for "an announcement starts on Tuesday"
 * trains people to ignore the signal. It reports, and the workflow turns the
 * report into a single tracking issue that it keeps up to date and closes when
 * there is nothing left to say.
 *
 * Flags:
 *   --date YYYY-MM-DD   Pretend today is this day. For testing the report.
 *   --json              Machine-readable output instead of markdown.
 */

import { appendFileSync } from 'node:fs';

import { ANNOUNCEMENT_QUEUE } from '../../lib/announcements/config';
import { isLive, parseDay } from '../../lib/announcements/select';
import type { Announcement } from '../../lib/announcements/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far ahead a start date becomes a thing to act on. Long enough to fix a
 *  pre-flight gate, short enough not to nag for a month. */
const UPCOMING_WINDOW_DAYS = 5;

/** How long an expired entry may sit in the config before we ask for it to be
 *  pruned. Long enough to read the numbers off the run first. */
const STALE_AFTER_DAYS = 30;

type Status = 'live' | 'upcoming' | 'scheduled' | 'expired';

interface Row {
  announcement: Announcement;
  status: Status;
  /** Days until start (upcoming/scheduled) or since expiry (expired). */
  days: number;
}

function parseArgs(argv: string[]): { now: number; json: boolean } {
  const dateIndex = argv.indexOf('--date');
  const raw = dateIndex >= 0 ? argv[dateIndex + 1] : undefined;

  if (raw) {
    const parsed = parseDay(raw);
    if (Number.isNaN(parsed)) {
      console.error(`--date "${raw}" is not a real YYYY-MM-DD day.`);
      process.exit(2);
    }
    // Midday, so the report never straddles a window boundary by an hour.
    return { now: parsed + 12 * 60 * 60 * 1000, json: argv.includes('--json') };
  }

  return { now: Date.now(), json: argv.includes('--json') };
}

function classify(a: Announcement, now: number): Row {
  const start = parseDay(a.startsAt);
  const end = parseDay(a.expiresAt) + DAY_MS;

  if (isLive(a, now)) return { announcement: a, status: 'live', days: 0 };

  if (now < start) {
    const days = Math.ceil((start - now) / DAY_MS);
    return { announcement: a, status: days <= UPCOMING_WINDOW_DAYS ? 'upcoming' : 'scheduled', days };
  }

  return { announcement: a, status: 'expired', days: Math.floor((now - end) / DAY_MS) };
}

function buildReport(rows: Row[], now: number): { markdown: string; actions: string[] } {
  const today = new Date(now).toISOString().slice(0, 10);
  const actions: string[] = [];
  const lines: string[] = [];

  lines.push(`_Queue as of **${today}** — \`lib/announcements/config.ts\`._`, '');

  const live = rows.filter((r) => r.status === 'live');
  const upcoming = rows.filter((r) => r.status === 'upcoming');
  const scheduled = rows.filter((r) => r.status === 'scheduled');
  const expired = rows.filter((r) => r.status === 'expired');
  const stale = expired.filter((r) => r.days >= STALE_AFTER_DAYS);

  if (live.length > 0) {
    lines.push('### Running now', '');
    for (const { announcement: a } of live) {
      lines.push(`- **\`${a.id}\`** → \`${a.cta.href}\` — ends **${a.expiresAt}**`);
      lines.push(`  > ${a.message}`);
    }
    lines.push('');
    actions.push(
      `\`${live.map((r) => r.announcement.id).join('`, `')}\` is live — check the dismiss-on-first-impression rate. Above ~40% the bar is reading as an ad and the queue should stop.`,
    );
  }

  if (upcoming.length > 0) {
    lines.push(`### Starting within ${UPCOMING_WINDOW_DAYS} days`, '');
    for (const { announcement: a, days } of upcoming) {
      lines.push(
        `- **\`${a.id}\`** starts **${a.startsAt}** (${days} day${days === 1 ? '' : 's'}) → \`${a.cta.href}\``,
      );
      lines.push(`  > ${a.message}`);
      if (a.note) lines.push(`  > _${a.note}_`);
      actions.push(
        `\`${a.id}\` starts in ${days} day${days === 1 ? '' : 's'}. Open \`${a.cta.href}\` as a returning user and confirm the claim in its copy is true today — not when the entry was written.`,
      );
    }
    lines.push('');
  }

  if (scheduled.length > 0) {
    lines.push('### Scheduled', '');
    for (const { announcement: a, days } of scheduled) {
      lines.push(`- \`${a.id}\` — ${a.startsAt} → ${a.expiresAt} (in ${days} days)`);
    }
    lines.push('');
  }

  if (expired.length > 0) {
    lines.push('### Finished', '');
    for (const { announcement: a, days } of expired) {
      const flag = days >= STALE_AFTER_DAYS ? ' — **prune me**' : '';
      lines.push(`- \`${a.id}\` — ended ${a.expiresAt}, ${days} days ago${flag}`);
    }
    lines.push('');
  }

  if (stale.length > 0) {
    actions.push(
      `${stale.length} entr${stale.length === 1 ? 'y has' : 'ies have'} been finished for over ${STALE_AFTER_DAYS} days (\`${stale.map((r) => r.announcement.id).join('`, `')}\`). Read the numbers off the run, then delete them from the config — an entry nobody can see is dead weight in the file people edit under time pressure.`,
    );
  }

  if (live.length === 0 && upcoming.length === 0 && scheduled.length === 0) {
    lines.push('### Nothing scheduled', '');
    lines.push(
      'The queue has run dry. That is a fine steady state — the bar exists to tell returning users about things they already have, and there is no obligation to always have one running.',
      '',
    );
    actions.push(
      'Nothing is scheduled. If a feature has shipped since the last run, add an entry; otherwise leave the bar dark rather than inventing something to announce.',
    );
  }

  if (actions.length > 0) {
    lines.push('### What needs a person', '');
    for (const action of actions) lines.push(`- [ ] ${action}`);
    lines.push('');
  }

  return { markdown: lines.join('\n'), actions };
}

function main(): void {
  const { now, json } = parseArgs(process.argv.slice(2));
  const rows = ANNOUNCEMENT_QUEUE.map((a) => classify(a, now));
  const { markdown, actions } = buildReport(rows, now);

  if (json) {
    console.log(
      JSON.stringify(
        {
          asOf: new Date(now).toISOString().slice(0, 10),
          actionable: actions.length > 0,
          actions,
          entries: rows.map(({ announcement, status, days }) => ({
            id: announcement.id,
            status,
            days,
            startsAt: announcement.startsAt,
            expiresAt: announcement.expiresAt,
            href: announcement.cta.href,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(markdown);

  // Surface the same report on the workflow run page, so the common case
  // (nothing to do) costs nobody a click.
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Announcement queue\n\n${markdown}\n`);
  }

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `actionable=${actions.length > 0 ? 'true' : 'false'}\n`,
    );
  }
}

main();
