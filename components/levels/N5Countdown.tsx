'use client';

/**
 * components/levels/N5Countdown.tsx
 *
 * The countdown to the JLPT sitting, as a plan the visitor can act on today: how many
 * days, how many kanji a day that means, which ones are today's (each with a tick and a
 * link to its page), a printable sheet set for the week, and the quiz. It sits on
 * /kanji/n5 only: that page is where someone studying for the N5 already is, and the
 * 82 character pages are not (they are mostly stroke-order lookups).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW IT STAYS HONEST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The only deadline is the exam's, and every number is arithmetic the visitor can check
 * (lib/jlpt/countdown.ts, whose header has the reasoning). The heading is a question,
 * not a claim, because most visitors to this page are not sitting this December and
 * registration for it closed in August and September; it counts down to the test day
 * for people already in, and says where dates and registration are set.
 *
 * Reads `kanji-progress`, the key the dictionary and the quiz already write, and writes
 * to it only when someone ticks a kanji, through the same `toggleKanjiLearned`. No new
 * storage key, so nothing new for the privacy policy to name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HYDRATION AND LAYOUT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pattern A (CookieConsent, AnnouncementBanner): a prerendered page cannot know today's
 * date, so the card is absent from the server HTML and appears after mount. The server
 * renders an empty box of the card's height instead, so nothing below it moves when it
 * arrives (this route gates on CLS 0.1; see lighthouserc.js). After the last sitting the
 * island renders nothing, and the page should be redeployed without it.
 *
 * Imports no kanji data: the page passes the list in as props, so the dictionary never
 * reaches this island's bundle. Never import lib/jlpt/published.ts here.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ListChecks, Printer } from 'lucide-react';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { customSheetsHref, DEFAULT_ROWS, MAX_ROWS_KANJI_PER_REQUEST } from '@/lib/sheets/kanji-sheets';
import {
  formatDay,
  formatDayWithYear,
  localDayNumber,
  localDayStart,
  monthName,
  PRINT_DAYS,
  planFor,
  printSet,
  todaysBatch,
} from '@/lib/jlpt/countdown';

/** [character, a few words of meaning], in the list's teaching order. */
type ListEntry = readonly [string, string];

interface Props {
  /** The whole list, in the order the page shows it. */
  list: readonly ListEntry[];
  /** Where "quiz yourself" goes: the JLPT-format sets if there are any, else the kanji quiz. */
  quiz: { href: string; label: string };
}

/**
 * Just under the first-visit card's height, so its arrival moves (almost) nothing and the
 * card never has slack. Measured 2026-10-11 in the dev server: 501px at 375, 469 at 640,
 * 445 at 767 and 302 at 768 and up. A narrower phone only makes the card taller, which is
 * the harmless direction. Re-measure if the copy or the layout changes.
 */
const RESERVE = 'min-h-[30.5rem] sm:min-h-[27.5rem] md:min-h-[18.5rem]';

const GOAL = 'n5_list_countdown_click';
const QUIZ_PATH = '/kanji/n5/quiz';

/** Slimmer buttons below `sm`, so the print and quiz buttons share a row on a 375px phone. */
const BTN = 'px-3 sm:px-4';
const OFFICIAL_SITE = 'https://www.jlpt.jp/e/';

const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Chips shown at most; a tight plan can ask for more than a screen of them. */
const MAX_CHIPS = 6;

/** Tomorrow's kanji named in the done-for-today line, at most. */
const MAX_TOMORROW = 4;

