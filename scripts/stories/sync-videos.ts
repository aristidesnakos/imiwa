/**
 * scripts/stories/sync-videos.ts
 *
 *   pnpm stories:sync-videos [--dry-run]
 *
 * Keeps `data/stories/videos.ts` current from the channel's public Atom feed, so
 * uploading an episode's video is the only step anyone takes. No API key: the
 * feed is open. The rules (matching by the focus kanji in the title, add-only)
 * live in `video-sync-core.ts` and are asserted by `pnpm validate:video-sync`.
 *
 * Exit code: non-zero only when the job itself broke (feed unreachable or not a
 * feed, the file could not be rewritten). A video that matches no episode is a
 * line in the report, never a failure.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { EPISODES } from '../../lib/stories';
import { EPISODE_VIDEOS } from '../../data/stories/videos';
import { parseFeed, parseVideosFile, planSync, renderVideosFile } from './video-sync-core';

// Channel id of the owner's channel (youtube.com/@officialmichikanji).
const CHANNEL_ID = 'UCWfjH9us3-qxv_O8kf7QE-Q';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEOS_FILE = resolve(__dirname, '../../data/stories/videos.ts');

async function fetchFeed(): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(FEED_URL, {
        headers: { 'user-agent': 'michikanji-sync-videos (+https://www.michikanji.com)' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise(r => setTimeout(r, 2_000 * attempt));
    }
  }
  throw new Error(`could not fetch ${FEED_URL}: ${lastError instanceof Error ? lastError.message : lastError}`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const entries = parseFeed(await fetchFeed());
  const plan = planSync(entries, EPISODES, EPISODE_VIDEOS);
  const added = Object.keys(plan.additions);

  console.log(`feed: ${entries.length} video(s); ${Object.keys(EPISODE_VIDEOS).length} episode(s) already linked`);
  for (const line of plan.report) console.log(`  ${line}`);

  if (added.length === 0) {
    console.log('nothing to add.');
    return;
  }
  if (dryRun) {
    console.log(`dry run: would link ${added.length} video(s); ${VIDEOS_FILE} not written.`);
    return;
  }

  const before = readFileSync(VIDEOS_FILE, 'utf8');
  const after = renderVideosFile(before, plan.additions, EPISODES);
  // Read the result back the way the next run will, so a rewrite that mangled
  // the file fails here rather than at the next build.
  const wrote = new Map(parseVideosFile(after).entries.map(e => [e.slug, e.youtubeId]));
  for (const [slug, id] of Object.entries(plan.additions)) {
    if (wrote.get(slug) !== id) throw new Error(`rewrite lost ${slug} -> ${id}`);
  }
  for (const [slug, v] of Object.entries(EPISODE_VIDEOS)) {
    if (wrote.get(slug) !== v.youtubeId) throw new Error(`rewrite changed existing entry ${slug}`);
  }
  writeFileSync(VIDEOS_FILE, after);
  console.log(`linked ${added.length} video(s) in data/stories/videos.ts.`);
}

main().catch(err => {
  console.error(`sync-videos failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
