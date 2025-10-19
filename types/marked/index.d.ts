declare module 'marked' {
  export interface MarkedToken {
    raw: string;
    [key: string]: any;
  }

  export interface MarkedOptions {
    baseUrl?: string;
    breaks?: boolean;
    gfm?: boolean;
    headerIds?: boolean;
    headerPrefix?: string;
    langPrefix?: string;
    mangle?: boolean;
    pedantic?: boolean;
    sanitize?: boolean;
    silent?: boolean;
    smartLists?: boolean;
    smartypants?: boolean;
    xhtml?: boolean;
    [key: string]: any;
  }

  export interface Marked {
    lexer(src: string, options?: MarkedOptions): MarkedToken[];
    parse(src: string, options?: MarkedOptions): string;
    parseInline(src: string, options?: MarkedOptions): string;
    use(extension: any): Marked;
    setOptions(options: MarkedOptions): Marked;
    defaults: MarkedOptions;
  }

  export const marked: Marked;
}
