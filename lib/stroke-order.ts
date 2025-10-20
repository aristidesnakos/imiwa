export class StrokeOrderService {
  private cache = new Map<string, string>();
  
  async loadSVG(kanji: string): Promise<string | null> {
    if (this.cache.has(kanji)) {
      return this.cache.get(kanji)!;
    }
    
    const hex = this.getUnicodeHex(kanji);
    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${hex}.svg`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const rawSvg = await response.text();
      // Clean the SVG by removing XML declaration and DTD
      const svg = this.cleanSVG(rawSvg);
      this.cache.set(kanji, svg);
      return svg;
    } catch {
      return null;
    }
  }

  private cleanSVG(rawSvg: string): string {
    // Remove XML declaration and DTD sections that cause display issues
    let cleaned = rawSvg
      // Remove XML declaration
      .replace(/<\?xml[^>]*\?>/g, '')
      // Remove DTD declaration (everything from <!DOCTYPE to ]>)
      .replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/g, '')
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Clean up whitespace
      .trim();
    
    return cleaned;
  }
  
  private getUnicodeHex(kanji: string): string {
    return kanji.charCodeAt(0).toString(16).padStart(5, '0');
  }
  
  // Helper method to get Unicode info for display
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