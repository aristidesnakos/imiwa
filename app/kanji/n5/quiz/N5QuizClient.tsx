'use client';

/**
 * app/kanji/n5/quiz/N5QuizClient.tsx
 *
 * The interactive half of /kanji/n5/quiz: set up a round, answer it, keep what
 * you got right. The question engine is components/levels/quiz/quiz-logic.ts;
 * this file is screens, keys and focus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SERVER RENDERS THE SETUP SCREEN, NEVER A QUESTION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every random draw happens in an event handler. The initial state is fixed
 * (all 82 kanji, mixed, ten questions), so the server's HTML and the first
 * client render are the same markup, and the setup form — group names, counts,
 * question types — is real text in the page before any script runs.
 *
 * Learned progress comes from `useKanjiProgress`, which starts empty and
 * hydrates from localStorage in an effect. No `mounted` guard downstream of it
 * (CLAUDE.md: the two hydration patterns must not be mixed); by the time a
 * round has been played the hook has long since hydrated.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUNDLE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The N5 list and its sequence are the only kanji data imported, and nothing
 * here may import another level: /kanji/review is ~40 kB heavier than this
 * route precisely because it pulls in all five lists. Links that render once
 * per question or per kanji carry prefetch={false}, so a results screen with
 * ten missed kanji does not fetch ten route payloads in the background.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KEYS, FOCUS AND WHAT A SCREEN READER HEARS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1–4 answer and Enter moves on, but only while focus is inside the quiz:
 * single-character shortcuts that fire from anywhere would answer a question
 * when someone types "3" into the feedback widget (and WCAG 2.1.4 asks for
 * exactly this scoping). Both keys go through `.click()` on the real button,
 * so a keyboard answer and a pointer answer are one code path — including the
 * DataFast goal on the last Next button, which the script picks up from the
 * click.
 *
 * Answered options take `aria-disabled`, not `disabled`: disabling the button
 * that has focus drops focus to <body>, and the next Tab starts over from the
 * header. Focus goes to the Next button instead, and each new screen focuses
 * its own heading, so a screen reader announces the question rather than
 * nothing. The verdict itself goes through one polite live region.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANALYTICS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `<place>_<thing>_<action>`, place `n5` for the /kanji/n5 section:
 *   n5_quiz_start_click    Start on the setup screen. A visitor's first round.
 *   n5_quiz_finish_click   The last Next button of any round. With start, the
 *                          completion rate — read it in a funnel (visitors),
 *                          not as an event ratio: retries finish without
 *                          passing Start again.
 *   n5_quiz_learned_click  "Mark as learned". Whether the quiz actually feeds
 *                          /kanji/review, which is the reason it exists.
 * The type, the question count and the score ride along as properties: worth
 * a breakdown, not worth a name of their own.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N5_SEQUENCE } from '@/lib/levels/n5-sequence';
import {
  DEFAULT_SESSION_LENGTH,
  SESSION_LENGTHS,
  buildRound,
  createQuizBank,
  parseQuizPreset,
  questionCount,
  resolvePool,
  type BankEntry,
  type QuestionType,
  type QuestionTypeChoice,
  type QuizQuestion,
  type SessionLength,
} from '@/components/levels/quiz/quiz-logic';

const BANK = createQuizBank(N5_KANJI, N5_SEQUENCE);
const TOTAL = BANK.byKanji.size;

const entryOf = (kanji: string): BankEntry => BANK.byKanji.get(kanji) as BankEntry;

// ─── Styles ──────────────────────────────────────────────────────────────────

/** The keyboard ring, for everything here that does not come from buttonVariants. */
const RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Control edge. Mountain mist mixed 70% into the card is 3.3:1 against it, over
 * WCAG 1.4.11's 3:1; the full-strength --input (6.5:1) on a two-by-two grid of
 * large tiles reads as a table ruled in ink.
 */
const EDGE = 'border-[color:color-mix(in_srgb,var(--mountain-mist)_70%,var(--temple-stone))]';
const HOVER = 'hover:bg-[color-mix(in_srgb,var(--sakura-waters)_15%,var(--temple-stone))]';
/** Selected, and the right answer: a sakura wash under a deep-ocean edge. */
const WASH_RIGHT = 'bg-[color-mix(in_srgb,var(--sakura-waters)_30%,var(--temple-stone))]';
/** A wrong pick: --destructive as a wash, never as text; --destructive-ink is 5.3:1 on it. */
const WASH_WRONG = 'bg-[color-mix(in_srgb,var(--destructive)_10%,var(--temple-stone))]';

