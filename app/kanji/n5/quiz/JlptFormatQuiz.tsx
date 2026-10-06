'use client';

/**
 * app/kanji/n5/quiz/JlptFormatQuiz.tsx
 *
 * The "JLPT format" mode of /kanji/n5/quiz: a set of our own practice questions in the
 * shape of the first two kinds of question in the real N5 vocabulary part.
 *
 *   Mondai 1  an underlined kanji word in a sentence -> choose how it is read
 *   Mondai 2  an underlined hiragana word            -> choose the kanji it is written with
 *
 * These are not JLPT questions and the screens never say they are, or that the score
 * predicts one. Every stem is a Tatoeba sentence, credited beside the item; Mondai 2
 * shows the target word in hiragana, which alters the sentence, and says so.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAME MACHINE AS THE KANJI QUIZ, DIFFERENT QUESTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The state machine, focus handling and keys are N5QuizClient's, deliberately: 1-4
 * answer and Enter moves on only while focus is inside the panel; answered options take
 * aria-disabled so focus is not dropped to <body>; each new screen focuses its own
 * heading; one polite live region speaks the verdict. The look comes from ./quiz-ui.
 *
 * The server renders the setup screen and never a question: nothing random happens here
 * at all (the items and their option order are fixed in the data), so the first client
 * render matches the HTML. Nothing is stored in the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE RESULTS SCREEN OFFERS, AND WHY IT IS PASSED IN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The book offer and the newsletter form arrive as `book` and `signup`, already-built
 * nodes from the server page. BookCTA is a server component, so as a slot it costs this
 * bundle nothing; EmailCapture is its own client component either way. Their copy lives
 * in page.tsx, in one place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANALYTICS: ONE GOAL, AND IT IS FINISHING A SET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   n5_jlpt_format_finish_click   The last question's "See my results" button. The set
 *                                 number and the score ride along as properties.
 *
 * It is a `data-fast-goal` attribute, as on N5QuizClient's last Next button, so it adds
 * no script: a key and a pointer both go through `.click()` on that button, and the
 * DataFast script picks the goal up from the click. A replay finishes again and fires
 * again, so count finishers as visitors, not events.
 *
 * Why this is the one goal: it is the denominator of the mode's kill criterion, "stop if
 * fewer than ~5% of finishers sign up". The numerator already exists, the `email_signup`
 * goal with source `jlpt-format-results`; without a finish count it divides by nothing.
 * To keep the mode at one goal, the book on the results screen fires none (its surface
 * has no entry in BOOK_CLICK_GOALS, lib/commerce/links.ts). Amazon exits from this page
 * still show in DataFast's exit-click report.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Check, ExternalLink, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JlptItem } from '@/lib/jlpt/types';
import { CARD, Chip, EDGE, EYEBROW, HOVER, RING, TEXT_LINK, WASH_RIGHT, WASH_WRONG } from './quiz-ui';
import {
  JLPT_SAMPLE_INDEX_URL,
  JLPT_SAMPLE_QUESTIONS_URL,
  groupSets,
  type JlptSet,
} from './jlpt-format';

const LICENSE_URL: Record<JlptItem['source']['license'], string> = {
  'CC BY 2.0 FR': 'https://creativecommons.org/licenses/by/2.0/fr/',
  'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

const INSTRUCTION: Record<1 | 2, string> = {
  1: 'How is the underlined word read?',
  2: 'Which kanji is right for the underlined word?',
};

function verdict(score: number, total: number): string {
  if (score === total) return 'Every one right.';
  if (score / total >= 0.8) return 'Nearly all of them. The misses are below.';
  if (score / total >= 0.5) return 'More than half. The ones to go over are below.';
  return 'These take a few rounds. Go over the misses below, then play the set again.';
}

/** The sentence, with the target underlined and announced as such. */
function Stem({ item, className = '' }: { item: JlptItem; className?: string }) {
  return (
    <span lang="ja" className={className}>
      {item.before}
      <span lang="en" className="sr-only">
        underlined word:{' '}
      </span>
      <span className="font-semibold underline decoration-japan-deep-ocean decoration-2 underline-offset-[0.3em]">
        {item.target}
      </span>
      {item.after}
    </span>
  );
}

