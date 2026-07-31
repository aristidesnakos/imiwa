import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { SITE_URL, KANJI_CONTENT_LAST_MODIFIED } from '@/lib/seo/site';

// Static pages, each with the date its content actually last changed.
//
// These are hardcoded rather than derived from `new Date()` on purpose. A
// per-deploy timestamp claims every URL changed at the same instant, which
// makes `lastmod` untrustworthy and gets it ignored. Bump a date here when you
// meaningfully change that page.
const STATIC_PAGES: { path: string; lastmod: string; priority: string }[] = [
  { path: '', lastmod: '2026-06-14', priority: '1.0' },
  { path: '/kanji', lastmod: '2026-06-14', priority: '0.9' },
  // Indexable and canonical, but both of its in-app links sit behind localStorage
  // checks a crawler never satisfies — without this entry it is an orphan.
  { path: '/kanji/review', lastmod: '2026-07-31', priority: '0.6' },
  { path: '/free-resources', lastmod: '2026-06-14', priority: '0.7' },
  { path: '/free-resources/kana-sheets', lastmod: '2026-01-10', priority: '0.7' },
  { path: '/free-resources/kanji-sheets', lastmod: '2026-06-14', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n5-sheets', lastmod: '2026-01-20', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n4-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n3-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n2-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/free-resources/kanji-sheets/n1-sheets', lastmod: '2026-01-24', priority: '0.7' },
  { path: '/advertise', lastmod: '2026-07-29', priority: '0.7' },
  { path: '/privacy-policy', lastmod: '2026-05-02', priority: '0.7' },
  { path: '/tos', lastmod: '2026-05-02', priority: '0.7' },
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${STATIC_PAGES.map(({ path, lastmod, priority }) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`).join('')}
  ${[...N5_KANJI, ...N4_KANJI, ...N3_KANJI, ...N2_KANJI, ...N1_KANJI].map(kanji => `
  <url>
    <loc>${baseUrl}/kanji/${encodeURIComponent(kanji.kanji)}</loc>
    <lastmod>${KANJI_CONTENT_LAST_MODIFIED}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
