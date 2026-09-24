/**
 * Popular Kanji Links
 *
 * Crawlable internal links from resource/landing pages to high-priority kanji
 * detail pages (Phase 0, task S3). Spreads authority to the pages that already
 * rank but under-convert, and gives readers a natural next step from the free
 * worksheets into the interactive dictionary.
 *
 * `kanji` overrides the default set. The default is the S3 priority list, which
 * is an internal-linking seed rather than a popularity measure — a page that
 * shows it should not call it "popular" unless it can back that up. The sheets
 * hub passes the start of the N5 sequence instead, which it can describe
 * accurately.
 */

import Link from 'next/link';
import { SECTION_HEADING } from '@/components/kanji/section';
import { PRIORITY_KANJI_UNIQUE } from '@/lib/linking/priority-kanji';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { cn } from '@/lib/utils';

// First-wins lookup so each character maps to its most-basic level/meaning.
const KANJI_LOOKUP = (() => {
  const map = new Map<string, { meaning: string; level: string }>();
  const add = (list: { kanji: string; meaning: string }[], level: string) => {
    for (const k of list) {
      if (!map.has(k.kanji)) map.set(k.kanji, { meaning: k.meaning, level });
    }
  };
  add(N5_KANJI, 'N5');
  add(N4_KANJI, 'N4');
  add(N3_KANJI, 'N3');
  add(N2_KANJI, 'N2');
  add(N1_KANJI, 'N1');
  return map;
})();

interface Props {
  /** How many links to render (default: all of `kanji`). */
  limit?: number;
  title?: string;
  description?: string;
  /** Which characters to link, in order (default: the S3 priority set). */
  kanji?: readonly string[];
  className?: string;
}

export function PopularKanjiLinks({
  limit,
  title = 'Popular Kanji',
  description = 'Jump straight to an interactive stroke-order page for a frequently searched kanji:',
  kanji = PRIORITY_KANJI_UNIQUE,
  className,
}: Props) {
  const items = kanji
    .map((character) => {
      const meta = KANJI_LOOKUP.get(character);
      return meta
        ? { kanji: character, meaning: meta.meaning.split(',')[0].trim(), level: meta.level }
        : null;
    })
    .filter((x): x is { kanji: string; meaning: string; level: string } => x !== null)
    .slice(0, limit ?? kanji.length);

  if (items.length === 0) return null;

  return (
    <section className={cn('mt-12', className)}>
      <h2 className={cn(SECTION_HEADING, 'mb-2 text-japan-deep-ocean')}>{title}</h2>
      <p className="mb-4 text-sm text-japan-mountain-mist">{description}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.kanji}>
            {/* prefetch={false}: up to ~60 of these render at once, and each
                would otherwise prefetch a full kanji page as it scrolls in. */}
            <Link
              href={`/kanji/${encodeURIComponent(item.kanji)}`}
              prefetch={false}
              className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 transition-colors hover:border-japan-mountain-mist hover:bg-japan-soft-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title={`${item.kanji} — ${item.meaning} kanji stroke order (JLPT ${item.level})`}
            >
              <span lang="ja" className="text-lg font-semibold text-japan-ink-black">
                {item.kanji}
              </span>
              <span className="text-sm text-japan-mountain-mist">{item.meaning}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
