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

const N5_KANJI = extractKanjiFromFile(path.join(__dirname, 'lib/constants/n5-kanji.ts'));
const N4_KANJI = extractKanjiFromFile(path.join(__dirname, 'lib/constants/n4-kanji.ts'));
const N3_KANJI = extractKanjiFromFile(path.join(__dirname, 'lib/constants/n3-kanji.ts'));
const N2_KANJI = extractKanjiFromFile(path.join(__dirname, 'lib/constants/n2-kanji.ts'));
const N1_KANJI = extractKanjiFromFile(path.join(__dirname, 'lib/constants/n1-kanji.ts'));

// Create deduplicated list of all kanji (same logic as in KanjiSearchClient)
const getAllKanji = () => {
  const kanjiMap = new Map();
  
  // Add N5 first (highest priority)
  N5_KANJI.forEach(k => kanjiMap.set(k.kanji, k));
  // Add N4, but don't overwrite N5
  N4_KANJI.forEach(k => {
    if (!kanjiMap.has(k.kanji)) {
      kanjiMap.set(k.kanji, k);
    }
  });
  // Add N3, but don't overwrite N5/N4
  N3_KANJI.forEach(k => {
    if (!kanjiMap.has(k.kanji)) {
      kanjiMap.set(k.kanji, k);
    }
  });
  // Add N2, but don't overwrite N5/N4/N3
  N2_KANJI.forEach(k => {
    if (!kanjiMap.has(k.kanji)) {
      kanjiMap.set(k.kanji, k);
    }
  });
  // Add N1, but don't overwrite N5/N4/N3/N2
  N1_KANJI.forEach(k => {
    if (!kanjiMap.has(k.kanji)) {
      kanjiMap.set(k.kanji, k);
    }
  });
  
  return Array.from(kanjiMap.values());
};

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.michikanji.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  additionalPaths: async (config) => {
    const allKanji = getAllKanji();
    
    // Generate paths for all individual kanji pages
    const kanjiPaths = allKanji.map(kanji => ({
      loc: `/kanji/${encodeURIComponent(kanji.kanji)}`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    }));
    
    console.log(`Generating sitemap for ${kanjiPaths.length} kanji pages`);
    
    return kanjiPaths;
  },
}