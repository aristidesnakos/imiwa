/**
 * The surfaces that can capture an email — as a runtime value, not just a type.
 *
 * ---------------------------------------------------------------------------
 * Why this is its own module
 * ---------------------------------------------------------------------------
 *
 * `lib/analytics/index.ts` is a browser module: it reads `localStorage` for
 * consent and touches `window`/`document` in nine places. `POST /api/subscribe`
 * has to validate the incoming `source` on the server, and importing the
 * analytics barrel from a route handler would drag that client code into the
 * server bundle to get at one string union.
 *
 * ---------------------------------------------------------------------------
 * Why a const array and not a type union
 * ---------------------------------------------------------------------------
 *
 * `EmailSignupSource` used to be declared directly as a union of string
 * literals. A type is erased at runtime, so there was nothing to validate
 * against and `/api/subscribe` accepted any non-empty string — which then
 * travelled into an email we send. The array is the value; the type is derived
 * from it, so the two can never drift.
 *
 * Adding a surface means adding it here and nowhere else. Per-surface signup
 * CTR is read entirely off this value in DataFast, so a typo silently splits
 * one surface's rate across two spellings.
 */
export const EMAIL_SIGNUP_SOURCES = [
  /** The weekly-story capture on the homepage. */
  'homepage-weekly-story',
  /** The printables hub — the page that ranks for "free printable kanji worksheets". */
  'free-resources',
  /**
   * The quiz gate at the foot of a single Travels-of-Tan episode. Someone here
   * read six panels of Japanese before they saw the form.
   */
  'story-episode-quiz',
  /** The form on the /stories hub — read nothing yet, browsing the shelf. */
  'story-hub',
  /**
   * The same episode-page form, reached from a YouTube Short via /tan.
   *
   * Deliberately NOT folded into `story-episode-quiz`, and the split is the
   * whole point rather than bookkeeping: a Short viewer arrives having watched
   * a 28-second video and typed a URL by hand, while a `story-episode-quiz`
   * subscriber read six panels of Japanese on the page before the form came
   * into view. Those are different levels of intent reached by different
   * effort, and YouTube is on trial here — a channel that cannot be shown to
   * produce subscribers gets stopped after eight Shorts. Collapsed into one
   * source that evidence does not exist.
   */
  'short-quiz',
  /**
   * The form at the foot of a JLPT level list (/kanji/n5). Someone here is
   * studying a level as a set — a different intent from browsing the story
   * shelf or finishing an episode, which is the test for earning a source of
   * its own. One source for every level page, not one per level: a per-level
   * split answers no decision the page URL in DataFast does not already.
   */
  'kanji-level-list',
] as const;

/**
 * The two story sources above are split deliberately, and the split is the
 * point rather than bookkeeping.
 *
 * The open question these pages exist to answer is *who* engages — and the
 * honest way to ask it is behaviour, not a survey. A subscriber from
 * `story-episode-quiz` finished an episode and wanted to be tested on it; a
 * subscriber from `story-hub` liked the idea of the thing. Those are different
 * people with different intent, and per-surface signup rate in DataFast reads
 * the difference directly. Collapsed into one `stories` source, it would not be
 * recoverable afterwards.
 *
 * Adding a third story surface means asking first whether it distinguishes a
 * different intent. If it does not, reuse one of these — a split that answers
 * no question just halves both numbers.
 */

export type EmailSignupSource = (typeof EMAIL_SIGNUP_SOURCES)[number];

/** Runtime guard. The only sanctioned way to turn untrusted input into a source. */
export function isEmailSignupSource(value: unknown): value is EmailSignupSource {
  return (
    typeof value === 'string' &&
    (EMAIL_SIGNUP_SOURCES as readonly string[]).includes(value)
  );
}
