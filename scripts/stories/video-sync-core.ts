/**
 * scripts/stories/video-sync-core.ts
 *
 * The pure half of `pnpm stories:sync-videos`: parse the channel's Atom feed,
 * decide which episode each video belongs to, and rewrite
 * `data/stories/videos.ts`. No network and no file access in here, so
 * `scripts/stories/validate-video-sync.ts` can assert every rule against
 * fixtures. Relative imports only, for the same reason as `lib/stories`.
 *
 * THE MATCHING RULE (deterministic, never a guess). Take the kanji in the part
 * of the title before the first `|`. The video belongs to episode E when that
 * set has at least three kanji and is a subset of E's `focusKanji`, and E is the
 * ONLY registered episode for which that is true. A foreign kanji, fewer than
 * three, or a set that two episodes could claim all mean "unmatched": reported,
 * never mapped. The titles the channel uses list the episode's focus kanji
 * ("Can You Read 雨 天 気 休 日?"), so a correctly titled upload links itself.
 *
 * THE WRITE RULE. Add only. A slug that already has an entry is never changed
 * (a hand fix must stick), nothing is ever removed, and an id that is already
 * mapped to some episode is never put on a second one.
 */

export interface SyncEpisode {
  slug: string;
  number: number;
  focusKanji: readonly string[];
}

export interface FeedEntry {
  videoId: string;
  title: string;
  /** ISO timestamp as the feed gives it; only ever compared. */
  published: string;
}

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const MIN_KANJI = 3;

const HAN = /\p{Script=Han}/u;

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Entries of a YouTube Atom feed. Tolerant on purpose: a regex per field, so an
 * added element or a reordering does not break it. Throws only when the text is
 * not an Atom feed at all (an HTML error page, an empty body). A feed with no
 * entries is valid; an entry missing a usable id, title or date is dropped.
 */
export function parseFeed(xml: string): FeedEntry[] {
  if (!/<feed[\s>]/.test(xml)) throw new Error('response is not an Atom feed (no <feed> element)');
  const entries: FeedEntry[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = m[1];
    const videoId = /<yt:videoId>\s*([^<\s]+)\s*<\/yt:videoId>/.exec(body)?.[1];
    // `<title>` does not match `<media:title>`, so this is the entry's own title.
    const title = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1];
    const published = /<published>\s*([^<\s]+)\s*<\/published>/.exec(body)?.[1];
    if (!videoId || !YOUTUBE_ID_RE.test(videoId) || title === undefined || !published) continue;
    entries.push({ videoId, title: decodeXml(title).trim(), published });
  }
  return entries;
}

/** The distinct kanji in the part of a title before the first `|`. */
export function titleKanji(title: string): string[] {
  const head = title.split('|')[0];
  return [...new Set(Array.from(head).filter(ch => HAN.test(ch)))];
}

export type Match = { kind: 'matched'; slug: string } | { kind: 'unmatched'; reason: string };

export function matchEpisode(title: string, episodes: readonly SyncEpisode[]): Match {
  const kanji = titleKanji(title);
  if (kanji.length < MIN_KANJI) {
    return { kind: 'unmatched', reason: `only ${kanji.length} kanji before "|", need ${MIN_KANJI}` };
  }
  const hits = episodes.filter(e => kanji.every(k => e.focusKanji.includes(k)));
  if (hits.length === 1) return { kind: 'matched', slug: hits[0].slug };
  if (hits.length === 0) {
    return { kind: 'unmatched', reason: `${kanji.join('')} is not a subset of any episode's focus kanji` };
  }
  return {
    kind: 'unmatched',
    reason: `${kanji.join('')} fits ${hits.length} episodes (${hits.map(h => h.slug).join(', ')})`,
  };
}

export interface SyncPlan {
  /** slug -> id, new entries only. */
  additions: Record<string, string>;
  /** Human-readable lines, in the order the videos were considered. */
  report: string[];
}

/**
 * Decide what to add. Videos are considered oldest first, so when two match one
 * episode the earlier upload wins and the later one is reported.
 */
