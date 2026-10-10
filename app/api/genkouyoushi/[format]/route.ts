import { NextResponse } from 'next/server';
import {
  GENKOUYOUSHI_FORMAT_IDS,
  isGenkouyoushiFormat,
  renderGenkouyoushiDocument,
} from '@/lib/sheets/genkouyoushi';

/**
 * /api/genkouyoushi/standard and /api/genkouyoushi/large — blank genkōyōshi
 * paper as a one-page document to print (lib/sheets/genkouyoushi.ts draws it).
 *
 * Built once, at build time: the document depends on nothing but the format,
 * so there is no reason to render it per request. Under /api/, which
 * robots.txt keeps out of the index: the page that should rank is
 * /free-resources/genkouyoushi, and the PDFs it links are what a search for
 * "genkouyoushi pdf" should find.
 */

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return GENKOUYOUSHI_FORMAT_IDS.map((format) => ({ format }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ format: string }> }) {
  const { format } = await params;
  if (!isGenkouyoushiFormat(format)) {
    return new NextResponse(`Unknown format "${format}": use ${GENKOUYOUSHI_FORMAT_IDS.join(' or ')}`, { status: 404 });
  }
  return new NextResponse(renderGenkouyoushiDocument(format), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
