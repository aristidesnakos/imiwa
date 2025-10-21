const fs = require('fs');
const path = require('path');

// Helper function to extract kanji from TypeScript files
const extractKanjiFromFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/\{ kanji: "([^"]+)", onyomi: "([^"]*)", kunyomi: "([^"]*)", meaning: "([^"]*)" \}/g)];
  return matches.map(match => ({
    kanji: match[1],
    onyomi: match[2],
    kunyomi: match[3],
    meaning: match[4]
  }));
};

const N5_KANJI = extractKanjiFromFile('lib/constants/n5-kanji.ts');
const N4_KANJI = extractKanjiFromFile('lib/constants/n4-kanji.ts');
const N3_KANJI = extractKanjiFromFile('lib/constants/n3-kanji.ts');
const N2_KANJI = extractKanjiFromFile('lib/constants/n2-kanji.ts');

// Create deduplicated list
const kanjiMap = new Map();
N5_KANJI.forEach(k => kanjiMap.set(k.kanji, k));
N4_KANJI.forEach(k => {
  if (!kanjiMap.has(k.kanji)) {
    kanjiMap.set(k.kanji, k);
  }
});
N3_KANJI.forEach(k => {
  if (!kanjiMap.has(k.kanji)) {
    kanjiMap.set(k.kanji, k);
  }
});
N2_KANJI.forEach(k => {
  if (!kanjiMap.has(k.kanji)) {
    kanjiMap.set(k.kanji, k);
  }
});

const allKanji = Array.from(kanjiMap.values());
const siteUrl = 'https://michikanji.com';
const lastmod = new Date().toISOString();

// Generate XML sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
<url><loc>${siteUrl}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
<url><loc>${siteUrl}/kanji</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
<url><loc>${siteUrl}/robots.txt</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>
<url><loc>${siteUrl}/sitemap.xml</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>
<url><loc>${siteUrl}/tos</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>
<url><loc>${siteUrl}/privacy-policy</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>
${allKanji.map(kanji => 
  `<url><loc>${siteUrl}/kanji/${encodeURIComponent(kanji.kanji)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
).join('\n')}
</urlset>`;

// Write sitemap
fs.writeFileSync('public/sitemap.xml', sitemap);
console.log(`Generated sitemap with ${allKanji.length} kanji pages + 6 main pages = ${allKanji.length + 6} total URLs`);

// Generate robots.txt
const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml`;

fs.writeFileSync('public/robots.txt', robotsTxt);
console.log('Generated robots.txt');