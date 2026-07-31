'use client';

/**
 * components/admin/sentences/sentence-reviewer.tsx
 *
 * The reviewer. This is a sequential grind of a few hundred judgements, so the
 * whole thing is built around throughput:
 *
 *   - every action has a key binding, and the legend is always one `?` away
 *   - a decision auto-advances to the next undecided candidate
 *   - decisions POST immediately; a refresh never loses work
 *   - progress is visible for the kanji AND for the whole queue
 *
 * What it deliberately does NOT offer: any way to edit `japanese` or `english`.
 * Those are verbatim CC BY 2.0 FR text. Editing them would make the sentence
 * Adapted Material (forfeiting the collective-work position that keeps our own
 * commentary proprietary) and would make the per-contributor attribution a lie.
 * Token READINGS are the only editable field, because a wrong furigana reading
 * is our error, not the contributor's.
 */

import * as React from 'react';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleSlash,
  Keyboard,
  Loader2,
  Pencil,
  Tags,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Attribution } from '@/components/sentences/attribution';
import { Furigana, HAS_KANJI } from '@/components/sentences/furigana';
import { REJECT_REASONS, REJECT_REASON_LABELS } from '@/lib/sentences/reject-reasons';
import type {
  CandidateId,
  KanjiQueueEntry,
  Level,
  RejectReason,
  ReviewDecision,
  SentenceCandidate,
} from '@/lib/sentences/types';

type DecisionMap = Record<CandidateId, ReviewDecision>;

/** Which number-key mode is live. Reject reasons and senses share the number row. */
type Armed = 'reject' | 'sense' | null;

/**
 * The sense vocabulary for one kanji: its own comma-separated `meaning`, with
 * the heuristic `senseHint` promoted to first position so that `s` then `1`
 * confirms the guess in two keystrokes.
 *
 * The hint is included even when it is not one of the comma-split senses —
 * the inference does not always land on a clean split — but it is never
 * silently written as `senseTag`. `senseTag` means "a human adjudicated this",
 * and promoting a guess that is null 78% of the time into an authoritative
 * field would repeat, in a new place, the mistake of recording a judgement
 * nobody made.
 */
function senseOptionsFor(meaning: string, hint: string | null): string[] {
  const options: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push(trimmed);
  };
  if (hint) push(hint);
  for (const part of meaning.split(',')) push(part);
  return options.slice(0, 9);
}

export interface SentenceReviewerProps {
  level: Level;
  entry: KanjiQueueEntry;
  initialDecisions: DecisionMap;
  nav: { prev: string | null; next: string | null; nextUndecided: string | null };
  overall: { decided: number; total: number };
}

