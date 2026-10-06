/**
 * components/levels/N5QuizLink.tsx
 *
 * One line of text linking to /kanji/n5/quiz, for the pages that teach the N5 kanji but
 * did not link to the quiz: every N5 character page, the N5 sheets page, and (for the
 * JLPT-format mode only) /kanji/n5, whose own buttons already link the kanji quiz.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO STATES, ONE COPY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * While data/jlpt/published/N5.json has approved items, the line names the JLPT-format
 * sets and opens the quiz on that tab. While it is empty, the line is a plain link to the
 * kanji quiz, or nothing (`fallback="none"`). The copy lives here once so it cannot drift
 * between surfaces, and every claim in it is computed or true in both states:
 *
 *   - "our own questions": these are not JLPT questions and must never read as if they
 *     were. Never "mock test".
 *   - "shaped like the exam's kanji questions": Mondai 1 and 2, the kanji reading and
 *     orthography items. No count for the real exam, which has many other kinds.
 *   - "in 5 sets of 12": counted from the published file at build time, so it can never
 *     promise a set that is not there, and promises nothing about sets to come.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT COSTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Server Component with no client boundary, so nothing to hydrate on /kanji/% pages,
 * which are gated on total transfer. It imports lib/jlpt/published.ts, and with it the
 * item data, into the SERVER bundle only; never import this file from a client component.
 * `prefetch={false}`: it renders on 82 pages and points at a client-heavy route, whose
 * payload a prefetch would add to each page's own byte budget (CLAUDE.md, "Performance
 * budgets").
 *
 * The JLPT-format link uses the `#jlpt-format` hash that QuizModes reads after mount,
 * never `?mode=jlpt`: a hash creates no new URL for a crawler to find.
 */

import Link from 'next/link';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { jlptFormatSummary, type JlptFormatSummary } from '@/lib/jlpt/published';

const QUIZ_PATH = '/kanji/n5/quiz';
/** The tab bar's id in app/kanji/n5/quiz/QuizModes.tsx. */
const JLPT_FORMAT_HREF = `${QUIZ_PATH}#jlpt-format`;

// The ring is spelled out because a raw <Link> does not go through buttonVariants.
const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** "5 sets of 12", "1 set of 12", or "5 sets, 58 questions in all" when sizes differ. */
export function describeJlptSets({ sets, perSet, questions }: JlptFormatSummary): string {
  const noun = sets === 1 ? 'set' : 'sets';
  return perSet === null ? `${sets} ${noun}, ${questions} questions in all` : `${sets} ${noun} of ${perSet}`;
}

interface Props {
  /** Words before the link, ending in a space, e.g. "Written a few out? ". */
  lead?: string;
  /** With nothing published: link the kanji quiz (default), or render nothing. */
  fallback?: 'quiz' | 'none';
  className?: string;
  /** Overrides the published summary; for checking both states' copy against a fixture. */
  summary?: JlptFormatSummary | null;
}

export function N5QuizLink({ lead, fallback = 'quiz', className, summary = jlptFormatSummary() }: Props) {
  if (summary) {
    return (
      <p className={className}>
        {lead}
        <Link href={JLPT_FORMAT_HREF} prefetch={false} className={LINK}>
          Practise the N5 kanji in JLPT format
        </Link>
        : our own questions, shaped like the exam&rsquo;s kanji questions, in {describeJlptSets(summary)}.
      </p>
    );
  }

  if (fallback === 'none') return null;

  return (
    <p className={className}>
      {lead}
      <Link href={QUIZ_PATH} prefetch={false} className={LINK}>
        Quiz yourself on all {N5_KANJI.length} N5 kanji
      </Link>
      : pick the meaning, the reading or the kanji.
    </p>
  );
}
