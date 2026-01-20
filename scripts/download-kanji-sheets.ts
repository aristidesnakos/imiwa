#!/usr/bin/env tsx

/**
 * Script to download kanji practice sheets from michikanji.com
 *
 * Usage:
 *   pnpm tsx scripts/download-kanji-sheets.ts <level>
 *
 * Example:
 *   pnpm tsx scripts/download-kanji-sheets.ts n5
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Define kanji lists for each level
const KANJI_LISTS = {
  n5: [
    '日','本',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円',
    '日', '時', '年', '月', '午', '半',
    '人', '女', '男', '子', '母', '父', '友',
    '大', '小', '高', '長', '白',
    '天', '火', '水', '木', '土', '山', '川', '雨',
    '東', '西', '南', '北',
    '行', '来', '見', '出', '入', '読', '書', '話', '聞', '食', '生', '気', '休',
    '本', '国', '学', '校', '中', '上', '下', '前', '後', '間', '外',
    '名', '分', '今', '金', '電', '語', '車', '何', '毎', '右', '左', '先', '刀'
  ],
  // Add more levels as needed (n4, n3, etc.)
};

async function downloadKanjiSheet(
  page: puppeteer.Page,
  kanji: string,
  outputDir: string
) {
  const url = `https://www.michikanji.com/api/kanji-sheets?character=${encodeURIComponent(kanji)}`;

  console.log(`Downloading ${kanji}...`);

  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Wait a bit for any dynamic content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot in A4 portrait format
    await page.screenshot({
      path: join(outputDir, `${kanji}.png`),
      fullPage: true,
      type: 'png'
    });

    console.log(`✓ Downloaded ${kanji}`);
  } catch (error) {
    console.error(`✗ Failed to download ${kanji}:`, error);
  }
}

async function main() {
  const level = process.argv[2]?.toLowerCase();

  if (!level || !(level in KANJI_LISTS)) {
    console.error('Usage: pnpm tsx scripts/download-kanji-sheets.ts <level>');
    console.error('Available levels:', Object.keys(KANJI_LISTS).join(', '));
    process.exit(1);
  }

  const kanjiList = KANJI_LISTS[level as keyof typeof KANJI_LISTS];
  const outputDir = join(process.cwd(), 'kanji-sheets', level);

  // Create output directory
  await mkdir(outputDir, { recursive: true });
  console.log(`Output directory: ${outputDir}`);
  console.log(`Total kanji to download: ${kanjiList.length}\n`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set viewport to A4 portrait dimensions (roughly 794x1123 at 96dpi)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2 // Higher resolution for better quality
    });

    // Download each kanji sheet
    for (const kanji of kanjiList) {
      await downloadKanjiSheet(page, kanji, outputDir);
    }

    console.log(`\n✓ All done! Sheets saved to ${outputDir}`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
