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
  n4: [
    // Company/Business/Organization
    '会', '社', '業', '場', '員', '事', '仕', '用',
    // Self/Identity/Essence
    '自', '身', '体', '心',
    // People/Relationships/Family
    '者', '兄', '弟', '姉', '妹', '親', '族',
    // Time-Related
    '朝', '夜', '昼', '夕', '春', '夏', '秋', '冬', '曜', '週',
    // Quantity/Numbers
    '多', '少', '度',
    // Descriptive/Qualities
    '新', '古', '明', '暗', '強', '弱', '広', '正', '悪', '安', '重', '特',
    // Colors
    '白', '黒', '赤', '青', '色',
    // Body Parts
    '手', '足', '目', '口',
    // Motion/Action Verbs
    '動', '行', '走', '歩', '立', '起', '転', '止', '送',
    // Intellectual/Mental Verbs
    '思', '考', '知', '見', '聞', '言', '話', '問',
    // Learning/Study/Academic Verbs
    '学', '習', '教', '研', '究', '勉',
    // Writing/Reading/Literary Verbs
    '読', '書', '字', '文',
    // Creation/Making Verbs
    '作', '開', '建',
    // Eating/Drinking Verbs
    '食', '飲',
    // Wearing/Clothing Verbs
    '着',
    // Commerce/Buying/Selling Verbs
    '売', '買', '貸', '借',
    // Other Verbs
    '注', '帰', '待', '試',
    // Transportation/Travel
    '駅', '旅', '運',
    // Buildings/Places/Locations
    '家', '店', '館', '屋', '室', '堂', '院',
    // Geographic/Location/Spatial
    '地', '方', '町', '京', '野', '道', '世',
    // Physical/Nature
    '空', '風', '海', '洋',
    // Food/Dining
    '飯', '肉', '菜', '茶', '魚', '牛', '鳥',
    // Animals
    '犬',
    // Clothing
    '服', '紙',
    // Nature/Natural Things
    '花',
    // Entertainment/Arts
    '楽', '歌', '映',
    // Abstracts/Concepts
    '意', '理', '力', '気',
    // Condition/State Verbs
    '病', '死', '休',
    // Communication/Connection
    '通', '語',
    // Material/Items
    '物', '品', '料',
    // Work/Profession
    '医', '工',
    // Abstract Movement/Time
    '始', '終', '切',
    // Existence/Possession
    '有', '無', '持', '使',
    // Negation/Opposition
    '不',
    // Basics/Fundamentals
    '元', '代', '同', '以',
    // Names/Naming
    '名',
    // Education/School
    '題',
    // Numbers/Quantities/Measuring
    '計',
    // Response/Answer
    '答',
    // Structure/Shape
    '図', '画',
    // Collection/Gathering
    '集',
    // Separation/Division
    '別', '分',
    // Sound/Noise
    '音',
    // Verification/Testing
    '験',
    // Image/Photography
    '写',
    // Technology/Electricity
    '電',
    // Wealth/Gems
    '銀',
    // Concepts/Relations
    '界', '質',
    // Origin/Beginning
    '田',
    // Chief/Master
    '主',
    // Nearness
    '近', '早',
    // Speed
    '急',
    // Truth/Genuine
    '真',
    // Intelligence/Wit
    '英',
    // Distance/Removal
    '去',
    // Private/Personal
    '私',
    // Public/Official
    '公',
    // Flavor
    '味',
    // Remaining/Last
    '台',
    // China
    '漢',
    // Blade
    '刃',
    // Frequency/Recurrence
    '毎'
  ]
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