const CARD = 'rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6';
const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist';
const TEXT_LINK = `rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline ${RING}`;

// ─── Copy ────────────────────────────────────────────────────────────────────

/** "Kanji → meaning" on screen, "Kanji to meaning" to a screen reader. */
function Arrow({ from, to }: { from: string; to: string }) {
  return (
    <>
      {from} <span aria-hidden="true">→</span>
      <span className="sr-only">to</span> {to}
    </>
  );
}

const TYPE_CHOICES: { value: QuestionTypeChoice; label: ReactNode; summary: string }[] = [
  { value: 'mixed', label: 'Mixed', summary: 'all three question types' },
  { value: 'meaning', label: <Arrow from="Kanji" to="meaning" />, summary: 'kanji to meaning' },
  { value: 'reading', label: <Arrow from="Kanji" to="reading" />, summary: 'kanji to reading' },
  { value: 'kanji', label: <Arrow from="Meaning" to="kanji" />, summary: 'meaning to kanji' },
];

const ASK: Record<QuestionType, string> = {
  meaning: 'What does this kanji mean?',
  reading: 'How is this kanji read?',
  kanji: 'Which kanji means…',
};

function verdict(score: number, total: number): string {
  if (score === total) return 'Every one right.';
  if (score / total >= 0.8) return 'Nearly all of them. The misses are below.';
  if (score / total >= 0.5) return 'More than half. The ones to go over are below.';
  return 'These take a few rounds. Go over the misses, then practise just those.';
}

