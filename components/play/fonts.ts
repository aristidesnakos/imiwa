/**
 * Tan Dash's two faces, self-hosted by next/font so /play makes no request to
 * Google at runtime. Imported only by components/play, so they are preloaded on
 * /play and nowhere else.
 *
 *  - Press Start 2P: the arcade's pixel headings, buttons and HUD.
 *  - DotGothic16: kanji, kana and every Japanese line, on the canvas and in the
 *    overlays. `subsets: ['latin']` decides only what is PRELOADED. next/font
 *    still serves every one of Google's unicode-range slices, so a Japanese
 *    glyph arrives when the page first uses it; the engine asks for the slices
 *    a world needs a world ahead (lib/play/engine.ts, loadWorldGlyphs).
 *
 * The title screen is server HTML and the page's LCP, so the swap from
 * fallback to webfont must not move it (CLS). Both faces are fixed-pitch
 * (measured: Press Start 2P 1em per glyph; DotGothic16 0.5em per ASCII glyph,
 * 1em per kana), so the first fallback is a local monospace (0.600em: Courier
 * New, Menlo, Roboto Mono...) scaled to the same advance, declared in
 * TanDash.module.css as 'Tan Dash Pixel Fallback' (size-adjust 166.6%) and
 * 'Tan Dash Dot Fallback' (83.3%, Latin only, so kana fall through to the
 * Japanese faces). Every string is then the same width before and after the
 * swap. next/font's own adjusted fallback is off: it is Arial at 224%, and
 * Arial is proportional, so its capitals overshoot; KANJI-DEX wrapped and the
 * swap moved the panels more than it saved (measured in headless Chrome).
 */

import { DotGothic16, Press_Start_2P } from 'next/font/google';

export const pixelFont = Press_Start_2P({
  weight: '400',
  style: 'normal',
  subsets: ['latin'],
  display: 'swap',
  variable: '--td-font-pixel',
  fallback: ['Tan Dash Pixel Fallback', 'Courier New', 'monospace'],
  adjustFontFallback: false,
});

export const dotFont = DotGothic16({
  weight: '400',
  style: 'normal',
  subsets: ['latin'],
  display: 'swap',
  variable: '--td-font-dot',
  fallback: ['Tan Dash Dot Fallback', 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'sans-serif'],
  adjustFontFallback: false,
});
