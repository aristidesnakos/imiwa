import { SITE_URL } from '@/lib/seo/site';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

  // /api/kanji-svg/ is page content, not an API: StrokeOrderViewer fetches each
  // character's stroke-order diagram from it. Under the blanket /api/ rule,
  // Google's renderer could not fetch it, so no kanji page ever showed Google
  // its diagram. Google applies the longest matching rule, so this Allow wins
  // over Disallow: /api/ for this one path whatever the order; it sits first
  // for crawlers that take the first match instead.
  const robots = `User-agent: *
Allow: /
Allow: /kanji
Allow: /kanji/*
Allow: /api/kanji-svg/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Block admin/private areas
Disallow: /api/
Disallow: /admin/
Disallow: /settings/
Disallow: /favicon.ico`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
