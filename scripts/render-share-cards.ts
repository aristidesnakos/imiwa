/**
 * scripts/render-share-cards.ts
 *
 *   pnpm og:render                       every page card and every episode
 *   pnpm og:render stories kanji-n5-quiz the named page cards
 *   pnpm og:render episode:<slug> [--panels 4,5,6] [--square <png>]
 *
 * Draws the 1200x630 link cards that Facebook, X and chat apps show for a
 * shared URL (lib/seo/share-cards.ts lists them). The page cards go to
 * public/og/<id>.jpg; an episode's card goes to public/stories/<slug>/og.jpg.
 *
 * THE RULES THE CARDS KEEP
 * ------------------------
 * - No image model draws any text. Every word is set here in HTML, in Noto
 *   Serif JP (display) and Noto Sans JP (body), the web cuts of Noto Serif /
 *   Sans CJK JP, and Chromium renders it. The fonts are fetched from Google
 *   Fonts at render time; the run fails, rather than falling back to Hiragino,
 *   if either did not load.
 * - Tan is always one of the real cutouts in public/assets/tan-*.png, and never
 *   mirrored.
 * - Every kanji set on a card must be on the N5 list: the run checks each card's
 *   text against lib/constants/n5-kanji.ts, prints the check and refuses to
 *   write a card that fails it. (The 探 on Tan's headband is part of the drawn
 *   character, not text on the card.)
 * - Colours are the brand palette of the strip, as named constants below.
 *
 * EPISODE CARDS
 * -------------
 * Three panels of the comic with their speech bubbles, under the episode's
 * title. The panels come from the episode's email panels (e1..e6.jpg, the
 * bubbles baked in from the same geometry the page uses), so a card needs
 * nothing outside this repo. EPISODE_CARDS picks the three per episode by eye:
 * faces visible, no bubble over a face or over another bubble's text. A new
 * episode gets panels 1-3 until someone looks and adds an entry.
 *
 * `--square` takes the panels from the strip pipeline's composited square
 * instead (strips/ep-NN/out/<slug>-square.png, 3x2 panels at fixed positions).
 *
 * Output is a JPEG under ~300 kB: quality starts at 88 and steps down until it
 * fits. Commit the files; nothing renders at request time.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import puppeteer, { type Page } from 'puppeteer';

import { N5_KANJI } from '../lib/constants/n5-kanji';
import { EPISODES } from '../lib/stories';
import type { Episode } from '../lib/stories/types';
import { SHARE_CARDS, SHARE_CARD_SIZE, type ShareCardId } from '../lib/seo/share-cards';

const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const { width: W, height: H } = SHARE_CARD_SIZE;
const BUDGET_KB = 300;

// The strip's brand palette (strips/build.py), the only colours a card uses.
const SAGE = '#C0D8B4';
const SAGE_DEEP = '#9CB49C';
const TERRA = '#CC543C';
const TERRA_INK = '#9B3A26'; // terracotta deep enough to carry cream text
const INK = '#3E2F26';
const INK_2 = '#4A382E';
const CREAM = '#FAF6EE';

const FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700;900&family=Noto+Sans+JP:wght@500;700&display=block';
const SERIF = "'Noto Serif JP', serif";
const SANS = "'Noto Sans JP', sans-serif";

/** Three panels per episode, picked by eye (see the header). 1-based. */
const EPISODE_CARDS: Record<string, readonly [number, number, number]> = {
  'tan-climbs-the-mountain': [4, 5, 6],
  'tan-finds-the-river': [4, 5, 6],
  'tan-goes-to-school': [4, 5, 6],
  'a-rainy-day-off': [2, 3, 5],
  'the-train-east': [2, 3, 5],
  'tans-family-and-friends': [2, 3, 5],
  'counting-at-the-market': [2, 3, 5],
  'how-much-is-it': [2, 3, 5],
};

// The square's panel grid, measured on build.py's output: 337px boxes with a
// 3px ink frame, columns at x = 22, 371, 720 and rows at y = 130, 541.
const SQUARE = { x0: 22, y0: 130, dx: 349, dy: 411, box: 337, frame: 3 };
// An email panel is 1040px with a 6px ink frame (3 CSS px at 2x).
const EPANEL = { size: 1040, frame: 6 };

