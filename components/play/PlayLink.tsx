/**
 * components/play/PlayLink.tsx
 *
 * One line of text linking to /play, Tan Dash, for the pages whose reader has just met the
 * kanji the game asks for: every episode page and /kanji/n5. Every N5 character page shows
 * the `kanji` variant as a card instead (PlayCard, at the foot of this file), because a
 * 14px line at the foot of a page was too quiet to be clicked.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE VARIANTS, EVERY CLAIM COMPUTED, NONE PROMISING SPEED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   kanji    "Tan Dash is a free one-thumb game that works through all 82 N5 kanji, world by
 *            world. 山 is in world 1, where every run starts."
 *            "... 刀 is in world 14 of 14."
 *            The world is the one whose kanji include this one. Only for a kanji the game asks
 *            for; any other character renders nothing.
 *   episode  "This episode is world 1 of 14 in Tan Dash, a free one-thumb kanji game: every run
 *            starts with its kanji."
 *            "This episode is world 8 of 14 in Tan Dash, a free one-thumb kanji game: reach it
 *            by catching the kanji of worlds 1 to 7."
 *            The world whose `episodeSlug` is this episode, and the number of worlds, both
 *            read from buildPlayData(), so a new episode (which becomes a world on its own,
 *            lib/play/build.ts) moves the total without anyone editing this file. An episode
 *            whose focus kanji were all taught earlier has no world, and renders nothing.
 *   level    "Tan Dash is a free one-thumb game that works through all 82 N5 kanji, world by
 *            world."
 *            The count is the game's own kanji list, which build.ts refuses to build unless
 *            it is the whole N5 list.
 *
 * The copy lives here once so it cannot drift between pages. The email cannot render this
 * component, so `playLine` in lib/email/quiz-email.ts words the episode line the same way:
 * change the two together. Every run starts at world 1 and a world opens after
 * CATCHES_PER_WORLD correct catches in that run (lib/play/rules.ts), so world 14's kanji
 * first appear after 78 catches. The lines therefore name a world and never invite the
 * reader to "catch" or "play" a kanji they cannot meet in a short run: only world 1 is
 * described as somewhere a run reaches at once. The game-only worlds are never named as
 * episodes, because they are not (lib/play/signs.ts, EXTRA_WORLDS).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT COSTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Server Component with no client boundary, so nothing to hydrate on /kanji/% and
 * /stories/.+ pages, which are gated on total transfer. The line is text only, no image, for
 * the same reason (the card's one image is a 4 kB tile, below the fold). It imports lib/play/build.ts, and with it the N5 list, the readings layer and every
 * episode, into the SERVER bundle only; never import this file from a client component.
 * `prefetch={false}`: it renders on 82 kanji pages and every episode, and points at a
 * client-heavy route whose payload a prefetch would add to each page's own byte budget
 * (CLAUDE.md, "Performance budgets").
 */

import Image from 'next/image';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { PracticeCard } from '@/components/levels/PracticeCard';
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

/**
 * The worlds a run passes through before world `n` (n >= 2): "world 1", "worlds 1 and 2",
 * "worlds 1 to 7". lib/email/quiz-email.ts keeps a copy rather than importing this file,
 * which would pull next/link into the broadcast scripts.
 */
function worldsBefore(n: number): string {
  if (n === 2) return 'world 1';
  if (n === 3) return 'worlds 1 and 2';
  return `worlds 1 to ${n - 1}`;
}

/** "食 is in world 13 of 14." or "山 is in world 1, where every run starts." Shared by the line and the card. */
function KanjiWorld({ kanji, n, total }: { kanji: string; n: number; total: number }) {
  return (
    <>
      <span lang="ja">{kanji}</span> is in world {n}
      {n === 1 ? ', where every run starts.' : ` of ${total}.`}
    </>
  );
}

type Props = { className?: string } & (
  | { /** The character this page is about. */ kanji: string }
  | { /** The episode this page is. */ episodeSlug: string }
  | { /** The level page: /kanji/n5. */ level: 'N5' }
);

export function PlayLink(props: Props) {
  const data = playData();
  const { className } = props;
  const total = data.worlds.length;

  if ('kanji' in props) {
    // Every game kanji is in exactly one world (lib/play/types.ts), so no world means
    // a character the game does not ask for.
    const world = data.worlds.find(w => w.kanji.includes(props.kanji));
    if (!world) return null;
    return (
      <p className={className}>
        <Link href={PLAY_PATH} prefetch={false} className={LINK}>
          Tan Dash
        </Link>{' '}
        is a free one-thumb game that works through all {data.kanji.length} N5 kanji, world by world.{' '}
        <KanjiWorld kanji={props.kanji} n={world.n} total={total} />
      </p>
    );
  }

  if ('episodeSlug' in props) {
    const world = data.worlds.find(w => w.episodeSlug === props.episodeSlug);
    if (!world) return null;
    return (
      <p className={className}>
        This episode is world {world.n} of {total} in{' '}
        <Link href={PLAY_PATH} prefetch={false} className={LINK}>
          Tan Dash
        </Link>
        , a free one-thumb kanji game:{' '}
        {world.n === 1 ? 'every run starts with its kanji.' : `reach it by catching the kanji of ${worldsBefore(world.n)}.`}
      </p>
    );
  }

  return (
    <p className={className}>
      <Link href={PLAY_PATH} prefetch={false} className={LINK}>
        Tan Dash
      </Link>{' '}
      is a free one-thumb game that works through all {data.kanji.length} N5 kanji, world by world.
    </p>
  );
}

/**
 * The `kanji` line as a bold card (PracticeCard), for the N5 character pages, where the
 * line was 14px text at the foot of the page and went unseen. Same claims as the line, split
 * across the card: the game's name moves to the eyebrow and the button, "free" and
 * "one-thumb" and the world sentence stay, and nothing promises speed or that a run reaches
 * the kanji. A character the game does not ask for renders nothing, as the line does.
 *
 * The tile is the 4 kB crop of the share card the homepage door uses
 * (public/assets/tan-dash-tile.png). Below the fold, so it lazy-loads, and no JavaScript.
 *
 * NO GOAL, ON PURPOSE. The six-week retention test (lib/play/measure.ts) takes no new goals,
 * and a click here is a page view of /play from a /kanji/<c> page, which DataFast already
 * records. It is untagged, like the homepage door, so its players are in arrival=other.
 */
export function PlayCard({ kanji, className }: { kanji: string; className?: string }) {
  const data = playData();
  const world = data.worlds.find(w => w.kanji.includes(kanji));
  if (!world) return null;

  return (
    <PracticeCard
      id="play-card"
      eyebrow="Free game"
      heading="Practise the N5 kanji in a game"
      href={PLAY_PATH}
      cta="Play Tan Dash"
      icon={<Gamepad2 aria-hidden />}
      tile={
        <Image
          src="/assets/tan-dash-tile.png"
          alt=""
          width={128}
          height={128}
          sizes="(min-width: 640px) 128px, 88px"
          className="h-auto w-full rounded-lg border border-border"
        />
      }
      className={className}
    >
      A one-thumb game that works through all {data.kanji.length} N5 kanji, world by world.{' '}
      <KanjiWorld kanji={kanji} n={world.n} total={data.worlds.length} />
    </PracticeCard>
  );
}
