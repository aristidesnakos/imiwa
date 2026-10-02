"use client"

import * as React from "react"
import { Check, RotateCcw, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  emptyPicks,
  isCorrect,
  optionLetter,
  tally,
  type QuizTally,
} from "@/lib/quiz"
import { Button } from "@/components/ui/button"

export interface QuizOption {
  label: React.ReactNode
  /** Language of `label` when it differs from the page, e.g. "ja". */
  lang?: string
}

export interface QuizQuestion {
  /** The thing being asked about. Shown large. */
  prompt: React.ReactNode
  /** Language of `prompt` when it differs from the page. */
  promptLang?: string
  /** A quieter line (or two) under the prompt, e.g. the question in words. */
  hint?: React.ReactNode
  /** Two or more. A plain string is the same as `{ label: string }`. */
  options: Array<string | QuizOption>
  /** Index into `options` of the one right answer. */
  answer: number
  /** Shown under the result once the question is answered. */
  explanation?: React.ReactNode
}

export type QuizResult = QuizTally

type OptionState = "idle" | "correct" | "wrong" | "answer" | "other"

// Tints are `color-mix` on the token, not `bg-primary/10`: an alpha modifier
// compiles to nothing where a theme stores colours as bare `var(--x)` values.
// `--destructive-ink` is used when a theme defines one (a darker red for text
// and borders) and `--destructive` otherwise. The classes are written out in
// full because Tailwind cannot see a class assembled from a string.
const OPTION_STYLES: Record<OptionState, string> = {
  idle: "border-border bg-background hover:bg-muted",
  // A ring, not a tint: a tint of a dark primary over a warm page reads as grey,
  // which looks disabled rather than right.
  correct: "border-primary bg-background ring-1 ring-primary",
  wrong:
    "border-[color:var(--destructive-ink,var(--destructive))] bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))]",
  answer: "border-primary bg-background",
  other: "border-border bg-background opacity-60",
}

function normalise(option: string | QuizOption): QuizOption {
  return typeof option === "string" ? { label: option } : option
}

export interface QuizCardProps {
  question: QuizQuestion
  /** The index the person picked, or `null` before they answer. */
  picked: number | null
  /** Called with the index of an option. Not called again once answered. */
  onPick: (index: number) => void
  /** 1-based position, shown as "1 / 3" when `total` is given too. */
  number?: number
  total?: number
}

/**
 * One question. Controlled: it shows `picked` and tells you about a tap, and
 * keeps no state of its own. Use `Quiz` for a whole set.
 */
function QuizCard({ question, picked, onPick, number, total }: QuizCardProps) {
  const promptId = React.useId()
  const answered = picked !== null
  const right = isCorrect(question, picked)
  const options = question.options.map(normalise)
  const answerLetter = optionLetter(question.answer)

  const stateOf = (index: number): OptionState => {
    if (!answered) return "idle"
    if (index === picked) return right ? "correct" : "wrong"
    if (index === question.answer) return "answer"
    return "other"
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {number !== undefined && total !== undefined && (
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {number} / {total}
          </p>
        )}
        <p
          id={promptId}
          lang={question.promptLang}
          className="text-xl font-semibold tracking-tight [word-break:keep-all] sm:text-2xl"
        >
          {question.prompt}
        </p>
        {question.hint && (
          <div className="text-sm text-muted-foreground">{question.hint}</div>
        )}
      </div>

      <div
        role="group"
        aria-labelledby={promptId}
        className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
      >
        {options.map((option, index) => {
          const state = stateOf(index)
          const mark =
            state === "correct" || state === "answer" ? (
              <Check className="size-3.5" />
            ) : state === "wrong" ? (
              <X className="size-3.5" />
            ) : (
              optionLetter(index)
            )
          return (
            <button
              key={index}
              type="button"
              data-quiz-option=""
              data-state={state}
              aria-pressed={picked === index}
              aria-disabled={answered || undefined}
              onClick={() => {
                if (!answered) onPick(index)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-base outline-none",
                "transition-colors motion-reduce:transition-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                answered ? "cursor-default" : "cursor-pointer",
                OPTION_STYLES[state]
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold",
                  state === "correct" || state === "answer"
                    ? "border-primary bg-primary text-primary-foreground"
                    : state === "wrong"
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border text-muted-foreground"
                )}
              >
                {mark}
              </span>
              <span lang={option.lang} className="[word-break:keep-all]">
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Always mounted, so the result is announced when it fills in. The
          fixed height keeps the page from jumping when it does. */}
      <div role="status" className="min-h-6 text-sm">
        {answered && (
          <div className="flex flex-col gap-1">
            <p
              className={cn(
                "font-medium",
                right
                  ? "text-foreground"
                  : "text-[color:var(--destructive-ink,var(--destructive))]"
              )}
            >
              {right ? "Correct" : `Not quite. The answer is ${answerLetter}.`}
            </p>
            {question.explanation && (
              <div className="text-muted-foreground">
                {question.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export interface QuizProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  questions: QuizQuestion[]
  /** Called once, when the last question is answered. */
  onComplete?: (result: QuizResult) => void
}

/**
 * A set of questions answered by tapping. Each tap shows at once whether it was
 * right and which option was, then locks that question. When every question is
 * answered the footer shows the score and a Try again button.
 */
function Quiz({ questions, onComplete, className, ...props }: QuizProps) {
  const [picks, setPicks] = React.useState<(number | null)[]>(() =>
    emptyPicks(questions)
  )
  const rootRef = React.useRef<HTMLDivElement>(null)
  // Set by Try again: the button that had focus unmounts, so focus moves to
  // the first option once the picks have reset.
  const refocus = React.useRef(false)

  // `questions` can change under the quiz (a new episode, a reshuffle); a pick
  // for a question that is no longer there would grade the wrong one. Done
  // while rendering, not in an effect, so the stale picks are never painted.
  if (picks.length !== questions.length) setPicks(emptyPicks(questions))

  const result = tally(questions, picks)

  React.useEffect(() => {
    if (!refocus.current || picks.some((pick) => pick !== null)) return
    refocus.current = false
    rootRef.current?.querySelector<HTMLElement>("[data-quiz-option]")?.focus()
  }, [picks])

  const pick = (question: number, option: number) => {
    const next = picks.map((p, i) => (i === question ? option : p))
    setPicks(next)
    const after = tally(questions, next)
    if (after.complete) onComplete?.(after)
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col", className)} {...props}>
      <ol className="overflow-hidden rounded-xl border bg-card">
        {questions.map((question, i) => (
          <li key={i} className="border-b p-5 sm:p-6">
            <QuizCard
              question={question}
              number={i + 1}
              total={questions.length}
              picked={picks[i] ?? null}
              onPick={(option) => pick(i, option)}
            />
          </li>
        ))}
        <li className="flex min-h-14 items-center justify-between gap-3 bg-muted px-5 py-2 text-sm sm:px-6">
          <span className="whitespace-nowrap tabular-nums">
            {result.complete ? (
              <span className="font-medium">
                {result.correct} of {result.total} correct
              </span>
            ) : (
              <span className="text-muted-foreground">
                {result.answered} of {result.total} answered
              </span>
            )}
          </span>
          {result.complete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refocus.current = true
                setPicks(emptyPicks(questions))
              }}
            >
              <RotateCcw />
              Try again
            </Button>
          )}
        </li>
      </ol>
      <span role="status" className="sr-only">
        {result.complete
          ? `You got ${result.correct} of ${result.total} correct`
          : ""}
      </span>
    </div>
  )
}

export { Quiz, QuizCard }
