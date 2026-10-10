import { NextRequest, NextResponse } from 'next/server';
import { lookupKanji } from '@/lib/kanji-lookup';

/**
 * The homepage search's as-you-type list: GET ?q=mizu returns the first few
 * hits, ranked by the same code as /kanji. The data is compiled in and changes
 * only on deploy, so a response can sit in the CDN for a day.
 */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  return NextResponse.json(
    { hits: lookupKanji(q) },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