// ─── helpers ────────────────────────────────────────────────────────────────

function dataUri(file: string): string {
  const ext = file.endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${readFileSync(file).toString('base64')}`;
}

const asset = (rel: string) => dataUri(join(PUBLIC_DIR, rel));

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const N5 = new Set(N5_KANJI.map(k => k.kanji));
const IDEOGRAPH = /\p{Script=Han}/gu;

/** Every kanji in `texts` must be N5. Returns the kanji found, or throws. */
function checkN5(card: string, texts: string[]): string[] {
  const found = [...new Set(texts.join(' ').match(IDEOGRAPH) ?? [])];
  const bad = found.filter(c => !N5.has(c));
  if (bad.length) {
    throw new Error(`${card}: ${bad.join(' ')} not on the N5 list (lib/constants/n5-kanji.ts)`);
  }
  return found;
}

/**
 * A crop of a larger image into a framed box: the image is scaled so the
 * region (rx, ry, rw, rh) of the source fills the box's inside exactly.
 */
function crop(src: string, srcW: number, srcH: number, r: [number, number, number, number], inner: number): string {
  const [rx, ry, rw] = r;
  const k = inner / rw;
  return `<img src="${src}" style="position:absolute;width:${srcW * k}px;height:${srcH * k}px;left:${-rx * k}px;top:${-ry * k}px;max-width:none" alt="">`;
}

function page(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS_CSS}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${CREAM}}
body{font-family:${SANS};color:${INK};-webkit-font-smoothing:antialiased}
.card{position:relative;width:${W}px;height:${H}px;background:${CREAM};overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(${SAGE} 1px,transparent 1px),linear-gradient(90deg,${SAGE} 1px,transparent 1px);background-size:48px 48px;background-position:-1px -1px;opacity:.32}
.blob{position:absolute;border-radius:50%;background:${SAGE};opacity:.55}
.pill{display:inline-flex;align-items:center;background:${TERRA_INK};color:${CREAM};font-weight:700;font-size:19px;letter-spacing:.14em;text-transform:uppercase;padding:9px 22px 10px;border-radius:999px;white-space:nowrap}
.serif{font-family:${SERIF}}
.h1{font-family:${SERIF};font-weight:900;color:${INK};letter-spacing:-.01em;line-height:1.04}
.tag{font-weight:500;color:${INK_2};font-size:27px;line-height:1.42}
.url{position:absolute;font-weight:700;color:${INK_2};font-size:24px;letter-spacing:.01em}
.url b{color:${TERRA}}
.frame{position:absolute;overflow:hidden;border:4px solid ${INK};border-radius:18px;background:${CREAM}}
.tan{position:absolute;display:block}
</style></head><body><div class="card"><div class="grid"></div>${body}</div></body></html>`;
}

// ─── the page cards ─────────────────────────────────────────────────────────

type Card = { out: string; html: string; texts: string[]; label: string };

function storiesCard(): Card {
  const tiles: { slug: string; n: number; x: number; y: number; s: number; rot: number }[] = [
    { slug: 'how-much-is-it', n: 3, x: 618, y: 70, s: 236, rot: -7 },
    { slug: 'tans-family-and-friends', n: 2, x: 880, y: 44, s: 236, rot: 5 },
    { slug: 'the-train-east', n: 2, x: 700, y: 318, s: 236, rot: 3 },
  ];
  const tileHtml = tiles
    .map(
      t =>
        `<div class="frame" style="left:${t.x}px;top:${t.y}px;width:${t.s}px;height:${t.s}px;transform:rotate(${t.rot}deg);box-shadow:8px 10px 0 ${SAGE_DEEP}"><img src="${asset(`stories/${t.slug}/p${t.n}.jpg`)}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>`
    )
    .join('');
  const ja = 'タンの たびの はなし';
  const html = page(`
<div class="blob" style="width:620px;height:620px;left:640px;top:40px"></div>
${tileHtml}
<img class="tan" src="${asset('assets/tan-wave.png')}" style="width:360px;height:360px;left:868px;top:282px">
<div style="position:absolute;left:64px;top:66px;width:560px">
  <div class="pill">Free · new every week</div>
  <div class="h1" style="font-size:96px;margin-top:30px">Tan’s<br>Stories</div>
  <div class="serif" style="font-weight:700;font-size:34px;color:${TERRA};margin-top:18px">${ja}</div>
  <div class="tag" style="margin-top:18px;width:520px">Cute six-panel comics in easy Japanese. Every word is JLPT N5.</div>
</div>
<div class="url" style="left:64px;bottom:44px">michikanji.com<b>/stories</b></div>`);
  return { out: SHARE_CARDS.stories.file, html, texts: [ja], label: 'stories' };
}

