import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { episodesNewestFirst } from '@/lib/stories';

const CARD =
  'group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-japan-sakura-waters hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function More({ children }: { children: string }) {
  return (
    <span className="mt-auto inline-flex items-center pt-4 text-sm font-medium text-japan-deep-ocean">
      {children}
      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

/**
 * Four ways in for the visitor who has no word to search for.
 * Each door is a page that already exists; none of them is prefetched.
 *
 * The fourth, Tan Dash, was added 2026-10-11 (it was three doors for a day), and it is why the
 * heading no longer says "look up": playing is not looking something up. The game's copy is
 * PlayLink's own sentence ("works through all N N5 kanji, world by world"), not a promise
 * that a run reaches them all; see components/play/PlayLink.tsx. Its tile is a 128px crop of
 * the /play share card (public/assets/tan-dash-tile.png, 4 kB). Do not point an <Image> at
 * /play/opengraph-image instead: that is a 35 kB PNG, and `/` has ~38 kB of transfer headroom.
 */
export function StartDoors({ n5Count }: { n5Count: number }) {
  const latest = episodesNewestFirst()[0];

  return (
    <section className="bg-background pb-14 pt-2 md:pb-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-5 text-center text-lg font-semibold text-japan-mountain-mist">
          Not sure where to start?
        </h2>
        <ul className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4">
          <li>
            <Link href="/kanji/n5" prefetch={false} className={CARD}>
              <span lang="ja" aria-hidden="true" className="text-4xl tracking-widest text-japan-deep-ocean">
                日一人
              </span>
              <span className="mt-3 text-lg font-bold text-japan-deep-ocean">Start from zero</span>
              <span className="mt-1 text-sm text-japan-mountain-mist">
                The {n5Count} N5 kanji, grouped by theme, each with its stroke order.
              </span>
              <More>Open the N5 list</More>
            </Link>
          </li>
          {latest && (
            <li>
              <Link href={`/stories/${latest.slug}`} prefetch={false} className={CARD}>
                <span className="flex items-center gap-3">
                  {/* The first panel, not the OpenGraph strip: six panels
                      shrunk into one 64px square are unreadable. */}
                  <Image
                    src={latest.panels[0]?.art ?? latest.ogImage}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                  <span lang="ja" className="text-sm text-japan-mountain-mist">
                    {latest.titleJa}
                  </span>
                </span>
                <span className="mt-3 text-lg font-bold text-japan-deep-ocean">Read this week&apos;s story</span>
                <span className="mt-1 text-sm text-japan-mountain-mist">
                  Episode {latest.number}: {latest.titleEn} Six panels, written only in N5.
                </span>
                <More>Read the episode</More>
              </Link>
            </li>
          )}
          <li>
            <Link href="/kanji/n5/quiz" prefetch={false} className={CARD}>
              <span lang="ja" aria-hidden="true" className="text-4xl text-japan-deep-ocean">
                水 = ?
              </span>
              <span className="mt-3 text-lg font-bold text-japan-deep-ocean">Test yourself</span>
              <span className="mt-1 text-sm text-japan-mountain-mist">
                A free N5 kanji quiz: meanings and readings, four choices, no sign-up.
              </span>
              <More>Take the quiz</More>
            </Link>
          </li>
          <li>
            <Link href="/play" prefetch={false} className={CARD}>
              <Image
                src="/assets/tan-dash-tile.png"
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <span className="mt-3 text-lg font-bold text-japan-deep-ocean">Play Tan Dash</span>
              <span className="mt-1 text-sm text-japan-mountain-mist">
                A free one-thumb game that works through all {n5Count} N5 kanji, world by world.
              </span>
              <More>Play free</More>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
