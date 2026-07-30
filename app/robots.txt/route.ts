import { SITE_URL } from '@/lib/seo/site';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

  const robots = `User-agent: *
Allow: /
Allow: /kanji
Allow: /kanji/*

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Block admin/private areas
Disallow: /api/
Disallow: /settings/
Disallow: /favicon.ico`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
