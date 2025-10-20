export class StrokeOrderService {
  private cache = new Map<string, string>();
  
  async loadSVG(kanji: string): Promise<string | null> {
    console.log('StrokeOrderService: Loading SVG for kanji:', kanji);
    
    if (this.cache.has(kanji)) {
      console.log('StrokeOrderService: Found in cache');
      return this.cache.get(kanji)!;
    }
    
    const hex = this.getUnicodeHex(kanji);
    // Use our internal API route that proxies the KanjiVG requests
    const url = `/api/kanji-svg/${hex}`;
    console.log('StrokeOrderService: Fetching from URL:', url);
    
    try {
      const response = await fetch(url);
      console.log('StrokeOrderService: Response status:', response.status, response.ok);
      
      if (!response.ok) {
        console.log('StrokeOrderService: Response not OK');
        return null;
      }
      
      const rawSvg = await response.text();
      console.log('StrokeOrderService: Raw SVG length:', rawSvg.length);
      console.log('StrokeOrderService: Raw SVG preview:', rawSvg.substring(0, 200));
      
      // Clean the SVG by removing XML declaration and DTD
      const svg = this.cleanSVG(rawSvg);
      console.log('StrokeOrderService: Cleaned SVG length:', svg.length);
      this.cache.set(kanji, svg);
      return svg;
    } catch (error) {
      console.error('StrokeOrderService: Error fetching SVG:', error);
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