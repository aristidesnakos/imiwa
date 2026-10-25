import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { PracticeCard } from '@/components/levels/PracticeCard';
import { fetchLinkPreview, type LinkPreview } from '@/lib/link-preview';

/**
 * A link card to YenPocket (japanramenguide.com/apps/yenpocket), the yen converter the owner of
 * Japan Ramen Guide made after the ramen pages, on four price-tag kanji: 円, and 税 込 抜, the
 * three characters of 税込 / 税抜 (tax included / before tax), which his page explains in its FAQ.
 * It sits beside WhereToEatSection, which says why these links exist and holds the rules both are
 * kept to; the two sets of characters are disjoint, so a page shows at most one of them.
 *
 * THE CARD IS HIS PAGE'S OWN METADATA. The heading, the sentence, the picture and the eyebrow are
 * its Open Graph title, description, image and site name, read by lib/link-preview.ts at build and
 * then at most once a day (the page's `revalidate`), in the shell of the quiz and game cards
 * (PracticeCard). So the card can say nothing his page does not, which is the rule the swap was
 * held to, and it follows him when he edits it: "26 currencies" or "Free on iPhone" changes here
 * the day it changes there. Only the button's words are ours, and the link itself is a constant,
 * never read from his page.
 *
 * If the request fails, or his page stops publishing a title or description, the card shows the
 * copy pinned in PINNED, read from his page on 2026-10-25, rather than nothing: a build must not
 * depend on his site being up, and the backlink should not disappear because it was down. Re-read
 * PINNED against the page when you touch this file.
 *
 * THE PICTURE is his og:image, a 512px app icon (428 kB), shown at 128px through next/image, so a
 * visitor's browser talks to us and Vercel fetches the file: his host never sees a reader, and the
 * privacy policy needs no new line. next/image refuses a host it was not told about and throws at
 * render, so `shownImage` accepts exactly what next.config.js `images.remotePatterns` allows
 * (https, japanramenguide.com, under /apps/yenpocket/) and anything else gets the ¥ tile. Widen
 * the two together. The card sits below the fold and the image lazy-loads; /kanji/% is gated on
 * total transfer, and only /kanji/日 is the measured page.
 *
 * Same link rules as WhereToEatSection: followable, `noopener` and no `noreferrer` so his
 * analytics sees michikanji.com as the source, a new tab with the screen-reader note (all in
 * PracticeCard's `external` branch). It is a block card rather than a sentence on purpose, at
 * Ari's request on 2026-10-25, so the editorial sentence the ramen links carry is not here: the
 * card is labelled by the owner's site name and describes the page in the page's own words.
 *
 * No goal, as for the ramen links (DataFast is over its event limit, and the Tan Dash test runs
 * until 7 Dec 2026 without new goals or placements); a click shows up as an exit link. Renders
 * nothing for every other character, with no heading and no empty state. A Set, not an object:
 * the route accepts arbitrary strings.
 */

const PAGE = 'https://japanramenguide.com/apps/yenpocket';
const KANJI = new Set(['円', '税', '込', '抜']);

const PINNED = {
  title: 'YenPocket: Japan Yen Converter & Price Tag Scanner',
  description:
    'Convert yen to 26 currencies, scan Japanese price tags, see if tax is included and track the tax-free minimum. Works offline. Free on iPhone and Apple Watch.',
  siteName: 'Japan Ramen Guide',
  image: `${PAGE}/icon-512.png`,
} satisfies LinkPreview;

function shownImage(src: string | null): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    const ok = url.protocol === 'https:' && url.hostname === 'japanramenguide.com' && url.pathname.startsWith('/apps/yenpocket/');
    return ok ? `${url.origin}${url.pathname}` : null;
  } catch {
    return null;
  }
}

export async function YenConverterSection({ kanji }: { kanji: string }) {
  if (!KANJI.has(kanji)) return null;

  const preview = (await fetchLinkPreview(PAGE)) ?? PINNED;
  const image = shownImage(preview.image);

  return (
    <PracticeCard
      id="yenpocket-card"
      external
      eyebrow={preview.siteName ?? PINNED.siteName}
      heading={preview.title}
      href={PAGE}
      cta="See YenPocket"
      icon={<ExternalLink aria-hidden />}
      tile={
        image ? (
          <Image
            src={image}
            alt=""
            width={128}
            height={128}
            sizes="(min-width: 640px) 128px, 88px"
            className="h-auto w-full rounded-lg border border-border"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-japan-soft-mist text-4xl font-bold text-japan-deep-ocean">
            ¥
          </div>
        )
      }
      className="mt-12"
    >
      {preview.description}
    </PracticeCard>
  );
}
