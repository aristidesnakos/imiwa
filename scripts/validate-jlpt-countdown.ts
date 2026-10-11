/**
 * Validator for the JLPT countdown card on /kanji/n5 (`lib/jlpt/countdown.ts`).
 *
 * Run: pnpm validate:countdown
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * The card makes a handful of promises a visitor cannot check and cannot
 * forgive: how many days are left, how many kanji a day, and when the stopping
 * point is. All of it is date arithmetic, and date arithmetic goes wrong at
 * exactly the moments nobody tests: the day of the exam, the day after, the
 * edge of the review fortnight, a daylight saving change, someone in Tokyo and
 * someone in Honolulu opening the page at the same instant.
 *
 * It also has to agree with the paid book. REVIEW_DAYS is the book's own rule
 * and the first sitting's date is the book's TEST_DATE; both live in
 * scripts/n5-countdown (Python), where a change would not touch this file. The
 * 81 -> 82 kanji episode in that README is the failure this guards: two things
 * that must agree, each self-consistent, nothing comparing them.
 *
 * Pure: imports nothing but countdown.ts, kanji-sheets.ts and node:fs.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  COMFORTABLE_PER_DAY,
  PRINT_DAYS,
  REVIEW_DAYS,
  SITTINGS,
  dayNumber,
  formatDay,
  formatDayWithYear,
  localDayNumber,
  localDayStart,
  monthName,
  parseDay,
  planFor,
  printSet,
  todaysBatch,
  upcomingSitting,
  weekdayOf,
  type CountdownPlan,
  type Sitting,
} from '../lib/jlpt/countdown';
import {
  DEFAULT_ROWS,
  MAX_ROWS_KANJI_PER_REQUEST,
  customSheetsHref,
} from '../lib/sheets/kanji-sheets';
import { N5_KANJI } from '../lib/constants/n5-kanji';
import { N5_SEQUENCE } from '../lib/levels/n5-sequence';

let checks = 0;
let failures = 0;

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function check(label: string, problems: string[], okMessage: string): void {
  checks += 1;
  if (problems.length === 0) {
    console.log(`  ok    ${okMessage}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL  ${label} — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 25)) console.error(`          ${p}`);
  if (problems.length > 25) console.error(`          ... and ${problems.length - 25} more`);
}

const TOTAL = N5_KANJI.length;
const ORDER = N5_SEQUENCE.flatMap(t => t.kanji);
const DAY = (iso: string) => parseDay(iso);

function plan(iso: string, learned = 0, markedToday = 0, total = TOTAL): CountdownPlan | null {
  return planFor({ today: DAY(iso), total, learned, markedToday });
}

// ---------------------------------------------------------------------------
section('Sittings');
{
  const problems: string[] = [];
  if (SITTINGS.length === 0) problems.push('no sittings at all');
  let previous = -Infinity;
  for (const s of SITTINGS) {
    let n: number;
    try {
      n = parseDay(s.date);
    } catch (e) {
      problems.push(`${s.date}: ${(e as Error).message}`);
      continue;
    }
    // The JLPT is always on a Sunday. A typo that moves it a day is the likeliest error.
    if (weekdayOf(n) !== 0) problems.push(`${s.date} is a ${formatDay(n).split(' ')[0]}, not a Sunday`);
    if (n <= previous) problems.push(`${s.date} is not after the sitting before it`);
    previous = n;
    if (!s.label.includes(monthName(n))) problems.push(`label "${s.label}" does not name ${monthName(n)}`);
  }
  check('sittings', problems, `${SITTINGS.length} sitting(s): ${SITTINGS.map(s => s.date).join(', ')}, each a Sunday, in order`);
}

// ---------------------------------------------------------------------------
section('The book and the card agree');
{
  const problems: string[] = [];
  const dir = path.join(__dirname, 'n5-countdown');
  const py = fs.readFileSync(path.join(dir, 'schedule.py'), 'utf8');
  const m = /^TEST_DATE\s*=\s*date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/m.exec(py);
  if (!m) {
    problems.push('schedule.py: cannot find TEST_DATE = date(Y, M, D)');
  } else {
    const bookDay = dayNumber(Number(m[1]), Number(m[2]), Number(m[3]));
    const first = SITTINGS[0];
    if (bookDay !== parseDay(first.date)) {
      problems.push(`schedule.py TEST_DATE is ${formatDayWithYear(bookDay)}, the card's first sitting is ${first.date}`);
    }
  }

  // The book's last teaching week must end on the card's learn-by day.
  const schedule = JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8')) as {
    plan: { week: number; start: string; end: string; new: string[] }[];
  };
  const teaching = schedule.plan.filter(w => w.new.length > 0);
  const last = teaching[teaching.length - 1];
  const learnBy = parseDay(SITTINGS[0].date) - REVIEW_DAYS;
  if (!last) {
    problems.push('schedule.json has no teaching week');
  } else if (parseDay(last.end) !== learnBy) {
    problems.push(
      `the book's last teaching week (week ${last.week}) ends ${last.end}, the card stops new kanji after ${formatDayWithYear(learnBy)} (test day - ${REVIEW_DAYS})`,
    );
  }
  const taught = new Set(schedule.plan.flatMap(w => w.new));
  if (taught.size !== TOTAL) problems.push(`the book teaches ${taught.size} kanji, the list has ${TOTAL}`);
  check('book agreement', problems, `book TEST_DATE = first sitting; last teaching week ends on test day - ${REVIEW_DAYS}; ${TOTAL} kanji both sides`);
}

// ---------------------------------------------------------------------------
section('Calendar days');
{
  const problems: string[] = [];
  // A calendar date is the same day number whatever the instant: noon and one second
  // before midnight local time are one date, and local midnight is the next.
  const a = localDayNumber(new Date(2026, 9, 11, 0, 0, 1));
  const b = localDayNumber(new Date(2026, 9, 11, 23, 59, 59));
  const c = localDayNumber(new Date(2026, 9, 12, 0, 0, 0));
  if (a !== b) problems.push('two instants on 11 Oct gave different days');
  if (c !== a + 1) problems.push('local midnight did not start the next day');
  if (localDayStart(new Date(2026, 9, 11, 17, 30)) !== new Date(2026, 9, 11).getTime()) {
    problems.push('localDayStart is not local midnight');
  }
  // Across a daylight saving change a day is still one day. Built from the local calendar
  // components, so this holds in whatever timezone the process runs in; the US change is
  // 1 Nov 2026 and the EU change 25 Oct 2026, both inside the countdown.
  for (const [y, m, d] of [[2026, 10, 25], [2026, 11, 1], [2026, 3, 29]] as const) {
    const before = localDayNumber(new Date(y, m - 1, d - 1, 12));
    const after = localDayNumber(new Date(y, m - 1, d, 12));
    if (after - before !== 1) problems.push(`${y}-${m}-${d - 1} to ${d} is ${after - before} days across a clock change`);
  }
  if (DAY('2026-12-06') - DAY('2026-10-11') !== 56) problems.push('11 Oct to 6 Dec is not 56 days');
  for (const bad of ['2026-02-30', '2026-13-01', '26-12-06', 'tomorrow']) {
    let threw = false;
    try {
      parseDay(bad);
    } catch {
      threw = true;
    }
    if (!threw) problems.push(`parseDay accepted "${bad}"`);
  }
  if (formatDayWithYear(DAY('2026-12-06')) !== 'Sunday 6 December 2026') problems.push('formatDayWithYear(2026-12-06) is wrong');
  if (formatDay(DAY('2026-11-22')) !== 'Sunday 22 November') problems.push('formatDay(2026-11-22) is wrong');
  check('calendar days', problems, 'same date at any hour; midnight starts the next; clock changes do not stretch a day; bad dates throw');
}

// ---------------------------------------------------------------------------
section('Phases around the edges');
{
  const problems: string[] = [];
  const expect = (iso: string, learned: number, want: Partial<CountdownPlan> | null, why: string) => {
    const got = plan(iso, learned);
    if (want === null) {
      if (got !== null) problems.push(`${iso}: expected no plan (${why}), got phase ${got.phase}`);
      return;
    }
    if (got === null) {
      problems.push(`${iso}: expected a plan (${why}), got none`);
      return;
    }
    for (const [k, v] of Object.entries(want)) {
      if ((got as unknown as Record<string, unknown>)[k] !== v) {
        problems.push(`${iso} learned ${learned}: ${k} is ${(got as unknown as Record<string, unknown>)[k]}, expected ${v} (${why})`);
      }
    }
  };

  expect('2026-10-11', 0, { phase: 'learn', daysLeft: 56, learnDays: 43, perDay: 2, remaining: 82, tight: false }, 'today, no progress');
  expect('2026-10-11', 0, { finishDay: DAY('2026-11-20'), reviewDaysAfter: 16 }, '2 a day from today ends Fri 20 Nov, 16 days before the test');
  expect('2026-11-22', 0, { phase: 'learn', learnDays: 1, daysLeft: 14 }, 'the last day for new kanji is still a learn day');
  expect('2026-11-23', 0, { phase: 'review', daysLeft: 13, perDay: 0 }, 'the day after it is review');
  expect('2026-12-05', 0, { phase: 'review', daysLeft: 1 }, 'the day before');
  expect('2026-12-06', 0, { phase: 'test-day', daysLeft: 0, perDay: 0 }, 'the day itself');
  expect('2026-12-07', 0, null, 'the day after: nothing left to count down to');
  expect('2027-03-01', 0, null, 'months after, with no later sitting confirmed');
  expect('2026-10-11', TOTAL, { phase: 'learn', remaining: 0, perDay: 0 }, 'everything marked: no pace to keep');
  expect('2026-12-01', 40, { phase: 'review', remaining: 42, perDay: 0 }, 'review with kanji unmarked');

  // Clamping: a learned count outside 0..total cannot make a negative or a >100% bar.
  const over = planFor({ today: DAY('2026-10-11'), total: TOTAL, learned: 500, markedToday: 900 });
  if (!over || over.learned !== TOTAL || over.remaining !== 0) problems.push('learned above the total was not clamped');
  const under = planFor({ today: DAY('2026-10-11'), total: TOTAL, learned: -3, markedToday: 0 });
  if (!under || under.learned !== 0 || under.remaining !== TOTAL) problems.push('negative learned was not clamped');

  check('phases', problems, 'learn 11 Oct and 22 Nov (last learning day); review 23 Nov-5 Dec; test day 6 Dec; nothing from 7 Dec');
}

// ---------------------------------------------------------------------------
section('The pace');
{
  const problems: string[] = [];

  // Replay every day of every learn phase at several levels of progress. The promise:
  // perDay is the FEWEST whole kanji a day that finishes by learn-by, so perDay a day
  // does finish (and perDay - 1 does not), and finishing leaves the stated review days.
  let replays = 0;
  const sitting = SITTINGS[0];
  const testDay = parseDay(sitting.date);
  for (let today = testDay - 70; today <= testDay - REVIEW_DAYS; today++) {
    for (let learned = 0; learned < TOTAL; learned += 7) {
      for (const markedToday of [0, Math.min(2, learned)]) {
        replays++;
        const p = planFor({ today, total: TOTAL, learned, markedToday });
        if (!p || p.phase !== 'learn') {
          problems.push(`day ${today}: expected a learn plan`);
          continue;
        }
        const atDawn = p.remaining + p.markedToday;
        const days = p.learnDays;
        if (p.perDay * days < atDawn) problems.push(`day -${testDay - today} learned ${learned}: ${p.perDay}/day over ${days} days does not cover ${atDawn}`);
        if (p.perDay > 1 && (p.perDay - 1) * days >= atDawn) problems.push(`day -${testDay - today} learned ${learned}: ${p.perDay - 1}/day would also finish, so ${p.perDay} is not the fewest`);
        const finishes = today + Math.ceil(atDawn / p.perDay) - 1;
        if (finishes !== p.finishDay) problems.push(`day -${testDay - today}: finishDay ${p.finishDay} != ${finishes}`);
        if (p.finishDay > testDay - REVIEW_DAYS) problems.push(`day -${testDay - today} learned ${learned}: finishes after learn-by`);
        if (p.reviewDaysAfter !== testDay - p.finishDay) problems.push(`day -${testDay - today}: reviewDaysAfter wrong`);
        if (p.reviewDaysAfter < REVIEW_DAYS) problems.push(`day -${testDay - today}: leaves ${p.reviewDaysAfter} < ${REVIEW_DAYS} review days`);
        if (p.tight !== p.perDay > COMFORTABLE_PER_DAY) problems.push(`day -${testDay - today}: tight flag wrong for ${p.perDay}`);
      }
    }
  }

  // Ticking does not move the goalposts: today's target is fixed from the count at dawn.
  const dawn = plan('2026-10-20', 10, 0)!;
  const afterTicks = plan('2026-10-20', 12, 2)!;
  if (dawn.perDay !== afterTicks.perDay) problems.push(`ticking two kanji changed today's target from ${dawn.perDay} to ${afterTicks.perDay}`);
  if (afterTicks.markedToday !== 2) problems.push('markedToday was not carried');

  check('pace', problems, `${replays} day x progress cases: perDay is the fewest that finishes by learn-by; ticking never changes today's target`);
}

// ---------------------------------------------------------------------------
section("Today's kanji");
{
  const problems: string[] = [];
  const learned = new Set(ORDER.slice(0, 5));
  const none = new Set<string>();

  const first = todaysBatch({ order: ORDER, learned: none, markedToday: none, size: 2 });
  if (first.join('') !== ORDER.slice(0, 2).join('')) problems.push(`fresh batch is ${first.join('')}, expected the first two in list order`);

  const resumed = todaysBatch({ order: ORDER, learned, markedToday: none, size: 3 });
  if (resumed.join('') !== ORDER.slice(5, 8).join('')) problems.push(`with 5 learned the batch is ${resumed.join('')}, expected the 6th to 8th`);

  // Marked today stay in, ticked, and count towards the size.
  const marked = new Set([ORDER[5]]);
  const withMarked = todaysBatch({ order: ORDER, learned: new Set([...learned, ...marked]), markedToday: marked, size: 3 });
  if (withMarked.join('') !== ORDER.slice(5, 8).join('')) problems.push(`a kanji marked today left the batch: ${withMarked.join('')}`);

  // Target met: only the marked ones, no more.
  const met = new Set(ORDER.slice(5, 7));
  const done = todaysBatch({ order: ORDER, learned: new Set([...learned, ...met]), markedToday: met, size: 2 });
  if (done.join('') !== ORDER.slice(5, 7).join('')) problems.push(`target met but batch is ${done.join('')}`);

  // Marking more than the target keeps them all.
  const extra = new Set(ORDER.slice(5, 9));
  const more = todaysBatch({ order: ORDER, learned: new Set([...learned, ...extra]), markedToday: extra, size: 2 });
  if (more.length !== 4) problems.push(`marked 4 today with a target of 2: batch has ${more.length}`);

  // A short list is not padded with what does not exist.
  const tail = new Set(ORDER.slice(0, TOTAL - 1));
  const last = todaysBatch({ order: ORDER, learned: tail, markedToday: none, size: 5 });
  if (last.length !== 1 || last[0] !== ORDER[TOTAL - 1]) problems.push(`one kanji left but batch is ${last.join('')}`);

  // Everything returned is on the list, in list order, once.
  const seen = new Set(first);
  if (seen.size !== first.length) problems.push('duplicate in batch');

  check('batch', problems, 'list order; marked-today stay in and count; never pads past the end');
}

// ---------------------------------------------------------------------------
section('The printable set');
{
  const problems: string[] = [];
  const none = new Set<string>();
  const p = plan('2026-10-11', 0)!;
  const batch = todaysBatch({ order: ORDER, learned: none, markedToday: none, size: p.perDay });
  const set = printSet(batch, ORDER, none, p.perDay, MAX_ROWS_KANJI_PER_REQUEST);

  if (set.length !== p.perDay * PRINT_DAYS) problems.push(`expected ${p.perDay * PRINT_DAYS} sheets for a week, got ${set.length}`);
  if (set.join('') !== ORDER.slice(0, set.length).join('')) problems.push('the printed set is not the next kanji in list order');
  for (const k of batch) if (!set.includes(k)) problems.push(`today's ${k} is missing from the print set`);

  // A tight plan asks for more than exists: capped, never past the list, never over the route's cap.
  const tight = printSet(ORDER.slice(0, 12), ORDER, none, 12, MAX_ROWS_KANJI_PER_REQUEST);
  if (tight.length !== TOTAL) problems.push(`a 12-a-day week should print all ${TOTAL}, got ${tight.length}`);
  const capped = printSet(ORDER.slice(0, 2), ORDER, none, 99, 20);
  if (capped.length !== 20) problems.push(`the cap was not applied: ${capped.length}`);

  // The link the card renders must be one the route accepts: that is the point of the
  // helper throwing on an oversized set.
  try {
    const href = customSheetsHref(set, { layout: 'rows', rows: DEFAULT_ROWS, grid: 'cross' });
    const params = new URL(href, 'https://example.test').searchParams;
    if ([...(params.get('characters') ?? '')].length !== set.length) problems.push('the link does not carry every kanji');
    if (params.get('layout') !== 'rows') problems.push('the link is not the rows layout');
  } catch (e) {
    problems.push(`customSheetsHref refused the week's set: ${(e as Error).message}`);
  }
  try {
    customSheetsHref(tight, { layout: 'rows', rows: DEFAULT_ROWS, grid: 'cross' });
  } catch (e) {
    problems.push(`customSheetsHref refused the whole list: ${(e as Error).message}`);
  }

  check('print set', problems, `a week is ${p.perDay * PRINT_DAYS} sheets in list order including today's; capped; the rows link is accepted for the largest set`);
}

// ---------------------------------------------------------------------------
section('The list the card paces through');
{
  const problems: string[] = [];
  const onList = new Set(N5_KANJI.map(k => k.kanji));
  if (new Set(ORDER).size !== ORDER.length) problems.push('N5_SEQUENCE repeats a kanji');
  if (ORDER.length !== TOTAL) problems.push(`N5_SEQUENCE places ${ORDER.length}, the list has ${TOTAL}`);
  for (const k of ORDER) if (!onList.has(k)) problems.push(`${k} is in the sequence but not on the N5 list`);
  check('list', problems, `the card's order is the page's order: ${ORDER.length} kanji, once each`);
}

// ---------------------------------------------------------------------------
section('A sitting added later');
{
  const problems: string[] = [];
  const next: Sitting = { date: '2027-07-04', label: 'July 2027' };
  const both: readonly Sitting[] = [...SITTINGS, next];
  const dec7 = upcomingSitting(DAY('2026-12-07'), both);
  if (dec7?.date !== next.date) problems.push('after December the card does not move to the next sitting');
  const dec6 = upcomingSitting(DAY('2026-12-06'), both);
  if (dec6?.date !== SITTINGS[0].date) problems.push('on test day the card moved on early');
  const p = planFor({ today: DAY('2027-04-01'), total: TOTAL, learned: 0, markedToday: 0, sittings: both });
  if (!p || p.phase !== 'learn' || p.daysLeft !== DAY('2027-07-04') - DAY('2027-04-01')) problems.push('a plan for a later sitting is wrong');
  check('next sitting', problems, 'adding a sitting moves the card on the day after the last one, not before');
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
