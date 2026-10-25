import type { ReactNode } from 'react';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';

/**
 * "Converting yen into your own currency?": one sentence and one link from four price-tag
 * kanji to YenPocket (japanramenguide.com/apps/yenpocket), the yen converter the owner of
 * Japan Ramen Guide made after the ramen pages. It sits beside WhereToEatSection, which says
 * why the link exists and holds the rules both are kept to; the sets of characters are
 * disjoint, so a page shows at most one of the two.
 *
 * The same rules apply here, and the ones that bite:
 *
 *   - Editorial, in the body, followable, and no `noreferrer`, so his analytics sees
 *     michikanji.com as the source. See WhereToEatSection for the Referrer-Policy reason.
 *   - True. Checked against the page on 2026-10-25. It is an iPhone and Apple Watch app
 *     (Android and web are not mentioned), converts yen into 26 currencies, keeps its rates on
 *     the phone so it works offline, and has a camera scanner that reads a price tag and says
 *     whether the price includes tax. 税込 and 税抜 appear on it, in its FAQ, as the two
 *     prices a Japanese tag often shows; 円 does not appear as a character, so that line is
 *     about the currency and claims nothing else. The converter is free and the scanner is
 *     a one-time purchase, so the lines that name the scanner say it is optional and give no
 *     price: a price on his page can change, and a line should go if its target stops saying it.
 *   - Modest. Four pages: 円 (the yen) and the three characters of 税込 / 税抜. 抜 and 込 are
 *     there only because the page itself explains the pair.
 *
 * Text only, no image and no client boundary: /kanji/% is gated on total transfer. No goal
 * (DataFast is over its event limit, and the Tan Dash test runs until 7 Dec 2026 without new
 * goals or placements); a click shows up as an exit link in DataFast.
 *
 * Renders null for every other character, no heading and no empty state. A Map, not an
 * object: the route accepts arbitrary strings, and `COPY['__proto__']` on a plain object is
 * truthy.
 */

const YENPOCKET = 'https://japanramenguide.com/apps/yenpocket';

// The ring is spelled out because a raw <a> does not go through buttonVariants.
const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function Ja({ children }: { children: ReactNode }) {
  return <span lang="ja">{children}</span>;
}

// Anchor text names the page being linked, not the character.
function YenPocket({ children }: { children: ReactNode }) {
  return (
    <a href={YENPOCKET} target="_blank" rel="noopener" className={LINK}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const CONVERTER = (
  <YenPocket>YenPocket, Japan Ramen Guide&rsquo;s yen converter for iPhone and Apple Watch</YenPocket>
);

const COPY = new Map<string, ReactNode>([
  [
    '円',
    <>
      <Ja>円</Ja> (en) is the yen, and it follows the number on many price tags, as in <Ja>500円</Ja>.{' '}
      {CONVERTER} turns yen into 26 currencies, and it keeps the latest rates on your phone, so it still converts
      offline.
    </>,
  ],
  [
    '税',
    <>
      <Ja>税</Ja> is tax. It starts <Ja>税込</Ja> (tax included) and <Ja>税抜</Ja> (before tax), the two prices a
      Japanese price tag often shows. {CONVERTER} has a camera scanner, an optional purchase, that reads a tag and
      says whether the price includes tax.
    </>,
  ],
  [
    '込',
    <>
      <Ja>込</Ja> is what marks the tax as included in <Ja>税込</Ja>, the price with tax; <Ja>税抜</Ja> is the price
      before it. {CONVERTER} has a camera scanner, an optional purchase, that reads a price tag and says whether the
      price includes tax.
    </>,
  ],
  [
    '抜',
    <>
      <Ja>抜</Ja> is what takes the tax out in <Ja>税抜</Ja>, the price before tax; <Ja>税込</Ja> is the price with
      it. {CONVERTER} has a camera scanner, an optional purchase, that reads a price tag and says whether the price
      includes tax.
    </>,
  ],
]);

export function YenConverterSection({ kanji }: { kanji: string }) {
  const copy = COPY.get(kanji);
  if (!copy) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="yen-converter-heading">
      <h2 id="yen-converter-heading" className={`${SECTION_HEADING} mb-2`}>
        Converting yen into your own currency?
      </h2>
      <p className="text-japan-mountain-mist">{copy}</p>
    </section>
  );
}
