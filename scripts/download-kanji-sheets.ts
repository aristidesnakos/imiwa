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
  ],
  n3: [
    // Politics/Government/Administration
    '政', '議', '民', '官', '法', '制', '治', '権',
    // People/Relationships/Family
    '身', '夫', '妻', '婦', '娘', '婚', '彼', '君', '祖', '息', '王',
    // Time/Periods/Age
    '期', '際', '昨', '歳', '末', '昔',
    // Geographic/Location/Spatial
    '都', '市', '港', '阪', '内', '所', '側', '面', '向', '横', '路', '途',
    // Buildings/Places/Housing
    '宅', '席', '座', '庭', '園', '宿',
    // Organization/Structure
    '部', '局', '科',
    // Actions/Motion Verbs
    '連', '回', '進', '引', '押', '投', '打', '追', '逃', '遊', '登', '降', '乗', '渡', '越', '退', '倒', '落', '浮', '散', '飛', '舞', '泳', '探', '迷', '居', '働', '勤',
    // Intellectual/Mental Verbs
    '想', '識', '覚', '忘', '迎',
    // Communication/Expression Verbs
    '談', '論', '説', '告', '示', '報', '記', '呼', '招', '声', '笑',
    // Decision/Selection/Judgment Verbs
    '選', '決', '定', '判', '認', '察', '確',
    // Change/Transformation Verbs
    '化', '変', '成', '更', '曲', '折',
    // Transaction/Interaction Verbs
    '取', '与', '受', '付', '返', '払', '貸', '借', '交',
    // Production/Creation Verbs
    '産', '企',
    // Destruction/Negative Actions
    '戦', '争', '殺', '破', '犯', '罪', '害',
    // Existence/Continuation/Completion Verbs
    '在', '存', '残', '続', '済', '完', '果', '達', '到',
    // Separation/Division/Removal Verbs
    '断', '割', '除', '刻', '抜',
    // Assistance/Support Verbs
    '助', '支', '努', '頼',
    // Opposition/Resistance
    '対', '反', '勝', '負', '敗',
    // Joining/Combining
    '合', '組', '参', '加', '寄', '込',
    // Work/Tasks/Duties
    '務', '職', '役', '任', '労', '係',
    // Business/Commerce/Trade
    '商', '利', '財', '資', '費', '収', '富', '値', '給', '債',
    // Quantity/Number/Measurement
    '数', '増', '積', '程', '幾',
    // Quality/State/Condition
    '全', '実', '現', '原', '初', '最', '当', '直', '正', '良', '優', '偉', '美', '難', '易', '単', '常', '特', '適', '雑',
    // Abstraction/Characteristics
    '性', '的', '形', '状', '様',
    // Necessity/Importance
    '要', '必',
    // Relation/Connection
    '関', '相', '共', '互', '兼',
    // Degree/Extent/Limit
    '過', '限', '深', '太', '満', '余',
    // Investigation/Research/Study
    '調', '観',
    // Representation/Display
    '表', '演', '供',
    // Physical Objects/Materials
    '石', '米', '馬', '船', '箱', '機',
    // Nature/Natural Phenomena
    '景', '光', '陽', '雪', '候', '煙', '流', '球',
    // Plants
    '葉', '草',
    // Body Parts
    '首', '頭', '顔', '背', '腹', '歯', '髪', '耳',
    // Position/Rank/Status
    '位', '格', '段',
    // Tools/Equipment/Facilities
    '具', '術', '備', '規', '便',
    // Emotions/Feelings
    '感', '情', '愛', '喜', '幸', '望', '欲', '願', '好', '悲', '怒', '恐', '怖', '恥', '苦', '困', '痛',
    // Mental States/Attitudes
    '疑', '信', '賛', '夢',
    // Ability/Capacity/Skill
    '能', '才', '芸', '練',
    // Acquisition/Loss
    '得', '失', '求',
    // Understanding/Solving
    '解',
    // Specification/Indication
    '指', '点',
    // Arrangement/Organization
    '置', '構', '列', '束',
    // Categories/Types/Classification
    '種', '類', '他', '等', '彙',
    // Similarity/Difference
    '似', '違', '差', '両',
    // Formality/Ceremony/Style
    '式', '礼',
    // Speed/Timing
    '速', '遅', '急',
    // Life/Living/Death
    '活', '命', '暮', '亡',
    // Physical States/Actions
    '寝', '眠', '抱', '掛', '閉',
    // Care/Maintenance/Protection
    '育', '守', '配', '警', '捕',
    // Consumption/Use
    '消', '吸', '吹',
    // Temperature/Physical Sensations
    '熱', '冷', '寒', '暗', '晴',
    // Peace/Harmony/Blessing
    '和', '平', '福', '静',
    // Danger/Risk/Safety
    '危', '険', '冒',
    // Truth/Reality/Accuracy
    '真',
    // Medicine/Health/Body Care
    '薬', '疲', '洗',
    // Teaching/Guidance/Expertise
    '師',
    // Action/Conduct/Behavior
    '伝', '訪', '留', '戻', '徒',
    // Permission/Approval/Refusal
    '許', '否', '辞', '責',
    // Advancement/Progress/Achievement
    '精', '促',
    // Negation/Absence/Emptiness
    '非', '未', '欠',
    // Extreme/Absolute
    '絶', '突',
    // People/Personnel/Customers
    '客', '誰', '皆',
    // Cause/Reason/Origin
    '因', '由',
    // Processing/Handling/Management
    '処',
    // Time/Sequence
    '次', '予',
    // Age/Youth/Elderly
    '若', '老',
    // Economic/Financial
    '貧',
    // Daily Items/Objects
    '靴', '杯', '窓', '酒',
    // Miscellaneous/Example/Pattern
    '例', '然', '容',
    // Number/Counting
    '番', '号',
    // Matters/Affairs/Cases
    '件',
    // Receiving/Obtaining
    '頂',
    // Animals
    '猫',
    // Artifacts/Ceramics
    '陶',
    // Sounds/Noises
    '鳴',
    // Stealing/Theft
    '盗',
    // Honorifics/Respect
    '御', '申',
    // Arts/Drawing/Pictures
    '絵',
    // Coincidence/Chance
    '偶',
    // Spirits/Deities
    '神',
    // Experience/Habit
    '慣',
    // Mistakes/Errors
    '誤',
    // Night/Evening
    '晩',
    // Busy/Occupied
    '忙',
    // Beginning/String/Connection
    '緒'
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
