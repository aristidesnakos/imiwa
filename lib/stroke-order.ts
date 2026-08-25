export class StrokeOrderService {
  private cache = new Map<string, string>();

  async loadSVG(kanji: string): Promise<string | null> {
    if (this.cache.has(kanji)) {
      return this.cache.get(kanji)!;
    }

    const hex = this.getUnicodeHex(kanji);
    const url = `/api/kanji-svg/${hex}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const rawSvg = await response.text();
      const svg = this.cleanSVG(rawSvg);
      this.cache.set(kanji, svg);
      return svg;
    } catch (error) {
      console.error('StrokeOrderService: Error fetching SVG:', error);
      return null;
    }
  }

  // The XML declaration and the internal-subset DOCTYPE are dropped because
  // neither is legal inside an HTML document once this string is injected into
  // the page. The KanjiVG copyright comment above them is NOT dropped, and must
  // not be: CC BY-SA 3.0 4(c) requires every copy we distribute to keep the
  // Work's copyright notices intact, and this string is such a copy. It used to
  // be stripped alongside the other two, which read as tidying and was in fact
  // a licence breach on every kanji page. An HTML comment is inert in the DOM
  // and costs a few hundred bytes that are not on any measured budget.
  private cleanSVG(rawSvg: string): string {
    return rawSvg
      .replace(/<\?xml[^>]*\?>/g, '')
      .replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '')
      .trim();
  }

  // KanjiVG names every file after the character's full Unicode code point,
  // zero-padded to five hex digits. charCodeAt returned only the leading
  // surrogate for anything above U+FFFF, which for a CJK Extension B character
  // would have asked the CDN for a lone-surrogate filename that cannot exist —
  // and, worse, asked for the *same* one for every character sharing that
  // surrogate. The current JLPT N5-N1 dataset is entirely BMP so nothing has
  // ever taken this path; codePointAt just stops it from being a trap for
  // whoever adds a Hyogai or Extension-B character later.
  //
  // padStart(5) still spans everything KanjiVG covers: planes 0-2 top out at
  // U+2FFFF, five hex digits. Code points at or above U+100000 would need six
  // and would be rejected by the hex validation in app/api/kanji-svg/[hex] —
  // that plane holds no kanji, so the ceiling is left where it is.
  private getUnicodeHex(kanji: string): string {
    // ?? 0 only for the empty-string case; the resulting 00000 lookup 404s,
    // which loadSVG already surfaces as "no diagram" rather than throwing.
    const codePoint = kanji.codePointAt(0) ?? 0;
    return codePoint.toString(16).padStart(5, '0');
  }

  getUnicodeInfo(kanji: string) {
    const codePoint = kanji.codePointAt(0) ?? 0;
    return {
      hex: '0x' + this.getUnicodeHex(kanji),
      decimal: codePoint,
      unicode: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    };
  }
}

export const strokeOrderService = new StrokeOrderService();
