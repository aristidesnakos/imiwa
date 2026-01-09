/**
 * Kanji SEO Optimization Algorithm
 * 
 * Provides intelligent meta tag optimization strategies for kanji pages
 * based on JLPT level, character type, and conceptual categories.
 * 
 * This replaces manual curation with automated, scalable optimization
 * that covers all 1000+ kanji pages in the database.
 */

export interface KanjiData {
  kanji: string;
  meaning: string;
  onyomi: string;
  kunyomi: string;
  level: string;
}

export interface OptimizedMetadata {
  title: string;
  description: string;
}

export type OptimizationStrategy = 'stroke-order-focused' | 'meaning-focused' | 'standard';

// Fundamental kanji categories (moved outside function for performance)
const FUNDAMENTAL_KANJI_CATEGORIES = [
  // Numbers (most common beginner searches)
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  
  // Basic actions/states (high search volume)
  '止', '出', '入', '見', '行', '来', '食', '飲', '読', '書', '話', '聞',
  
  // Time/duration (common in daily life)
  '日', '月', '年', '時', '分', '前', '後', '今', '昨', '明',
  
  // Family/people (high emotional connection)
  '人', '男', '女', '子', '父', '母', '兄', '弟', '姉', '妹', '家',
  
  // Nature/basic concepts (concrete, visual)
  '水', '火', '木', '土', '金', '大', '小', '長', '短', '高', '低',
  
  // Body parts (universal concepts)
  '手', '足', '目', '口', '耳', '頭', '心',
  
  // Common places/directions (spatial concepts)
  '中', '上', '下', '左', '右', '東', '西', '南', '北'
] as const;

/**
 * Main function to generate optimized metadata for kanji pages
 */
export function getOptimizedKanjiMetadata(kanjiData: KanjiData): OptimizedMetadata {
  // Input validation
  if (!kanjiData?.kanji?.trim()) {
    throw new Error('Kanji character is required');
  }

  const { kanji, meaning = '', onyomi = '', kunyomi = '', level = 'N5' } = kanjiData;
  const strategy = determineOptimizationStrategy(kanji, level);
  
  switch (strategy) {
    case 'stroke-order-focused':
      return {
        title: `How to Write ${kanji} - Stroke Order & Meaning | JLPT ${level} Kanji`,
        description: `✓ Learn ${kanji} stroke order step-by-step ✓ Meaning: "${meaning}" ✓ Readings: ${onyomi}, ${kunyomi} ✓ Interactive animation for JLPT ${level}`
      };
      
    case 'meaning-focused':
      return {
        title: `${kanji} Kanji: "${meaning}" | Stroke Order & Readings | JLPT ${level}`,
        description: `Master ${kanji} kanji meaning "${meaning}" with stroke order animation. Learn readings: ${onyomi} (onyomi), ${kunyomi} (kunyomi). JLPT ${level} level.`
      };
      
    case 'standard':
    default:
      return {
        title: `${kanji} Kanji: "${meaning}" | Stroke Order & Readings | JLPT ${level}`,
        description: `Master ${kanji} kanji meaning "${meaning}" with stroke order animation. Learn readings: ${onyomi} (onyomi). JLPT ${level} level.`
      };
  }
}

/**
 * Determines the optimal SEO strategy based on kanji characteristics
 */
export function determineOptimizationStrategy(kanji: string, level: string): OptimizationStrategy {
  // Stroke-order focused: Fundamental kanji that beginners search for with "how to write"
  if (isFundamentalKanji(kanji, level)) {
    return 'stroke-order-focused';
  }
  
  // Meaning-focused: Intermediate kanji with complex meanings
  if (isIntermediateKanji(level)) {
    return 'meaning-focused';
  }
  
  // Standard: Advanced kanji and compounds
  return 'standard';
}

/**
 * Identifies fundamental kanji that beginners commonly search for
 */
function isFundamentalKanji(kanji: string, level: string): boolean {
  return (
    isBeginnerLevel(level) && 
    isSingleCharacter(kanji) && 
    isCommonSingleCharacterConcept(kanji)
  );
}

/**
 * Checks if kanji is at beginner JLPT level
 */
function isBeginnerLevel(level: string): boolean {
  return ['N5', 'N4'].includes(level);
}

/**
 * Checks if kanji is at intermediate JLPT level
 */
function isIntermediateKanji(level: string): boolean {
  return ['N3', 'N2'].includes(level);
}


/**
 * Checks if input is a single character (not compound)
 */
function isSingleCharacter(kanji: string): boolean {
  return kanji.length === 1;
}

/**
 * Identifies common single-character concepts that beginners search for
 */
function isCommonSingleCharacterConcept(kanji: string): boolean {
  return FUNDAMENTAL_KANJI_CATEGORIES.includes(kanji as any);
}

/**
 * Utility function to get strategy for testing/debugging
 */
export function getStrategyForKanji(kanji: string, level: string): OptimizationStrategy {
  return determineOptimizationStrategy(kanji, level);
}

/**
 * Utility function to check if kanji is in fundamental category
 */
export function isFundamentalForTesting(kanji: string, level: string): boolean {
  return isFundamentalKanji(kanji, level);
}