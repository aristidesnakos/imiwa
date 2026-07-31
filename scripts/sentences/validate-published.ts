/**
 * scripts/sentences/validate-published.ts
 *
 * CI entry point:  pnpm validate:sentences
 *
 * Validates every committed `data/sentences/published/<level>.json` against the
 * contract in `lib/sentences/types.ts`, using the same `validatePublished()`
 * that `publish.ts` runs before it writes. Publish is the gate; this is the
 * check that the gate was not bypassed — by a hand-edit, a bad merge, or a
 * publish run from a stale queue.
 *
 * No published files is a PASS, not a failure. That is the normal state until
 * the first review pass lands, and a red CI for "you have not written the
 * content yet" trains people to ignore it.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { validatePublished, formatIssues } from '../../lib/sentences/validate';
import type { ExampleSentence, Level, ReviewQueue } from '../../lib/sentences/types';

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const ROOT = resolve(__dirname, '..', '..');
const QUEUE_DIR = join(ROOT, 'data', 'sentences', 'queue');
const PUBLISHED_DIR = join(ROOT, 'data', 'sentences', 'published');

function main(): void {
  let files = 0;
  let checked = 0;
  let failed = 0;

  for (const level of LEVELS) {
    const file = join(PUBLISHED_DIR, `${level}.json`);
    if (!existsSync(file)) continue;

    files += 1;
    const sentences = JSON.parse(readFileSync(file, 'utf8')) as ExampleSentence[];

    // The queue is the in-repo record of what the corpus said, so text-drift
    // can only be checked where it is present. Its absence weakens the check;
    // it does not invalidate the rest.
    const queueFile = join(QUEUE_DIR, `${level}.json`);
    const queue = existsSync(queueFile)
      ? (JSON.parse(readFileSync(queueFile, 'utf8')) as ReviewQueue)
      : undefined;

    const issues = validatePublished(sentences, { queue });
    checked += sentences.length;

    if (issues.length > 0) {
      failed += issues.length;
      console.error(`\n${level} — ${issues.length} issue(s) in ${sentences.length} sentences`);
      console.error(formatIssues(issues));
    } else {
      console.log(
        `${level}: ${sentences.length} sentences OK` +
          (queue ? '' : ' (no queue on disk — text-drift check skipped)')
      );
    }
  }

  if (files === 0) {
    console.log('No published sentence files yet — nothing to validate.');
    return;
  }

  if (failed > 0) {
    console.error(`\n${failed} validation failure(s). See lib/sentences/validate.ts.`);
    process.exit(1);
  }

  console.log(
    checked === 0
      ? `\n${files} published file(s), all empty — nothing published yet.`
      : `\n${checked} published sentences validated, 0 issues.`
  );
}

main();
