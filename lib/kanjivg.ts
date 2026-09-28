/**
 * KanjiVG, the source of every stroke-order diagram on the site: where a
 * character's file lives and how it is fetched, the licence facts every copy
 * has to carry, and how a source file becomes the standalone image.
 *
 * Two routes serve diagrams, to two different consumers:
 *
 *   /api/kanji-svg/<hex>            The source file, untouched. The viewer
 *                                   injects it inline so its CSS can animate the
 *                                   strokes, and fetches it only on Play.
 *   /kanji/<char>/stroke-order.svg  A self-contained copy that looks like the
 *                                   viewer at rest. It is what the page shows
 *                                   before Play, and what search engines index:
 *                                   an <img> in the server HTML, the first
 *                                   `image` of the Article JSON-LD, and an
 *                                   <image:loc> in the sitemap.
 *
 * Both fetch through fetchKanjiVgSource, so a character's file is one Data
 * Cache entry whichever route asked for it first.
 *
 * Server-side use only in practice: nothing here needs the browser, and the
 * client imports its half (the image's URL and alt text) from
 * `lib/stroke-order-image.ts` instead. Relative imports, because
 * `scripts/validate-schema.ts` imports this module under tsx.
 */

import { SITE_URL } from './seo/site';
import { STROKE_ORDER_IMAGE_SIZE } from './stroke-order-image';

/** jsDelivr's mirror of the KanjiVG repository's `kanji/` directory. */
const KANJIVG_SOURCE_BASE = 'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji';

/** How long Next's Data Cache reuses a fetched source file: a day. */
const SOURCE_REVALIDATE_SECONDS = 86400;

/**
 * What every copy of a KanjiVG diagram has to carry, and what the Article
 * JSON-LD publishes as the image's licence metadata.
 *
 * `copyrightNotice` is verbatim from the first line of the header comment
 * that every KanjiVG file carries (identical across the files checked on
 * 2026-09-28). The JSON-LD claims it is the file's own notice, so if KanjiVG
 * ever rewrites that header, change this with it.
 */
export const KANJIVG_LICENCE = {
  copyrightNotice: 'Copyright (C) 2009/2010/2011 Ulrich Apel.',
  creator: 'Ulrich Apel',
  creditText: 'KanjiVG (Ulrich Apel)',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  projectUrl: 'https://kanjivg.tagaini.net/',
} as const;

/**
 * The five-digit hex a character's KanjiVG file is named after: its full code
 * point, from codePointAt(0). Never charCodeAt, which returns a lone surrogate
 * above U+FFFF. Five digits span planes 0-2, which is everything KanjiVG has.
 */
export function kanjiVgHex(character: string): string {
  return (character.codePointAt(0) ?? 0).toString(16).padStart(5, '0');
}

export interface KanjiVgSource {
  /** jsDelivr's HTTP status. */
  status: number;
  /** The file, verbatim, or null when the status was not a success. */
  svg: string | null;
}

/**
 * Fetch one KanjiVG source file, verbatim. `hex` is the file name without its
 * extension, as kanjiVgHex produces it. A network failure throws.
 *
 * The Data Cache stores only 200 responses, so a failed fetch is never pinned
 * for the day. That matters: on 2026-09-24 jsDelivr answered 403 and 404 for
 * files that exist and loaded fine minutes later.
 */
export async function fetchKanjiVgSource(hex: string): Promise<KanjiVgSource> {
  const response = await fetch(`${KANJIVG_SOURCE_BASE}/${hex}.svg`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)',
      'Accept': 'image/svg+xml,text/xml,application/xml,*/*',
      'Referer': 'https://github.com/KanjiVG/kanjivg',
    },
    next: { revalidate: SOURCE_REVALIDATE_SECONDS },
  });

  return {
    status: response.status,
    svg: response.ok ? await response.text() : null,
  };
}

/**
 * How the viewer draws the diagram at rest, restated inside the file, because
 * an <img> cannot inherit the page's CSS.
 *
 * The `path` rule repeats `.stroke-animation path` in app/globals.css; change
 * the two together. The font is the stack the stroke numbers inherit from
 * `html, body` there, which an image would otherwise swap for the browser's
 * default serif. KanjiVG's own group styles supply the rest, exactly as they do
 * on the page: round caps and joins on the strokes, #808080 on the numbers.
 *
 * `font-size` restates KanjiVG's own `font-size:8`, which has no unit. Chrome
 * reads it as 8px (measured on the live page), but a unitless length in a
 * style attribute is not something every engine has to accept, and a dropped
 * value would fall back to 16px, doubling the numbers. 8px is what the page
 * renders.
 */