export function N5Countdown({ list, quiz }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const { learnedKanji, learnedAt, toggleKanjiLearned } = useKanjiProgress();

  useEffect(() => {
    setNow(new Date());
  }, []);

  const order = useMemo(() => list.map(([k]) => k), [list]);
  const gloss = useMemo(() => new Map(list), [list]);

  const view = useMemo(() => {
    if (!now) return null;

    const onList = new Set(order);
    const learned = new Set(learnedKanji.filter((k) => onList.has(k)));
    const dayStart = localDayStart(now);
    const markedToday = new Set(
      [...learned].filter((k) => {
        const at = learnedAt[k];
        return typeof at === 'number' && at >= dayStart;
      }),
    );

    const plan = planFor({
      today: localDayNumber(now),
      total: order.length,
      learned: learned.size,
      markedToday: markedToday.size,
    });
    if (!plan) return null;

    // Learn phase: today's target. Review: whatever is still unmarked, first few.
    const size = plan.phase === 'learn' ? plan.perDay : plan.phase === 'review' ? Math.min(plan.remaining, MAX_CHIPS) : 0;
    const batch = size > 0 ? todaysBatch({ order, learned, markedToday, size }) : [];
    const sheets =
      plan.phase === 'learn' && plan.perDay > 0
        ? printSet(batch, order, learned, plan.perDay, MAX_ROWS_KANJI_PER_REQUEST)
        : [];

    // Today's target met: name tomorrow's kanji instead of a prompt with nothing to tick.
    const doneToday = plan.phase === 'learn' && plan.perDay > 0 && plan.markedToday >= plan.perDay;
    const tomorrow = doneToday
      ? order.filter((k) => !learned.has(k)).slice(0, Math.min(plan.perDay, MAX_TOMORROW))
      : [];

    return { plan, learned, batch, sheets, doneToday, tomorrow };
  }, [now, order, learnedKanji, learnedAt]);

  // Before mount: an empty box of the card's height (see the header). After the last
  // sitting: nothing at all.
  if (!now) return <div aria-hidden className={cn('mb-8', RESERVE)} />;
  if (!view) return null;

  const { plan, learned, batch, sheets, doneToday, tomorrow } = view;
  const total = plan.total;
  const shown = batch.slice(0, MAX_CHIPS);
  const hidden = batch.length - shown.length;
  const keepsReserve = plan.phase === 'review' || (plan.phase === 'learn' && plan.remaining > 0);

  return (
    <section
      aria-labelledby="countdown-heading"
      className={cn(
        'mb-8 rounded-lg border-2 border-japan-sakura-waters bg-card p-4 shadow-sm sm:p-5 md:p-6',
        // Held to the learn card's height only where the card is that tall. On test day, or
        // with everything marked, it is short, and a short card in a tall box looks broken.
        keepsReserve && RESERVE,
      )}
    >
      {/* Four grid children in reading order for a phone: header, plan, progress, footnote.
          From md up the header and progress share the left column, the plan runs down the
          right, and the footnote spans the bottom, which keeps the card short on a wide page. */}
      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:gap-x-8 md:gap-y-4">
        <div className="md:col-start-1 md:row-start-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            JLPT N5 · {formatDayWithYear(plan.testDay)}
          </p>
          <h2 id="countdown-heading" className="mt-2 text-lg font-semibold text-japan-deep-ocean">
            Sitting the N5 in {monthName(plan.testDay)}?
          </h2>
          {plan.phase === 'test-day' ? (
            <p className="mt-1 text-4xl font-bold text-japan-deep-ocean md:text-5xl">Today</p>
          ) : (
            <p className="mt-1 text-4xl font-bold tabular-nums text-japan-deep-ocean md:text-5xl">
              {plan.daysLeft}{' '}
              <span className="text-lg font-semibold text-japan-mountain-mist">
                {plan.daysLeft === 1 ? 'day' : 'days'} to go
              </span>
            </p>
          )}
        </div>

        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          {plan.phase === 'test-day' && (
            <p className="text-japan-ink-black">Good luck. You have put the work in.</p>
          )}

          {plan.phase === 'learn' && plan.remaining === 0 && (
            <p className="text-japan-ink-black">
              All {total} kanji on this list are marked as learned, with {plan.daysLeft}{' '}
              {plan.daysLeft === 1 ? 'day' : 'days'} to go. Spend them going back over the ones that slip.
            </p>
          )}

          {plan.phase === 'learn' && plan.remaining > 0 && (
            <>
              <p className="text-japan-ink-black">
                {plan.tight ? (
                  <>
                    <span className="font-semibold">{plan.perDay} kanji a day</span> would finish the list by{' '}
                    {formatDay(plan.learnBy)}. That is a lot: get as far as you can, and let the quiz show you
                    which ones have stuck.
                  </>
                ) : (
                  <>
                    Learn <span className="font-semibold">{plan.perDay} kanji a day</span> and you will finish on{' '}
                    {formatDay(plan.finishDay)}, with {plan.reviewDaysAfter} days to review.
                  </>
                )}
              </p>

              <p className="mt-4 text-sm font-semibold text-japan-deep-ocean">
                {doneToday ? (
                  <>
                    Done for today. Tomorrow:{' '}
                    {tomorrow.map((k, i) => (
                      <span key={k}>
                        {i > 0 && ', '}
                        <Link
                          href={`/kanji/${encodeURIComponent(k)}`}
                          prefetch={false}
                          lang="ja"
                          data-fast-goal={GOAL}
                          data-fast-goal-action="learn"
                          className={cn(LINK, 'text-base')}
                        >
                          {k}
                        </Link>
                      </span>
                    ))}
                    {plan.perDay > tomorrow.length && '…'}
                  </>
                ) : (
                  `Today’s ${plan.perDay}`
                )}
              </p>
              <KanjiChips
                kanji={shown}
                gloss={gloss}
                learned={learned}
                onToggle={toggleKanjiLearned}
                hidden={hidden}
              />
              {plan.learned === 0 && (
                <p className="mt-3 text-sm text-japan-mountain-mist">
                  Know some?{' '}
                  <Link href={QUIZ_PATH} prefetch={false} className={LINK}>
                    The kanji quiz
                  </Link>{' '}
                  marks them.
                </p>
              )}
            </>
          )}

          {plan.phase === 'review' && (
            <>
              <p className="text-japan-ink-black">
                {plan.daysLeft} {plan.daysLeft === 1 ? 'day' : 'days'} left: time to go back over what you know
                rather than add more.
                {plan.remaining > 0 &&
                  ` ${plan.remaining} on the list ${plan.remaining === 1 ? 'is' : 'are'} not marked as learned yet. Tick the ones you already know and look at the rest first.`}
              </p>
              {batch.length > 0 && (
                <>
                  <p className="mt-4 text-sm font-semibold text-japan-deep-ocean">Not marked yet</p>
                  <KanjiChips
                    kanji={shown}
                    gloss={gloss}
                    learned={learned}
                    onToggle={toggleKanjiLearned}
                    hidden={plan.remaining - shown.length}
                  />
                </>
              )}
            </>
          )}

          {plan.phase !== 'test-day' && (
            <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
              {sheets.length > 0 && (
                <a
                  href={customSheetsHref(sheets, { layout: 'rows', rows: DEFAULT_ROWS, grid: 'cross' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-fast-goal={GOAL}
                  data-fast-goal-action="print"
                  className={cn(buttonVariants({ size: 'default' }), BTN)}
                >
                  <Printer aria-hidden />
                  Print {sheets.length} sheets
                  <span className="sr-only"> for the next {PRINT_DAYS} days (opens in a new tab)</span>
                </a>
              )}
              <Link
                href={quiz.href}
                prefetch={false}
                data-fast-goal={GOAL}
                data-fast-goal-action="quiz"
                className={cn(buttonVariants({ size: 'default', variant: sheets.length > 0 ? 'outline' : 'default' }), BTN)}
              >
                <ListChecks aria-hidden />
                {quiz.label}
              </Link>
              {plan.phase === 'review' || plan.remaining === 0 ? (
                <Link
                  href="/kanji/review"
                  prefetch={false}
                  data-fast-goal={GOAL}
                  data-fast-goal-action="review"
                  className={cn(buttonVariants({ size: 'default', variant: 'outline' }), BTN)}
                >
                  Review what you’ve learned
                  <ArrowRight aria-hidden />
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {plan.phase !== 'test-day' && (
          <div className="md:col-start-1 md:row-start-2 md:self-end">
            <p className="text-sm text-japan-ink-black">
              <span className="font-semibold tabular-nums">{plan.learned}</span> of {total} marked as learned
            </p>
            {/* Decorative: the sentence above carries the number. */}
            <div aria-hidden className="mt-1.5 h-2 w-full max-w-[16rem] overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-japan-sakura-waters"
                style={{ width: `${Math.round((plan.learned / total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {plan.phase !== 'test-day' && (
          <p className="text-xs text-japan-mountain-mist md:col-span-2">
            Registration for this sitting has closed in most places.{' '}
            <a href={OFFICIAL_SITE} target="_blank" rel="noopener noreferrer" className={LINK}>
              Official JLPT site<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function KanjiChips({
  kanji,
  gloss,
  learned,
  onToggle,
  hidden,
}: {
  kanji: readonly string[];
  gloss: ReadonlyMap<string, string>;
  learned: ReadonlySet<string>;
  onToggle: ReturnType<typeof useKanjiProgress>['toggleKanjiLearned'];
  hidden: number;
}) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {kanji.map((k) => {
        const isLearned = learned.has(k);
        const meaning = gloss.get(k) ?? '';
        return (
          <li
            key={k}
            className={cn(
              'flex items-stretch overflow-hidden rounded-full border bg-card',
              isLearned ? 'border-japan-sakura-waters' : 'border-border',
            )}
          >
            <Link
              href={`/kanji/${encodeURIComponent(k)}`}
              prefetch={false}
              data-fast-goal={GOAL}
              data-fast-goal-action="learn"
              className="flex items-center gap-2 py-1.5 pl-4 pr-2 text-japan-ink-black hover:bg-japan-soft-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span lang="ja" className="text-2xl leading-none">
                {k}
              </span>
              <span className="text-sm text-japan-mountain-mist">{meaning}</span>
            </Link>
            <button
              type="button"
              onClick={() => onToggle(k)}
              aria-pressed={isLearned}
              aria-label={`Mark ${k}${meaning ? ` (${meaning})` : ''} as learned`}
              className={cn(
                'flex w-11 items-center justify-center border-l transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isLearned
                  ? 'border-japan-sakura-waters bg-japan-sakura-waters text-japan-ink-black'
                  : 'border-border text-japan-mountain-mist hover:bg-japan-soft-mist hover:text-japan-deep-ocean',
              )}
            >
              <Check className="h-4 w-4" aria-hidden />
            </button>
          </li>
        );
      })}
      {hidden > 0 && <li className="flex items-center px-1 text-sm text-japan-mountain-mist">+{hidden} more</li>}
    </ul>
  );
}