/** What the live region says after an answer. Short: the screen shows the rest. */
function SpokenVerdict({ question, right }: { question: QuizQuestion; right: boolean }) {
  const entry = entryOf(question.kanji);
  const lead = right ? 'Correct.' : 'Not quite.';
  const kanji = <span lang="ja">{question.kanji}</span>;
  if (question.type === 'reading') {
    const spoken = entry.reading?.parts.map(p => p.romaji).join(' or ') ?? '';
    return <>{lead} {kanji} is read {spoken}.</>;
  }
  if (question.type === 'kanji') return <>{lead} {entry.meaning} is {kanji}.</>;
  return <>{lead} {kanji} means {entry.meaning}.</>;
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * A native checkbox or radio, visually replaced by a chip. The input stays in
 * the DOM (sr-only), so the label, the group semantics, arrow keys between
 * radios and form submission are all the browser's own; only the drawing is
 * ours. The small box or dot keeps "pick several" and "pick one" telling
 * themselves apart without relying on colour.
 */
function Chip({
  type,
  name,
  value,
  checked,
  onChange,
  children,
}: {
  type: 'checkbox' | 'radio';
  name?: string;
  value?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ${
          checked ? `border-japan-deep-ocean text-japan-deep-ocean ${WASH_RIGHT}` : `${EDGE} bg-background ${HOVER}`
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 ${
            type === 'radio' ? 'rounded-full' : 'rounded'
          } ${checked ? 'border-japan-deep-ocean bg-japan-deep-ocean text-japan-temple-stone' : 'border-japan-mountain-mist'}`}
        >
          {checked &&
            (type === 'radio' ? (
              <span className="h-1.5 w-1.5 rounded-full bg-japan-temple-stone" />
            ) : (
              <Check className="h-3 w-3" strokeWidth={3} />
            ))}
        </span>
        {children}
      </span>
    </label>
  );
}

/** Kana over romaji: the reading as an option shows it, and as feedback repeats it. */
function ReadingText({ kanji, className = '' }: { kanji: string; className?: string }) {
  const reading = entryOf(kanji).reading;
  if (!reading) return null;
  return (
    <span className={className}>
      <span lang="ja">{reading.kana}</span>{' '}
      <span className="text-japan-mountain-mist">({reading.romaji})</span>
    </span>
  );
}

/** A kanji's own page, where the stroke order is. One per question or missed kanji, hence no prefetch. */
function KanjiPageLink({ kanji, children, className }: { kanji: string; children: ReactNode; className: string }) {
  return (
    <Link prefetch={false} href={`/kanji/${encodeURIComponent(kanji)}`} className={className}>
      {children}
    </Link>
  );
}

// ─── The quiz ────────────────────────────────────────────────────────────────

interface Round {
  questions: QuizQuestion[];
  /** What "Try again" draws from: the setup's pool, or the kanji just missed. */
  pool: string[];
  type: QuestionTypeChoice;
  length: SessionLength;
}

type FocusTarget = 'setup' | 'question' | 'next' | 'results' | 'marked';

/** The sticky header's height, roughly. A panel top above this is hidden under it. */
const HEADER_CLEARANCE = 80;

export function N5QuizClient() {
  const { learnedKanji, toggleKanjiLearned } = useKanjiProgress();

  // Setup. These defaults are what the server renders.
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [typeChoice, setTypeChoice] = useState<QuestionTypeChoice>('mixed');
  const [length, setLength] = useState<SessionLength>(DEFAULT_SESSION_LENGTH);

  // The round in play.
  const [round, setRound] = useState<Round | null>(null);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [marked, setMarked] = useState<string[] | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const setupHeadingRef = useRef<HTMLHeadingElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const markedNoteRef = useRef<HTMLParagraphElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingFocus = useRef<FocusTarget | null>(null);
  // Synchronous guards. State updates land on the next render, so a double
  // click or a key and a click in the same tick would otherwise both count.
  const answeredIndex = useRef(-1);
  const markingStarted = useRef(false);

  // A link can open the quiz already set up (?group=numbers&type=reading) —
  // see parseQuizPreset. Read after mount, the same way the progress hook reads
  // localStorage, so the server HTML and the first client render still agree.
  useEffect(() => {
    const preset = parseQuizPreset(window.location.search, BANK);
    if (preset.groups.length > 0) setGroupIds(preset.groups);
    if (preset.type) setTypeChoice(preset.type);
    if (preset.length) setLength(preset.length);
  }, []);

  const pool = useMemo(() => resolvePool(BANK, groupIds), [groupIds]);
  const count = questionCount(length, pool.length);

  const question = round && !finished ? round.questions[index] : null;
  const pick = question ? picks[index] : undefined;
  const answered = pick !== undefined;
  const rightSoFar = round ? round.questions.filter((q, i) => picks[i] === q.answer).length : 0;

  const results = useMemo(() => {
    if (!round || !finished) return null;
    const right: string[] = [];
    const missed: string[] = [];
    round.questions.forEach((q, i) => (picks[i] === q.answer ? right : missed).push(q.kanji));
    return { right, missed };
  }, [round, finished, picks]);

  const unlearnedRight = results ? results.right.filter(k => !learnedKanji.includes(k)) : [];

  // ── Focus: each new screen lands on its heading, an answer on Next ─────────
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;

    if (target === 'next') {
      nextButtonRef.current?.focus();
      return;
    }
    if (target === 'marked') {
      markedNoteRef.current?.focus();
      return;
    }

    const heading =
      target === 'setup'
        ? setupHeadingRef.current
        : target === 'results'
          ? resultsHeadingRef.current
          : questionHeadingRef.current;
    heading?.focus({ preventScroll: true });

    // The Next button can sit below the fold on a phone, so the page is often
    // scrolled past the top of the panel when the screen changes. Bring the
    // panel's top back into view rather than leaving the new question
    // half-hidden under the sticky header.
    const panel = panelRef.current;
    if (!panel) return;
    const { top } = panel.getBoundingClientRect();
    if (top < HEADER_CLEARANCE || top > window.innerHeight / 2) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  });

  // ── Keys ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!round || finished) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !panelRef.current?.contains(target)) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (!answered) {
        // event.code as well as event.key: on AZERTY the unshifted top-row key
        // types "&", not "1".
        const digit = /^[1-9]$/.test(event.key)
          ? Number(event.key)
          : Number(/^(?:Digit|Numpad)([1-9])$/.exec(event.code)?.[1] ?? Number.NaN);
        const option = optionRefs.current[digit - 1];
        if (option) {
          event.preventDefault();
          option.click();
        }
        return;
      }

      if (event.key === 'Enter' && !event.repeat) {
        // A focused link or live button handles Enter itself. Clicking Next
        // here as well would skip the question after this one.
        if (target.closest('a, button:not([aria-disabled="true"])')) return;
        event.preventDefault();
        nextButtonRef.current?.click();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [round, finished, answered]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function startRound(roundPool: readonly string[], type: QuestionTypeChoice, roundLength: SessionLength) {
    const questions = buildRound(BANK, {
      pool: roundPool,
      type,
      count: questionCount(roundLength, roundPool.length),
    });
    // Unreachable with the N5 data (scripts/validate-quiz.ts builds every
    // question there is); a round with no questions must not start at all.
    if (questions.length === 0) return;
    answeredIndex.current = -1;
    markingStarted.current = false;
    setRound({ questions, pool: [...roundPool], type, length: roundLength });
    setIndex(0);
    setPicks([]);
    setFinished(false);
    setMarked(null);
    pendingFocus.current = 'question';
  }

  function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startRound(pool, typeChoice, length);
  }

  function choose(option: number) {
    if (!question || answeredIndex.current === index) return;
    answeredIndex.current = index;
    setPicks(previous => [...previous.slice(0, index), option]);
    pendingFocus.current = 'next';
  }

  function next() {
    if (!round || answeredIndex.current !== index) return;
    if (index + 1 < round.questions.length) {
      setIndex(index + 1);
      pendingFocus.current = 'question';
    } else {
      setFinished(true);
      pendingFocus.current = 'results';
    }
  }

  function markLearned() {
    if (!results || markingStarted.current) return;
    markingStarted.current = true;
    // `toggleKanjiLearned` is a toggle: handed a kanji that is already learned,
    // it UNlearns it. So the list is filtered here, against this render's
    // progress, and the ref above keeps a double click from toggling anything
    // back. Nothing on this page ever unmarks a kanji.
    const fresh = results.right.filter(k => !learnedKanji.includes(k));
    fresh.forEach(k => toggleKanjiLearned(k));
    setMarked(fresh);
    pendingFocus.current = 'marked';
  }

  function toggleGroup(id: string) {
    setGroupIds(current => (current.includes(id) ? current.filter(g => g !== id) : [...current, id]));
  }

  function changeQuiz() {
    setRound(null);
    setFinished(false);
    pendingFocus.current = 'setup';
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  let screen: ReactNode;

  if (!round) {
    const lengths = SESSION_LENGTHS.filter(l => l === 'all' || l < pool.length);
    const typeSummary = TYPE_CHOICES.find(c => c.value === typeChoice)?.summary;

    screen = (
      <section aria-labelledby="quiz-setup-heading" className={CARD}>
        <h2
          id="quiz-setup-heading"
          ref={setupHeadingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-japan-deep-ocean focus:outline-none"
        >
          Choose the N5 kanji to practise
        </h2>

        {/* A real GET form: submitted before hydration it reloads the page with
            the same query string parseQuizPreset reads, so an early click is
            not lost. After hydration onSubmit takes over. */}
        <form onSubmit={onStart} className="mt-5 space-y-6">
          <fieldset>
            <legend className="font-semibold text-japan-ink-black">Which kanji?</legend>
            <p className="mt-1 text-sm text-japan-mountain-mist">
              All of them, or one or more of the groups they are taught in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip type="checkbox" checked={groupIds.length === 0} onChange={() => setGroupIds([])}>
                All {TOTAL} N5 kanji
              </Chip>
              {N5_SEQUENCE.map(group => (
                <Chip
                  key={group.id}
                  type="checkbox"
                  name="group"
                  value={group.id}
                  checked={groupIds.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                >
                  {group.title}
                  <span className="text-japan-mountain-mist">
                    {group.kanji.length}
                    <span className="sr-only"> kanji</span>
                  </span>
                </Chip>
              ))}
            </div>
            {groupIds.length > 0 && (
              <p className="mt-3 text-sm text-japan-mountain-mist">
                In this quiz:{' '}
                <span lang="ja" className="text-base tracking-wider text-japan-ink-black">
                  {pool.join(' ')}
                </span>
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-japan-ink-black">Which questions?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {TYPE_CHOICES.map(choice => (
                <Chip
                  key={choice.value}
                  type="radio"
                  name="type"
                  value={choice.value}
                  checked={typeChoice === choice.value}
                  onChange={() => setTypeChoice(choice.value)}
                >
                  {choice.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          {/* One question per kanji at most, so a pool of ten or fewer has
              exactly one possible length and nothing to choose. */}
          {lengths.length > 1 && (
            <fieldset>
              <legend className="font-semibold text-japan-ink-black">How many?</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {lengths.map(option => (
                  <Chip
                    key={option}
                    type="radio"
                    name="length"
                    value={String(option)}
                    checked={questionCount(option, pool.length) === count}
                    onChange={() => setLength(option)}
                  >
                    {option === 'all' ? `All ${pool.length}` : `${option} questions`}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-japan-mountain-mist">
              {count} {count === 1 ? 'question' : 'questions'} from{' '}
              {groupIds.length === 0 ? `all ${TOTAL} N5 kanji` : `${pool.length} kanji`}, {typeSummary}.
            </p>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              data-fast-goal="n5_quiz_start_click"
              data-fast-goal-mode={typeChoice}
              data-fast-goal-questions={String(count)}
            >
              Start the quiz
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </section>
    );
  } else if (results) {
    const total = round.questions.length;
    const score = results.right.length;

    screen = (
      <section aria-labelledby="quiz-results-heading" className={CARD}>
        <p className={EYEBROW}>Round complete</p>
        <h2
          id="quiz-results-heading"
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="mt-1 text-3xl font-semibold text-japan-deep-ocean focus:outline-none"
        >
          You got {score} of {total} right
        </h2>
        <p className="mt-2 text-japan-mountain-mist">{verdict(score, total)}</p>

        {results.missed.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">The ones to go over</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {results.missed.map(kanji => (
                <li key={kanji}>
                  <KanjiPageLink
                    kanji={kanji}
                    className={`flex items-center gap-3 rounded-lg border border-border bg-japan-soft-mist px-4 py-3 transition hover:brightness-95 ${RING}`}
                  >
                    <span lang="ja" className="text-3xl font-semibold text-japan-ink-black">
                      {kanji}
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium text-japan-ink-black">{entryOf(kanji).meaning}</span>
                      <ReadingText kanji={kanji} className="block" />
                    </span>
                    <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-japan-mountain-mist" />
                  </KanjiPageLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The learning loop. /kanji/review only reviews what has been marked
            learned, so without this the quiz would be a dead end: practice
            that never reaches spaced repetition. */}
        {score > 0 && (
          <div className="mt-6 rounded-lg border border-border bg-japan-soft-mist p-4">
            <h3 className="text-lg font-semibold">What you got right</h3>
            <p lang="ja" className="mt-2 text-2xl tracking-wider text-japan-ink-black">
              {results.right.join(' ')}
            </p>

            {marked !== null ? (
              <p ref={markedNoteRef} tabIndex={-1} className="mt-3 text-sm focus:outline-none">
                {marked.length > 0
                  ? `Added ${marked.length} kanji to your learned list. `
                  : 'They were already in your learned list. '}
                <Link prefetch={false} href="/kanji/review" className={TEXT_LINK}>
                  Review them with spaced repetition
                </Link>
              </p>
            ) : unlearnedRight.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-japan-mountain-mist">
                  {unlearnedRight.length === score
                    ? 'None of these are in your learned list yet.'
                    : `${unlearnedRight.length} of these are not in your learned list yet.`}{' '}
                  Mark them learned and they join your spaced-repetition reviews.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={markLearned}
                  data-fast-goal="n5_quiz_learned_click"
                  data-fast-goal-count={String(unlearnedRight.length)}
                >
                  <Check aria-hidden="true" />
                  Mark {unlearnedRight.length} as learned
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-japan-mountain-mist">
                All of these are already in your learned list.{' '}
                <Link prefetch={false} href="/kanji/review" className={TEXT_LINK}>
                  Go to your reviews
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {results.missed.length > 0 && (
            <Button
              type="button"
              size="lg"
              onClick={() => startRound(results.missed, round.type, 'all')}
            >
              Practise the {results.missed.length} I missed
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            variant={results.missed.length > 0 ? 'outline' : 'default'}
            onClick={() => startRound(round.pool, round.type, round.length)}
          >
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button type="button" size="lg" variant="ghost" onClick={changeQuiz}>
            Change the quiz
          </Button>
        </div>
      </section>
    );
  } else if (question) {
    const total = round.questions.length;
    const isLast = index + 1 === total;
    const right = answered && pick === question.answer;
    const entry = entryOf(question.kanji);
    const answeredCount = picks.length;

    const tone = (i: number): string => {
      if (!answered) return `${EDGE} bg-background ${HOVER}`;
      if (i === question.answer) return `border-japan-deep-ocean ${WASH_RIGHT}`;
      if (i === pick) return `border-destructive-ink ${WASH_WRONG}`;
      return 'border-border bg-background text-japan-mountain-mist';
    };

    screen = (
      <section aria-labelledby="quiz-question-heading" className={CARD}>
        {/* Visible progress. Hidden from assistive tech because the heading
            below already says "Question 3 of 10". */}
        <div aria-hidden="true">
          <div className="flex items-center justify-between text-sm text-japan-mountain-mist">
            <span>
              Question {index + 1} of {total}
            </span>
            {answeredCount > 0 && (
              <span>
                {rightSoFar} of {answeredCount} right
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--sakura-waters)_30%,var(--temple-stone))]">
            <div
              className="h-full rounded-full bg-japan-mountain-mist transition-[width] duration-300"
              style={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
        </div>

        <h2
          id="quiz-question-heading"
          ref={questionHeadingRef}
          tabIndex={-1}
          className="mt-6 text-center focus:outline-none"
        >
          <span className="sr-only">
            Question {index + 1} of {total}.{' '}
          </span>
          <span className={`block ${EYEBROW}`}>{ASK[question.type]}</span>
          {question.type === 'kanji' ? (
            <span className="mt-3 block text-3xl font-semibold text-japan-deep-ocean sm:text-4xl">
              {question.prompt}
            </span>
          ) : (
            <span lang="ja" className="mt-3 block text-7xl font-bold leading-none text-japan-ink-black sm:text-8xl">
              {question.prompt}
            </span>
          )}
        </h2>

        <ol
          className={`mt-6 grid gap-3 ${question.type === 'kanji' ? 'grid-cols-2 sm:grid-cols-4' : 'sm:grid-cols-2'}`}
        >
          {question.options.map((option, i) => (
            <li key={option.kanji}>
              <button
                ref={el => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                onClick={() => choose(i)}
                aria-disabled={answered || undefined}
                aria-keyshortcuts={String(i + 1)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${RING} ${tone(i)} ${
                  answered ? 'cursor-default' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-xs font-semibold text-japan-mountain-mist"
                >
                  {i + 1}
                </span>
                {question.type === 'kanji' ? (
                  <span lang="ja" className="flex-1 text-center text-4xl font-semibold text-japan-ink-black">
                    {option.text}
                  </span>
                ) : question.type === 'reading' ? (
                  <span className="flex-1">
                    <span lang="ja" className="block text-lg text-japan-ink-black">
                      {option.text}
                    </span>
                    <span className="block text-sm text-japan-mountain-mist">{option.romaji}</span>
                  </span>
                ) : (
                  <span className="flex-1 text-base text-japan-ink-black">{option.text}</span>
                )}
                {answered && i === question.answer && (
                  <>
                    <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-japan-deep-ocean" />
                    <span className="sr-only">(the right answer)</span>
                  </>
                )}
                {answered && i === pick && pick !== question.answer && (
                  <>
                    <X aria-hidden="true" className="h-5 w-5 shrink-0 text-destructive-ink" />
                    <span className="sr-only">(your answer)</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ol>

        {!answered && (
          <p className="mt-4 hidden text-center text-xs text-japan-mountain-mist sm:block">
            Keys 1–4 answer. Enter goes on to the next question.
          </p>
        )}

        {answered && (
          <div
            className={`mt-6 rounded-lg border-2 p-4 ${
              right ? `border-japan-deep-ocean ${WASH_RIGHT}` : `border-destructive-ink ${WASH_WRONG}`
            }`}
          >
            <p
              className={`flex items-center gap-2 font-semibold ${right ? 'text-japan-deep-ocean' : 'text-destructive-ink'}`}
            >
              {right ? <Check aria-hidden="true" className="h-5 w-5" /> : <X aria-hidden="true" className="h-5 w-5" />}
              {right ? 'Correct' : 'Not quite'}
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-japan-ink-black">
              <span lang="ja" className="text-3xl font-bold">
                {question.kanji}
              </span>
              <span>{entry.entry.meaning}</span>
              <ReadingText kanji={question.kanji} />
            </p>
            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <KanjiPageLink kanji={question.kanji} className={`self-start text-sm ${TEXT_LINK}`}>
                Stroke order and readings for <span lang="ja">{question.kanji}</span>
              </KanjiPageLink>
              <Button
                ref={nextButtonRef}
                type="button"
                size="lg"
                onClick={next}
                aria-keyshortcuts="Enter"
                data-fast-goal={isLast ? 'n5_quiz_finish_click' : undefined}
                data-fast-goal-mode={isLast ? round.type : undefined}
                data-fast-goal-questions={isLast ? String(total) : undefined}
                data-fast-goal-score={isLast ? String(rightSoFar) : undefined}
              >
                {isLast ? 'See my results' : 'Next question'}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <div ref={panelRef} tabIndex={-1} className="scroll-mt-24 focus:outline-none">
      {/* One polite region for the verdict. It exists from the first render
          (empty) because a live region that mounts together with its first
          message is usually not announced at all. */}
      <p role="status" className="sr-only">
        {question && answered ? <SpokenVerdict question={question} right={pick === question.answer} /> : null}
      </p>
      {screen}
    </div>
  );
}
