/**
 * scripts/jlpt/publish-items.ts
 *
 *   npx tsx --tsconfig tsconfig.json scripts/jlpt/publish-items.ts [--include-pending]
 *
 *   --review <path> / --out <path>   read / write other files instead; for testing
 *
 * Compiles the reviewed items (data/jlpt/review/N5.json) into the compact file the quiz
 * imports (data/jlpt/published/N5.json). Only `approved` items are published, so an item
 * nobody has signed off never reaches the site, and a `rejected` one never does, not even
 * with `--include-pending`. A distractor the reviewer replaced ships as its `replacedBy`.
 * `--include-pending` exists for local development of the UI against real-shaped data and
 * must never be committed: the committed file holds approved items only.
 *
 * The option order is a deterministic shuffle keyed by the item id, so the right answer
 * is not always in the same slot and rebuilding changes nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { JlptItem, PublishedFile, ReviewFile } from '../../lib/jlpt/types';

const ROOT = path.resolve(__dirname, '../..');
const argAfter = (flag: string) => {
  const at = process.argv.indexOf(flag);
  return at >= 0 ? process.argv[at + 1] : undefined;
};
const REVIEW = path.resolve(argAfter('--review') ?? path.join(ROOT, 'data/jlpt/review/N5.json'));
const OUT = path.resolve(argAfter('--out') ?? path.join(ROOT, 'data/jlpt/published/N5.json'));

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const review: ReviewFile = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));
const includePending = process.argv.includes('--include-pending');

const items: JlptItem[] = [];
for (const r of review.items) {
  if (r.status === 'rejected') continue;
  if (r.status === 'pending' && !includePending) continue;
  const texts = r.distractors.map(d => d.replacedBy ?? d.text);
  if (texts.length !== 3) throw new Error(`${r.id}: needs exactly 3 distractors, has ${texts.length}`);
  const options = [r.answerText, ...texts]
    .map(t => ({ t, k: hash(`${r.id}|${t}`) }))
    .sort((a, b) => a.k - b.k || a.t.localeCompare(b.t))
    .map(o => o.t);
  items.push({
    id: r.id,
    mondai: r.mondai,
    set: r.set,
    before: r.before,
    target: r.target,
    after: r.after,
    english: r.english,
    options: options as JlptItem['options'],
    answer: options.indexOf(r.answerText) as JlptItem['answer'],
    source: r.source,
  });
}
items.sort((a, b) => a.set - b.set || a.mondai - b.mondai || a.id.localeCompare(b.id, 'en', { numeric: true }));

// The date moves only when the items do, so a rebuild that changes nothing leaves the
// sitemap's lastmod for /kanji/n5/quiz alone (app/sitemap.xml/route.ts).
const previous: PublishedFile | null = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const unchanged = previous !== null && JSON.stringify(previous.items) === JSON.stringify(items);
const updated = unchanged ? previous.updated : new Date().toISOString().slice(0, 10);

const file: PublishedFile = { level: 'N5', ...(updated ? { updated } : {}), items };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(file) + '\n');
console.log(`published ${items.length} item(s)${includePending ? ' (INCLUDING PENDING — do not commit)' : ''} -> ${OUT.startsWith(ROOT + path.sep) ? path.relative(ROOT, OUT) : OUT}`);
