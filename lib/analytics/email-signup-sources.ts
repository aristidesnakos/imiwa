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
] as const;

export type EmailSignupSource = (typeof EMAIL_SIGNUP_SOURCES)[number];

/** Runtime guard. The only sanctioned way to turn untrusted input into a source. */
export function isEmailSignupSource(value: unknown): value is EmailSignupSource {
  return (
    typeof value === 'string' &&
    (EMAIL_SIGNUP_SOURCES as readonly string[]).includes(value)
  );
}
