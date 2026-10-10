'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { LookupHit } from '@/lib/kanji-lookup';
import {
  EXAMPLE_CHIP,
  EXAMPLE_QUERIES,
  SEARCH_BUTTON,
  SEARCH_INPUT,
  SEARCH_INPUT_ID,
  SEARCH_PLACEHOLDER,
  SearchIcon,
  SearchLabel,
} from './search-field';

/**
 * The homepage search, with results as you type.
 *
 * It asks /api/kanji-lookup rather than searching in the browser, so the
 * dictionary never reaches this page (that is what makes /kanji heavy). It is
 * a plain GET form underneath: before this hydrates, or if the lookup is slow,
 * Enter submits to /search and the redirect does the work.
 *
 * Enter opens the highlighted row, the first by default. A combobox in the
 * ARIA sense: arrows move, Escape closes, the list is announced by count.
 */

const DEBOUNCE_MS = 90;

export function KanjiLookup({ autoFocusOnDesktop = true }: { autoFocusOnDesktop?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, LookupHit[]>());

  const [query, setQuery] = useState('');
  // The query the hits belong to, so a stale list is never shown as current.
  const [result, setResult] = useState<{ query: string; hits: LookupHit[] } | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  // Desktop only: a phone would throw its keyboard over the page on arrival.
  useEffect(() => {
    if (autoFocusOnDesktop && window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocusOnDesktop]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResult(null);
      return;
    }
    const cached = cache.current.get(q);
    if (cached) {
      setResult({ query: q, hits: cached });
      setActive(0);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/kanji-lookup?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const { hits } = (await res.json()) as { hits: LookupHit[] };
        cache.current.set(q, hits);
        setResult({ query: q, hits });
        setActive(0);
      } catch {
        // Aborted by the next keystroke, or offline: the form still submits.
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const current = result && result.query === query.trim() ? result : null;
  const hits = current?.hits ?? [];
  const showList = open && current !== null;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault();
      router.push(hits[active].href);
    }
  }

  function fill(example: string) {
    setQuery(example);
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="w-full">
      <form action="/search" method="get" role="search" className="relative w-full">
        <SearchLabel />
        <SearchIcon />
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={SEARCH_PLACEHOLDER}
          className={SEARCH_INPUT}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={SEARCH_BUTTON}>
          Search
        </button>

        {showList && (
          <div
            // Keep focus in the input while a row is clicked, so blur does not
            // close the list before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card text-left shadow-lg"
          >
            {hits.length > 0 ? (
              <ul id={listId} role="listbox" aria-label="Matching kanji">
                {hits.map((hit, i) => (
                  <li
                    key={hit.kanji}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className="border-b border-border last:border-b-0"
                    onMouseEnter={() => setActive(i)}
                  >
                    <Link
                      href={hit.href}
                      prefetch={false}
                      tabIndex={-1}
                      className={`flex items-center gap-4 px-4 py-2.5 ${
                        i === active ? 'bg-japan-soft-mist' : ''
                      }`}
                    >
                      <span lang="ja" className="w-10 text-center text-3xl text-japan-deep-ocean">
                        {hit.kanji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium capitalize text-japan-deep-ocean">
                          {hit.meaning}
                        </span>
                        <span className="block truncate text-sm text-japan-mountain-mist">{hit.romaji}</span>
                      </span>
                      <span className="rounded-full bg-japan-soft-mist px-2 py-0.5 text-xs font-semibold text-japan-mountain-mist">
                        {hit.level}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p id={listId} className="px-4 py-3 text-sm text-japan-mountain-mist">
                No kanji found for &ldquo;{current.query}&rdquo;. Try an English meaning, or a reading in romaji.
              </p>
            )}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {current ? `${hits.length} kanji found` : ''}
        </p>
      </form>

      <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-japan-mountain-mist">
        <span>Try</span>
        {EXAMPLE_QUERIES.map((example) => (
          <a
            key={example}
            href={`/search?q=${encodeURIComponent(example)}`}
            rel="nofollow"
            className={EXAMPLE_CHIP}
            onClick={(e) => {
              e.preventDefault();
              fill(example);
            }}
          >
            {example}
          </a>
        ))}
      </p>
    </div>
  );
}