const RESTING_STYLE =
  'path{fill:none;stroke:#2c2c2c;stroke-width:2}' +
  'text{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;font-size:8px}';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The change notice CC BY-SA 3.0 §3(b) asks for ("clearly label ... that
 * changes were made to the original Work"), as an XML comment. It carries the
 * full attribution too, not just the change, so the file still names KanjiVG,
 * its author and the licence if upstream ever drops its header. XML comments
 * cannot contain two hyphens in a row, and nothing below does.
 */
function modificationNotice(character: string): string {
  const codePoint = `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;
  return [
    '<!--',
    `Stroke order diagram for ${character} (${codePoint}) from KanjiVG`,
    `(${KANJIVG_LICENCE.projectUrl}), ${KANJIVG_LICENCE.copyrightNotice}`,
    'Licensed under the Creative Commons Attribution-Share Alike 3.0 licence',
    `(${KANJIVG_LICENCE.licenseUrl}).`,
    '',
    `Modified by MichiKanji (${SITE_URL}): the styling was`,
    'changed for display as a standalone image. Stroke colour and width, the',
    'stroke-number font and the image size differ from the KanjiVG file, and a',
    'title and a stylesheet were added. The strokes, their order and their',
    'numbers are unchanged. This modified file is distributed under the same',
    'licence.',
    '-->',
  ].join('\n');
}

/**
 * Give the root element the image's intrinsic size. A viewBox has to exist
 * first, or the drawing would stay at its original scale in the corner of a
 * much larger canvas; every KanjiVG file has one, so the fallback below only
 * guards against upstream changing shape.
 */
function sizeRoot(openTag: string): string {
  let tag = openTag;
  if (!/\sviewBox="/.test(tag)) {
    const width = /\swidth="([\d.]+)"/.exec(tag)?.[1] ?? '109';
    const height = /\sheight="([\d.]+)"/.exec(tag)?.[1] ?? '109';
    tag = tag.replace(/^<svg\b/, `<svg viewBox="0 0 ${width} ${height}"`);
  }
  for (const attribute of ['width', 'height']) {
    const existing = new RegExp(`\\s${attribute}="[^"]*"`);
    const sized = ` ${attribute}="${STROKE_ORDER_IMAGE_SIZE}"`;
    tag = existing.test(tag) ? tag.replace(existing, sized) : tag.replace(/^<svg\b/, `<svg${sized}`);
  }
  return tag;
}

/**
 * Turn a KanjiVG source file into the standalone image served at
 * /kanji/<char>/stroke-order.svg, or return null if there is no <svg> root to
 * work on.
 *
 * Everything KanjiVG wrote stays: the XML declaration, its copyright header
 * byte for byte (CC BY-SA 3.0 §4(c): keep intact all copyright notices), the
 * DOCTYPE, and every path, number and kvg: attribute. Added: our change notice,
 * directly after KanjiVG's header, then a <title> and the resting stylesheet as
 * the root's first children. Changed: the root's width and height.
 */
export function toStandaloneStrokeOrderSvg(
  source: string,
  { character, title }: { character: string; title: string }
): string | null {
  const root = /<svg\b[^>]*>/.exec(source);
  if (!root) return null;

  const prolog = source.slice(0, root.index);
  const body = source.slice(root.index + root[0].length);

  // Before the DOCTYPE, or before the root when there is none: that is after
  // KanjiVG's header, and still after the XML declaration, which has to stay
  // the first thing in the file.
  const doctypeAt = prolog.search(/<!DOCTYPE\b/);
  const noticeAt = doctypeAt === -1 ? prolog.length : doctypeAt;

  return (
    prolog.slice(0, noticeAt) +
    `${modificationNotice(character)}\n` +
    prolog.slice(noticeAt) +
    sizeRoot(root[0]) +
    `\n<title>${escapeXml(title)}</title>\n<style>${RESTING_STYLE}</style>` +
    body
  );
}
