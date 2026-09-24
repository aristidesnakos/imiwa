import { Printer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import type { LevelTheme } from '@/lib/levels/n5-sequence';
import { kanjiSheetsHref } from '@/lib/sheets/kanji-sheets';
import { cn } from '@/lib/utils';
import { withJapanese } from '@/components/ja-text';

/**
 * components/sheets/GroupSheetLinks.tsx
 *
 * A level's themed groups, in teaching order, each with one link that prints
 * every sheet in the group as a single document — one kanji per page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LINKS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Plain `<a>`, never `<Link>`: the target is an API route that returns HTML,
 * which client navigation cannot render. `target="_blank"` like every other
 * sheet link on the site, and here it is also what makes the click countable:
 * DataFast posts goals with an asynchronous XHR that a same-tab navigation
 * abandons (see components/commerce/BookCTA.tsx, where this was verified).
 *
 * `kanjiSheetsHref` throws for a group over the route's cap, and the pages
 * that render this are prerendered — so a theme that outgrows the cap fails the
 * build instead of shipping a print button that answers 400.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOAL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Tracked by a `data-fast-goal` attribute, not an onClick, so this stays a
 * server component: DataFast's single document listener resolves the nearest
 * `[data-fast-goal]` with zero JavaScript of ours.
 *
 * ONE goal name for every group, passed in by the page (the page owns the
 * `<place>` slot), and the theme as a `group` property. The decision this
 * measures is whether printing by group earns its section at all — and whether
 * the next level should get a sequence of its own. No decision is taken per
 * theme, so the theme is a breakdown, not a name.
 */

interface Props {
  themes: readonly LevelTheme[];
  /** The DataFast goal every link here fires, e.g. `n5_sheets_group_click`. */
  goal: string;
  className?: string;
}

export function GroupSheetLinks({ themes, goal, className }: Props) {
  return (
    <ol className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {themes.map((theme, index) => {
        const count = theme.kanji.length;
        return (
          <li key={theme.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-japan-mountain-mist">
              Group {index + 1} · {count} kanji
            </p>
            <h3 className="mt-1 text-lg font-semibold text-japan-deep-ocean">{theme.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-japan-mountain-mist">
              {withJapanese(theme.summary)}
            </p>
            <p lang="ja" className="mt-3 text-2xl leading-relaxed text-japan-ink-black">
              {theme.kanji.join(' ')}
            </p>

            <div className="mt-auto pt-4">
              <a
                href={kanjiSheetsHref(theme.kanji)}
                target="_blank"
                rel="noopener noreferrer"
                data-fast-goal={goal}
                data-fast-goal-group={theme.id}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full sm:w-auto')}
              >
                <Printer aria-hidden />
                {count === 1 ? 'Print this sheet' : `Print all ${count} sheets`}
                <span className="sr-only"> for {theme.title} (opens in a new tab)</span>
              </a>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
