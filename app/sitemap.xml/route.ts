import { N5_KANJI } from '@/lib/constants/n5-kanji';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://imiwa.app';
  
  // Static pages
  const staticUrls = [
    '',
    '/kanji',
    '/blog',
    '/signin',
    '/privacy-policy',
    '/tos',
  ];
  
  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url === '' ? '1.0' : url === '/kanji' ? '0.9' : '0.7'}</priority>
  </url>`).join('')}
  ${N5_KANJI.map(kanji => `
  <url>
    <loc>${baseUrl}/kanji/${encodeURIComponent(kanji.kanji)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
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