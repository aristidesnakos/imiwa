import type { LucideIcon } from 'lucide-react';
import { Grid3x3, Languages, ListOrdered, PenLine } from 'lucide-react';
import { SECTION_HEADING } from '@/components/kanji/section';
import { cn } from '@/lib/utils';

/**
 * components/sheets/SheetContents.tsx
 *
 * What one printed kanji sheet actually has on it, for the sheets hub and the
 * N5 sheets page — one copy, so the two pages cannot describe the same sheet
 * two different ways.
 *
 * Every line here is a claim about the document `app/api/kanji-sheets/route.ts`
 * renders: the 72px character and its info rows, the KanjiVG diagram (which
 * carries its own stroke numbers), the 8 × 10 table with crosshair guides, the
 * faint diagram in the first cell of each row, `@page { size: A4 portrait }`
 * and the credit paragraph. Change the sheet, re-read this.
 *
 * The old copy on both pages also promised "Print-Optimized" and told readers
 * to wait for the diagram to load. The diagram is inlined into the sheet on the
 * server, so there is nothing to wait for, and the claim is gone.
 */

interface SheetPart {
  icon: LucideIcon;
  title: string;
  body: string;
}

const SHEET_PARTS: readonly SheetPart[] = [
  {
    icon: Languages,
    title: 'The kanji and its readings',
    body: 'Written large, with its meaning, on’yomi and kun’yomi, JLPT level and stroke count.',
  },
  {
    icon: ListOrdered,
    title: 'A numbered stroke-order diagram',
    body: 'Every stroke in the order you write it, from the KanjiVG project.',
  },
  {
    icon: Grid3x3,
    title: '80 practice squares',
    body: 'Ten across and eight down, each with crosshair guides to help you keep the character balanced.',
  },
  {
    icon: PenLine,
    title: 'A tracing guide on every row',
    body: 'The first square of each row holds a faint copy of the diagram to trace before you write it freehand.',
  },
];

interface Props {
  className?: string;
}

export function SheetContents({ className }: Props) {
  return (
    <section aria-labelledby="sheet-contents-heading" className={className}>
      <h2 id="sheet-contents-heading" className={cn(SECTION_HEADING, 'text-japan-deep-ocean')}>
        What&rsquo;s on each kanji practice sheet
      </h2>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {SHEET_PARTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-japan-soft-mist text-japan-deep-ocean"
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-japan-deep-ocean">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-japan-mountain-mist">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-japan-mountain-mist">
        One sheet per page, laid out for A4 portrait, with the KanjiVG credit printed at the foot
        of every sheet.
      </p>
    </section>
  );
}
