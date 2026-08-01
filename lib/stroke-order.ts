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

  private cleanSVG(rawSvg: string): string {
    return rawSvg
      .replace(/<\?xml[^>]*\?>/g, '')
      .replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
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
