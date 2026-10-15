/**
 * The tunes up for audition, for the local-dev switcher on /play
 * (components/play/TuneSwitcher.tsx). A local developer tool, like /admin: a
 * 404 in production, so the candidates stay on the server and out of the
 * client bundle. Choosing a tune means moving it into lib/play/theme.ts
 * (scripts/music/candidates.ts says how).
 */

import { NextResponse } from 'next/server';
import { blockedResponse } from '@/lib/sentences/local-only';
import { THEME } from '@/lib/play/theme';
import { CANDIDATES } from '@/scripts/music/candidates';

export const dynamic = 'force-dynamic';

export async function GET() {
  const blocked = blockedResponse();
  if (blocked) return blocked;
  return NextResponse.json({
    tunes: CANDIDATES.map(c => ({
      id: c.id,
      name: c.name,
      bpm: c.source.bpm,
      shipped: c.source === THEME,
      source: c.source,
    })),
  });
}
