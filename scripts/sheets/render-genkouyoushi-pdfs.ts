/**
 * Print the blank genkōyōshi sheets to the PDFs /free-resources/genkouyoushi
 * offers for download.
 *
 * Run: pnpm sheets:genkouyoushi-pdfs
 *
 * Each PDF is the print document /api/genkouyoushi/<format> serves, rendered
 * by lib/sheets/genkouyoushi.ts and printed by Chrome, so the file and the
 * Print button give the same sheet. No server is needed: the document is a
 * pure function of the format. Rerun after changing the drawing, and commit
 * the PDFs; `pnpm validate:sheets` fails if either is missing.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { PAPER_DOWNLOADS } from '../../lib/commerce/links';
import { GENKOUYOUSHI_FORMAT_IDS, renderGenkouyoushiDocument } from '../../lib/sheets/genkouyoushi';

const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  // The installed Chrome first, as in scripts/stories/render-email-panels.ts:
  // puppeteer's downloaded Chrome for Testing has failed to start on this Mac.
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

async function main(): Promise<void> {
  const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), timeout: 240_000 });
  try {
    const page = await browser.newPage();
    for (const format of GENKOUYOUSHI_FORMAT_IDS) {
      await page.setContent(renderGenkouyoushiDocument(format), { waitUntil: 'load' });
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      const out = join(PUBLIC_DIR, PAPER_DOWNLOADS[format]);
      writeFileSync(out, pdf);
      console.log(`${format}: ${out} (${(pdf.length / 1024).toFixed(1)} kB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
