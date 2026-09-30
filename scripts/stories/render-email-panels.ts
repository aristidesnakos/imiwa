/**
 * scripts/stories/render-email-panels.ts
 *
 *   pnpm stories:render-email-panels <episode-slug>
 *   pnpm stories:render-email-panels --all
 *
 * Bakes each panel's speech bubbles into a JPEG for the weekly episode email:
 * public/stories/<slug>/e1.jpg .. e6.jpg, 1040px square, shown at 520 CSS px.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site draws bubbles as live HTML over the art (components/stories/
 * StoryPanel.tsx) and the art carries no text. A mail client cannot position
 * text over an image, so an email that used the bare art (pN.jpg) showed six
 * pictures with the dialogue underneath, not the comic the site shows. These
 * files are that comic, flattened. They are for email only: the page keeps
 * real text (crawlable, selectable), and the email keeps the Japanese in its
 * alt text and its plain-text part, so nothing depends on the pixels.
 *
 * ONE SOURCE, THREE RENDERERS
 * ---------------------------
 * Geometry is each line's `bubble` from data/stories (percentages of the
 * panel). The type scale is lib/stories/bubble-style.ts, the same module
 * StoryPanel imports. Colours are read from the tokens in app/globals.css, not
 * copied, so a palette change reaches the next render. The markup below is a
 * deliberate mirror of StoryPanel's; change one, change both.
 *
 * The page is laid out at 520 CSS px with deviceScaleFactor 2, so every cqw,
 * the 3px frame and the radius resolve exactly as they do on a 520px panel on
 * the site, and the file comes out at 1040px.
 *
 * HOW IT RENDERS, AND WHY NOT PLAYWRIGHT
 * --------------------------------------
 * `puppeteer` is already a dependency of this repo, and it drives the same
 * headless Chromium the strip pipeline's build.py drives through Playwright
 * (build.py's CHROME path is a Linux sandbox path that does not exist on this
 * Mac). So no new dependency and no Python. Chrome is resolved as
 * $CHROME_PATH, else the installed Google Chrome, else puppeteer's own
 * download. Japanese glyphs come from the system CJK face (Hiragino on macOS),
 * as they do for a visitor on the site; render on a machine whose result you
 * would be happy to look at.
 *
 * Chrome's JPEG encoder is baseline, not progressive. That is fine for email.
 *
 * The output is deterministic per machine, and the files are committed:
 * re-run after importing an episode, or after changing a bubble, the type scale
 * or the palette. `pnpm validate:stories` fails if any registered episode is
 * missing one.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import puppeteer from 'puppeteer';

import { EPISODES } from '../../lib/stories';
import type { Episode, Panel, PanelLine } from '../../lib/stories/types';
import {
  BORDER,
  JA_SIZE,
  NARRATION_RADIUS,
  PAD,
  RADIUS,
  TAIL,
  TAIL_DROP,
} from '../../lib/stories/bubble-style';

const ROOT = resolve(__dirname, '..', '..');
const PUBLIC_DIR = join(ROOT, 'public');

/** CSS px the panel is laid out at; the JPEG is this times SCALE. */
const CSS_WIDTH = 520;
const SCALE = 2;
const QUALITY = 80;
const SIZE_BUDGET_KB = 150;

/** `--name: #hex;` from app/globals.css, so the render tracks the palette. */
function token(name: string): string {
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`app/globals.css has no --${name} hex token`);
  return match[1];
}

/** The site's body font stack (app/globals.css), so CJK falls back the same way. */
const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bubbleHtml(line: PanelLine, ink: string, speech: string, narrationPaper: string): string {
  const narration = line.speaker === 'narration';
  const { x, y, w, tail, tailX } = line.bubble;
  const tailPosition =
    tailX != null
      ? `left:calc(${tailX}% - ${TAIL} / 2);`
      : `${tail === 'bl' ? 'left' : 'right'}:14%;`;
  const tailHtml = tail
    ? `<span style="position:absolute;display:block;width:${TAIL};height:${TAIL};bottom:${TAIL_DROP};${tailPosition}background:${speech};border-right:${BORDER} solid ${ink};border-bottom:${BORDER} solid ${ink};transform:rotate(45deg);"></span>`
    : '';
  return `<div lang="ja" style="position:absolute;text-align:center;font-weight:${narration ? 600 : 700};line-break:strict;overflow-wrap:normal;word-break:keep-all;left:${x}%;top:${y}%;width:${w}%;padding:${PAD};font-size:${JA_SIZE};line-height:1.42;color:${ink};border:${BORDER} solid ${ink};background:${narration ? narrationPaper : speech};border-radius:${narration ? NARRATION_RADIUS : RADIUS};">${escapeHtml(line.ja)}${tailHtml}</div>`;
}

