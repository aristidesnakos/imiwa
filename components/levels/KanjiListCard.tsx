/**
 * components/levels/KanjiListCard.tsx
 *
 * One entry on a JLPT level list: the character, what it means, and how it is
 * read, linking through to its stroke-order page.
 *
 * A Server Component with no client boundary. A level list renders this 82
 * times at N5 and would render it ~1,000 times at N1, so anything interactive
 * here would be paid for per card.
 *
 * `prefetch={false}` is load-bearing, not a nicety. Next prefetches every
 * <Link> that scrolls into view, and each kanji page's RSC payload is ~10 kB:
 * a list page would pull its whole list in the background, the same failure
 * that once blew /kanji's total-byte budget (see KanjiSearchClient's grid).
 */

import Link from 'next/link';
import type { KanjiData } from '@/lib/constants/kanji-types';
import { kanjiReadings, type Reading } from '@/lib/romaji/readings';

/** Readings shown per kind before the rest are counted rather than listed. */
const MAX_READINGS = 3;

/**
 * The first few meanings, which is what fits on a card. The full list is one
 * tap away on the character's own page. Our data separates meanings with both
 * `,` and `;` ("male; man"), so both split.
 */
function shortMeaning(meaning: string): string {
  return meaning
    .split(/[,;]/)
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

/**
 * Romaji with the affix hyphen put back, exactly as the character page does it:
 * `Reading.display` deliberately holds clean romaji only, so `-び` must come
 * back as `-bi` here or a bound form reads as a free word.
 */
function romajiFor(r: Reading): string {
  if (r.affix === 'suffix') return `-${r.display}`;
  if (r.affix === 'prefix') return `${r.display}-`;
  return r.display;
}

function ReadingLine({ label, fullLabel, readings }: { label: string; fullLabel: string; readings: Reading[] }) {
  if (readings.length === 0) return null;
  const shown = readings.slice(0, MAX_READINGS);
  const more = readings.length - shown.length;

  return (
    <span className="block text-sm leading-snug text-japan-mountain-mist">
      <abbr title={fullLabel} className="mr-1.5 text-xs font-semibold uppercase tracking-wide no-underline">
        {label}
      </abbr>
      {shown.map((r, i) => (
        <span key={`${r.raw}-${i}`}>
          {i > 0 && ', '}
          {/* lang="ja" on the kana alone: the romaji beside it is Latin script
              and a screen reader should voice it as such. */}
          <span lang="ja" className="text-japan-ink-black">
            {r.raw}
          </span>{' '}
          {romajiFor(r)}
        </span>
      ))}
      {more > 0 && <span> +{more} more</span>}
    </span>
  );
}

export function KanjiListCard({ entry }: { entry: KanjiData }) {
  const readings = kanjiReadings(entry);

  return (
    <Link
      href={`/kanji/${encodeURIComponent(entry.kanji)}`}
      prefetch={false}
      className="flex h-full items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-japan-sakura-waters focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span lang="ja" className="w-12 shrink-0 text-center text-4xl font-bold leading-none text-japan-deep-ocean">
        {entry.kanji}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block font-semibold leading-snug text-japan-ink-black">
          {shortMeaning(entry.meaning)}
        </span>
        <ReadingLine label="On" fullLabel="On'yomi, the Chinese-derived reading" readings={readings.onyomi} />
        <ReadingLine label="Kun" fullLabel="Kun'yomi, the native Japanese reading" readings={readings.kunyomi} />
      </span>
    </Link>
  );
}