/** Credit beside every item. A null contributor is normal (unadopted Tanaka Corpus import). */
function ItemCredit({ item, className = '' }: { item: JlptItem; className?: string }) {
  const { source } = item;
  return (
    <p className={`text-xs leading-relaxed text-japan-mountain-mist ${className}`}>
      Sentence{' '}
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer noopener"
        className={`rounded-sm underline underline-offset-2 hover:no-underline ${RING}`}
      >
        #{source.sentenceId} on Tatoeba
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      ,{' '}
      {source.contributor ? (
        <>
          by <span className="font-medium">{source.contributor}</span>
        </>
      ) : (
        'an unadopted Tanaka Corpus import with no individual contributor'
      )}
      ,{' '}
      <a
        href={LICENSE_URL[source.license]}
        target="_blank"
        rel="noreferrer noopener license"
        className={`rounded-sm underline underline-offset-2 hover:no-underline ${RING}`}
      >
        {source.license}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      . The English translation is from Tatoeba too and is credited on that page.
      {item.mondai === 2 && (
        <>
          {' '}
          <span className="font-semibold text-japan-ink-black">
            Adapted: the underlined word is shown in hiragana.
          </span>
        </>
      )}
    </p>
  );
}

/** What the live region says after an answer. Short: the screen shows the rest. */
function SpokenVerdict({ item, right }: { item: JlptItem; right: boolean }) {
  const answer = item.options[item.answer];
  return (
    <>
      {right ? 'Correct.' : 'Not quite.'} <span lang="ja">{item.target}</span>{' '}
      {item.mondai === 1 ? 'is read' : 'is written'} <span lang="ja">{answer}</span>.
    </>
  );
}

interface Play {
  set: JlptSet;
  items: JlptItem[];
}

type FocusTarget = 'setup' | 'question' | 'next' | 'results';

/** The sticky header's height, roughly. A panel top above this is hidden under it. */
const HEADER_CLEARANCE = 80;

