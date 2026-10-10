import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * The search-first hero: heading, the search, and Tan beside it pointing at
 * it. The pointing pose wears a 探 headband, "search", which is the one thing
 * this hero asks a visitor to do. Tan is the LCP image, hence `priority`.
 */
export function HomeHero({
  kanjiCount,
  search,
  children,
}: {
  kanjiCount: number;
  search: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative bg-gradient-to-b from-japan-soft-mist via-background to-background pb-12 pt-8 md:pb-16 md:pt-14">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[color-mix(in_srgb,var(--sakura-waters)_12%,transparent)] to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-japan-deep-ocean md:text-5xl">
            Look up any Japanese kanji
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-japan-mountain-mist md:text-lg">
            Free stroke order, readings and meanings for all {kanjiCount.toLocaleString('en-US')} JLPT kanji.
            Type a meaning or a reading, in romaji or kana.
          </p>

          <div className="mt-6 flex w-full max-w-2xl items-start gap-2 md:mt-8 md:gap-3">
            <div className="min-w-0 flex-1">{search}</div>
            {/* The finger sits about 42% of the way down the image; the
                negative margin lines it up with the middle of the input. */}
            <Image
              src="/assets/tan-point.png"
              alt="Tan the tanuki mascot pointing at the search box"
              width={160}
              height={160}
              className="-mt-1 w-16 shrink-0 drop-shadow-md sm:w-20 md:-mt-5 md:w-28"
              priority
            />
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
