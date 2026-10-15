'use client';

/**
 * LOCAL DEV ONLY: a small panel pinned to the top right of /play that swaps the
 * tune while a run is going, to choose between the candidates in
 * scripts/music/candidates.ts. TanDash renders it only when NODE_ENV is
 * 'development', and the list comes from /api/dev/tunes, which is a 404 in
 * production, so nothing here reaches a visitor and the unchosen tunes never
 * reach the client bundle.
 *
 * Its buttons must never take focus: the island hands a focused button its own
 * Space key, so a focused tune button would stop Space making Tan jump. They
 * are out of the tab order and swallow the mousedown that would focus them.
 */

import { useEffect, useState, type RefObject } from 'react';
import type { TanDashEngine } from '@/lib/play/engine';
import type { TuneSource } from '@/lib/play/tune';

interface DevTune {
  id: string;
  name: string;
  bpm: number;
  shipped: boolean;
  source: TuneSource;
}

interface Props {
  engineRef: RefObject<TanDashEngine | null>;
  stageRef: RefObject<HTMLElement | null>;
}

export function TuneSwitcher({ engineRef, stageRef }: Props) {
  const [tunes, setTunes] = useState<DevTune[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/dev/tunes')
      .then(r => (r.ok ? r.json() : null))
      .then((json: { tunes?: DevTune[] } | null) => {
        if (!alive || !json?.tunes) return;
        setTunes(json.tunes);
        setCurrent(json.tunes.find(t => t.shipped)?.id ?? json.tunes[0]?.id ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (tunes.length === 0) return null;

  const pick = (t: DevTune) => {
    engineRef.current?.setTune(t.source);
    setCurrent(t.id);
    stageRef.current?.focus({ preventScroll: true });
  };

  return (
    <div
      role="group"
      aria-label="Tune, local dev only"
      className="fixed right-3 top-24 z-40 flex w-36 flex-col gap-1.5 rounded-md border border-border bg-card p-2 text-card-foreground shadow-md"
    >
      <p className="text-xs font-semibold">♪ Tune</p>
      {tunes.map(t => (
        <button
          key={t.id}
          type="button"
          tabIndex={-1}
          aria-pressed={current === t.id}
          onMouseDown={e => e.preventDefault()}
          onClick={() => pick(t)}
          className={`flex items-baseline justify-between rounded border border-border px-2 py-1 text-left text-sm hover:brightness-90 ${
            current === t.id ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          <span>{t.name}</span>
          <span className="text-xs opacity-80">{t.bpm}</span>
        </button>
      ))}
      <p className="text-xs text-muted-foreground">Local dev only. Restarts the tune from bar 1.</p>
    </div>
  );
}
