'use client';

/**
 * app/kanji/n5/quiz/QuizModes.tsx
 *
 * The two modes of the N5 quiz as tabs: the kanji quiz that was always here, and the
 * JLPT-format mode. The server page only renders this when there is at least one
 * published JLPT-format item; with none, the page renders the kanji quiz bare and this
 * file is not in the route's script at all.
 *
 * Both panels are always in the DOM and the inactive one is `hidden`, so switching tabs
 * never throws away a round in progress. The kanji quiz is the default, so the server
 * HTML and the first client render agree; `?mode=jlpt` or `#jlpt-format` (the link in
 * the page copy) opens the other tab after mount.
 *
 * Choosing a tab writes it back to the address with replaceState: `#jlpt-format` on the
 * JLPT tab, no hash on the kanji one. A reload or a copied link then opens the tab that
 * was showing, and the page's own "#jlpt-format" link always changes the hash, so it
 * still fires `hashchange` for someone who arrived on that hash and then switched to the
 * kanji quiz. A tab is not a page, so no history entry is added.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { EDGE, HOVER, RING, WASH_RIGHT } from './quiz-ui';

type Mode = 'kanji' | 'jlpt';

const TABS: { mode: Mode; label: string }[] = [
  { mode: 'kanji', label: 'Kanji quiz' },
  { mode: 'jlpt', label: 'JLPT format' },
];

export function QuizModes({ kanjiQuiz, jlptQuiz }: { kanjiQuiz: ReactNode; jlptQuiz: ReactNode }) {
  const [mode, setMode] = useState<Mode>('kanji');
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ kanji: null, jlpt: null });
  const barRef = useRef<HTMLDivElement>(null);

  // Deep links. Read after mount, never during render.
  const openFromLocation = useCallback((scroll: boolean) => {
    const wanted =
      new URLSearchParams(window.location.search).get('mode') === 'jlpt' || window.location.hash === '#jlpt-format';
    if (!wanted) return;
    setMode('jlpt');
    if (scroll) barRef.current?.scrollIntoView({ block: 'start' });
  }, []);

  const select = useCallback((target: Mode) => {
    setMode(target);
    const url = new URL(window.location.href);
    url.hash = target === 'jlpt' ? 'jlpt-format' : '';
    if (target === 'kanji') {
      url.searchParams.delete('mode');
      url.searchParams.delete('set');
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    openFromLocation(false);
    const onHash = () => openFromLocation(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openFromLocation]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const at = TABS.findIndex(t => t.mode === mode);
    let to = -1;
    if (event.key === 'ArrowRight') to = (at + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') to = (at + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = TABS.length - 1;
    if (to < 0) return;
    event.preventDefault();
    const target = TABS[to].mode;
    select(target);
    tabRefs.current[target]?.focus();
  }

  return (
    <div>
      <div
        ref={barRef}
        id="jlpt-format"
        role="tablist"
        aria-label="Quiz mode"
        onKeyDown={onKeyDown}
        className="mb-4 flex scroll-mt-24 flex-wrap gap-2"
      >
        {TABS.map(tab => {
          const selected = mode === tab.mode;
          return (
            <button
              key={tab.mode}
              ref={el => {
                tabRefs.current[tab.mode] = el;
              }}
              type="button"
              role="tab"
              id={`quiz-tab-${tab.mode}`}
              aria-selected={selected}
              aria-controls={`quiz-panel-${tab.mode}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.mode)}
              className={`min-h-11 rounded-full border-2 px-5 py-1.5 text-sm transition-colors ${RING} ${
                selected
                  ? `border-japan-deep-ocean font-semibold text-japan-deep-ocean ${WASH_RIGHT}`
                  : `${EDGE} bg-background font-medium text-japan-ink-black ${HOVER}`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="quiz-panel-kanji" aria-labelledby="quiz-tab-kanji" hidden={mode !== 'kanji'}>
        {kanjiQuiz}
      </div>
      <div role="tabpanel" id="quiz-panel-jlpt" aria-labelledby="quiz-tab-jlpt" hidden={mode !== 'jlpt'}>
        {jlptQuiz}
      </div>
    </div>
  );
}
