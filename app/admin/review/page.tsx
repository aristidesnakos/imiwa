/**
 * app/admin/review/page.tsx — the queue overview.
 *
 * Server component: reads the queue and the decision log straight off disk, so
 * a refresh always shows exactly what is persisted. Filtering is a URL search
 * param rather than client state — it survives a reload, it is linkable, and it
 * costs no client JS.
 */

import Link from 'next/link';

import { assertLocalOnlyPage } from '@/lib/sentences/local-only';
import { allDecisionsById, readAllQueues } from '@/lib/sentences/store';
import { countDistinct, countEntry, percent } from '@/lib/sentences/progress';
import type { ProgressCounts } from '@/lib/sentences/progress';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Filter = 'all' | 'undecided' | 'accepted' | 'rejected';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All kanji' },
  { key: 'undecided', label: 'Has undecided' },
  { key: 'accepted', label: 'Has accepted' },
  { key: 'rejected', label: 'Has rejected' },
];

function matches(counts: ProgressCounts, filter: Filter): boolean {
  if (filter === 'all') return true;
  return counts[filter] > 0;
}

export default async function ReviewOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  assertLocalOnlyPage();

  const { filter: rawFilter } = await searchParams;
  const filter: Filter = (['undecided', 'accepted', 'rejected'] as string[]).includes(rawFilter)
    ? (rawFilter as Filter)
    : 'all';

  const queues = readAllQueues();
  const decisions = allDecisionsById();

  if (queues.length === 0) {
    return <EmptyState />;
  }

  const rows = queues.flatMap((queue) =>
    queue.entries.map((entry) => ({ queue, entry, counts: countEntry(entry, decisions) }))
  );
  const allEntries = queues.flatMap((q) => q.entries);
  const overall = countDistinct(allEntries, decisions);
  const slotTotal = rows.reduce((n, r) => n + r.counts.total, 0);
  const visible = rows.filter((r) => matches(r.counts, filter));

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Example sentence review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {queues.map((q) => q.level).join(', ')} · corpus vintage{' '}
          {queues[0].corpusVintage} · target {queues[0].targetPerKanji} sentences per kanji
        </p>
      </header>

      <section className="rounded-lg border p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-3xl font-semibold tabular-nums">
            {overall.decided}{' '}
            <span className="text-base font-normal text-muted-foreground">
              of {overall.total} candidates decided
            </span>
          </p>
          <p className="ml-auto text-sm text-muted-foreground">
            <span className="font-medium text-emerald-600">{overall.accepted} accepted</span>{' '}
            · <span className="font-medium text-destructive">{overall.rejected} rejected</span>{' '}
            · {overall.undecided} left
          </p>
        </div>
        <Progress value={percent(overall)} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {rows.length} kanji · {rows.filter((r) => r.counts.undecided === 0).length} fully
          reviewed
          {slotTotal > overall.total ? (
            <>
              {' '}· {slotTotal} slots across kanji, but {slotTotal - overall.total} are
              repeats of a sentence that demonstrates more than one kanji — one decision
              settles all of them
            </>
          ) : null}
        </p>
      </section>

      <nav className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <Link
            key={key}
            href={key === 'all' ? '/admin/review' : `/admin/review?filter=${key}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent',
              filter === key && 'border-primary bg-primary text-primary-foreground hover:bg-primary'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <ul className="mt-4 divide-y rounded-lg border">
        {visible.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No kanji match this filter.
          </li>
        ) : null}
        {visible.map(({ entry, counts }) => (
          <li key={`${entry.level}-${entry.kanji}`}>
            <Link
              href={`/admin/review/${encodeURIComponent(entry.kanji)}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <span lang="ja" className="w-10 shrink-0 text-3xl leading-none">
                {entry.kanji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{entry.meaning}</span>
                <span className="block text-xs text-muted-foreground">
                  {entry.level} · {counts.total} shown of {entry.totalCandidates} that passed
                  filtering
                </span>
              </span>
              <span className="hidden w-40 shrink-0 sm:block">
                <Progress value={percent(counts)} className="h-1.5" />
              </span>
              <span className="flex w-40 shrink-0 items-center justify-end gap-1.5 text-xs">
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-700">
                  {counts.accepted} ✓
                </Badge>
                <Badge variant="outline" className="border-destructive-ink text-destructive-ink">
                  {counts.rejected} ✕
                </Badge>
                <Badge variant={counts.undecided ? 'secondary' : 'outline'}>
                  {counts.undecided} left
                </Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function EmptyState() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">No review queue yet</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing was found in <code className="font-mono">data/sentences/queue/</code>. The
        queue is generated, not committed by hand — run the selection step to produce{' '}
        <code className="font-mono">data/sentences/queue/&lt;level&gt;.json</code>.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        To exercise this dashboard before the real queue exists, copy the fixture:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-3 text-left text-xs">
        {'mkdir -p data/sentences/queue\ncp data/sentences/fixtures/N5.fixture.json data/sentences/queue/N5.json'}
      </pre>
      <p className="mt-4 text-xs text-muted-foreground">
        Decisions already recorded are never stored in the queue file, so regenerating it
        cannot destroy review work.
      </p>
    </main>
  );
}
