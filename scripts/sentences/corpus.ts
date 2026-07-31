/**
 * scripts/sentences/corpus.ts
 *
 * Loaders for the Tatoeba exports, written against the ACTUAL file formats as
 * verified on the 2026-07-25 dumps — not against the downloads page's
 * description of them, which is incomplete and in two places wrong.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EIGHT THINGS A NAIVE PARSER GETS WRONG
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each of these was found by inspecting real rows. They are encoded as code
 * below, but written down here because the next person will otherwise
 * re-discover them the hard way:
 *
 *  1. NULL is the literal two-character string `\N`, not an empty field. An
 *     empty string and `\N` mean different things — see #2.
 *  2. `user_languages.csv` skill level uses `0`–`5` AND `\N`. `0` is an
 *     explicit "just started"; `\N` is "declared the language, never set a
 *     level". Conflating them turns 2,620 unknowns into beginners.
 *  3. `user_languages.csv` CONTAINS EMBEDDED NEWLINES in its free-text
 *     `details` column — 3,233 physical lines (3%) are continuations. A
 *     line-per-record reader silently produces 109,094 records instead of
 *     107,376 and corrupts the tail of every affected row. `details` never
 *     contains a tab, so the safe rule is: a record starts only on a line with
 *     exactly 3 tabs.
 *  4. The PER-LANGUAGE `sentences_with_audio` file REVERSES columns 0 and 1
 *     relative to the global export (`sentence_id, audio_id` vs
 *     `audio_id, sentence_id`). Undocumented. One parser cannot serve both.
 *  5. `sentences_CC0.csv` has 4 columns, not 6 — it drops `username`. Do not
 *     assume a shared schema with `sentences_detailed`.
 *  6. `jpn-eng_links.tsv` contains dangling references: 193 rows point at a
 *     sentence id absent from the sentence exports. The join must tolerate
 *     misses rather than assert.
 *  7. Date columns carry TWO null encodings, `\N` and `0000-00-00 00:00:00`,
 *     both of which throw a strict parser. `date_added` is absent for 59% of
 *     Japanese sentences, so it is useless as a recency signal — we do not
 *     read dates at all.
 *  8. Sentence text itself is unusually clean: across all 248,821 Japanese
 *     sentences there are zero embedded tabs, zero embedded newlines, zero
 *     C0 controls, and every string is already NFC-normalised. So the sentence
 *     files CAN be parsed line-by-line — only `user_languages` cannot.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DUMPS ARE FETCHED, NOT VENDORED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Per the PRD's open question #4, we fetch the corpus and commit only curated
 * output. The dumps total ~350MB decompressed and change weekly; committing
 * them would dwarf the repo and go stale. They land in `.tatoeba-cache/`
 * (gitignored) and are re-used across runs.
 *
 * Decompression shells out to `bunzip2`. Node has zlib for gzip but no bzip2,
 * and this repo's established pattern (scripts/validate-schema.ts,
 * scripts/check-indexation.ts) is zero new dependencies — so a shell-out beats
 * pulling in a decompressor.
 */

import { createReadStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** `\N` is Tatoeba's NULL. Everything else, including '', is a real value. */
const NULL_TOKEN = '\\N';
const nul = (v: string): string | null => (v === NULL_TOKEN ? null : v);

export const CACHE_DIR =
  process.env.TATOEBA_DIR ?? resolve(__dirname, '../../.tatoeba-cache');

/**
 * The exports we need, with their verified URLs.
 *
 * We deliberately use the PER-LANGUAGE exports where they exist: `jpn-eng_links`
 * is 1.4MB against the global `links.tar.bz2`'s ~100MB, and it is already
 * filtered to exactly the pairs we care about. The one global file we still
 * need is `user_languages`, which has no per-language equivalent carrying
 * other-language skills (we need each Japanese author's ENGLISH skill too, and
 * vice versa).
 */
const DUMPS = {
  jpnSentences: {
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_detailed.tsv.bz2',
    file: 'jpn_sentences_detailed.tsv',
  },
  engSentences: {
    url: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_detailed.tsv.bz2',
    file: 'eng_sentences_detailed.tsv',
  },
  links: {
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn-eng_links.tsv.bz2',
    file: 'jpn-eng_links.tsv',
  },
  jpnTags: {
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_tags.tsv.bz2',
    file: 'jpn_tags.tsv',
  },
  jpnAudio: {
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_with_audio.tsv.bz2',
    file: 'jpn_sentences_with_audio.tsv',
  },
  jpnCC0: {
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_CC0.tsv.bz2',
    file: 'jpn_sentences_CC0.tsv',
  },
  engCC0: {
    url: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_CC0.tsv.bz2',
    file: 'eng_sentences_CC0.tsv',
  },
  userLanguages: {
    url: 'https://downloads.tatoeba.org/exports/user_languages.tar.bz2',
    file: 'user_languages.csv',
    tar: true,
  },
} as const;

export type DumpName = keyof typeof DUMPS;

/** Absolute path to a decompressed dump, downloading it first if absent. */
export function dumpPath(name: DumpName): string {
  const spec = DUMPS[name];
  const target = join(CACHE_DIR, spec.file);
  if (existsSync(target)) return target;

  mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`  fetching ${spec.file} …`);

  const archive = join(CACHE_DIR, spec.url.split('/').pop()!);
  if (!existsSync(archive)) {
    // `-R` makes curl stamp the file with the server's Last-Modified, which is
    // the dump's real vintage. Without it the mtime is "when we happened to
    // download", and `corpusVintage` in the review queue — an attribution field
    // that must say which dump a sentence came from — becomes a guess. The
    // exports carry no version marker inside the file, so the HTTP header is
    // the only vintage signal there is.
    execFileSync('curl', ['-sSfLR', '--max-time', '900', '-o', `${archive}.part`, spec.url], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    // Rename only after a complete download, so an interrupted run does not
    // leave a truncated archive that looks cached and fails opaquely later.
    renameSync(`${archive}.part`, archive);
  }

  if ('tar' in spec && spec.tar) {
    execFileSync('tar', ['-xjf', archive, '-C', CACHE_DIR], { stdio: 'inherit' });
  } else {
    execFileSync('bash', ['-c', `bunzip2 -kc ${JSON.stringify(archive)} > ${JSON.stringify(target)}`], {
      stdio: 'inherit',
    });
  }

  if (!existsSync(target)) {
    throw new Error(`Extracted ${spec.url} but ${target} is still missing — layout changed?`);
  }
  return target;
}

/**
 * The vintage of a dump, as `YYYY-MM-DD`.
 *
 * This is an ATTRIBUTION field, not a nicety: `ReviewQueue.corpusVintage`
 * records which snapshot of Tatoeba a reviewer's judgements were made against,
 * and the exports carry no version marker inside the file. The only authority
 * is the server's `Last-Modified`, so we ask for it once with a HEAD request
 * and cache the answer next to the archive.
 *
 * Fallbacks, in order: cached answer → archive mtime (exact for anything
 * fetched with curl `-R`, otherwise the download date, which is an
 * over-estimate of freshness by up to a week) → today. Never throws; a queue
 * that cannot be generated because the network is down would be a worse
 * outcome than a vintage that is a few days pessimistic.
 */
export function corpusVintage(name: DumpName = 'jpnSentences'): string {
  const spec = DUMPS[name];
  const archive = join(CACHE_DIR, spec.url.split('/').pop()!);
  const stamp = `${archive}.vintage`;

  if (existsSync(stamp)) {
    const cached = readFileSync(stamp, 'utf8').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cached)) return cached;
  }

  try {
    const head = execFileSync('curl', ['-sSI', '--max-time', '30', spec.url], {
      encoding: 'utf8',
    });
    const match = head.match(/^last-modified:\s*(.+)$/im);
    if (match) {
      const iso = new Date(match[1].trim()).toISOString().slice(0, 10);
      if (existsSync(CACHE_DIR)) writeFileSync(stamp, `${iso}\n`, 'utf8');
      return iso;
    }
  } catch {
    /* offline, or curl unavailable — fall through to the mtime */
  }

  if (existsSync(archive)) return statSync(archive).mtime.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/** Stream a TSV line-by-line. Safe for every dump EXCEPT user_languages (gotcha #3). */
