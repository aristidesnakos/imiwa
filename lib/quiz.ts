/**
 * Pure helpers for the quiz pattern: grade one pick, tally a set of picks, and
 * check that a question set is well formed. No React and no network, so they
 * are safe to unit test and to run on a server.
 *
 * A pick is the index of the chosen option, or `null` while unanswered. Every
 * helper returns a new value and never changes what it is given.
 */

/** The part of a question the helpers need. The component's `QuizQuestion` fits it. */
export interface GradableQuestion {
  options: readonly unknown[]
  /** Index into `options` of the one right answer. */
  answer: number
}

export interface QuizTally {
  total: number
  /** Questions with a pick. */
  answered: number
  /** Picks that matched the answer. */
  correct: number
  /** Every question has a pick. An empty quiz is never complete. */
  complete: boolean
}

/** "A" for 0, "B" for 1, and so on. Wraps to "AA" after "Z". */
export function optionLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0) return ""
  let n = index
  let letter = ""
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

/** True when the pick is the answer. An unanswered pick is never correct. */
export function isCorrect(
  question: Pick<GradableQuestion, "answer">,
  pick: number | null
): boolean {
  return pick !== null && pick === question.answer
}

/**
 * Count answered and correct picks. `picks` is read by position; a missing
 * entry counts as unanswered, and extra entries are ignored.
 */
export function tally(
  questions: readonly GradableQuestion[],
  picks: readonly (number | null)[]
): QuizTally {
  let answered = 0
  let correct = 0
  questions.forEach((question, i) => {
    const pick = picks[i] ?? null
    if (pick === null) return
    answered += 1
    if (isCorrect(question, pick)) correct += 1
  })
  return {
    total: questions.length,
    answered,
    correct,
    complete: questions.length > 0 && answered === questions.length,
  }
}

/** A fresh, all-unanswered pick list for `questions`. */
export function emptyPicks(questions: readonly unknown[]): null[] {
  // Annotated so a project without `strictNullChecks` still gets `null[]`, not `any[]`.
  return questions.map((): null => null)
}

/**
 * Problems that would make a question unanswerable or ambiguous, one message
 * per problem, each naming the question (1-based). An empty list means the set
 * is fine. Run it in a test or at build time against your own data.
 */
export function checkQuestions(
  questions: readonly GradableQuestion[]
): string[] {
  const problems: string[] = []
  questions.forEach((question, i) => {
    const name = `Question ${i + 1}`
    if (question.options.length < 2) {
      problems.push(`${name}: needs at least two options`)
    }
    if (
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= question.options.length
    ) {
      problems.push(`${name}: answer ${question.answer} is not an option`)
    }
    const labels = question.options.filter(
      (option): option is string => typeof option === "string"
    )
    const seen = new Set<string>()
    for (const label of labels) {
      const key = label.trim().toLowerCase()
      if (seen.has(key)) {
        problems.push(
          `${name}: "${label}" appears twice, so two options are right`
        )
      }
      seen.add(key)
    }
  })
  return problems
}