function quizCard(): Card {
  const kanji = '水';
  const choices = [
    ['みず', 'mizu'],
    ['かわ', 'kawa'],
    ['やま', 'yama'],
    ['あめ', 'ame'],
  ];
  const chips = choices
    .map(
      ([kana, romaji]) =>
        `<div style="display:flex;align-items:baseline;gap:10px;border:3px solid ${SAGE_DEEP};background:${CREAM};border-radius:14px;padding:8px 18px 10px;width:206px"><span class="serif" style="font-weight:700;font-size:30px;color:${INK}">${kana}</span><span style="font-weight:500;font-size:20px;color:${SAGE_DEEP}">${romaji}</span></div>`
    )
    .join('');
  const html = page(`
<div class="blob" style="width:560px;height:560px;left:600px;top:60px"></div>
<div style="position:absolute;left:628px;top:96px;width:330px;height:330px;transform:rotate(-4deg);background:${CREAM};border:6px solid ${INK};border-radius:30px;box-shadow:12px 14px 0 ${SAGE_DEEP};display:flex;align-items:center;justify-content:center">
  <span class="serif" style="font-weight:900;font-size:236px;line-height:1;color:${INK};margin-top:-14px">${kanji}</span>
</div>
<img class="tan" src="${asset('assets/tan-point.png')}" style="width:340px;height:340px;left:880px;top:270px">
<div style="position:absolute;left:64px;top:62px;width:560px">
  <div class="pill">Free JLPT N5 kanji quiz</div>
  <div class="h1" style="font-size:80px;margin-top:28px">Can you<br>read this?</div>
  <div style="display:grid;grid-template-columns:repeat(2,max-content);gap:14px;margin-top:30px">${chips}</div>
  <div class="tag" style="margin-top:24px;font-size:24px">All ${N5_KANJI.length} N5 kanji · four choices · no sign-up</div>
</div>
<div class="url" style="left:64px;bottom:40px">michikanji.com<b>/kanji/n5/quiz</b></div>`);
  return {
    out: SHARE_CARDS['kanji-n5-quiz'].file,
    html,
    texts: [kanji, ...choices.map(c => c[0])],
    label: 'kanji-n5-quiz',
  };
}

/**
 * The real sheet: page 1 of public/downloads/michikanji-n5-kanji-practice-sheets.pdf
 * (日), rasterised by pdftoppm into the scratch file this function is handed.
 */
