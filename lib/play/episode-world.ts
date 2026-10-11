/**
 * Which Tan Dash world an episode is, for the lines that send a reader from an
 * episode to the game (the episode page, the episode email). SERVER ONLY: it
 * builds the play data, which imports the N5 list and the stories registry.
 */

import { buildPlayData } from './build';

let worlds: { slug: string | null; n: number }[] | null = null;
let total = 0;

/** `{ n, total }` for an episode that is a world, or null (every episode is, today). */
export function episodeWorld(slug: string): { n: number; total: number } | null {
  if (!worlds) {
    const data = buildPlayData();
    worlds = data.worlds.map(w => ({ slug: w.episodeSlug, n: w.n }));
    total = data.worlds.length;
  }
  const world = worlds.find(w => w.slug === slug);
  return world ? { n: world.n, total } : null;
}
