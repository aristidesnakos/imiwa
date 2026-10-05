/**
 * app/kanji/n5/quiz/quiz-ui.tsx
 *
 * The look of the N5 quiz, in one place: the control edge, the right/wrong washes, the
 * card, and the chip. They used to live inside N5QuizClient; the JLPT-format mode is a
 * second screen set that has to look like the first, so both import them from here.
 *
 * No 'use client' of its own: a module of constants plus one component with no state is
 * fine to import from either side, and it takes the boundary of whoever imports it.
 */

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

/** The keyboard ring, for everything here that does not come from buttonVariants. */
export const RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Control edge. Mountain mist mixed 70% into the card is 3.3:1 against it, over
 * WCAG 1.4.11's 3:1; the full-strength --input (6.5:1) on a two-by-two grid of
 * large tiles reads as a table ruled in ink.
 */
export const EDGE = 'border-[color:color-mix(in_srgb,var(--mountain-mist)_70%,var(--temple-stone))]';
export const HOVER = 'hover:bg-[color-mix(in_srgb,var(--sakura-waters)_15%,var(--temple-stone))]';
/** Selected, and the right answer: a sakura wash under a deep-ocean edge. */
export const WASH_RIGHT = 'bg-[color-mix(in_srgb,var(--sakura-waters)_30%,var(--temple-stone))]';
/** A wrong pick: --destructive as a wash, never as text; --destructive-ink is 5.3:1 on it. */
export const WASH_WRONG = 'bg-[color-mix(in_srgb,var(--destructive)_10%,var(--temple-stone))]';

export const CARD = 'rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6';
export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist';
export const TEXT_LINK = `rounded-sm font-medium text-japan-deep-ocean underline underline-offset-4 hover:no-underline ${RING}`;

/**
 * A native checkbox or radio, visually replaced by a chip. The input stays in
 * the DOM (sr-only), so the label, the group semantics, arrow keys between
 * radios and form submission are all the browser's own; only the drawing is
 * ours. The small box or dot keeps "pick several" and "pick one" telling
 * themselves apart without relying on colour.
 */
export function Chip({
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
