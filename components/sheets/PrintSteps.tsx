import type { ReactNode } from 'react';
import { SECTION_HEADING } from '@/components/kanji/section';
import { cn } from '@/lib/utils';

/**
 * components/sheets/PrintSteps.tsx
 *
 * How a sheet becomes paper or a PDF, for the sheets hub and the N5 sheets page.
 *
 * A sheet is an HTML page, not a file: no PDF is generated anywhere, the
 * browser's print dialog does that. So the steps are about Ctrl+P, and the
 * one thing that differs between pages — where you click to open a sheet — is
 * passed in.
 */

interface Props {
  /** Where a sheet is opened from on this page, as the first step's sentence. */
  firstStep: ReactNode;
  className?: string;
}

const KEY = 'rounded border border-border bg-japan-soft-mist px-1.5 py-0.5 font-mono text-sm';

export function PrintSteps({ firstStep, className }: Props) {
  return (
    <section aria-labelledby="print-steps-heading" className={className}>
      <h2 id="print-steps-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
        How to print a sheet or save it as a PDF
      </h2>

      <ol className="ml-5 mt-4 list-decimal space-y-2 text-japan-ink-black">
        <li>{firstStep} The sheet opens in a new tab.</li>
        <li>
          Press <kbd className={KEY}>Ctrl</kbd>&nbsp;+&nbsp;<kbd className={KEY}>P</kbd>, or{' '}
          <kbd className={KEY}>
            {/* Screen readers announce the glyph as "place of interest sign". */}
            <span aria-hidden>&#8984;</span>
            <span className="sr-only">Command</span>
          </kbd>
          &nbsp;+&nbsp;<kbd className={KEY}>P</kbd> on a Mac.
        </li>
        <li>
          Print it, or choose <strong>Save as PDF</strong> as the destination to keep a copy.
        </li>
      </ol>

      <p className="mt-4 text-sm text-japan-mountain-mist">
        On a phone, open the sheet and look for Print in your browser&rsquo;s share menu.
      </p>
    </section>
  );
}