export function SentenceReviewer({
  level,
  entry,
  initialDecisions,
  nav,
  overall,
}: SentenceReviewerProps) {
  const router = useRouter();
  const candidates = entry.candidates;

  const [decisions, setDecisions] = useState<DecisionMap>(initialDecisions);
  const [activeIndex, setActiveIndex] = useState(() => {
    const first = candidates.findIndex((c) => !initialDecisions[c.id]);
    return first >= 0 ? first : 0;
  });
  const [armed, setArmed] = useState<Armed>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ReviewDecision | null>(null);

  const [notes, setNotes] = useState<Record<CandidateId, string>>(() =>
    Object.fromEntries(
      Object.values(initialDecisions)
        .filter((d) => d.note)
        .map((d) => [d.candidateId, d.note as string])
    )
  );
  const [readingDrafts, setReadingDrafts] = useState<
    Record<CandidateId, Record<number, string>>
  >(() =>
    Object.fromEntries(
      Object.values(initialDecisions)
        .filter((d) => d.readingCorrections)
        .map((d) => [d.candidateId, d.readingCorrections as Record<number, string>])
    )
  );
  const [senseTags, setSenseTags] = useState<Record<CandidateId, string>>(() =>
    Object.fromEntries(
      Object.values(initialDecisions)
        .filter((d) => d.senseTag)
        .map((d) => [d.candidateId, d.senseTag as string])
    )
  );

  const active = candidates[activeIndex];
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const counts = useMemo(() => {
    let accepted = 0;
    let rejected = 0;
    for (const c of candidates) {
      const d = decisions[c.id];
      if (d?.verdict === 'accepted') accepted += 1;
      else if (d?.verdict === 'rejected') rejected += 1;
    }
    return {
      accepted,
      rejected,
      decided: accepted + rejected,
      total: candidates.length,
      undecided: candidates.length - accepted - rejected,
    };
  }, [candidates, decisions]);

  // The overall counter arrives server-rendered, so it would freeze for a whole
  // kanji's worth of decisions — useless as a progress indicator on a job this
  // long. Decisions made outside this kanji cannot change while we are here, so
  // the live total is that fixed remainder plus this kanji's live count.
  const decidedElsewhere = overall.total
    ? overall.decided - Object.keys(initialDecisions).length
    : 0;

  /* ── navigation ──────────────────────────────────────────────────────────── */

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    setArmed(null);
    setEditorOpen(false);
  }, []);

  const step = useCallback(
    (delta: number) => {
      goTo(Math.min(candidates.length - 1, Math.max(0, activeIndex + delta)));
    },
    [activeIndex, candidates.length, goTo]
  );

  const nextUndecidedIndex = useCallback(
    (from: number, current: DecisionMap) => {
      for (let i = from; i < candidates.length; i += 1) {
        if (!current[candidates[i].id]) return i;
      }
      for (let i = 0; i < from; i += 1) {
        if (!current[candidates[i].id]) return i;
      }
      return -1;
    },
    [candidates]
  );

  const jumpToNextUndecided = useCallback(() => {
    const index = nextUndecidedIndex(activeIndex + 1, decisions);
    if (index >= 0) {
      goTo(index);
      return;
    }
    if (nav.nextUndecided) router.push(`/admin/review/${encodeURIComponent(nav.nextUndecided)}`);
  }, [activeIndex, decisions, goTo, nav.nextUndecided, nextUndecidedIndex, router]);

  useEffect(() => {
    cardRefs.current[activeIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIndex]);

  /* ── persistence ─────────────────────────────────────────────────────────── */

  const submit = useCallback(
    async (
      candidate: SentenceCandidate,
      verdict: 'accepted' | 'rejected',
      rejectReason?: RejectReason,
      overwrite?: boolean
    ) => {
      const previous = decisions;
      const existing = decisions[candidate.id];
      const note = notes[candidate.id]?.trim() || undefined;
      const corrections = readingDrafts[candidate.id];
      const hasCorrections = corrections && Object.keys(corrections).length > 0;
      const senseTag = senseTags[candidate.id]?.trim() || undefined;

      setError(null);
      setConflict(null);
      setSaving(true);
      setArmed(null);

      // Optimistic: the reviewer moves on immediately. A failure below puts the
      // state back and parks them on the offending candidate.
      const optimistic: ReviewDecision = {
        candidateId: candidate.id,
        targetKanji: candidate.targetKanji,
        verdict,
        ...(rejectReason ? { rejectReason } : {}),
        ...(note ? { note } : {}),
        ...(hasCorrections ? { readingCorrections: corrections } : {}),
        ...(senseTag ? { senseTag } : {}),
        reviewer: existing?.reviewer ?? '…',
        decidedAt: new Date().toISOString(),
      };
      const nextState = { ...decisions, [candidate.id]: optimistic };
      setDecisions(nextState);

      const advanceTo = nextUndecidedIndex(
        candidates.indexOf(candidate) + 1,
        nextState
      );
      if (advanceTo >= 0) goTo(advanceTo);
      else setEditorOpen(false);

      try {
        const response = await fetch(
          `/api/admin/sentences/decisions/${level}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateId: candidate.id,
              targetKanji: candidate.targetKanji,
              verdict,
              rejectReason,
              note,
              readingCorrections: hasCorrections ? corrections : undefined,
              senseTag,
              overwrite: overwrite ?? Boolean(existing),
            }),
          }
        );
        const payload = await response.json();

        if (response.status === 409) {
          setDecisions({ ...previous, [candidate.id]: payload.existing });
          setConflict(payload.existing as ReviewDecision);
          setError(payload.error as string);
          goTo(candidates.indexOf(candidate));
          return;
        }
        if (!response.ok) {
          setDecisions(previous);
          setError((payload?.error as string) ?? `request failed (${response.status})`);
          goTo(candidates.indexOf(candidate));
          return;
        }
        setDecisions((current) => ({ ...current, [candidate.id]: payload.decision }));
      } catch (cause) {
        setDecisions(previous);
        setError(cause instanceof Error ? cause.message : 'network error');
        goTo(candidates.indexOf(candidate));
      } finally {
        setSaving(false);
      }
    },
    [candidates, decisions, goTo, level, nextUndecidedIndex, notes, readingDrafts, senseTags]
  );

  const clear = useCallback(
    async (candidate: SentenceCandidate) => {
      setError(null);
      setConflict(null);
      setSaving(true);
      try {
        const response = await fetch(
          `/api/admin/sentences/decisions/${level}?candidateId=${encodeURIComponent(candidate.id)}`,
          { method: 'DELETE' }
        );
        if (!response.ok) {
          const payload: { error?: string } | null = await response
            .json()
            .catch((): null => null);
          setError(payload?.error ?? `request failed (${response.status})`);
          return;
        }
        setDecisions((current) => {
          const next = { ...current };
          delete next[candidate.id];
          return next;
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'network error');
      } finally {
        setSaving(false);
      }
    },
    [level]
  );

  /* ── keyboard ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (event.key === 'Escape') {
        if (typing) target?.blur();
        setArmed(null);
        setLegendOpen(false);
        return;
      }
      if (typing) return;
      if (!active) return;

      // The number row belongs to whichever picker is armed.
      if (armed === 'reject' && /^[1-8]$/.test(event.key)) {
        event.preventDefault();
        void submit(active, 'rejected', REJECT_REASONS[Number(event.key) - 1]);
        return;
      }
      if (armed === 'sense') {
        if (/^[1-9]$/.test(event.key)) {
          event.preventDefault();
          const option = senseOptionsFor(entry.meaning, active.senseHint)[Number(event.key) - 1];
          if (option) {
            setSenseTags((current) => ({ ...current, [active.id]: option }));
            setArmed(null);
          }
          return;
        }
        if (event.key === '0') {
          event.preventDefault();
          setSenseTags((current) => {
            const next = { ...current };
            delete next[active.id];
            return next;
          });
          setArmed(null);
          return;
        }
      }

      switch (event.key) {
        case 'a':
        case 'Enter':
          event.preventDefault();
          void submit(active, 'accepted');
          break;
        case 'r':
          event.preventDefault();
          setArmed((v) => (v === 'reject' ? null : 'reject'));
          break;
        case 's':
          event.preventDefault();
          setArmed((v) => (v === 'sense' ? null : 'sense'));
          break;
        case 'x':
          event.preventDefault();
          void clear(active);
          break;
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          step(1);
          break;
        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          step(-1);
          break;
        case 'u':
          event.preventDefault();
          jumpToNextUndecided();
          break;
        case '[':
          if (nav.prev) router.push(`/admin/review/${encodeURIComponent(nav.prev)}`);
          break;
        case ']':
          if (nav.next) router.push(`/admin/review/${encodeURIComponent(nav.next)}`);
          break;
        case 'n':
          event.preventDefault();
          noteRef.current?.focus();
          break;
        case 'e':
          event.preventDefault();
          setEditorOpen((v) => !v);
          break;
        case 'g':
          router.push('/admin/review');
          break;
        case '?':
          event.preventDefault();
          setLegendOpen((v) => !v);
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    active,
    armed,
    clear,
    entry.meaning,
    jumpToNextUndecided,
    nav.next,
    nav.prev,
    router,
    step,
    submit,
  ]);

  /* ── render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="pb-40">
      <StickyHeader
        entry={entry}
        counts={counts}
        overall={{ decided: decidedElsewhere + counts.decided, total: overall.total }}
        nav={nav}
        saving={saving}
        onLegend={() => setLegendOpen((v) => !v)}
      />

      {error ? (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-4xl rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-semibold">Not saved</p>
          <p className="mt-1">{error}</p>
          {conflict ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs">
                On disk: <strong>{conflict.verdict}</strong>
                {conflict.rejectReason ? ` (${conflict.rejectReason})` : ''} by{' '}
                {conflict.reviewer}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const forced = decisions[active.id];
                  void submit(
                    active,
                    forced?.verdict === 'rejected' ? 'rejected' : 'accepted',
                    forced?.rejectReason,
                    true
                  );
                }}
              >
                Overwrite anyway
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mx-auto mt-6 max-w-4xl space-y-3 px-4">
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            candidate={candidate}
            decision={decisions[candidate.id]}
            active={index === activeIndex}
            onFocus={() => goTo(index)}
            targetKanji={entry.kanji}
            senseOptions={senseOptionsFor(entry.meaning, candidate.senseHint)}
            senseTag={senseTags[candidate.id]}
            armed={index === activeIndex ? armed : null}
            editorOpen={editorOpen && index === activeIndex}
            note={notes[candidate.id] ?? ''}
            noteRef={index === activeIndex ? noteRef : undefined}
            corrections={readingDrafts[candidate.id] ?? {}}
            onNoteChange={(value) =>
              setNotes((current) => ({ ...current, [candidate.id]: value }))
            }
            onCorrectionChange={(tokenIndex, value) =>
              setReadingDrafts((current) => {
                const forCandidate = { ...(current[candidate.id] ?? {}) };
                if (value.trim() === '') delete forCandidate[tokenIndex];
                else forCandidate[tokenIndex] = value;
                return { ...current, [candidate.id]: forCandidate };
              })
            }
            onToggleEditor={() => setEditorOpen((v) => !v)}
            onAccept={() => void submit(candidate, 'accepted')}
            onArmReject={() => setArmed((v) => (v === 'reject' ? null : 'reject'))}
            onArmSense={() => setArmed((v) => (v === 'sense' ? null : 'sense'))}
            onPickSense={(value) => {
              setSenseTags((current) => {
                if (value === null) {
                  const next = { ...current };
                  delete next[candidate.id];
                  return next;
                }
                return { ...current, [candidate.id]: value };
              });
              setArmed(null);
            }}
            onReject={(reason) => void submit(candidate, 'rejected', reason)}
            onClear={() => void clear(candidate)}
          />
        ))}

        {counts.undecided === 0 ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-4 py-5 text-center dark:bg-emerald-950/40">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              {entry.kanji} is fully reviewed — {counts.accepted} accepted, {counts.rejected}{' '}
              rejected.
            </p>
            {nav.nextUndecided ? (
              <Button asChild className="mt-3" size="sm">
                <Link href={`/admin/review/${encodeURIComponent(nav.nextUndecided)}`}>
                  Next kanji with undecided candidates ({nav.nextUndecided}) — press u
                </Link>
              </Button>
            ) : (
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href="/admin/review">Back to the queue overview — press g</Link>
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <KeyboardLegend open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
  );
}

/* ────────────────────────────────── header ────────────────────────────────── */

function StickyHeader({
  entry,
  counts,
  overall,
  nav,
  saving,
  onLegend,
}: {
  entry: KanjiQueueEntry;
  counts: { accepted: number; rejected: number; decided: number; total: number };
  overall: { decided: number; total: number };
  nav: { prev: string | null; next: string | null; nextUndecided: string | null };
  saving: boolean;
  onLegend: () => void;
}) {
  const overallPct = overall.total ? Math.round((overall.decided / overall.total) * 100) : 0;
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/admin/review"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          ← queue
        </Link>
        <div className="flex items-baseline gap-2">
          <span lang="ja" className="text-3xl font-semibold leading-none">
            {entry.kanji}
          </span>
          <span className="text-sm text-muted-foreground">{entry.meaning}</span>
          <Badge variant="outline">{entry.level}</Badge>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {saving ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> saving
            </span>
          ) : null}
          <span>
            this kanji <strong className="text-foreground">{counts.decided}</strong>/
            {counts.total}
          </span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            overall <strong className="text-foreground">{overall.decided}</strong> of{' '}
            {overall.total} ({overallPct}%)
          </span>
          <Button size="sm" variant="ghost" onClick={onLegend} title="Keyboard shortcuts (?)">
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex w-full items-center gap-3">
          <Progress value={overallPct} className="h-1.5 flex-1" />
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <NavLink kanji={nav.prev} label="[" icon={<ArrowLeft className="h-3 w-3" />} />
            <NavLink kanji={nav.next} label="]" icon={<ArrowRight className="h-3 w-3" />} />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  kanji,
  label,
  icon,
}: {
  kanji: string | null;
  label: string;
  icon: React.ReactNode;
}) {
  if (!kanji) {
    return (
      <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-muted-foreground/40">
        {icon}
      </span>
    );
  }
  return (
    <Link
      href={`/admin/review/${encodeURIComponent(kanji)}`}
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 hover:bg-accent"
      title={`${label} → ${kanji}`}
    >
      {icon}
      <span lang="ja">{kanji}</span>
    </Link>
  );
}

/* ─────────────────────────────── candidate card ───────────────────────────── */

interface CandidateCardProps {
  candidate: SentenceCandidate;
  decision?: ReviewDecision;
  active: boolean;
  targetKanji: string;
  senseOptions: string[];
  senseTag?: string;
  armed: Armed;
  editorOpen: boolean;
  note: string;
  noteRef?: React.RefObject<HTMLTextAreaElement>;
  corrections: Record<number, string>;
  onFocus: () => void;
  onNoteChange: (value: string) => void;
  onCorrectionChange: (tokenIndex: number, value: string) => void;
  onToggleEditor: () => void;
  onAccept: () => void;
  onArmReject: () => void;
  onArmSense: () => void;
  onPickSense: (value: string | null) => void;
  onReject: (reason: RejectReason) => void;
  onClear: () => void;
}

const CandidateCard = forwardRef<HTMLElement, CandidateCardProps>(function CandidateCard(
  {
    candidate,
    decision,
    active,
    targetKanji,
    senseOptions,
    senseTag,
    armed,
    editorOpen,
    note,
    noteRef,
    corrections,
    onFocus,
    onNoteChange,
    onCorrectionChange,
    onToggleEditor,
    onAccept,
    onArmReject,
    onArmSense,
    onPickSense,
    onReject,
    onClear,
  },
  ref
) {
  const suspectCount = candidate.tokens.filter((t) => t.readingUnknown).length;

  if (!active) {
    return (
      <article
        ref={ref}
        onClick={onFocus}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors hover:bg-accent/40',
          decision?.verdict === 'accepted' && 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20',
          decision?.verdict === 'rejected' && 'border-destructive/30 bg-destructive/5 opacity-70'
        )}
      >
        <StatusDot decision={decision} />
        <span className="w-6 shrink-0 text-xs text-muted-foreground">#{candidate.rank}</span>
        <span lang="ja" className="truncate text-base">
          {candidate.japanese}
        </span>
        {suspectCount > 0 ? (
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        ) : null}
        {decision?.senseTag ? (
          <Badge variant="outline" className="ml-auto shrink-0 font-normal">
            {decision.senseTag}
          </Badge>
        ) : null}
        <span className={cn('shrink-0 text-xs text-muted-foreground', !decision?.senseTag && 'ml-auto')}>
          {decision?.rejectReason ?? candidate.score.toFixed(2)}
        </span>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      className={cn(
        'rounded-lg border-2 border-primary bg-card p-5 shadow-lg',
        decision?.verdict === 'accepted' && 'border-emerald-500',
        decision?.verdict === 'rejected' && 'border-destructive'
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <StatusDot decision={decision} />
        <Badge variant="secondary">rank #{candidate.rank}</Badge>
        <Badge variant="outline">score {candidate.score.toFixed(2)}</Badge>
        <Badge variant="outline">{candidate.level}</Badge>
        {candidate.signals.isTanaka ? <Badge variant="outline">Tanaka</Badge> : null}
        {candidate.signals.hasAudio ? <Badge variant="outline">audio</Badge> : null}
        {suspectCount > 0 ? (
          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
            {suspectCount} unknown reading{suspectCount > 1 ? 's' : ''}
          </Badge>
        ) : null}
        {decision ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {decision.verdict}
            {decision.rejectReason ? ` · ${decision.rejectReason}` : ''} · {decision.reviewer}
          </span>
        ) : null}
      </div>

      <Furigana
        tokens={candidate.tokens}
        highlightKanji={targetKanji}
        corrections={corrections}
      />

      <p className="mt-2 text-lg text-muted-foreground">{candidate.english}</p>

      <SenseLine
        hint={candidate.senseHint}
        senseTag={senseTag}
        onArmSense={onArmSense}
      />

      <p className="mt-3 text-[11px] italic text-muted-foreground/70">
        Sentence and translation are verbatim licensed text and cannot be edited here — only
        token readings may be corrected.
      </p>

      <Attribution
        className="mt-3 border-t pt-3"
        japanese={candidate.source.japanese}
        english={candidate.source.english}
      />

      <ul className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
        {candidate.scoreBreakdown.map((reason, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-border">
              ▸
            </span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>

      {/* ── actions ── */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <Button onClick={onAccept} className="bg-emerald-600 hover:bg-emerald-700">
          <Check className="h-4 w-4" /> Accept <Kbd>a</Kbd>
        </Button>
        <Button variant={armed === 'reject' ? 'destructive' : 'outline'} onClick={onArmReject}>
          <X className="h-4 w-4" /> Reject <Kbd>r</Kbd>
        </Button>
        <Button variant={armed === 'sense' ? 'default' : 'ghost'} onClick={onArmSense}>
          <Tags className="h-4 w-4" /> Sense <Kbd>s</Kbd>
        </Button>
        <Button variant="ghost" onClick={onToggleEditor}>
          <Pencil className="h-4 w-4" /> Readings &amp; note <Kbd>e</Kbd>
        </Button>
        {decision ? (
          <Button variant="ghost" onClick={onClear} className="text-muted-foreground">
            <CircleSlash className="h-4 w-4" /> Undecide <Kbd>x</Kbd>
          </Button>
        ) : null}
      </div>

      {armed === 'sense' ? (
        <div className="mt-3 rounded-md border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold">
            Which sense does this sentence demonstrate? Press its number, 0 to clear, Esc to
            cancel. Saved with the next accept or reject.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {senseOptions.map((option, i) => (
              <button
                key={option}
                type="button"
                onClick={() => onPickSense(option)}
                className={cn(
                  'flex items-center gap-2 rounded border bg-background px-2.5 py-1.5 text-sm hover:bg-accent',
                  senseTag === option && 'border-primary bg-primary/10'
                )}
              >
                <Kbd>{i + 1}</Kbd>
                <span>{option}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPickSense(null)}
              className="flex items-center gap-2 rounded border border-dashed bg-background px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <Kbd>0</Kbd>
              <span>no sense tag</span>
            </button>
          </div>
        </div>
      ) : null}

      {armed === 'reject' ? (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="mb-2 text-xs font-semibold text-destructive">
            Pick a reason — press its number, or Esc to cancel
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {REJECT_REASONS.map((reason, i) => (
              <button
                key={reason}
                type="button"
                onClick={() => onReject(reason)}
                className="flex items-center gap-2 rounded border bg-background px-2.5 py-1.5 text-left text-sm hover:bg-accent"
              >
                <Kbd>{i + 1}</Kbd>
                <span>{REJECT_REASON_LABELS[reason]}</span>
                <code className="ml-auto text-[10px] text-muted-foreground">{reason}</code>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <div className="mt-3 space-y-4 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="mb-2 text-xs font-semibold">
              Reading corrections — the only text a reviewer may change
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {candidate.tokens.map((token, index) =>
                HAS_KANJI.test(token.surface) ? (
                  <label
                    key={index}
                    className={cn(
                      'flex items-center gap-2 rounded border bg-background px-2 py-1',
                      token.readingUnknown && 'border-amber-500'
                    )}
                  >
                    <span lang="ja" className="w-16 shrink-0 truncate text-sm">
                      {token.surface}
                    </span>
                    <Input
                      lang="ja"
                      className="h-7 text-sm"
                      placeholder={
                        token.readingUnknown ? 'no reading — suspect' : token.reading ?? ''
                      }
                      defaultValue={corrections[index] ?? ''}
                      onChange={(e) => onCorrectionChange(index, e.target.value)}
                    />
                  </label>
                ) : null
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="review-note">
              Note <Kbd>n</Kbd>
            </label>
            <Textarea
              id="review-note"
              ref={noteRef}
              value={note}
              rows={2}
              placeholder="Optional free text; saved with the decision."
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
});

/**
 * The inferred sense, stated as a guess.
 *
 * `senseHint` is heuristic — it matches the kanji's own `meaning` list against
 * the English translation and is `null` for roughly 78% of candidates. Null is
 * the ordinary case, not missing data, so it renders as a plain statement that
 * nothing was inferred rather than as an empty or error state. The reviewer's
 * own `senseTag`, once set, is shown as the authority and visually outranks the
 * guess.
 */
function SenseLine({
  hint,
  senseTag,
  onArmSense,
}: {
  hint: string | null;
  senseTag?: string;
  onArmSense: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Sense:</span>
      {senseTag ? (
        <Badge className="bg-sky-600 hover:bg-sky-600">{senseTag}</Badge>
      ) : null}
      <span className="text-muted-foreground/80">
        {senseTag ? 'set by you · ' : ''}
        {hint ? (
          <>
            guessed <span className="font-medium text-foreground/70">{hint}</span>{' '}
            <span className="italic">(heuristic, unverified)</span>
          </>
        ) : (
          <span className="italic">sense not inferred — normal, most candidates are</span>
        )}
      </span>
      <button
        type="button"
        onClick={onArmSense}
        className="underline underline-offset-2 text-muted-foreground hover:text-foreground"
      >
        set <Kbd>s</Kbd>
      </button>
    </div>
  );
}

function StatusDot({ decision }: { decision?: ReviewDecision }) {
  if (!decision) {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30" />;
  }
  return (
    <span
      className={cn(
        'h-2.5 w-2.5 shrink-0 rounded-full',
        decision.verdict === 'accepted' ? 'bg-emerald-500' : 'bg-destructive'
      )}
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px] leading-4 text-muted-foreground">
      {children}
    </kbd>
  );
}

/* ─────────────────────────────── keyboard legend ──────────────────────────── */

const SHORTCUTS: [string, string][] = [
  ['a / Enter', 'Accept the active candidate'],
  ['r', 'Arm reject (then pick a reason)'],
  ['1 – 8', 'Reject with reason 1–8 (while reject is armed)'],
  ['s', 'Arm the sense picker, then 1–9 to tag / 0 to clear'],
  ['x', 'Undecide — clear the saved decision'],
  ['j / ↓', 'Next candidate'],
  ['k / ↑', 'Previous candidate'],
  ['u', 'Jump to next undecided (this kanji, then the next kanji)'],
  ['[ / ]', 'Previous / next kanji'],
  ['e', 'Toggle reading corrections + note'],
  ['n', 'Focus the note field'],
  ['g', 'Back to the queue overview'],
  ['Esc', 'Cancel reject / leave a text field'],
  ['?', 'Toggle this legend'],
];

function KeyboardLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur transition-transform',
        open ? 'translate-y-0' : 'translate-y-[calc(100%-2.25rem)]'
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="flex w-full items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Keyboard shortcuts — press <Kbd>?</Kbd> to {open ? 'hide' : 'show'}
      </button>
      <div className="mx-auto grid max-w-4xl gap-x-6 gap-y-1 px-4 pb-4 text-xs sm:grid-cols-2">
        {SHORTCUTS.map(([key, description]) => (
          <div key={key} className="flex items-baseline gap-2">
            <Kbd>{key}</Kbd>
            <span className="text-muted-foreground">{description}</span>
          </div>
        ))}
        <div className="col-span-full mt-2 border-t pt-2 text-muted-foreground">
          Reject reasons:{' '}
          {REJECT_REASONS.map((reason, i) => (
            <span key={reason} className="mr-3 whitespace-nowrap">
              <Kbd>{i + 1}</Kbd> {REJECT_REASON_LABELS[reason]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
