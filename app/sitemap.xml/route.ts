import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { SITE_URL, KANJI_CONTENT_LAST_MODIFIED } from '@/lib/seo/site';
import { strokeOrderImagePath } from '@/lib/stroke-order-image';
import { EPISODES, STORIES_HUB_LAST_MODIFIED } from '@/lib/stories';
import { PUBLISHED_JLPT_UPDATED } from '@/lib/jlpt/published';
import { PLAY_PATH, PLAY_CONTENT_LAST_MODIFIED } from '@/lib/play/seo';

/** The later of two YYYY-MM-DD dates, ignoring a missing one. */
const later = (a: string, b: string | null): string => (b && b > a ? b : a);

// Static pages, each with the date its content actually last changed.
//
// These are hardcoded rather than derived from `new Date()` on purpose. A
// per-deploy timestamp claims every URL changed at the same instant, which
// makes `lastmod` untrustworthy and gets it ignored. Bump a date here when you
// meaningfully change that page.
const STATIC_PAGES: { path: string; lastmod: string; priority: string }[] = [
  { path: '', lastmod: '2026-09-24', priority: '1.0' },
  { path: '/kanji', lastmod: '2026-09-24', priority: '0.9' },
  // Level list pages — one per entry in lib/levels (only N5 has a page yet).
  // Same priority as the hub: each is a category page written to rank for its
  // own query class ("n5 kanji", "n5 kanji list").
  { path: '/kanji/n5', lastmod: '2026-09-24', priority: '0.9' },
  // Indexable and canonical, but both of its in-app links sit behind localStorage
  // checks a crawler never satisfies — without this entry it is an orphan.
  { path: '/kanji/review', lastmod: '2026-07-31', priority: '0.6' },
  // Practice, not a list: it is written for "n5 kanji quiz", a different query
  // from the one the N5 list page answers. Its JLPT-format tab exists only while
  // there are published items, so the page changes whenever they do: the later of
  // the template's date and the items' own stamp (scripts/jlpt/publish-items.ts).
  { path: '/kanji/n5/quiz', lastmod: later('2026-09-24', PUBLISHED_JLPT_UPDATED), priority: '0.7' },
  // Tan Dash, the kanji game: written for "kanji game", a query neither the
  // quiz nor the list answers. Its own date lives beside the page's other
  // constants (lib/play/seo.ts). Registering an episode makes it a world
  // (lib/play/build.ts), which changes the page's worlds section, so the page
  // changes whenever one is registered: the later of that date and the newest
  // registered episode's, as the quiz above does with its items.
  {
    path: PLAY_PATH,
    lastmod: EPISODES.reduce((date, episode) => later(date, episode.publishedAt), PLAY_CONTENT_LAST_MODIFIED),
    priority: '0.7',
  },
  // The hub, not the episodes: those carry their own publication dates and are
  // emitted below. Priority matches /kanji because it does the same job for a
  // different query class — it is a category page written to rank, not an index.
  // It lists every registered episode, so it changes whenever one is registered:
  // the later of its template's date (lib/stories) and the newest episode's, as
  // /play does above.
  {
    path: '/stories',
    lastmod: EPISODES.reduce((date, episode) => later(date, episode.publishedAt), STORIES_HUB_LAST_MODIFIED),
    priority: '0.9',
  },
  { path: '/free-resources', lastmod: '2026-10-10', priority: '0.7' },
  // Blank manuscript paper, written for "genkouyoushi paper / pdf / template".
  { path: '/free-resources/genkouyoushi', lastmod: '2026-10-10', priority: '0.7' },
  { path: '/free-resources/kana-sheets', lastmod: '2026-01-10', priority: '0.7' },
  // Written for "shi vs tsu katakana" / "so vs n katakana" (2026-10-21).
  { path: '/katakana/shi-tsu-so-n', lastmod: '2026-10-21', priority: '0.7' },
  { path: '/free-resources/kanji-sheets', lastmod: '2026-10-10', priority: '0.7' },
  // The builder: written for "kanji worksheet generator", a query the hub's
  // copy deliberately no longer answers.
  { path: '/free-resources/kanji-sheets/custom', lastmod: '2026-10-10', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n5-sheets', lastmod: '2026-09-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n4-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n3-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n2-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n1-sheets', lastmod: '2026-01-24', priority: '0.7' },
  // Who makes the site and where its data comes from. Low priority: it exists
  // to be found when someone asks "who is behind this", not to rank for a query.
  { path: '/about', lastmod: '2026-10-02', priority: '0.5' },
  // LAST_UPDATED in app/privacy-policy/page.tsx, as a date: keep the two in step.
  { path: '/privacy-policy', lastmod: '2026-10-11', priority: '0.7' },
  { path: '/tos', lastmod: '2026-09-29', priority: '0.7' },
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

  // Generate sitemap XML. The image namespace is for the kanji pages: each one
  // lists its stroke-order diagram (app/kanji/[character]/stroke-order.svg), the
  // image the page exists to show. <image:image> comes after the standard
  // elements, where the sitemap schema puts extensions, and its <image:loc> is
  // built by the same helper as the page's <img>, so it is encoded exactly as
  // that page's <loc> is.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${STATIC_PAGES.map(({ path, lastmod, priority }) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`).join('')}
  ${EPISODES.map(episode => `
  <url>
    <loc>${baseUrl}/stories/${episode.slug}</loc>
    <lastmod>${episode.publishedAt}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  ${[...N5_KANJI, ...N4_KANJI, ...N3_KANJI, ...N2_KANJI, ...N1_KANJI].map(kanji => `
  <url>
    <loc>${baseUrl}/kanji/${encodeURIComponent(kanji.kanji)}</loc>
    <lastmod>${KANJI_CONTENT_LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${baseUrl}${strokeOrderImagePath(kanji.kanji)}</image:loc>
    </image:image>
  </url>`).join('')}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
