/**
 * scripts/sentences/coverage.ts
 *
 * PHASE 0 of docs/prd/example-sentences-system.md: how many of our 1,896 kanji
 * does Tatoeba actually cover?
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts --kanji 暑
 *
 * Read-only. Produces a report; ships nothing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS REPORTS A FUNNEL AND NOT A SINGLE NUMBER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The PRD specifies one filter and asks for the count that survives it. That
 * would have been the wrong deliverable, because measuring the corpus showed
 * the PRD's proposed filter is far more expensive than it looks:
 *
 *   - 40.2% of Japanese sentences are ORPHANED (no owner). The PRD's step 1
 *     prefers "JP sentence owned by a self-declared native speaker", which
 *     discards all of them.
 *   - But 99.65% of those orphans are unadopted `Tanaka Corpus` imports — a
 *     curated textbook-derived corpus, not abandoned junk. "Orphaned" here
 *     means "nobody clicked adopt on a bulk import from 2006", not "low
 *     quality".
 *   - Only 660 users declare native (skill=5) Japanese at all, against 30,790
 *     for English. So "owned by a native speaker" is a filter over a small
 *     pool, and it is self-declared, per-user, and unverified.
 *
 * A single-threshold answer would therefore have hidden the actual decision.
 * So each tier below is applied cumulatively and reported separately: the
 * output is a funnel showing what each quality filter COSTS in coverage, so
 * the strictness can be chosen against real numbers rather than assumed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LEVEL FILTER USES OUR OWN DATA, DELIBERATELY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The PRD's step 3 says to score candidates against "a JLPT vocabulary/grammar
 * frequency list". No such list can be licensed. The JLPT has published no
 * vocabulary lists since the 2010 redesign, and every list in circulation
 * (Jisho's tags, jlpt-vocab-api, the Yomitan and Kaggle sets) traces to one
 * personal reconstruction — tanos.co.uk — which reserves copyright and grants
 * no licence. The MIT/CC-BY badges downstream are void as to the data.
 *
 * Rather than reach into that grey zone — which our own provenance rule
 * forbids — complexity is proxied from `lib/constants/*-kanji.ts`: a sentence
 * is as hard as the hardest kanji in it. We already own that mapping for 1,896
 * characters, it needs no third-party data, and it is self-consistent with how
 * the site levels everything else.
 *
 * What this proxy does NOT capture: grammar difficulty, and vocabulary
 * difficulty independent of kanji (a sentence of only N5 kanji can still use
 * N2 grammar). It is a floor, not a full level model. The honest description
 * is "contains no kanji harder than the target", which is a real and useful
 * filter, not a JLPT level assignment.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  KANJI_INVENTORY,
  KANJI_LEVEL,
  LEVELS,
  assertInventory,
  countsByLevel,
  type Level,
} from './kanji-inventory';
import {
  loadJapaneseSentences,
  loadJpnEngLinks,
  loadEnglishSentences,
  loadJapaneseTags,
  loadJapaneseAudioIds,
  loadUserSkills,
  type Sentence,
} from './corpus';

/** Difficulty rank; higher is harder. Kanji outside our dictionary rank hardest. */
export const LEVEL_RANK: Record<Level, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
export const OUT_OF_DICTIONARY_RANK = 6;
/** rank → level, for naming a sentence's own complexity. */
export const LEVEL_BY_RANK: Record<number, Level> = { 1: 'N5', 2: 'N4', 3: 'N3', 4: 'N2', 5: 'N1' };

/**
 * Sentence length band, in characters.
 *
 * Lower bound: a 2-character sentence teaches nothing about usage in context,
 * which is the entire point of the feature. Upper bound: the corpus contains a
 * 302-character "sentence" (the Obama victory speech as one row), and anything
 * near that is unreadable as a kanji example. Both bounds are judgement calls
 * and are stated here so they can be argued with rather than discovered.
 */
export const MIN_CHARS = 8;
export const MAX_CHARS = 60;

export const CJK = /[一-鿿㐀-䶿]/u;

export interface Candidate {
  id: number;
  text: string;
  english: string | null;
  owner: string | null;
  isTanaka: boolean;
  hasAudio: boolean;
  jpnNative: boolean;
  engNative: boolean;
  /** Hardest rank among kanji we DO have, using our own dictionary. */
  hardestKnownRank: number;
  /** Kanji in the sentence that are absent from our dictionary entirely. */
  unknown: string[];
  length: number;
}

