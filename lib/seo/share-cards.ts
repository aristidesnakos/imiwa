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
 * ~300 kB a scraper is happy to fetch (WhatsApp drops a bigger one). The
 * ~1,900 character pages are the exception, since 1,900 JPEGs do not belong
 * in git: each is drawn on request (lib/seo/kanji-share-card.ts).
 *
 * WHY EACH PAGE MUST NAME ITS CARD: getSEOTags fills `openGraph.images` with
 * the homepage's card whenever a page leaves it out, and nothing reports it.
 * That fallback is branded now, but it still says nothing about the page.
 * Until 2026-10-23 it was the navy app/opengraph-image.tsx card, which every
 * page but these shared; /stories went out that way (and Facebook showed it
 * with no image at all) until 2026-10-13.
 *
 * Relative import, not `@/`, so scripts under tsx can import it.
 */

import { SITE_URL } from './site';

/** Facebook's and X's large-card size, 1.91:1. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * The level sheet pages (/free-resources/kanji-sheets/n5-sheets ..), one card
 * each, each showing a real sheet for a kanji of that level. `sample` must be
 * on that level's list; the renderer refuses one that is not.
 */
export const LEVEL_SHEET_CARDS = {
  N5: { id: 'kanji-sheets-n5', sample: '水' },
  N4: { id: 'kanji-sheets-n4', sample: '会' },
  N3: { id: 'kanji-sheets-n3', sample: '夫' },
  N2: { id: 'kanji-sheets-n2', sample: '区' },
  N1: { id: 'kanji-sheets-n1', sample: '己' },
} as const;

type LevelSheetCardId = (typeof LEVEL_SHEET_CARDS)[keyof typeof LEVEL_SHEET_CARDS]['id'];

export type ShareCardId =
  | 'home'
  | 'kanji'
  | 'kanji-n5'
  | 'stories'
  | 'kanji-n5-quiz'
  | 'kanji-sheets'
  | 'free-resources'
  | 'kana-sheets'
  | 'genkouyoushi'
  | 'sheet-builder'
  | LevelSheetCardId;

const levelSheetCards = Object.fromEntries(
  Object.entries(LEVEL_SHEET_CARDS).map(([level, { id, sample }]) => [
    id,
    {
      page: `/free-resources/kanji-sheets/${level.toLowerCase()}-sheets`,
      file: `/og/${id}.jpg`,
      alt: `A free printable JLPT ${level} kanji practice sheet for ${sample}, with stroke order and practice squares, and Tan the tanuki holding a brush.`,
    },
  ])
) as Record<LevelSheetCardId, { page: string; file: string; alt: string }>;

export const SHARE_CARDS: Record<ShareCardId, { page: string; file: string; alt: string }> = {
  // Also every page's card that names none: getSEOTags falls back to this one.
  home: {
    page: '/',
    file: '/og/home.jpg',
    alt: 'Look up any Japanese kanji: "mizu" typed into a search box finds 水 (water), and Tan the tanuki points at it.',
  },
  kanji: {
    page: '/kanji',
    file: '/og/kanji.jpg',
    alt: 'Kanji stroke order dictionary: kanji tiles for every JLPT level from N5 to N1, and Tan the tanuki pointing at them.',
  },
  'kanji-n5': {
    page: '/kanji/n5',
    file: '/og/kanji-n5.jpg',
    alt: 'Every JLPT N5 kanji on one board, in the order to learn them, and Tan the tanuki giving a thumbs up.',
  },
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
  'kana-sheets': {
    page: '/free-resources/kana-sheets',
    file: '/og/kana-sheets.jpg',
    alt: 'Printable hiragana and katakana practice sheets, every kana in its square, and Tan the tanuki holding a brush.',
  },
  genkouyoushi: {
    page: '/free-resources/genkouyoushi',
    file: '/og/genkouyoushi.jpg',
    alt: 'Free printable genkouyoushi, Japanese manuscript paper: the 400-square sheet and a large-square sheet, and Tan the tanuki holding a brush.',
  },
  'sheet-builder': {
    page: '/free-resources/kanji-sheets/custom',
    file: '/og/sheet-builder.jpg',
    alt: 'Make your own kanji practice sheets: 日本語 typed into the sheet builder, its printed rows beside it, and Tan the tanuki pointing.',
  },
  ...levelSheetCards,
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
