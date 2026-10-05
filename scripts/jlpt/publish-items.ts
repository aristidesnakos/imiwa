/**
 * scripts/jlpt/publish-items.ts
 *
 *   npx tsx --tsconfig tsconfig.json scripts/jlpt/publish-items.ts [--include-pending]
 *
 * Compiles the reviewed items (data/jlpt/review/N5.json) into the compact file the quiz
 * imports (data/jlpt/published/N5.json). Only `approved` items are published, so an item
 * nobody has signed off never reaches the site. `--include-pending` exists for local
 * development of the UI against real-shaped data and must never be committed: the
 * committed file holds approved items only.
 *
 * The option order is a deterministic shuffle keyed by the item id, so the right answer
 * is not always in the same slot and rebuilding changes nothing.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { JlptItem, PublishedFile, ReviewFile } from '../../lib/jlpt/types';

const ROOT = path.resolve(__dirname, '../..');
const REVIEW = path.join(ROOT, 'data/jlpt/review/N5.json');
const OUT = path.join(ROOT, 'data/jlpt/published/N5.json');

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

const file: PublishedFile = { level: 'N5', items };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(file) + '\n');
console.log(`published ${items.length} item(s)${includePending ? ' (INCLUDING PENDING — do not commit)' : ''} -> ${path.relative(ROOT, OUT)}`);
