/**
 * scripts/sentences/kanji-inventory.ts
 *
 * The canonical list of kanji the example-sentence pipeline targets, derived
 * from the same constants the site actually renders.
 *
 * Run directly to print the inventory summary:
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/kanji-inventory.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS DERIVED AND NOT HAND-MAINTAINED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * docs/prd/example-sentences-system.md quotes per-level counts (N5 82, N4 171,
 * N3 380, N2 259, N1 1,004 = 1,896). Those numbers were correct when written,
 * but the kanji dictionary grows one kanji at a time — recent commits add a
 * single character each. A hand-copied count in a script goes stale silently
 * and every downstream coverage percentage is then computed against the wrong
 * denominator.
 *
 * So this module imports the real constants and recomputes. `assertInventory`
 * exists to catch the opposite failure: if an import silently resolves to an
 * empty array, a coverage run would cheerfully report "0 kanji analysed, 100%
 * coverage" rather than failing. It refuses to proceed on an implausible count.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY NON_JLPT_KANJI IS EXCLUDED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `lib/constants/non-jlpt-kanji.ts` defines NON_JLPT_KANJI (102 entries) but
 * app/kanji/[character]/page.tsx does NOT import it — only the five JLPT sets
 * are spread into its kanji list. Those characters therefore have no detail
 * page, so there is nowhere to render a sentence for them. Including them here
 * would inflate the denominator with pages that do not exist.
 *
 * This mirrors the PRD's "Not in scope for any phase" note. If those kanji are
 * ever wired up, add the import here and the coverage report follows
 * automatically.
 */

import { N5_KANJI } from '../../lib/constants/n5-kanji';
import { N4_KANJI } from '../../lib/constants/n4-kanji';
import { N3_KANJI } from '../../lib/constants/n3-kanji';
import { N2_KANJI } from '../../lib/constants/n2-kanji';
import { N1_KANJI } from '../../lib/constants/n1-kanji';

/** JLPT levels, ordered easiest-first — this is also the phase rollout order. */
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type Level = (typeof LEVELS)[number];

export interface InventoryEntry {
  kanji: string;
  level: Level;
  meaning: string;
  onyomi: string;
  kunyomi: string;
}

const SETS: Record<Level, { kanji: string; meaning: string; onyomi: string; kunyomi: string }[]> = {
  N5: N5_KANJI,
  N4: N4_KANJI,
  N3: N3_KANJI,
  N2: N2_KANJI,
  N1: N1_KANJI,
};

/**
 * Build the inventory, assigning each kanji to the FIRST (easiest) level it
 * appears in.
 *
 * The dedupe is not defensive padding — a character appearing in two level
 * files would otherwise be analysed twice and counted twice, quietly breaking
 * every "% of level covered" figure. Reported by `duplicates` rather than
 * thrown on, because a duplicate is a dictionary-data problem to fix upstream,
 * not a reason to block a read-only coverage analysis.
 */
function build(): { entries: InventoryEntry[]; duplicates: { kanji: string; levels: Level[] }[] } {
  const seen = new Map<string, Level[]>();
  const entries: InventoryEntry[] = [];

  for (const level of LEVELS) {
    for (const k of SETS[level]) {
      const existing = seen.get(k.kanji);
      if (existing) {
        existing.push(level);
        continue;
      }
      seen.set(k.kanji, [level]);
      entries.push({
        kanji: k.kanji,
        level,
        meaning: k.meaning,
        onyomi: k.onyomi,
        kunyomi: k.kunyomi,
      });
    }
  }

  const duplicates = [...seen.entries()]
    .filter(([, levels]) => levels.length > 1)
    .map(([kanji, levels]) => ({ kanji, levels }));

  return { entries, duplicates };
}

const built = build();

export const KANJI_INVENTORY: InventoryEntry[] = built.entries;
export const DUPLICATE_KANJI = built.duplicates;

/** Fast membership/level lookup for the coverage pass. */
export const KANJI_LEVEL = new Map<string, Level>(
  KANJI_INVENTORY.map((e) => [e.kanji, e.level])
);

export function countsByLevel(): Record<Level, number> {
  const out = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
  for (const e of KANJI_INVENTORY) out[e.level]++;
  return out;
}

/**
 * Refuse to run a coverage analysis against an obviously broken inventory.
 *
 * The failure this guards against is a silent one: a bad import or a refactor
 * that empties a constants file yields an inventory of 0, and every coverage
 * ratio downstream becomes 0/0. The floor is deliberately loose (the dictionary
 * only grows) — this is a "something is structurally wrong" alarm, not a
 * regression gate on the kanji count.
 */
export function assertInventory(): void {
  const counts = countsByLevel();
  for (const level of LEVELS) {
    if (counts[level] === 0) {
      throw new Error(
        `Kanji inventory for ${level} is empty — lib/constants/${level.toLowerCase()}-kanji.ts ` +
          `failed to import or was emptied. Refusing to run a coverage analysis ` +
          `against a broken denominator.`
      );
    }
  }
  if (KANJI_INVENTORY.length < 1500) {
    throw new Error(
      `Kanji inventory is ${KANJI_INVENTORY.length}, well below the ~1,896 expected. ` +
        `Something is structurally wrong with the constants import.`
    );
  }
}

if (require.main === module) {
  assertInventory();
  const counts = countsByLevel();

  console.log('Kanji inventory — derived from lib/constants/*-kanji.ts\n');
  for (const level of LEVELS) {
    console.log(`  ${level}  ${String(counts[level]).padStart(5)}`);
  }
  console.log(`  ${'—'.repeat(9)}`);
  console.log(`  total ${String(KANJI_INVENTORY.length).padStart(5)}`);

  if (DUPLICATE_KANJI.length > 0) {
    console.log(
      `\n⚠ ${DUPLICATE_KANJI.length} kanji appear in more than one level file ` +
        `(counted once, at the easiest level):`
    );
    for (const d of DUPLICATE_KANJI.slice(0, 20)) {
      console.log(`    ${d.kanji}  ${d.levels.join(', ')}`);
    }
    if (DUPLICATE_KANJI.length > 20) {
      console.log(`    … and ${DUPLICATE_KANJI.length - 20} more`);
    }
  }

  // Sanity signal for the coverage pass: multi-character or non-kanji entries
  // would break the "does this character occur in this sentence" test.
  const malformed = KANJI_INVENTORY.filter((e) => [...e.kanji].length !== 1);
  if (malformed.length > 0) {
    console.log(`\n⚠ ${malformed.length} entries are not a single character:`);
    for (const m of malformed.slice(0, 20)) console.log(`    "${m.kanji}" (${m.level})`);
  }
}
