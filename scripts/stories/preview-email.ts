/**
 * scripts/stories/preview-email.ts
 *
 *   pnpm email:preview <episode-slug> [output-path] [--weekly]
 *
 * Writes the episode email's full HTML to a file and prints it, so you can open
 * the file in a browser and see what a subscriber gets. Without an output path
 * it writes to the OS temp directory and prints where.
 *
 * The HTML is exactly `quizEmailHtml` (the welcome card by default, the
 * broadcast with --weekly), with one difference for viewing: image URLs point
 * at the production site, so a panel that has not been deployed yet shows as
 * broken here. Pass --local to rewrite them to this checkout's public/ files.
 */

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SITE_URL } from '../../lib/seo/site';
import { EPISODES, episodeBySlug } from '../../lib/stories';
import { quizEmailHtml } from '../../lib/email/quiz-email';

const ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter(a => !a.startsWith('--'));
const [slug, outArg] = positional;

const episode = slug ? episodeBySlug(slug) : undefined;
if (!episode) {
  console.error(
    `usage: pnpm email:preview <episode-slug> [output-path] [--weekly] [--local]\nRegistered: ${EPISODES.map(e => e.slug).join(', ')}`
  );
  process.exit(slug ? 1 : 2);
}

let html = quizEmailHtml(
  episode,
  'https://example.com/unsubscribe-preview',
  flags.has('--weekly') ? 'weekly' : 'welcome'
);
if (flags.has('--local')) {
  // Only the images: the links must keep pointing at the real site.
  html = html
    .split(`src="${SITE_URL}/stories/`)
    .join(`src="file://${join(ROOT, 'public', 'stories')}/`);
}

const out = outArg ? resolve(outArg) : join(tmpdir(), `email-preview-${episode.slug}.html`);
writeFileSync(out, html);
console.log(html);
console.log(`\nWritten to ${out}`);
