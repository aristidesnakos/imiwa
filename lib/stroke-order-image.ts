/**
 * The stroke-order image: one real, indexable image per character, served by
 * `app/kanji/[character]/stroke-order.svg/route.ts`.
 *
 * Its name and address live here, dependency-free, because four places build
 * them and must agree: the viewer (a client component, so this module ships in
 * the kanji page's bundle), the page's Article JSON-LD, the sitemap, and
 * `scripts/validate-schema.ts`. The server half — fetching KanjiVG and turning
 * a source file into this image — is `lib/kanjivg.ts`, which the client bundle
 * never needs.
 */

/**
 * The served image's intrinsic width and height, in px. The page displays it
 * at 192px; the file claims 1024 so that Google Images, which judges an image
 * by its intrinsic size, sees a large image rather than KanjiVG's 109px one.
 * The viewBox is untouched, so the drawing scales rather than moves.
 */
export const STROKE_ORDER_IMAGE_SIZE = 1024;

/**
 * Root-relative path of a character's stroke-order image, encoded exactly as
 * the character's own page URL is (`/kanji/${encodeURIComponent(kanji)}`), so
 * a page and its image can never disagree about which character a URL names.
 */
export function strokeOrderImagePath(kanji: string): string {
  return `/kanji/${encodeURIComponent(kanji)}/stroke-order.svg`;
}

/**
 * The image's text alternative, also used as the served SVG's `<title>`.
 * English, and it names the character and its meaning, because that is what an
 * image search for "日 stroke order" or "day kanji stroke order" has to match.
 */
export function strokeOrderImageAlt(kanji: string, meaning: string): string {
  return `${kanji} (${meaning}) kanji stroke order diagram with numbered strokes`;
}
