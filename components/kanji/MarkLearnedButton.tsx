'use client';

/**
 * components/kanji/MarkLearnedButton.tsx
 *
 * Marks this character learned from its own page. It is the same toggle as the
 * check on the /kanji grid and the tick on the N5 countdown, through the same
 * hook, so all three read and write one `kanji-progress` entry.
 *
 * The server HTML is the unlearned state: the hook starts empty and reads what
 * is stored in an effect, so a returning learner's button turns "Learned" after
 * hydration, as the grid's check does. The label reserves the width of both
 * states. A wider label would re-centre the button after hydration, and that
 * counts as a layout shift on a route that gates on CLS.
 */

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKanjiProgress } from '@/hooks/useKanjiProgress';

interface Props {
  kanji: string;
}

export function MarkLearnedButton({ kanji }: Props) {
  const { isKanjiLearned, toggleKanjiLearned } = useKanjiProgress();
  const learned = isKanjiLearned(kanji);

  return (
    <Button
      type="button"
      variant={learned ? 'default' : 'outline'}
      // The outline variant draws a 1px border and the default one does not.
      // The learned fill takes its own, in the fill's colour, so marking a
      // character does not shrink the button by 2px and move its edges.
      className={learned ? 'border border-primary' : undefined}
      onClick={() => toggleKanjiLearned(kanji)}
    >
      <Check aria-hidden />
      {/* Both labels share one grid cell. The longer one is hidden but still
          takes its space, so the button is the same width in either state. */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1">Mark as learned</span>
        <span className="col-start-1 row-start-1">{learned ? 'Learned' : 'Mark as learned'}</span>
      </span>
    </Button>
  );
}