async function* tsvLines(path: string): AsyncGenerator<string[]> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line === '') continue;
    yield line.split('\t');
  }
}

export interface Sentence {
  id: number;
  text: string;
  /** null = orphaned. For Japanese this overwhelmingly means "unadopted Tanaka import". */
  owner: string | null;
}

/**
 * Load the Japanese sentences. ~249k rows, ~24MB — held entirely in memory,
 * which is the whole point: the coverage pass scans every sentence against
 * every one of 1,896 kanji, so streaming it repeatedly would be far slower.
 */
export async function loadJapaneseSentences(): Promise<Map<number, Sentence>> {
  const out = new Map<number, Sentence>();
  for await (const f of tsvLines(dumpPath('jpnSentences'))) {
    if (f.length < 4) continue;
    const id = Number(f[0]);
    if (!Number.isFinite(id)) continue;
    out.set(id, { id, text: f[2], owner: nul(f[3]) });
  }
  return out;
}

/**
 * jpnSentenceId → engSentenceId[].
 *
 * The file is one-directional (Japanese id always in column 0), verified: zero
 * rows carry an English id first. So no normalisation pass is needed.
 */
export async function loadJpnEngLinks(): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>();
  for await (const f of tsvLines(dumpPath('links'))) {
    if (f.length < 2) continue;
    const jp = Number(f[0]);
    const en = Number(f[1]);
    if (!Number.isFinite(jp) || !Number.isFinite(en)) continue;
    const bucket = out.get(jp);
    if (bucket) bucket.push(en);
    else out.set(jp, [en]);
  }
  return out;
}

/**
 * Load only the English sentences actually referenced by a Japanese link.
 *
 * The English export is 2.03M rows / 189MB, but only ~250k of those are
 * translations of a Japanese sentence. Filtering during the stream keeps peak
 * memory proportional to what we use rather than to the file.
 */
export async function loadEnglishSentences(needed: Set<number>): Promise<Map<number, Sentence>> {
  const out = new Map<number, Sentence>();
  for await (const f of tsvLines(dumpPath('engSentences'))) {
    if (f.length < 4) continue;
    const id = Number(f[0]);
    if (!needed.has(id)) continue;
    out.set(id, { id, text: f[2], owner: nul(f[3]) });
  }
  return out;
}

/** sentenceId → tags. Used for the `Tanaka Corpus` provenance signal. */
export async function loadJapaneseTags(): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  for await (const f of tsvLines(dumpPath('jpnTags'))) {
    if (f.length < 2) continue;
    const id = Number(f[0]);
    if (!Number.isFinite(id)) continue;
    const bucket = out.get(id);
    if (bucket) bucket.push(f[1]);
    else out.set(id, [f[1]]);
  }
  return out;
}

/**
 * Japanese sentence ids that have a recorded audio reading.
 *
 * NOTE gotcha #4: in the per-language file the SENTENCE id is column 0 and the
 * audio id is column 1 — the reverse of the global export. Verified against the
 * data: all 6,420 column-0 values resolve as Japanese sentence ids, while only
 * 932 column-1 values do.
 *
 * Audio carries its own per-recording licence (frequently NC or ND) which does
 * NOT follow the sentence licence. We use audio only as a quality signal here;
 * shipping the audio itself would be a separate licence review.
 */
export async function loadJapaneseAudioIds(): Promise<Set<number>> {
  const out = new Set<number>();
  for await (const f of tsvLines(dumpPath('jpnAudio'))) {
    if (f.length < 2) continue;
    const id = Number(f[0]);
    if (Number.isFinite(id)) out.add(id);
  }
  return out;
}

/** Self-declared skill, 0–5 where 5 is native. null = declared the language, never rated it. */
export type Skill = 0 | 1 | 2 | 3 | 4 | 5 | null;