export function JlptFormatQuiz({
  items,
  book,
  signup,
}: {
  items: JlptItem[];
  /** The BookCTA for this screen, built by the server page. */
  book: ReactNode;
  /** The newsletter form for this screen, built by the server page. */
  signup: ReactNode;
}) {
  const sets = useMemo(() => groupSets(items), [items]);

  const [chosenSet, setChosenSet] = useState<number>(sets[0]?.set ?? 1);
  const [play, setPlay] = useState<Play | null>(null);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const setupHeadingRef = useRef<HTMLHeadingElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pendingFocus = useRef<FocusTarget | null>(null);
  // Synchronous guard: a key and a click in the same tick must not both count.
  const answeredIndex = useRef(-1);

  // A link or a no-script form submit can name a set (?mode=jlpt&set=3). Read after
  // mount so the server HTML and the first client render still agree.
  useEffect(() => {
    const wanted = Number(new URLSearchParams(window.location.search).get('set'));
    if (sets.some(s => s.set === wanted)) setChosenSet(wanted);
  }, [sets]);

  const question = play && !finished ? play.items[index] : null;
  const pick = question ? picks[index] : undefined;
  const answered = pick !== undefined;
  const rightSoFar = play ? play.items.filter((q, i) => picks[i] === q.answer).length : 0;

  const results = useMemo(() => {
    if (!play || !finished) return null;
    const m1 = play.items.filter(i => i.mondai === 1);
    const m2 = play.items.filter(i => i.mondai === 2);
    const rightOf = (list: JlptItem[]) => list.filter(q => picks[play.items.indexOf(q)] === q.answer).length;
    const missed = play.items
      .map((q, i) => ({ q, i, pick: picks[i] }))
      .filter(({ q, pick: p }) => p !== q.answer);
    return {
      m1Right: rightOf(m1),
      m1Total: m1.length,
      m2Right: rightOf(m2),
      m2Total: m2.length,
      missed,
    };
  }, [play, finished, picks]);

  // ── Focus: each new screen lands on its heading, an answer on Next ─────────
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;

    if (target === 'next') {
      nextButtonRef.current?.focus();
      return;
    }

    const heading =
      target === 'setup'
        ? setupHeadingRef.current
        : target === 'results'
          ? resultsHeadingRef.current
          : questionHeadingRef.current;
    heading?.focus({ preventScroll: true });

    // Bring the panel's top back into view rather than leave the new screen
    // half-hidden under the sticky header.
    const panel = panelRef.current;
    if (!panel) return;
    const { top } = panel.getBoundingClientRect();
    if (top < HEADER_CLEARANCE || top > window.innerHeight / 2) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  });

  // ── Keys: 1-4 answer, Enter goes on; only while focus is inside this panel ─
  useEffect(() => {
    if (!play || finished) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !panelRef.current?.contains(target)) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (!answered) {
        // event.code as well as event.key: on AZERTY the unshifted top-row key types "&".
        const digit = /^[1-4]$/.test(event.key)
          ? Number(event.key)
          : Number(/^(?:Digit|Numpad)([1-4])$/.exec(event.code)?.[1] ?? Number.NaN);
        const option = optionRefs.current[digit - 1];
        if (option) {
          event.preventDefault();
          option.click();
        }
        return;
      }

      if (event.key === 'Enter' && !event.repeat) {
        // A focused link or live button handles Enter itself; clicking Next here too
        // would skip the question after this one.
        if (target.closest('a, button:not([aria-disabled="true"])')) return;
        event.preventDefault();
        nextButtonRef.current?.click();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [play, finished, answered]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function startSet(setNo: number) {
    const set = sets.find(s => s.set === setNo);
    if (!set || set.all.length === 0) return;
    answeredIndex.current = -1;
    setPlay({ set, items: set.all });
    setIndex(0);
    setPicks([]);
    setFinished(false);
    pendingFocus.current = 'question';
  }

  function onStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSet(chosenSet);
  }

  function choose(option: number) {
    if (!question || answeredIndex.current === index) return;
    answeredIndex.current = index;
    setPicks(previous => [...previous.slice(0, index), option]);
    pendingFocus.current = 'next';
  }

  function next() {
    if (!play || answeredIndex.current !== index) return;
    if (index + 1 < play.items.length) {
      setIndex(index + 1);
      pendingFocus.current = 'question';
    } else {
      setFinished(true);
      pendingFocus.current = 'results';
    }
  }

  function chooseAnotherSet() {
    setPlay(null);
    setFinished(false);
    pendingFocus.current = 'setup';
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  let screen: ReactNode;

  if (!play) {
    const current = sets.find(s => s.set === chosenSet) ?? sets[0];
    screen = (
      <section aria-labelledby="jlpt-setup-heading" className={CARD}>
        <p className={EYEBROW}>JLPT format · N5</p>
        <h2
          id="jlpt-setup-heading"
          ref={setupHeadingRef}
          tabIndex={-1}
          className="mt-1 text-2xl font-semibold text-japan-deep-ocean focus:outline-none"
        >
          Pick a set of practice questions
        </h2>
        <p className="mt-3 text-japan-ink-black">
          These are our own questions, written in the same two formats that open the vocabulary part
          of the real N5 exam: in Mondai 1 you read an underlined kanji word, in Mondai 2 you pick the
          kanji for an underlined kana word. A set is a small slice of what the real exam asks, and
          your score on it says nothing about how you would score on the JLPT.
        </p>

        {/* A real GET form: submitted before hydration it reloads with ?mode=jlpt&set=N,
            which the page and the effect above read, so an early click is not lost. */}
        <form onSubmit={onStart} className="mt-5 space-y-6">
          <input type="hidden" name="mode" value="jlpt" />
          <fieldset>
            <legend className="font-semibold text-japan-ink-black">Which set?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {sets.map(s => (
                <Chip
                  key={s.set}
                  type="radio"
                  name="set"
                  value={String(s.set)}
                  checked={chosenSet === s.set}
                  onChange={() => setChosenSet(s.set)}
                >
                  Set {s.set}
                  <span className="text-japan-mountain-mist">
                    {s.all.length}
                    <span className="sr-only"> questions</span>
                  </span>
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-japan-mountain-mist">
              {current
                ? `Set ${current.set}: ${current.mondai1.length} Mondai 1 questions, then ${current.mondai2.length} Mondai 2.`
                : ''}
            </p>
            <Button type="submit" size="lg" className="min-h-11 w-full sm:w-auto">
              Start set {current?.set}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </section>
    );
  } else if (results) {
    const total = play.items.length;
    const score = results.m1Right + results.m2Right;

    screen = (
      <section aria-labelledby="jlpt-results-heading" className={CARD}>
        <p className={EYEBROW}>Set {play.set.set} complete</p>
        <h2
          id="jlpt-results-heading"
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="mt-1 text-3xl font-semibold text-japan-deep-ocean focus:outline-none"
        >
          You got {score} of {total} right
        </h2>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-japan-soft-mist px-4 py-3">
            <dt className="text-sm text-japan-mountain-mist">Mondai 1</dt>
            <dd className="text-2xl font-semibold text-japan-ink-black">
              {results.m1Right}/{results.m1Total}
            </dd>
          </div>
          {results.m2Total > 0 && (
            <div className="rounded-lg border border-border bg-japan-soft-mist px-4 py-3">
              <dt className="text-sm text-japan-mountain-mist">Mondai 2</dt>
              <dd className="text-2xl font-semibold text-japan-ink-black">
                {results.m2Right}/{results.m2Total}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-4 text-japan-ink-black">{verdict(score, total)}</p>
        <p className="mt-1 text-sm text-japan-mountain-mist">
          That is a count of these {total} practice questions. It is not a JLPT score and does not
          predict one.
        </p>

        {results.missed.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">The ones to go over</h3>
            <ul className="mt-3 space-y-3">
              {results.missed.map(({ q, i, pick: chosen }) => (
                <li key={q.id} className="rounded-lg border border-border bg-japan-soft-mist p-4">
                  <p className={EYEBROW}>
                    Mondai {q.mondai} · question {i + 1}
                  </p>
                  <p className="mt-2 text-xl leading-loose text-japan-ink-black">
                    <Stem item={q} />
                  </p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-japan-ink-black">
                    <span className="flex items-center gap-1 font-semibold text-japan-deep-ocean">
                      <Check aria-hidden="true" className="h-4 w-4" />
                      Right answer:
                    </span>
                    <span lang="ja" className="text-xl font-bold">
                      {q.options[q.answer]}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-japan-ink-black">
                    <span className="flex items-center gap-1 font-semibold text-destructive-ink">
                      <X aria-hidden="true" className="h-4 w-4" />
                      You chose:
                    </span>
                    <span lang="ja" className="text-base">
                      {chosen === undefined ? '—' : q.options[chosen]}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-japan-mountain-mist">{q.english}</p>
                  <ItemCredit item={q} className="mt-2" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="lg"
            className="min-h-11"
            onClick={() => startSet(play.set.set)}
          >
            <RotateCcw aria-hidden="true" />
            Play set {play.set.set} again
          </Button>
          {sets.length > 1 && (
            <Button type="button" size="lg" variant="outline" className="min-h-11" onClick={chooseAnotherSet}>
              Try another set
            </Button>
          )}
        </div>

        <div className="mt-8 space-y-6 border-t border-border pt-6">
          {/* Wrapped, not bare: nodes handed over from a server component trip React's
              missing-key warning when they sit directly among a parent's children. */}
          <div>{book}</div>
          <div>{signup}</div>

          <div>
            <h3 className="text-lg font-semibold text-japan-deep-ocean">
              For the rest of the exam, use the official material
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-japan-mountain-mist">
              A set here covers {total} questions of two kinds. The JLPT publishes free sample
              questions and a practice workbook for every section, including grammar, reading and
              listening. They are its own questions, so we link to them instead of copying them.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={JLPT_SAMPLE_QUESTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 items-center gap-1.5 ${TEXT_LINK}`}
                >
                  Official JLPT sample questions
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href={JLPT_SAMPLE_INDEX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 items-center gap-1.5 ${TEXT_LINK}`}
                >
                  Official JLPT practice workbook, every level
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    );
  } else if (question) {
    const total = play.items.length;
    const isLast = index + 1 === total;
    const right = answered && pick === question.answer;
    const answeredCount = picks.length;
    const inMondai = play.items.filter(i => i.mondai === question.mondai);
    const posInMondai = inMondai.indexOf(question) + 1;

    const tone = (i: number): string => {
      if (!answered) return `${EDGE} bg-background ${HOVER}`;
      if (i === question.answer) return `border-japan-deep-ocean ${WASH_RIGHT}`;
      if (i === pick) return `border-destructive-ink ${WASH_WRONG}`;
      return 'border-border bg-background text-japan-mountain-mist';
    };

    screen = (
      <section aria-labelledby="jlpt-question-heading" className={CARD}>
        {/* Visible progress; the heading below already says "Question 3 of 12". */}
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
          id="jlpt-question-heading"
          ref={questionHeadingRef}
          tabIndex={-1}
          className="mt-6 focus:outline-none"
        >
          <span className="sr-only">
            Question {index + 1} of {total}.{' '}
          </span>
          <span className={`block ${EYEBROW}`}>
            Mondai {question.mondai} · {posInMondai} of {inMondai.length}
          </span>
          <span className="mt-1 block text-base font-medium text-japan-deep-ocean">
            {INSTRUCTION[question.mondai]}
          </span>
          <span className="sr-only">. </span>
          <Stem
            item={question}
            className="mt-4 block text-2xl font-normal leading-[2.2] text-japan-ink-black sm:text-3xl sm:leading-[2.2]"
          />
        </h2>

        <ItemCredit item={question} className="mt-3" />

        <ol className="mt-6 grid grid-cols-2 gap-3">
          {question.options.map((option, i) => (
            <li key={option}>
              <button
                ref={el => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                onClick={() => choose(i)}
                aria-disabled={answered || undefined}
                aria-keyshortcuts={String(i + 1)}
                className={`flex min-h-14 w-full items-center gap-2 rounded-lg border-2 px-3 py-3 text-left transition-colors sm:gap-3 sm:px-4 ${RING} ${tone(i)} ${
                  answered ? 'cursor-default' : ''
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-xs font-semibold text-japan-mountain-mist"
                >
                  {i + 1}
                </span>
                <span lang="ja" className="min-w-0 flex-1 break-words text-xl text-japan-ink-black sm:text-2xl">
                  {option}
                </span>
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
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-japan-ink-black">
              <span lang="ja" className="text-2xl font-bold">
                {question.target}
              </span>
              <span>{question.mondai === 1 ? 'is read' : 'is written'}</span>
              <span lang="ja" className="text-2xl font-bold">
                {question.options[question.answer]}
              </span>
            </p>
            <p className="mt-2 text-sm text-japan-mountain-mist">{question.english}</p>
            <div className="mt-4 flex sm:justify-end">
              <Button
                ref={nextButtonRef}
                type="button"
                size="lg"
                className="min-h-11 w-full sm:w-auto"
                onClick={next}
                aria-keyshortcuts="Enter"
                data-fast-goal={isLast ? 'n5_jlpt_format_finish_click' : undefined}
                data-fast-goal-set={isLast ? String(play.set.set) : undefined}
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
      {/* One polite region for the verdict, present from the first render. */}
      <p role="status" className="sr-only">
        {question && answered ? <SpokenVerdict item={question} right={pick === question.answer} /> : null}
      </p>
      {screen}
    </div>
  );
}
