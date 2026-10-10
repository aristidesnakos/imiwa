import { NextRequest, NextResponse } from 'next/server';
import { searchDestination } from '@/lib/kanji-lookup';

/**
 * Where the homepage search form submits. It works without JavaScript: the
 * form is a plain GET, and this sends the query on to the one kanji it found
 * or to the /kanji results. See lib/kanji-lookup.ts for the rule.
 */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  return NextResponse.redirect(new URL(searchDestination(q), request.url), 302);
}
