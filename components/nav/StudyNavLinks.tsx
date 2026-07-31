'use client';

import Link from 'next/link';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { useKanjiSRS } from '@/hooks/useKanjiSRS';

// One list, two hosts. Header and Footer both need the Study destinations, and
// duplicating them in two files guarantees they drift the next time one is added.
const STUDY_LINKS = [
  { href: '/kanji/review', label: 'Review', showsDueCount: true },
  { href: '/kanji/progress', label: 'Progress', showsDueCount: false },
] as const;

interface StudyNavLinksProps {
  /**
   * Element wrapping each link: 'li' inside the footer's <ul>, 'div' inside the
   * header's flex <nav>. Presentation stays with the host; this component only
   * decides *which* links exist and *whether* they should exist at all.
   */
  itemAs?: 'li' | 'div';
  itemClassName?: string;
  linkClassName?: string;
}

export function StudyNavLinks({
  itemAs: Item = 'div',
  itemClassName,
  linkClassName,
}: StudyNavLinksProps) {
  const { learnedKanji, totalLearned } = useKanjiProgress();
  const { getDueCount } = useKanjiSRS();

  // Gate on evidence of use. A review session with nothing to review is a worse
  // first impression than no link, and a nav item that dead-ends teaches people
  // the nav is unreliable.
  //
  // No `mounted` guard is needed: both hooks start from an SSR-safe empty state
  // and hydrate in an effect, so the first client render matches the server
  // (nothing rendered) and the links appear on the following paint.
  if (totalLearned === 0) return null;

  const dueCount = getDueCount(learnedKanji);

  return (
    <>
      {STUDY_LINKS.map(({ href, label, showsDueCount }) => (
        <Item key={href} className={itemClassName}>
          <Link href={href} className={linkClassName}>
            {label}
            {showsDueCount && dueCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-purple-100 px-1.5 min-w-[18px] h-[18px] text-xs font-bold text-purple-800 align-middle">
                {dueCount}
              </span>
            )}
          </Link>
        </Item>
      ))}
    </>
  );
}

export default StudyNavLinks;
