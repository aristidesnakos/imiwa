/**
 * The link cards: what a page looks like when someone shares it on Facebook,
 * X or in a chat. One place for the files, their size and their alt text, read
 * by each page's metadata, by scripts/render-share-cards.ts (which draws them)
 * and by `pnpm validate:schema` (which asserts each page names its own).
 *
 * Every card is a static 1200x630 JPEG in public/, drawn by
 * `pnpm og:render`. Static, not an opengraph-image.tsx route like /play's,
 * because these carry painted art (Tan, the episode panels, a sheet), and
 * next/og only writes PNG: the same card as a PNG is several times the
 * ~300 kB a scraper is happy to fetch.
 *
 * WHY EACH PAGE MUST NAME ITS CARD: getSEOTags fills `openGraph.images` with
 * the site-wide /opengraph-image whenever a page leaves it out, and nothing
 * reports it. /stories shared as that generic card (and Facebook showed it
 * with no image at all) until 2026-10-13.
 *
 * Relative import, not `@/`, so scripts under tsx can import it.
 */

import { SITE_URL } from './site';

/** Facebook's and X's large-card size, 1.91:1. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

export type ShareCardId = 'stories' | 'kanji-n5-quiz' | 'kanji-sheets' | 'free-resources';

export const SHARE_CARDS: Record<ShareCardId, { page: string; file: string; alt: string }> = {
  stories: {
    page: '/stories',
    file: '/og/stories.jpg',
    alt: "Tan's Stories: Tan the tanuki waves beside three panels from The Travels of Tan, a free six-panel comic in easy JLPT N5 Japanese.",
  },
  'kanji-n5-quiz': {
    page: '/kanji/n5/quiz',
    file: '/og/kanji-n5-quiz.jpg',
    alt: 'Can you read this? Tan the tanuki points at the kanji 水, beside four reading choices: a free JLPT N5 kanji quiz.',
  },
  'kanji-sheets': {
    page: '/free-resources/kanji-sheets',
    file: '/og/kanji-sheets.jpg',
    alt: 'A free printable kanji practice sheet for 日, with stroke order and practice squares, and Tan the tanuki holding a brush.',
  },
  'free-resources': {
    page: '/free-resources',
    file: '/og/free-resources.jpg',
    alt: 'Free printable kanji and kana practice sheets, and Tan the tanuki holding a brush.',
  },
};

/** A page's card, in the shape `openGraph.images` takes. */
export function shareCardImage(id: ShareCardId) {
  const card = SHARE_CARDS[id];
  return { url: `${SITE_URL}${card.file}`, ...SHARE_CARD_SIZE, alt: card.alt };
}

/**
 * An episode's card, public/stories/<slug>/og.jpg: three of its panels under
 * its title, drawn by `pnpm og:render episode:<slug>` (`pnpm stories:ship`
 * runs it). `pnpm validate:stories` asserts every one is this size.
 */
export function episodeShareCardImage(episode: { ogImage: string; number: number; titleEn: string; titleJa: string }) {
  return {
    url: `${SITE_URL}${episode.ogImage}`,
    ...SHARE_CARD_SIZE,
    alt: `${episode.titleEn} (${episode.titleJa}): three panels from episode ${episode.number} of The Travels of Tan, a free comic in easy JLPT N5 Japanese.`,
  };
}
