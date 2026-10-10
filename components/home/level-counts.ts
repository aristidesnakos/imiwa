import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import { JLPT_LEVELS, type JlptLevel } from '@/lib/levels';

// Server components only: read at build time, so only the numbers reach the page.
export const LEVEL_COUNTS: Record<JlptLevel, number> = {
  N5: N5_KANJI.length,
  N4: N4_KANJI.length,
  N3: N3_KANJI.length,
  N2: N2_KANJI.length,
  N1: N1_KANJI.length,
};

export const ALL_KANJI_COUNT = JLPT_LEVELS.reduce((sum, level) => sum + LEVEL_COUNTS[level], 0);