/**
 * Cumulative tiers. Each adds one constraint to the one before it.
 *
 * `levelRelaxed` and `levelStrict` separate two effects that a single filter
 * conflated, badly. The first version ranked out-of-dictionary kanji as harder
 * than N1, which meant a sentence was rejected for containing ANY character we
 * happen not to teach. That took 紹 (N2) from 167 clean candidates to zero,
 * because its commonest compound is 紹介 and 介 is not in our dictionary — even
 * though 介 is jōyō (grade 8). 刀 (N5) went to zero the same way.
 *
 * So the two constraints are now measured apart:
 *   - relaxed → tolerates unknown kanji, allows one level of headroom. This is
 *     the realistic shipping tier: a learner reading an example sentence is not
 *     harmed by one unfamiliar character, and furigana covers it.
 *   - strict  → every kanji is in our dictionary AND at or below the target
 *     level. This is the "fully self-contained within what we teach" tier.
 *
 * The gap between them is a direct measure of our dictionary's coverage holes,
 * which is why the report prints the most frequent missing kanji.
 */
export const TIERS = [
  { key: 'contains', label: 'contains the kanji' },
  { key: 'translated', label: '+ has an English translation' },
  { key: 'length', label: `+ length ${MIN_CHARS}–${MAX_CHARS} chars` },
  { key: 'levelRelaxed', label: '+ ≤1 level harder (unknown kanji ok)' },
  { key: 'levelStrict', label: '+ all kanji known and ≤ target' },
  { key: 'quality', label: '+ owned, non-orphan' },
  { key: 'native', label: '+ JP owner declares native' },
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

/**
 * Exported so `select.ts` applies the SAME filter this analysis measured.
 * If the shipping filter and the coverage funnel drift apart, every number in
 * `example-sentences-phase0-findings.md` silently stops describing what we
 * actually ship — so there is exactly one implementation and it lives here.
 */
export function passes(c: Candidate, targetRank: number, tier: TierKey): boolean {
  // Cumulative: each case falls through to the ones above it.
  if (tier === 'contains') return true;
  if (c.english === null) return false;
  if (tier === 'translated') return true;
  if (c.length < MIN_CHARS || c.length > MAX_CHARS) return false;
  if (tier === 'length') return true;
  if (c.hardestKnownRank > targetRank + 1) return false;
  if (tier === 'levelRelaxed') return true;
  if (c.hardestKnownRank > targetRank || c.unknown.length > 0) return false;
  if (tier === 'levelStrict') return true;
  if (c.owner === null) return false;
  if (tier === 'quality') return true;
  return c.jpnNative;
}

async function main() {
  assertInventory();
  const only = process.argv.includes('--kanji')
    ? process.argv[process.argv.indexOf('--kanji') + 1]
    : null;

  console.log('Phase 0 — Tatoeba coverage analysis\n');
  console.log('loading corpus …');

  const jpn = await loadJapaneseSentences();
  const links = await loadJpnEngLinks();
  const tags = await loadJapaneseTags();
  const audio = await loadJapaneseAudioIds();
  const skills = loadUserSkills();

  const neededEng = new Set<number>();
  for (const ids of links.values()) for (const id of ids) neededEng.add(id);
  const eng = await loadEnglishSentences(neededEng);

  console.log(
    `  ${jpn.size.toLocaleString()} jpn · ${eng.size.toLocaleString()} linked eng · ` +
      `${skills.size.toLocaleString()} users with a declared skill\n`
  );

  // ── Pre-compute per-sentence facts once ──────────────────────────────────
  // Every sentence is examined against every kanji it contains, so anything
  // derivable per-sentence must be computed here rather than inside that loop.
  const targets = only
    ? KANJI_INVENTORY.filter((e) => e.kanji === only)
    : KANJI_INVENTORY;
  if (only && targets.length === 0) {
    throw new Error(`${only} is not in the kanji dictionary.`);
  }

  const byKanji = new Map<string, Candidate[]>();
  for (const e of targets) byKanji.set(e.kanji, []);

  /** Kanji absent from our dictionary → how many sentences use them. */
  const missingKanjiFreq = new Map<string, number>();

  for (const s of jpn.values()) {
    const chars = [...s.text];
    // Distinct dictionary kanji in this sentence, the hardest known rank, and
    // any character we do not teach at all.
    let hardestKnown = 0;
    const hits = new Set<string>();
    const unknown = new Set<string>();
    for (const ch of chars) {
      if (!CJK.test(ch)) continue;
      const lvl = KANJI_LEVEL.get(ch);
      if (lvl) {
        const rank = LEVEL_RANK[lvl];
        if (rank > hardestKnown) hardestKnown = rank;
        if (byKanji.has(ch)) hits.add(ch);
      } else {
        unknown.add(ch);
      }
    }
    for (const u of unknown) missingKanjiFreq.set(u, (missingKanjiFreq.get(u) ?? 0) + 1);
    if (hits.size === 0) continue;

    const engIds = links.get(s.id);
    const englishText = engIds
      ? (engIds.map((id) => eng.get(id)?.text).find((t) => t !== undefined) ?? null)
      : null;
    const engOwner = engIds
      ? (engIds.map((id) => eng.get(id)?.owner).find((o) => o != null) ?? null)
      : null;

    const c: Candidate = {
      id: s.id,
      text: s.text,
      english: englishText,
      owner: s.owner,
      isTanaka: (tags.get(s.id) ?? []).includes('Tanaka Corpus'),
      hasAudio: audio.has(s.id),
      jpnNative: s.owner !== null && skills.get(s.owner)?.jpn === 5,
      engNative: engOwner !== null && skills.get(engOwner)?.eng === 5,
      hardestKnownRank: hardestKnown,
      unknown: [...unknown],
      length: chars.length,
    };

    for (const k of hits) byKanji.get(k)!.push(c);
  }

  // ── Per-kanji tier counts ────────────────────────────────────────────────
  interface KanjiResult {
    kanji: string;
    level: Level;
    counts: Record<TierKey, number>;
  }
  const results: KanjiResult[] = [];
  for (const e of targets) {
    const cands = byKanji.get(e.kanji)!;
    const targetRank = LEVEL_RANK[e.level];
    const counts = {} as Record<TierKey, number>;
    for (const t of TIERS) {
      counts[t.key] = cands.filter((c) => passes(c, targetRank, t.key)).length;
    }
    results.push({ kanji: e.kanji, level: e.level, counts });
  }

  if (only) {
    const r = results[0];
    console.log(`${r.kanji} (${r.level})\n`);
    for (const t of TIERS) console.log(`  ${t.label.padEnd(34)} ${r.counts[t.key]}`);
    const sample = byKanji
      .get(only)!
      .filter((c) => passes(c, LEVEL_RANK[r.level], 'levelRelaxed'))
      .slice(0, 5);
    console.log('\n  sample candidates at the relaxed level tier:');
    for (const c of sample) {
      console.log(`    ${c.text}`);
      console.log(`      ${c.english}`);
      console.log(
        `      #${c.id} owner=${c.owner ?? '(orphan)'} tanaka=${c.isTanaka} ` +
          `audio=${c.hasAudio} jpNative=${c.jpnNative}` +
          (c.unknown.length ? ` notInDictionary=${c.unknown.join('')}` : '')
      );
    }
    return;
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const totals = countsByLevel();
  const THRESHOLDS = [1, 3, 5];
  const lines: string[] = [];
  const say = (s = '') => {
    console.log(s);
    lines.push(s);
  };

  say('## Coverage funnel — kanji with at least N usable candidates');
  say();
  for (const threshold of THRESHOLDS) {
    say(`### ≥${threshold} candidate${threshold > 1 ? 's' : ''}`);
    say();
    say(`| filter | ${LEVELS.map((l) => `${l} (${totals[l]})`).join(' | ')} | total |`);
    say(`|---|${LEVELS.map(() => '---:').join('|')}|---:|`);
    for (const t of TIERS) {
      const cells = LEVELS.map((l) => {
        const inLevel = results.filter((r) => r.level === l);
        const ok = inLevel.filter((r) => r.counts[t.key] >= threshold).length;
        const pct = ((ok / inLevel.length) * 100).toFixed(0);
        return `${ok} (${pct}%)`;
      });
      const allOk = results.filter((r) => r.counts[t.key] >= threshold).length;
      const allPct = ((allOk / results.length) * 100).toFixed(0);
      say(`| ${t.label} | ${cells.join(' | ')} | ${allOk} (${allPct}%) |`);
    }
    say();
  }

  // Distribution at the tier we expect to actually ship on.
  const SHIP_TIER: TierKey = 'levelRelaxed';
  say(`## Candidate-count distribution at "${TIERS.find((t) => t.key === SHIP_TIER)!.label}"`);
  say();
  say('| level | 0 | 1–2 | 3–4 | 5–9 | 10+ | median |');
  say('|---|---:|---:|---:|---:|---:|---:|');
  for (const l of LEVELS) {
    const inLevel = results.filter((r) => r.level === l).map((r) => r.counts[SHIP_TIER]);
    const bucket = (lo: number, hi: number) =>
      inLevel.filter((n) => n >= lo && n <= hi).length;
    const sorted = [...inLevel].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    say(
      `| ${l} | ${bucket(0, 0)} | ${bucket(1, 2)} | ${bucket(3, 4)} | ` +
        `${bucket(5, 9)} | ${inLevel.filter((n) => n >= 10).length} | ${median} |`
    );
  }
  say();

  const zero = results.filter((r) => r.counts[SHIP_TIER] === 0);
  say(`## ${zero.length} kanji with zero candidates at that tier`);
  say();
  for (const l of LEVELS) {
    const inLevel = zero.filter((r) => r.level === l);
    if (inLevel.length === 0) continue;
    const shown = inLevel.slice(0, 40).map((r) => r.kanji).join(' ');
    say(
      `- **${l}** — ${inLevel.length}: ${shown}` +
        (inLevel.length > 40 ? ` … +${inLevel.length - 40} more` : '')
    );
  }
  say();

  // ── Dictionary gaps ──────────────────────────────────────────────────────
  // The distance between the relaxed and strict tiers is mostly this: kanji
  // that appear in ordinary Japanese but that the site does not teach. That is
  // a content gap in the product, independent of this feature, and the list is
  // directly actionable — it is ranked by how many real sentences we cannot
  // fully cover without it.
  const gaps = [...missingKanjiFreq.entries()].sort((a, b) => b[1] - a[1]);
  say(`## Dictionary gaps — kanji in the corpus that we do not teach`);
  say();
  say(
    `${gaps.length.toLocaleString()} distinct kanji appear in Japanese sentences but are ` +
      `absent from all five level files. The 40 most frequent, with the number of ` +
      `corpus sentences using each:`
  );
  say();
  say('| kanji | sentences | kanji | sentences | kanji | sentences | kanji | sentences |');
  say('|---|---:|---|---:|---|---:|---|---:|');
  for (let i = 0; i < 40; i += 4) {
    const row = gaps.slice(i, i + 4).map(([k, n]) => `${k} | ${n.toLocaleString()}`);
    if (row.length === 0) break;
    while (row.length < 4) row.push(' | ');
    say(`| ${row.join(' | ')} |`);
  }
  say();

  // ── Dictionary composition ───────────────────────────────────────────────
  // Corpus frequency is an independent, licence-free opinion on whether a
  // character is worth teaching. Comparing it against what we actually teach
  // turns "the dictionary has gaps" into a measured claim.
  const taughtFreq = results.map((r) => ({ ...r, freq: r.counts.contains }));
  const rare = taughtFreq.filter((r) => r.freq < 10);
  const commonMissing = gaps.filter(([, n]) => n >= 100);
  say('## Dictionary composition');
  say();
  say(
    `- **${rare.length}** of the ${results.length.toLocaleString()} kanji we teach appear in ` +
      `fewer than 10 corpus sentences (${rare.filter((r) => r.freq === 0).length} appear in none).`
  );
  say(
    `- **${commonMissing.length}** kanji we do NOT teach appear in 100+ corpus sentences.`
  );
  say(
    `- The most-used kanji we omit (${gaps[0][0]}, ${gaps[0][1].toLocaleString()} sentences) is more ` +
      `common than **${taughtFreq.filter((r) => r.freq < gaps[0][1]).length.toLocaleString()}** ` +
      `of the ${results.length.toLocaleString()} we do teach.`
  );
  say();
  say(`Rarest kanji currently in the dictionary, by corpus usage:`);
  say();
  for (const l of LEVELS) {
    const inLevel = taughtFreq.filter((r) => r.level === l).sort((a, b) => a.freq - b.freq);
    if (inLevel.length === 0) continue;
    say(
      `- **${l}** — ${inLevel.filter((r) => r.freq === 0).length} unused; rarest: ` +
        inLevel.slice(0, 12).map((r) => `${r.kanji}(${r.freq})`).join(' ')
    );
  }
  say();

  const outPath = resolve(__dirname, '../../docs/prd/example-sentences-phase0-coverage.md');
  writeFileSync(
    outPath,
    `# Phase 0 — Tatoeba coverage analysis\n\n` +
      `Generated by \`scripts/sentences/coverage.ts\` against the 2026-07-25 Tatoeba dumps.\n` +
      `Corpus: ${jpn.size.toLocaleString()} Japanese sentences, ${eng.size.toLocaleString()} linked English.\n` +
      `Dictionary: ${KANJI_INVENTORY.length.toLocaleString()} kanji.\n\n` +
      `Filters are **cumulative** — each row adds one constraint to the row above.\n\n` +
      lines.join('\n') +
      '\n',
    'utf8'
  );
  console.log(`\nwrote ${outPath}`);
}

// Guarded so `select.ts` can import the filter above without triggering a full
// coverage run as an import side effect. Matches corpus.ts and
// kanji-inventory.ts, which already use this pattern.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
