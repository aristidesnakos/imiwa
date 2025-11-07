export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.michikanji.com';
  
  const robots = `User-agent: *
Allow: /
Allow: /kanji
Allow: /kanji/*
Allow: /blog
Allow: /blog/*

# High-value content
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Block admin/private areas
Disallow: /api/
Disallow: /settings/
Disallow: /_next/
Disallow: /favicon.ico`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}