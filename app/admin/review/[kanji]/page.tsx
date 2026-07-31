/**
 * app/admin/review/[kanji]/page.tsx — the reviewer.
 *
 * Server component: resolves the kanji's queue entry and the decisions already
 * on disk, then hands both to the client reviewer. Because the initial state
 * comes from the file rather than from browser storage, a refresh mid-session
 * resumes exactly where the reviewer left off.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { assertLocalOnlyPage } from '@/lib/sentences/local-only';
import { allDecisionsById, findKanjiEntry, readAllQueues } from '@/lib/sentences/store';
import { countDistinct, countEntry } from '@/lib/sentences/progress';
import { SentenceReviewer } from '@/components/admin/sentences/sentence-reviewer';
import type { CandidateId, ReviewDecision } from '@/lib/sentences/types';

export const dynamic = 'force-dynamic';

export default async function ReviewKanjiPage({
  params,
}: {
  params: Promise<{ kanji: string }>;
}) {
  assertLocalOnlyPage();

  const { kanji: rawKanji } = await params;
  const kanji = decodeURIComponent(rawKanji);

  const found = findKanjiEntry(kanji);
  if (!found) {
    const queues = readAllQueues();
    if (queues.length === 0) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">No review queue yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            <code className="font-mono">data/sentences/queue/</code> is empty, so{' '}
            <span lang="ja">{kanji}</span> cannot be reviewed.
          </p>
          <Link
            href="/admin/review"
            className="mt-4 inline-block text-sm underline underline-offset-4"
          >
            Back to the queue overview
          </Link>
        </main>
      );
    }
    notFound();
  }

  const { queue, entry } = found;
  const decisionMap = allDecisionsById();

  // Only the decisions this page can act on. Sending the whole log would ship
  // hundreds of irrelevant rows to the browser.
  const initialDecisions: Record<CandidateId, ReviewDecision> = {};
  for (const candidate of entry.candidates) {
    const decision = decisionMap.get(candidate.id);
    if (decision) initialDecisions[candidate.id] = decision;
  }

  // Cross-level ordering so [ and ] walk the whole review job, not one file.
  const allEntries = readAllQueues().flatMap((q) => q.entries);
  const index = allEntries.findIndex((e) => e.kanji === kanji);

  const nextUndecided =
    allEntries
      .slice(index + 1)
      .concat(allEntries.slice(0, index))
      .find((e) => countEntry(e, decisionMap).undecided > 0)?.kanji ?? null;

  // Distinct, not per-kanji slots — see countDistinct. 108 of the N5 queue's
  // candidates are ranked under more than one kanji.
  const overall = countDistinct(allEntries, decisionMap);

  return (
    <SentenceReviewer
      level={queue.level}
      entry={entry}
      initialDecisions={initialDecisions}
      nav={{
        prev: index > 0 ? allEntries[index - 1].kanji : null,
        next: index < allEntries.length - 1 ? allEntries[index + 1].kanji : null,
        nextUndecided,
      }}
      overall={{ decided: overall.decided, total: overall.total }}
    />
  );
}
