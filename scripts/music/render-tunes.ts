/**
 * Renders the shipped tune (lib/play/theme.ts) to a WAV file to listen to, or
 * to check a change to the voices or the levels without opening the game.
 *
 *   pnpm music:render
 *
 * The audio is made by the game's own synth (lib/play/music.ts `playStep`) in
 * headless Chrome's OfflineAudioContext, so what you hear is what ships, down
 * to the pulse waves. The file goes to out/music/theme.wav (git-ignored): one
 * loop plus four bars of the next, so the seam where it wraps is audible, and
 * the peak and RMS are printed (a peak over about -3 dBFS means a click or a
 * runaway voice: the first renders caught exactly that).
 *
 * Needs Google Chrome (CHROME_PATH, or /Applications/Google Chrome.app) like
 * `pnpm og:render`. esbuild comes from tsx's own dependency, so there is
 * nothing extra to install.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';
import { THEME } from '../../lib/play/theme';
import { parseTune, stepSeconds } from '../../lib/play/tune';

const OUT = path.join(process.cwd(), 'out', 'music');

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const installed = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return fs.existsSync(installed) ? installed : undefined;
}

async function bundleEntry(): Promise<string> {
  // esbuild is tsx's dependency, so it is only resolvable from tsx's own folder under pnpm.
  const fromTsx = createRequire(require.resolve('tsx/package.json'));
  const esbuild = fromTsx('esbuild') as typeof import('esbuild');
  const built = await esbuild.build({
    entryPoints: [path.join(__dirname, 'render-entry.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'MKMusic',
    platform: 'browser',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  return built.outputFiles[0].text;
}

async function main(): Promise<void> {
  const picked = [{ id: 'theme', name: 'Theme', source: THEME }];
  fs.mkdirSync(OUT, { recursive: true });

  const code = await bundleEntry();
  const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), timeout: 120_000 });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>render</title>');
    await page.addScriptTag({ content: code });
    for (const c of picked) {
      const tune = parseTune(c.source);
      const r = await page.evaluate(
        // eslint-disable-next-line no-unused-vars
        (src, loops) => (window as unknown as { MKMusic: { renderTune: (s: unknown, n: number) => Promise<unknown> } }).MKMusic.renderTune(src, loops),
        c.source as unknown as Record<string, unknown>,
        1,
      ) as { wavBase64: string; seconds: number; peak: number; rms: number };
      const file = path.join(OUT, `${c.id}.wav`);
      fs.writeFileSync(file, Buffer.from(r.wavBase64, 'base64'));
      const db = (x: number) => (20 * Math.log10(x)).toFixed(1);
      console.log(
        `${c.name.padEnd(6)} ${c.source.bpm} bpm, ${tune.bars} bars (${(tune.steps * stepSeconds(c.source.bpm, 1)).toFixed(0)} s a loop)  ` +
          `peak ${db(r.peak)} dBFS, rms ${db(r.rms)} dBFS  ->  ${path.relative(process.cwd(), file)}`,
      );
      if (r.peak > 0.9) console.log(`       WARNING: peak ${r.peak.toFixed(2)} is hot; lower a voice in lib/play/music.ts VOL`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
