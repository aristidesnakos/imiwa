'use client';

/**
 * STUB from the /play contract commit. The game island replaces this file.
 * Contract: a client component, `<TanDash data={buildPlayData()} />`, rendered
 * by app/play/page.tsx inside the page's <main>. It owns the 9:16 stage, the
 * canvas engine (lib/play/engine.ts), the title / pause / results overlays,
 * and every goal in lib/play/measure.ts except site_visit_return.
 */

import type { PlayData } from '@/lib/play/types';

export function TanDash({ data }: { data: PlayData }) {
  return (
    <div aria-label="Tan Dash" className="mx-auto aspect-[9/16] w-full max-w-sm">
      {data.kanji.length} kanji, {data.worlds.length} worlds
    </div>
  );
}