function panelHtml(panel: Panel): string {
  const ink = token('ink-black');
  const stone = token('temple-stone');
  const speech = token('speech-paper');
  const narrationPaper = token('narration-paper');
  const artPath = join(PUBLIC_DIR, panel.art);
  const mime = panel.art.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const art = `data:${mime};base64,${readFileSync(artPath).toString('base64')}`;
  // The frame mirrors StoryPanel's `rounded-xl border-[3px] border-japan-ink-black`,
  // and the page behind it is temple-stone, the email's own background, so the
  // rounded corners do not show a foreign colour.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    /* Tailwind's preflight sets border-box on everything; bubble widths are
       percentages of the panel INCLUDING their padding and border. */
    *,*::before,*::after{box-sizing:border-box;}
    html,body{margin:0;padding:0;background:${stone};font-family:${FONT_STACK};}
    .panel{position:relative;box-sizing:border-box;width:${CSS_WIDTH}px;height:${CSS_WIDTH}px;overflow:hidden;border:3px solid ${ink};border-radius:12px;background:${stone};container-type:inline-size;}
    .panel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
  </style></head><body><div class="panel"><img src="${art}" alt="">${panel.lines
    .map(line => bubbleHtml(line, ink, speech, narrationPaper))
    .join('')}</div></body></html>`;
}

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  // The installed Chrome first: puppeteer's downloaded Chrome for Testing
  // failed to start here (timed out waiting for its DevTools endpoint) where
  // the installed one launched at once.
  const installed = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(installed)) return installed;
  try {
    const own = puppeteer.executablePath();
    if (own && existsSync(own)) return own;
  } catch {
    /* let puppeteer report that it has no browser */
  }
  return undefined;
}

async function render(episodes: readonly Episode[]): Promise<void> {
  // Generous launch timeout: a cold Chrome start on a busy, nearly full disk
  // has taken over a minute, and puppeteer's default of 30s fails it spuriously.
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    timeout: 240_000,
  });
  let oversize = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CSS_WIDTH, height: CSS_WIDTH, deviceScaleFactor: SCALE });
    for (const episode of episodes) {
      const dir = join(PUBLIC_DIR, 'stories', episode.slug);
      mkdirSync(dir, { recursive: true });
      for (const [i, panel] of episode.panels.entries()) {
        await page.setContent(panelHtml(panel), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const jpeg = await page.screenshot({
          type: 'jpeg',
          quality: QUALITY,
          clip: { x: 0, y: 0, width: CSS_WIDTH, height: CSS_WIDTH },
        });
        const file = join(dir, `e${i + 1}.jpg`);
        writeFileSync(file, jpeg);
        const kb = Math.round(statSync(file).size / 1024);
        if (kb > SIZE_BUDGET_KB) oversize++;
        console.log(
          `  ${episode.slug}/e${i + 1}.jpg  ${kb} kB${kb > SIZE_BUDGET_KB ? `  OVER the ${SIZE_BUDGET_KB} kB budget` : ''}`
        );
      }
    }
  } finally {
    await browser.close();
  }
  if (oversize) console.warn(`\n${oversize} file(s) over ${SIZE_BUDGET_KB} kB; lower QUALITY in this script.`);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error('usage: pnpm stories:render-email-panels <episode-slug> | --all');
    process.exit(2);
  }
  const episodes = arg === '--all' ? EPISODES : EPISODES.filter(e => e.slug === arg);
  if (!episodes.length) {
    console.error(
      `No registered episode "${arg}". Registered: ${EPISODES.map(e => e.slug).join(', ')}.\n` +
        'An episode must be in lib/stories/index.ts before its email panels can be rendered.'
    );
    process.exit(1);
  }
  await render(episodes);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
