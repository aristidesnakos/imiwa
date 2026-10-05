/**
 * lib/jlpt/also-valid.ts
 *
 * Words in the JLPT-format quiz that have a second genuine reading. A distractor equal to
 * one of these would be a second right answer, so the item builder excludes them and
 * scripts/validate-quiz.ts asserts none slipped through. When in doubt, list it.
 */

export const ALSO_VALID: Record<string, string[]> = {
  今日: ['こんにち'],
  日本: ['にっぽん'],
  日本人: ['にっぽんじん'],
  日本語: ['にっぽんご'],
  十分: ['じっぷん', 'じゅっぷん'],
  人間: ['じんかん'],
  三十分: ['さんじっぷん'],
  今年: ['こんねん'],
};