export interface UserSkills {
  jpn: Skill;
  eng: Skill;
}

/**
 * username → declared Japanese and English skill.
 *
 * Parsed with the record-boundary rule from gotcha #3 rather than line-by-line:
 * a new record begins only on a line containing exactly three tabs. Continuation
 * lines are appended back onto the previous record's `details` field, which we
 * then discard — we only need lang/skill/username, but the field has to be
 * reassembled correctly or the record count and alignment both drift.
 */
export function loadUserSkills(): Map<string, UserSkills> {
  const raw = readFileSync(dumpPath('userLanguages'), 'utf8');
  const out = new Map<string, UserSkills>();

  let pending: string[] | null = null;
  const commit = (f: string[]) => {
    if (f.length < 3) return;
    const lang = f[0];
    if (lang !== 'jpn' && lang !== 'eng') return;
    const username = f[2];
    if (username === NULL_TOKEN || username === '') return;
    const rawSkill = nul(f[1]);
    const skill = (rawSkill === null ? null : (Number(rawSkill) as Skill));
    const entry = out.get(username) ?? { jpn: null, eng: null };
    entry[lang as 'jpn' | 'eng'] = skill;
    out.set(username, entry);
  };

  for (const line of raw.split('\n')) {
    // A record has exactly 4 fields => exactly 3 tabs. Anything else is the
    // continuation of the previous record's free-text `details`.
    const tabs = (line.match(/\t/g) ?? []).length;
    if (tabs === 3) {
      if (pending) commit(pending);
      pending = line.split('\t');
    } else if (pending) {
      pending[pending.length - 1] += `\n${line}`;
    }
  }
  if (pending) commit(pending);

  return out;
}

/**
 * Japanese sentence ids released under CC0 rather than the CC BY 2.0 FR default.
 *
 * There are exactly TWO in the entire Japanese corpus, and both are sentences
 * *about* Creative Commons licensing. So for Japanese, licence is effectively
 * constant. This loader exists anyway because the English side is different
 * (~41.5k CC0 sentences) and because the PRD's data model correctly treats the
 * two sides as separately licensed — a constant today is not a constant
 * forever, and hardcoding it would be the kind of assumption that rots.
 */
export function loadJapaneseCC0Ids(): Set<number> {
  const out = new Set<number>();
  for (const line of readFileSync(dumpPath('jpnCC0'), 'utf8').split('\n')) {
    if (!line) continue;
    const id = Number(line.split('\t')[0]);
    if (Number.isFinite(id)) out.add(id);
  }
  return out;
}

/**
 * English sentence ids released under CC0.
 *
 * The mirror of `loadJapaneseCC0Ids`, and the reason that function's comment
 * insists licence is per-side: on the English side CC0 is not a rounding error
 * — roughly 41.5k sentences — and a CC0 English translation of a CC BY 2.0 FR
 * Japanese sentence is the common case of the mixed pair the data model exists
 * to represent. Labelling those CC BY would credit an author who explicitly
 * waived the requirement, which is inaccurate in exactly the direction our
 * attribution work is meant to prevent.
 *
 * Only the ids we actually reference are worth resolving, but the file is
 * 1.3MB compressed, so it is read whole rather than filtered during the stream.
 */
export function loadEnglishCC0Ids(): Set<number> {
  const out = new Set<number>();
  for (const line of readFileSync(dumpPath('engCC0'), 'utf8').split('\n')) {
    if (!line) continue;
    const id = Number(line.split('\t')[0]);
    if (Number.isFinite(id)) out.add(id);
  }
  return out;
}

export const DEFAULT_JPN_LICENSE = 'CC BY 2.0 FR';

/**
 * Self-check: re-derive the corpus statistics independently and assert them
 * against the values measured on the 2026-07-25 dumps.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/sentences/corpus.ts
 *
 * This is not ceremony. Every one of these numbers is a parser correctness
 * test in disguise — the orphan count only comes out right if `\N` handling is
 * correct (#1), the user-skill count only comes out right if the embedded-
 * newline rule is correct (#3), and the audio count only comes out right if the
 * per-language column swap is handled (#4). A silent parser bug here would
 * propagate into every coverage figure downstream and look like real data.
 *
 * Counts are expected to DRIFT as Tatoeba grows — the dumps regenerate weekly.
 * So these are reported as deltas against the reference, and only a
 * structurally impossible result (a count collapsing toward zero, or the audio
 * columns reading as audio ids) is treated as a failure.
 */
