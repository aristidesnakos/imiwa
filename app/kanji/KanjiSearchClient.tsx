'use client';

import { useState, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';
import {
  JLPT_LEVELS,
  levelFilterHref,
  levelPagePath,
  parseJlptLevel,
  type JlptLevel,
} from '@/lib/levels';
import { ArrowRight, Brain, Check, Filter, Search } from 'lucide-react';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { useKanjiSRS } from '@/hooks/useKanjiSRS';

const PAGE_SIZE = 200;

interface KanjiWithLevel {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
  level: JlptLevel;
}

// Built once at module load — never recomputed on re-renders
const ALL_KANJI: KanjiWithLevel[] = (() => {
  const kanjiMap = new Map<string, KanjiWithLevel>();
  N5_KANJI.forEach(k => kanjiMap.set(k.kanji, { ...k, level: 'N5' }));
  N4_KANJI.forEach(k => { if (!kanjiMap.has(k.kanji)) kanjiMap.set(k.kanji, { ...k, level: 'N4' }); });
  N3_KANJI.forEach(k => { if (!kanjiMap.has(k.kanji)) kanjiMap.set(k.kanji, { ...k, level: 'N3' }); });
  N2_KANJI.forEach(k => { if (!kanjiMap.has(k.kanji)) kanjiMap.set(k.kanji, { ...k, level: 'N2' }); });
  N1_KANJI.forEach(k => { if (!kanjiMap.has(k.kanji)) kanjiMap.set(k.kanji, { ...k, level: 'N1' }); });
  return Array.from(kanjiMap.values());
})();

// `null` is the unfiltered view, "All": it is what an absent or unparseable
// ?level= means, so there is no separate sentinel to keep in step with the URL.
type View = JlptLevel | null;

const VIEWS: readonly View[] = [null, ...JLPT_LEVELS];

const VIEW_COPY: Record<JlptLevel | 'ALL', { title: string; description: string }> = {
  ALL: { title: 'All JLPT Kanji', description: 'Browse all available kanji from N5, N4, N3, N2, and N1 levels' },
  N5: { title: 'JLPT N5 Kanji', description: 'Fundamental kanji for beginners - most essential characters' },
  N4: { title: 'JLPT N4 Kanji', description: 'Intermediate kanji building on N5 foundation' },
  N3: { title: 'JLPT N3 Kanji', description: 'Advanced intermediate kanji for complex expressions and formal contexts' },
  N2: { title: 'JLPT N2 Kanji', description: 'Advanced kanji for professional and academic contexts' },
  N1: { title: 'JLPT N1 Kanji', description: 'Expert-level kanji for advanced academic, professional, and literary contexts' },
};

// The anchors the homepage and outside links pointed at before a level had a
// URL of its own. They sit inside the collapsed index, so arriving on one left
// the visitor mid-grid on "All" with the level they chose nowhere in sight.
const LEGACY_LEVEL_HASH = /^#level-(n[1-5])$/i;

/** A view's address: the level filter from lib/levels, carrying the search along. */
function viewHref(view: View, search: string): string {
  const href = view ? levelFilterHref(view) : '/kanji';
  if (!search) return href;
  return `${href}${href.includes('?') ? '&' : '?'}search=${encodeURIComponent(search)}`;
}

// A level is a filter over kanji this page already holds, so choosing one must
// not cost a round trip. As a plain <Link> navigation it would: the router
// cannot reuse this page's payload across different search params, so every
// level refetched the whole RSC payload of /kanji (61 kB gzipped, nearly all of
// it the server-rendered index) before the grid changed. pushState goes through
// Next's history integration instead — useSearchParams updates, Back and
// Forward restore the level — and nothing is fetched. Modified clicks (new tab,
// new window, download) fall through to the browser, which is what keeps these
// real links: open one in a tab, copy it, share it.
function switchViewInPlace(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (event.currentTarget.href !== window.location.href) {
    window.history.pushState(null, '', event.currentTarget.href);
  }
}

// Raw links that do not go through buttonVariants carry the ring themselves.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function LevelSwitcher({ active, search }: { active: View; search: string }) {
  return (
    <nav aria-label="JLPT level" className="w-full sm:w-auto">
      <ul className="grid h-9 grid-cols-6 items-center rounded-lg bg-[color-mix(in_srgb,var(--sakura-waters)_20%,var(--temple-stone))] p-1">
        {VIEWS.map((view) => {
          const isActive = view === active;
          return (
            <li key={view ?? 'ALL'}>
              {/* prefetch={false}: every level resolves to this same page, so a
                  prefetch would pull /kanji's full payload once per level. */}
              <Link
                href={viewHref(view, search)}
                scroll={false}
                prefetch={false}
                onClick={switchViewInPlace}
                aria-current={isActive ? 'page' : undefined}
                data-fast-goal="kanji_level_click"
                data-fast-goal-level={view ?? 'all'}
                className={cn(
                  'flex h-7 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors sm:text-sm',
                  FOCUS_RING,
                  isActive
                    ? 'bg-card text-japan-deep-ocean shadow'
                    : 'text-muted-foreground hover:text-japan-deep-ocean'
                )}
              >
                {view ?? 'All'}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function KanjiSearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = parseJlptLevel(searchParams.get('level'));
  const urlSearch = searchParams.get('search');

  const [search, setSearch] = useState(urlSearch ?? '');
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const rootRef = useRef<HTMLDivElement>(null);
  // Set when a legacy #level-N5 arrival is being turned into ?level=N5, so the
  // grid is brought into view once that level is actually showing.
  const revealOnLevel = useRef<JlptLevel | null>(null);
  const { isKanjiLearned, getLearnedCountForLevel, totalLearned, toggleKanjiLearned, learnedKanji } = useKanjiProgress();
  const { getDueCount } = useKanjiSRS();
  const dueCount = getDueCount(learnedKanji);

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, level, showOnlyUnlearned]);

  // Back-compat for #level-N5 … #level-N1. Through the router rather than
  // pushState: this runs on arrival, and the router's history patch is
  // installed by an effect of its own that is not guaranteed to have run yet.
  // It costs one payload fetch, once, and only for links written before
  // levels had addresses of their own.
  useEffect(() => {
    const hashLevel = parseJlptLevel(LEGACY_LEVEL_HASH.exec(window.location.hash)?.[1]);
    if (!hashLevel) return;
    revealOnLevel.current = hashLevel;
    const carried = new URLSearchParams(window.location.search).get('search') ?? '';
    router.replace(viewHref(hashLevel, carried), { scroll: false });
  }, [router]);

  useEffect(() => {
    if (level === null || level !== revealOnLevel.current) return;
    revealOnLevel.current = null;
    rootRef.current?.scrollIntoView({ block: 'start' });
  }, [level]);

  const levelKanji = useMemo(
    () => (level === null ? ALL_KANJI : ALL_KANJI.filter(k => k.level === level)),
    [level]
  );

  const filtered = useMemo(() => {
    let kanjiSet = levelKanji;
    if (search) {
      const lower = search.toLowerCase();
      kanjiSet = kanjiSet.filter(k =>
        k.kanji.includes(search) ||
        k.meaning.toLowerCase().includes(lower) ||
        k.onyomi.toLowerCase().includes(lower) ||
        k.kunyomi.toLowerCase().includes(lower)
      );
    }
    if (showOnlyUnlearned) {
      kanjiSet = kanjiSet.filter(k => !isKanjiLearned(k.kanji));
    }
    return kanjiSet;
  }, [levelKanji, search, showOnlyUnlearned, isKanjiLearned]);

  const learnedCount = useMemo(
    () => getLearnedCountForLevel(levelKanji.map(k => k.kanji)),
    [getLearnedCountForLevel, levelKanji]
  );
  const totalCount = levelKanji.length;
  const progressPercentage = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  const copy = VIEW_COPY[level ?? 'ALL'];
  const listPath = level ? levelPagePath(level) : null;
  const visible = filtered.slice(0, visibleCount);

  return (
    // min-h-screen matches the Suspense fallback in page.tsx: whatever the grid
    // holds, everything below it stays where the prerendered HTML put it.
    <div ref={rootRef} className="min-h-screen scroll-mt-24 space-y-6">
      {/* Unified Control Bar */}
      <div className="mx-auto w-full rounded-xl border border-border bg-card p-3 shadow-sm sm:w-fit">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative sm:w-64 shrink-0">
            <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              aria-label="Search kanji by meaning or kana reading"
              placeholder='e.g. 水, "water", くだ...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Divider (desktop only) */}
          <div aria-hidden className="hidden sm:block h-6 w-px bg-border shrink-0" />

          <LevelSwitcher active={level} search={search} />

          {/* Divider (desktop only) */}
          <div aria-hidden className="hidden sm:block h-6 w-px bg-border shrink-0" />

          {/* Filter and Progress Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showOnlyUnlearned ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyUnlearned(!showOnlyUnlearned)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showOnlyUnlearned ? "Show all" : "Show unlearned"}
            </Button>

            {/* prefetch={false} on both study links. /kanji/progress carries
                the site's charting library, ~106 kB of script, and this link is
                on screen from the first paint — so every visit to /kanji
                downloaded the progress page in full, whether or not anyone
                looked at it. That was over a quarter of this route's script
                budget in lighthouserc.js. A click still loads it on demand. */}
            <Link
              href="/kanji/progress"
              prefetch={false}
              className={cn(
                'rounded-lg bg-[color-mix(in_srgb,var(--sakura-waters)_18%,var(--temple-stone))] px-3 py-2 transition hover:brightness-90',
                FOCUS_RING
              )}
            >
              <span className="text-japan-deep-ocean font-semibold">{totalLearned}</span>
              <span className="text-japan-mountain-mist ml-1">learned</span>
            </Link>

            {totalLearned > 0 && (
              <Link
                href="/kanji/review"
                prefetch={false}
                className={cn(
                  'relative flex items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--cherry-blossom)_22%,var(--temple-stone))] px-3 py-2 text-japan-deep-ocean transition hover:brightness-90',
                  FOCUS_RING
                )}
              >
                <Brain aria-hidden className="w-4 h-4" />
                <span>Review</span>
                {dueCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {dueCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 className="text-2xl font-semibold">
            {copy.title} {search && `(${filtered.length} results)`}
          </h2>
          {!search && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-japan-mountain-mist font-medium">
                {learnedCount}/{totalCount} learned ({progressPercentage}%)
              </div>
              <div className="w-24 h-2 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--mountain-mist)_18%,var(--temple-stone))]">
                <div
                  className="h-full bg-japan-mountain-mist transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-4">{copy.description}</p>
        {/* A level with a list page of its own gets pointed at it: the list is
            ordered for studying, and this grid is not. */}
        {listPath && (
          <p className="mb-4">
            <Link
              href={listPath}
              prefetch={false}
              data-fast-goal="kanji_list_click"
              data-fast-goal-level={level}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Study the {level} list in learning order
              <ArrowRight aria-hidden />
            </Link>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Click any kanji to see its stroke order, readings, and meaning
        </p>
      </div>

      {/* Kanji Grid */}
      {/* The scroll marker goes on the grid, but the click goal goes on the
          <Link> below and NOT here: the grid also contains the check-off
          buttons, and DataFast's delegated click handler would count those as
          kanji opens. */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-4" data-fast-scroll="kanji_scroll_grid">
        {visible.map((k, index) => {
          const isLearned = isKanjiLearned(k.kanji);
          return (
            <div key={`${k.kanji}-${k.level}-${index}`} className="relative">
              {/* prefetch={false}: this grid renders up to PAGE_SIZE (200) cards
                  at once, and Next.js prefetches every <Link> that scrolls into
                  view — each pull is a ~10 kB RSC payload for a page most
                  visitors are browsing, not about to click. With a full tab's
                  worth of cards in the initial viewport that alone blew the
                  route's total-byte budget (resource-summary:total:size),
                  which counts prefetches unlike the script-only budget. Search
                  is the primary way through this page; a browsed click still
                  fetches on demand, same as any unprefetched link. */}
              <Link
                href={`/kanji/${encodeURIComponent(k.kanji)}`}
                prefetch={false}
                data-fast-goal="kanji_card_click"
                className={`group block p-4 border rounded-lg text-center transition-all duration-200 hover:border-japan-sakura-waters hover:bg-muted hover:shadow-md ${FOCUS_RING} ${
                  isLearned
                    ? 'border-[color:color-mix(in_srgb,var(--sakura-waters)_70%,var(--temple-stone))] bg-[color-mix(in_srgb,var(--sakura-waters)_15%,var(--temple-stone))]'
                    : 'border-border'
                }`}
              >
                <div lang="ja" className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {k.kanji}
                </div>
                <div className="text-xs text-muted-foreground truncate mb-1">
                  {k.meaning.split(',')[0]}
                </div>
                <Badge variant="outline" className="text-xs">
                  {k.level}
                </Badge>
              </Link>

              {/* Check-off button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleKanjiLearned(k.kanji);
                }}
                className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition hover:brightness-90 ${FOCUS_RING} ${
                  isLearned
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[color-mix(in_srgb,var(--mountain-mist)_15%,var(--temple-stone))] text-muted-foreground'
                }`}
                title={isLearned ? 'Mark as unlearned' : 'Mark as learned'}
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {visibleCount} of {filtered.length} kanji
          </p>
          <Button
            variant="outline"
            data-fast-goal="kanji_more_click"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
          </Button>
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && search && (
        <div className="text-center text-muted-foreground py-12">
          <div className="flex justify-center mb-4">
            <Image
              src="/assets/tan-confused.png"
              alt="Tan the tanuki mascot looking confused"
              width={120}
              height={120}
              className="w-28 md:w-32 drop-shadow-sm"
            />
          </div>
          <div className="text-lg mb-2 font-medium">No kanji found</div>
          <div className="text-sm">Tan couldn&apos;t find that one. Try an English meaning, or a reading in kana.</div>
        </div>
      )}
    </div>
  );
}
