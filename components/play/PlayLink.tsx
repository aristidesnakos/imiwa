/**
 * components/play/PlayLink.tsx
 *
 * One line of text linking to /play, Tan Dash, for the pages whose reader has just met the
 * kanji the game asks for: every N5 character page, every episode page, and /kanji/n5.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE VARIANTS, EVERY CLAIM COMPUTED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   kanji    "Play Tan Dash: catch 山 and the other N5 kanji in a free one-thumb game."
 *            Only for a kanji the game asks for; any other character renders nothing.
 *   episode  "Play this episode's kanji in Tan Dash, world 3 of 14: a free one-thumb game."
 *            The world whose `episodeSlug` is this episode, and the number of worlds, both
 *            read from buildPlayData(), so a new episode (which becomes a world on its own,
 *            lib/play/build.ts) moves the total without anyone editing this file. An episode
 *            whose focus kanji were all taught earlier has no world, and renders nothing.
 *   level    "Play Tan Dash: catch all 82 N5 kanji in a free one-thumb game."
 *            The count is the game's own kanji list, which build.ts refuses to build unless
 *            it is the whole N5 list.
 *
 * The copy lives here once so it cannot drift between surfaces. "World 3 of 14" names the
 * world, it does not open it: the link goes to /play, where every run starts at world 1.
 * The game-only worlds are never named here, because they are not episodes
 * (lib/play/signs.ts, EXTRA_WORLDS).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT COSTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Server Component with no client boundary, so nothing to hydrate on /kanji/% and
 * /stories/.+ pages, which are gated on total transfer. Text only, no image, for the same
 * reason. It imports lib/play/build.ts, and with it the N5 list, the readings layer and every
 * episode, into the SERVER bundle only; never import this file from a client component.
 * `prefetch={false}`: it renders on 82 kanji pages and every episode, and points at a
 * client-heavy route whose payload a prefetch would add to each page's own byte budget
 * (CLAUDE.md, "Performance budgets").
 */

import Link from 'next/link';
import { buildPlayData } from '@/lib/play/build';
import type { PlayData } from '@/lib/play/types';

const PLAY_PATH = '/play';

// The ring is spelled out because a raw <Link> does not go through buttonVariants.
const LINK =
  'rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

// Built once per server process rather than once per page: every page reads the same data.
let cached: PlayData | undefined;
function playData(): PlayData {
  cached ??= buildPlayData();
  return cached;
}

type Props = { className?: string } & (
  | { /** The character this page is about. */ kanji: string }
  | { /** The episode this page is. */ episodeSlug: string }
  | { /** The level page: /kanji/n5. */ level: 'N5' }
);

export function PlayLink(props: Props) {
  const data = playData();
  const { className } = props;

  if ('kanji' in props) {
    if (!data.kanji.some(k => k.c === props.kanji)) return null;
    return (
      <p className={className}>
        <Link href={PLAY_PATH} prefetch={false} className={LINK}>
          Play Tan Dash
        </Link>
        : catch <span lang="ja">{props.kanji}</span> and the other N5 kanji in a free one-thumb game.
      </p>
    );
  }

  if ('episodeSlug' in props) {
    const world = data.worlds.find(w => w.episodeSlug === props.episodeSlug);
    if (!world) return null;
    return (
      <p className={className}>
        <Link href={PLAY_PATH} prefetch={false} className={LINK}>
          Play this episode&rsquo;s kanji in Tan Dash
        </Link>
        , world {world.n} of {data.worlds.length}: a free one-thumb game.
      </p>
    );
  }

  return (
    <p className={className}>
      <Link href={PLAY_PATH} prefetch={false} className={LINK}>
        Play Tan Dash
      </Link>
      : catch all {data.kanji.length} N5 kanji in a free one-thumb game.
    </p>
  );
}