if (require.main === module) {
  const REFERENCE = {
    date: '2026-07-25',
    jpnSentences: 248_821,
    jpnOrphans: 100_087,
    jpnWithEnglish: 232_735,
    jpnTanaka: 147_216,
    jpnAudio: 6_420,
    jpnCC0: 2,
  };

  (async () => {
    console.log(`Tatoeba corpus self-check (reference dumps: ${REFERENCE.date})`);
    console.log(`cache: ${CACHE_DIR}\n`);

    const jpn = await loadJapaneseSentences();
    const links = await loadJpnEngLinks();
    const tags = await loadJapaneseTags();
    const audio = await loadJapaneseAudioIds();
    const cc0 = loadJapaneseCC0Ids();
    const skills = loadUserSkills();

    const orphans = [...jpn.values()].filter((s) => s.owner === null).length;
    const withEnglish = [...links.keys()].filter((id) => jpn.has(id)).length;
    let tanaka = 0;
    for (const t of tags.values()) if (t.includes('Tanaka Corpus')) tanaka++;

    const row = (label: string, actual: number, expected: number) => {
      const delta = actual - expected;
      const pct = expected === 0 ? 0 : (delta / expected) * 100;
      const flag = Math.abs(pct) > 10 ? '  ⚠ >10% drift' : '';
      console.log(
        `  ${label.padEnd(22)} ${String(actual).padStart(9)}  (ref ${String(expected).padStart(9)}, ` +
          `${delta >= 0 ? '+' : ''}${delta})${flag}`
      );
    };

    row('jpn sentences', jpn.size, REFERENCE.jpnSentences);
    row('  orphaned', orphans, REFERENCE.jpnOrphans);
    row('  with an EN link', withEnglish, REFERENCE.jpnWithEnglish);
    row('  Tanaka Corpus', tanaka, REFERENCE.jpnTanaka);
    row('  with audio', audio.size, REFERENCE.jpnAudio);
    row('  CC0 (rest CC BY)', cc0.size, REFERENCE.jpnCC0);

    // Structural assertions — these must hold on ANY dump vintage.
    const problems: string[] = [];
    if (jpn.size < 100_000) problems.push('Japanese sentence count collapsed — parse failure?');
    if (orphans === 0) problems.push('Zero orphans — `\\N` owner handling is broken (gotcha #1).');
    if (orphans === jpn.size) problems.push('Every sentence orphaned — owner column misread.');
    // Gotcha #4: if we accidentally read the audio-id column, almost none of the
    // values would resolve to real Japanese sentence ids.
    const audioResolving = [...audio].filter((id) => jpn.has(id)).length;
    if (audio.size > 0 && audioResolving / audio.size < 0.9) {
      problems.push(
        `Only ${audioResolving}/${audio.size} audio rows resolve to Japanese sentences — ` +
          `the per-language column swap (gotcha #4) is being mishandled.`
      );
    }
    const jpnSkilled = [...skills.values()].filter((s) => s.jpn !== null).length;
    if (jpnSkilled < 1000) {
      problems.push(
        `Only ${jpnSkilled} users declare a Japanese skill — the embedded-newline ` +
          `record rule (gotcha #3) is likely broken.`
      );
    }

    console.log(
      `\n  users declaring jpn skill  ${jpnSkilled}` +
        `   (native, skill=5: ${[...skills.values()].filter((s) => s.jpn === 5).length})`
    );

    if (problems.length > 0) {
      console.error(`\n✗ ${problems.length} structural problem(s):`);
      for (const p of problems) console.error(`    ${p}`);
      process.exit(1);
    }
    console.log('\n✓ parsers structurally sound');
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
