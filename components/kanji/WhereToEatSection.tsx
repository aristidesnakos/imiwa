import type { ReactNode } from 'react';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';

/**
 * "Where to eat the kanji you just learned": one sentence and one link from nine food
 * kanji to Japan Ramen Guide (japanramenguide.com).
 *
 * This is the return half of a link swap agreed with its owner on 2026-10-21. His site links
 * to MichiKanji from three pages (the menu guide, the ramen-characters post and the glossary,
 * checked live 2026-10-22). The rules the swap is held to, so that ours is as good as his:
 *
 *   - Editorial and in the body. A sentence about the character with the link inside it, in
 *     the server HTML, never a footer or sidebar link and never injected by script.
 *   - Followable. No nofollow, sponsored or ugc. And no `noreferrer` either, which the rest of
 *     the site's external links carry: the site-wide Referrer-Policy is
 *     strict-origin-when-cross-origin, so without it his analytics sees michikanji.com as the
 *     source of the visit, the same way ours sees his. With it he would see "direct".
 *   - True. Every sentence says only what the page it links to says. 飲 and 肉 are on the
 *     list because they were named in the proposal, but neither character appears on his
 *     pages, so their sentences are about the menu layout and chāshū and do not claim
 *     otherwise. 食 is there for 食べログ (Tabelog) in his glossary. The other six
 *     (味 卵 塩 豚 醤 盛) are on his key-kanji list. A new kanji earns a line only if it can
 *     be written the same way, and a line should go if its target page stops saying it.
 *   - Modest. Nine of 1,900 pages, one link each, and only to the three pages that already
 *     link here. Google's spam policy targets excessive link exchanges, not a few
 *     contextual links between two sites on the same subject.
 *
 * Text only, no image and no client boundary: /kanji/% is gated on total transfer. No goal is
 * wired (DataFast is over its event limit, and the Tan Dash test runs until 7 Dec 2026
 * without new goals or placements); a click shows up as an exit link in DataFast.
 *
 * Renders null for every other character, with no heading and no empty state, exactly as
 * StoryAppearancesSection does. A Map, not an object: the route accepts arbitrary strings,
 * and `COPY['__proto__']` on a plain object is truthy.
 */

const GUIDE = 'https://japanramenguide.com';
const PAGES = {
  menu: `${GUIDE}/blog/reading-japanese-ramen-menu`,
  words: `${GUIDE}/blog/ramen-japanese-characters`,
  glossary: `${GUIDE}/glossary`,
} as const;

// The ring is spelled out because a raw <a> does not go through buttonVariants.
const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function Ja({ children }: { children: ReactNode }) {
  return <span lang="ja">{children}</span>;
}

// Anchor text names the page being linked, not the character: a link reading "食" on a page
// about 食 says nothing to a reader or a crawler.
function Guide({ page, children }: { page: keyof typeof PAGES; children: ReactNode }) {
  return (
    <a href={PAGES[page]} target="_blank" rel="noopener" className={LINK}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const MENU_LIST = <Guide page="menu">Japan Ramen Guide&rsquo;s short list of what to recognise on a ramen menu</Guide>;
const WORDS_LIST = <Guide page="words">Japan Ramen Guide&rsquo;s list of ramen kanji and menu words</Guide>;

const COPY = new Map<string, ReactNode>([
  [
    '食',
    <>
      <Ja>食</Ja> is the first character of <Ja>食べログ</Ja> (Tabelog), Japan&rsquo;s biggest restaurant review
      site. <Guide page="glossary">Japan Ramen Guide&rsquo;s ramen glossary</Guide> explains how to read its
      scores, and the words you will meet in a ramen shop.
    </>,
  ],
  [
    '飲',
    <>
      Want a drink with your bowl? A ramen menu is laid out the same way almost everywhere, with the drinks at the
      end, after the sides and toppings.{' '}
      <Guide page="menu">Japan Ramen Guide&rsquo;s guide to reading a ramen menu</Guide> walks through the whole
      layout.
    </>,
  ],
  [
    '肉',
    <>
      In a ramen shop the braised pork slices are called chāshū and are often written in katakana, as{' '}
      <Ja>チャーシュー</Ja>. It is one of the words on {MENU_LIST}.
    </>,
  ],
  [
    '味',
    <>
      <Ja>味</Ja> turns up on ramen menus in <Ja>味噌</Ja> (miso) and <Ja>味玉</Ja> (ajitama, the marinated
      soft-boiled egg). {WORDS_LIST} explains both.
    </>,
  ],
  [
    '卵',
    <>
      <Ja>卵</Ja> is the egg in <Ja>煮卵</Ja> (nitamago), the marinated soft-boiled egg that is also written{' '}
      <Ja>味玉</Ja> (ajitama). It is one of the words on {MENU_LIST}.
    </>,
  ],
  [
    '塩',
    <>
      <Ja>塩</Ja> is the shio in shio ramen, the salt broth. {WORDS_LIST} sets it beside the other broth words:
      shoyu, miso and tonkotsu.
    </>,
  ],
  [
    '豚',
    <>
      <Ja>豚</Ja> is the pig in <Ja>豚骨</Ja> (tonkotsu), the pork-bone broth. {WORDS_LIST} sets it beside the
      other broth words: shoyu, shio and miso.
    </>,
  ],
  [
    '醤',
    <>
      <Ja>醤</Ja> is the first character of <Ja>醤油</Ja> (shōyu), soy sauce, and so of shoyu ramen, the soy sauce
      broth. {WORDS_LIST} sets it beside the other broth words: shio, miso and tonkotsu.
    </>,
  ],
  [
    '盛',
    <>
      <Ja>盛</Ja> is the mori in <Ja>大盛り</Ja> (ōmori), the large serving of noodles, and in <Ja>特盛</Ja>{' '}
      (tokumori), extra large. <Guide page="menu">Japan Ramen Guide&rsquo;s guide to reading a ramen menu</Guide>{' '}
      shows where the size options sit.
    </>,
  ],
]);

export function WhereToEatSection({ kanji }: { kanji: string }) {
  const copy = COPY.get(kanji);
  if (!copy) return null;

  return (
    <section className={SECTION_BAND} aria-labelledby="where-to-eat-heading">
      <h2 id="where-to-eat-heading" className={`${SECTION_HEADING} mb-2`}>
        Where to eat the kanji you just learned
      </h2>
      <p className="text-japan-mountain-mist">{copy}</p>
    </section>
  );
}