function sheetsCard(id: 'kanji-sheets' | 'free-resources', sheetPng: string): Card {
  const kanjiPage = id === 'kanji-sheets';
  const headline = kanjiPage ? `Kanji practice<br><span style="color:${TERRA}">sheets</span>` : `Free practice<br><span style="color:${TERRA}">sheets</span>`;
  const tag = kanjiPage
    ? 'Stroke order, readings and 80 practice squares for every kanji, JLPT N5 to N1.'
    : 'Kanji and kana sheets with stroke order and practice squares.';
  const pill = kanjiPage ? 'Free · printable' : 'Free · printable PDFs';
  const path = kanjiPage ? '/free-resources/kanji-sheets' : '/free-resources';
  // A4 is 1:1.414.
  const sw = 372;
  const sh = Math.round(sw * 1.4144);
  const html = page(`
<div class="blob" style="width:600px;height:600px;left:640px;top:30px"></div>
${
  kanjiPage
    ? ''
    : `<div style="position:absolute;left:642px;top:58px;width:${sw}px;height:${Math.round(sw * 1.1818)}px;transform:rotate(-7deg);background:${CREAM};border:2px solid ${SAGE_DEEP};border-radius:6px;overflow:hidden;box-shadow:10px 12px 0 ${SAGE_DEEP}"><img src="${asset('assets/hiragana-sheet.png')}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block" alt=""></div>`
}
<div style="position:absolute;left:${kanjiPage ? 690 : 742}px;top:${kanjiPage ? 46 : 84}px;width:${sw}px;height:${sh}px;transform:rotate(4deg);background:${CREAM};border:2px solid ${SAGE_DEEP};border-radius:6px;overflow:hidden;box-shadow:12px 14px 0 ${SAGE_DEEP}">
  <img src="${dataUri(sheetPng)}" style="width:100%;height:100%;display:block" alt="">
</div>
<img class="tan" src="${asset('assets/tan-brush.png')}" style="width:${kanjiPage ? 316 : 330}px;height:${kanjiPage ? 316 : 330}px;left:${kanjiPage ? 640 : 560}px;top:${kanjiPage ? 314 : 300}px">
<div style="position:absolute;left:64px;top:66px;width:600px">
  <div class="pill">${pill}</div>
  <div class="h1" style="font-size:${kanjiPage ? 80 : 84}px;margin-top:30px">${headline}</div>
  <div class="tag" style="margin-top:22px;width:${kanjiPage ? 500 : 490}px">${tag}</div>
</div>
<div class="url" style="left:64px;bottom:44px">michikanji.com<b>${path}</b></div>`);
  return { out: SHARE_CARDS[id].file, html, texts: ['日'], label: id };
}

// ─── episode cards ──────────────────────────────────────────────────────────

function episodeCard(episode: Episode, panels: readonly number[], square?: string): Card {
  const box = 352; // outer size of a panel frame
  const inner = box - 8; // inside the 4px frame
  const gap = 26;
  const left = (W - (box * 3 + gap * 2)) / 2;
  const squareUri = square ? dataUri(square) : '';
  const frames = panels
    .map((n, i) => {
      let img: string;
      if (square) {
        const c = (n - 1) % 3;
        const r = Math.floor((n - 1) / 3);
        const x = SQUARE.x0 + c * SQUARE.dx + SQUARE.frame + 1;
        const y = SQUARE.y0 + r * SQUARE.dy + SQUARE.frame + 1;
        const size = SQUARE.box - 2 * (SQUARE.frame + 1);
        img = crop(squareUri, 1080, 1080, [x, y, size, size], inner);
      } else {
        const f = EPANEL.frame + 1;
        img = crop(asset(`stories/${episode.slug}/e${n}.jpg`), EPANEL.size, EPANEL.size, [f, f, EPANEL.size - 2 * f, EPANEL.size - 2 * f], inner);
      }
      return `<div class="frame" style="left:${left + i * (box + gap)}px;top:156px;width:${box}px;height:${box}px;box-shadow:7px 8px 0 ${SAGE}">${img}</div>`;
    })
    .join('');
  const html = page(`
<div style="position:absolute;left:${left}px;top:34px;right:${left}px;display:flex;align-items:flex-start;justify-content:space-between">
  <div>
    <div style="display:flex;align-items:baseline;gap:14px;white-space:nowrap"><span style="font-weight:700;font-size:18px;letter-spacing:.16em;color:${TERRA};text-transform:uppercase">Episode ${episode.number}</span><span style="font-weight:500;font-size:24px;color:${INK_2}">${esc(episode.titleEn)}</span></div>
    <div class="serif" style="font-weight:700;font-size:52px;line-height:1.2;color:${INK};white-space:nowrap;margin-top:2px" lang="ja">${esc(episode.titleJa)}</div>
  </div>
  <div class="pill" style="margin-top:20px">Free · all JLPT ${episode.level}</div>
</div>
${frames}
<div class="url" style="left:${left}px;bottom:36px">michikanji.com<b>/stories</b></div>
<div style="position:absolute;right:${left}px;bottom:38px;font-weight:500;font-size:22px;color:${INK_2}">The Travels of Tan · six panels, with English</div>`);
  return {
    out: `/stories/${episode.slug}/og.jpg`,
    html,
    texts: [episode.titleJa],
    label: `episode:${episode.slug}${square ? ' (from the strip square)' : ''}`,
  };
}

