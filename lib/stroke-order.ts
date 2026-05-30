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

  private getUnicodeHex(kanji: string): string {
    return kanji.charCodeAt(0).toString(16).padStart(5, '0');
  }

  getUnicodeInfo(kanji: string) {
    const codePoint = kanji.charCodeAt(0);
    return {
      hex: '0x' + this.getUnicodeHex(kanji),
      decimal: codePoint,
      unicode: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
    };
  }
}

export const strokeOrderService = new StrokeOrderService();