export function planSync(
  entries: readonly FeedEntry[],
  episodes: readonly SyncEpisode[],
  existing: Readonly<Record<string, { youtubeId: string }>>,
): SyncPlan {
  const additions: Record<string, string> = {};
  const report: string[] = [];
  const idToSlug = new Map<string, string>();
  for (const [slug, v] of Object.entries(existing)) idToSlug.set(v.youtubeId, slug);
  const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

  const ordered = [...entries].sort(
    (a, b) => a.published.localeCompare(b.published) || a.videoId.localeCompare(b.videoId),
  );
  for (const e of ordered) {
    const label = `${e.videoId} "${e.title}"`;
    const match = matchEpisode(e.title, episodes);
    if (match.kind === 'unmatched') {
      report.push(`unmatched: ${label} (${match.reason})`);
      continue;
    }
    const { slug } = match;
    const owner = idToSlug.get(e.videoId);
    if (owner === slug) {
      report.push(`already linked: ${e.videoId} -> ${slug}`);
    } else if (owner !== undefined) {
      report.push(`skipped: ${label} matches ${slug} but the id is already mapped to ${owner}`);
    } else if (has(existing, slug)) {
      report.push(`kept: ${slug} already has ${existing[slug].youtubeId}; ${label} left unlinked`);
    } else if (has(additions, slug)) {
      report.push(`duplicate: ${label} also matches ${slug}, which takes ${additions[slug]} (earlier upload)`);
    } else {
      additions[slug] = e.videoId;
      idToSlug.set(e.videoId, slug);
      report.push(`add: ${slug} -> ${e.videoId}`);
    }
  }
  return { additions, report };
}

// --- rewriting data/stories/videos.ts ---------------------------------------

const MAP_DECL = 'export const EPISODE_VIDEOS: Record<string, EpisodeVideo> = {';
// Leading comment/blank lines, then one single-line entry. Anything else in the
// body is something regenerating would lose, so it is an error, not a guess.
const ENTRY_RE =
  /((?:[ \t]*\/\/[^\n]*\n|[ \t]*\n)*)[ \t]*['"]?([\w-]+)['"]?[ \t]*:[ \t]*\{[ \t]*youtubeId[ \t]*:[ \t]*['"]([^'"\n]*)['"][ \t]*,?[ \t]*\}[ \t]*,?[ \t]*\n/g;

interface ParsedEntry {
  slug: string;
  youtubeId: string;
  /** Comment lines directly above the entry; they travel with it when entries are sorted. */
  leading: string;
}

function splitFile(source: string): { head: string; body: string; tail: string } {
  const start = source.indexOf(MAP_DECL);
  if (start < 0) throw new Error(`videos.ts: cannot find "${MAP_DECL}"`);
  const bodyStart = start + MAP_DECL.length;
  const end = source.indexOf('};', bodyStart);
  if (end < 0) throw new Error('videos.ts: cannot find the end of EPISODE_VIDEOS');
  return { head: source.slice(0, bodyStart), body: source.slice(bodyStart, end), tail: source.slice(end) };
}

export function parseVideosFile(source: string): { entries: ParsedEntry[]; trailing: string } {
  const { body } = splitFile(source);
  const entries: ParsedEntry[] = [];
  const unrecognised = (text: string) =>
    new Error(`videos.ts: unrecognised text in EPISODE_VIDEOS near "${text.trim().slice(0, 60)}"`);
  let consumed = 0;
  ENTRY_RE.lastIndex = 0;
  for (let m = ENTRY_RE.exec(body); m; m = ENTRY_RE.exec(body)) {
    if (m.index !== consumed) throw unrecognised(body.slice(consumed, m.index));
    const leading = m[1]
      .split('\n')
      .filter(line => line.trim().startsWith('//'))
      .map(line => `${line}\n`)
      .join('');
    entries.push({ slug: m[2], youtubeId: m[3], leading });
    consumed = m.index + m[0].length;
  }
  const trailing = body.slice(consumed);
  if (trailing.replace(/[ \t]*\/\/[^\n]*\n|\s/g, '') !== '') throw unrecognised(trailing);
  return { entries, trailing: trailing.trim() === '' ? '' : trailing };
}

/**
 * The file with `additions` merged in: header and footer byte-for-byte, entries
 * sorted by episode number (unknown slugs last, by name), existing entries and
 * the comments above them untouched.
 */
export function renderVideosFile(
  source: string,
  additions: Readonly<Record<string, string>>,
  episodes: readonly SyncEpisode[],
): string {
  const { head, tail } = splitFile(source);
  const { entries, trailing } = parseVideosFile(source);
  const have = new Set(entries.map(e => e.slug));
  for (const [slug, youtubeId] of Object.entries(additions)) {
    if (have.has(slug)) throw new Error(`videos.ts: refusing to overwrite ${slug}`);
    entries.push({ slug, youtubeId, leading: '' });
  }
  const number = (slug: string) => episodes.find(e => e.slug === slug)?.number ?? Infinity;
  entries.sort((a, b) => number(a.slug) - number(b.slug) || a.slug.localeCompare(b.slug));
  const lines = entries.map(e => `${e.leading}  '${e.slug}': { youtubeId: '${e.youtubeId}' },\n`).join('');
  const body = entries.length === 0 && trailing === '' ? '' : `\n${lines}${trailing}`;
  return `${head}${body}${tail}`;
}