// ─── rendering ──────────────────────────────────────────────────────────────

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const installed = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(installed)) return installed;
  return undefined;
}

async function shoot(pageHandle: Page, card: Card): Promise<void> {
  await pageHandle.setContent(card.html, { waitUntil: 'load', timeout: 120_000 });
  await pageHandle.evaluate(() => document.fonts.ready);
  const loaded: string[] = await pageHandle.evaluate(() =>
    [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, ''))
  );
  for (const family of ['Noto Serif JP', 'Noto Sans JP']) {
    if (!loaded.includes(family)) throw new Error(`${card.label}: ${family} did not load (got ${[...new Set(loaded)].join(', ') || 'none'})`);
  }
  const file = join(PUBLIC_DIR, card.out);
  mkdirSync(dirname(file), { recursive: true });
  for (let quality = 88; ; quality -= 4) {
    const jpeg = await pageHandle.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: W, height: H } });
    if (jpeg.length <= BUDGET_KB * 1024 || quality <= 60) {
      writeFileSync(file, jpeg);
      console.log(`  ${card.out}  ${W}x${H}  ${Math.round(statSync(file).size / 1024)} kB  q${quality}`);
      return;
    }
  }
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const flagValues = new Set([arg('--panels'), arg('--square')].filter(Boolean));
  const wanted = process.argv.slice(2).filter(a => !a.startsWith('--') && !flagValues.has(a));
  const pageIds = Object.keys(SHARE_CARDS) as ShareCardId[];
  const targets = wanted.length ? wanted : [...pageIds, ...EPISODES.map(e => `episode:${e.slug}`)];

  const cards: Card[] = [];
  let sheetPng: string | undefined;
  for (const target of targets) {
    if (target.startsWith('episode:')) {
      const slug = target.slice('episode:'.length);
      const episode = EPISODES.find(e => e.slug === slug);
      if (!episode) throw new Error(`No registered episode "${slug}"`);
      const panels = (arg('--panels')?.split(',').map(Number) ?? EPISODE_CARDS[slug] ?? [1, 2, 3]) as number[];
      if (panels.length !== 3 || panels.some(n => !(n >= 1 && n <= 6))) throw new Error('--panels takes three panel numbers, 1-6');
      if (!EPISODE_CARDS[slug] && !arg('--panels')) console.log(`  note: ${slug} has no EPISODE_CARDS entry; using panels 1-3. Look at the card.`);
      const square = wanted.length === 1 ? arg('--square') : undefined;
      if (square && !existsSync(square)) throw new Error(`--square ${square} does not exist`);
      cards.push(episodeCard(episode, panels, square));
    } else if (pageIds.includes(target as ShareCardId)) {
      const id = target as ShareCardId;
      if (id === 'stories') cards.push(storiesCard());
      else if (id === 'kanji-n5-quiz') cards.push(quizCard());
      else {
        if (!sheetPng) sheetPng = rasteriseSheet();
        cards.push(sheetsCard(id, sheetPng));
      }
    } else {
      throw new Error(`Unknown card "${target}". Cards: ${pageIds.join(', ')}, episode:<slug>.`);
    }
  }

  console.log('N5 check (every kanji set as text on a card):');
  for (const card of cards) {
    const kanji = checkN5(card.label, card.texts);
    console.log(`  ${card.label}: ${kanji.length ? `${kanji.join(' ')} — all on the N5 list` : 'no kanji'}`);
  }

  const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), timeout: 240_000 });
  try {
    const p = await browser.newPage();
    await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    console.log('Cards:');
    for (const card of cards) await shoot(p, card);
  } finally {
    await browser.close();
  }
}

/** Page 1 of the N5 PDF as a PNG, via pdftoppm (poppler). */
function rasteriseSheet(): string {
  const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
  const { mkdtempSync } = require('node:fs') as typeof import('node:fs');
  const { tmpdir } = require('node:os') as typeof import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'mk-sheet-'));
  const pdf = join(PUBLIC_DIR, 'downloads', 'michikanji-n5-kanji-practice-sheets.pdf');
  execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '110', '-png', '-singlefile', pdf, join(dir, 'sheet')]);
  return join(dir, 'sheet.png');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
