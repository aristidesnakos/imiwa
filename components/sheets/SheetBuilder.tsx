'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Link2, Printer, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import {
  DEFAULT_ROWS,
  MAX_ROWS,
  MIN_ROWS,
  customSheetsHref,
  type SheetGrid,
  type SheetLayout,
  type SheetOptions,
} from '@/lib/sheets/kanji-sheets';
import { GENKOU_GEOMETRY, kanjiPerPage, printChunks, totalPrintedPages } from '@/lib/sheets/layout';
import { cn } from '@/lib/utils';

/**
 * components/sheets/SheetBuilder.tsx
 *
 * The client island of /free-resources/kanji-sheets/custom: pick any kanji,
 * choose how much practice space each one gets, print them as one document.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT KNOWS, AND WHAT IT IS NEVER GIVEN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The server page passes each level's characters as one string (all 1,907 are
 * 5.7 kB). Never the kanji data: the five level lists, or lib/kanji-lookup.ts,
 * imported here would ship the dictionary to the browser, which is why /kanji
 * is the heaviest page on the site. Readings and meanings are the API's job.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TEXT BOX IS THE SET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Whatever is in the box, filtered to the kanji in our dataset, in order and
 * once each, is what prints. The level and theme buttons write into the box and
 * removing a chip takes that kanji out of it, so there is one source of truth
 * and what you see is what you get. It is also why the page works without
 * JavaScript: the box is a plain form field the API reads directly.
 *
 * The API is strict and never drops a character (lib/sheets/request.ts), so the
 * cleaning happens here, and what was left out is said out loud: kana, letters
 * and punctuation as a count, and kanji we do not have yet BY NAME, because the
 * visitor typed them expecting a sheet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE URL IS THE STATE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No accounts, no saved sets, no localStorage, so the privacy policy needs no
 * change. The set, layout, rows and grid live in the address bar (replaceState
 * as they change), so a built set is a link a teacher can hand a class. The page
 * is prerendered; the parameters are read here, after mount.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE GOAL — `custom_sheets_submit`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * On every print link, as `data-fast-goal` attributes kept current from state,
 * so DataFast's document listener reads them at the click. `target="_blank"` is
 * what lets the goal's XHR finish (see components/commerce/BookCTA.tsx).
 * Properties: `count` (kanji in that document), `layout`, `rows` (rows layout
 * only), `grid`, and `source` (paste, level, group, link, or mixed when the set
 * came in more than one way).
 *
 * Gate 0: if submits per builder pageview are low, the form asks too much, so
 * cut options. If they are high, link the builder from the print button on
 * every kanji detail page.
 */

export const CUSTOM_SHEETS_GOAL = 'custom_sheets_submit';

const GENKOUYOUSHI_PATH = '/free-resources/genkouyoushi';

export interface BuilderLevel {
  level: string;
  /** Every character of the level, in the data file's order. */
  characters: string;
}

export interface BuilderGroup {
  id: string;
  title: string;
  characters: string;
}

interface Props {
  /** The id of the <form>, so a server-rendered no-script button can submit it. */
  formId: string;
  levels: readonly BuilderLevel[];
  groups: readonly BuilderGroup[];
}

type Source = 'paste' | 'level' | 'group' | 'link';

/** Kanji-script marks that are not characters to practise on their own. */
const NOT_PRACTISABLE = new Set(['々', '〆']);
const HAN = /\p{Script=Han}/u;
const WHITESPACE = /\s/u;

interface ParsedSet {
  /** Dataset kanji, in order, once each. */
  kanji: string[];
  /** Non-space characters left out that are not kanji: kana, letters, punctuation. */
  otherSkipped: number;
  /** Kanji left out because the dataset does not have them, once each. */
  missingKanji: string[];
}

function parseSet(text: string, dataset: ReadonlySet<string>): ParsedSet {
  const kanji: string[] = [];
  const seen = new Set<string>();
  const missing: string[] = [];
  let otherSkipped = 0;

  // for…of walks by code point, the way the API does.
  for (const char of text) {
    if (dataset.has(char)) {
      if (!seen.has(char)) {
        seen.add(char);
        kanji.push(char);
      }
    } else if (HAN.test(char) && !NOT_PRACTISABLE.has(char)) {
      if (!missing.includes(char)) missing.push(char);
    } else if (!WHITESPACE.test(char)) {
      otherSkipped++;
    }
  }
  return { kanji, otherSkipped, missingKanji: missing };
}

function removeCharacters(text: string, remove: ReadonlySet<string>): string {
  return Array.from(text)
    .filter((char) => !remove.has(char))
    .join('')
    .replace(/\n{3,}/g, '\n\n');
}

function appendCharacters(text: string, characters: string): string {
  if (!text.trim()) return characters;
  return `${text.replace(/\s+$/, '')}\n${characters}`;
}

/** The page's own URL for a set: what the address bar and "Copy link" carry. */
function shareQuery(kanji: readonly string[], options: SheetOptions): string {
  const params = new URLSearchParams();
  if (kanji.length > 0) params.set('characters', kanji.join(''));
  if (options.layout === 'rows') {
    params.set('layout', 'rows');
    params.set('rows', String(options.rows));
  }
  if (options.grid !== 'cross') params.set('grid', options.grid);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

// A focus ring for the chips and the pressed-state buttons, which are styled
// by hand rather than through buttonVariants.
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function SheetBuilder({ formId, levels, groups }: Props) {
  const ids = useId();
  const [text, setText] = useState('');
  const [layout, setLayout] = useState<SheetLayout>('page');
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [grid, setGrid] = useState<SheetGrid>('cross');
  const [sources, setSources] = useState<ReadonlySet<Source>>(new Set());
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [readUrl, setReadUrl] = useState(false);
  const [activeChip, setActiveChip] = useState(0);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusChipAfterRemoval = useRef<number | null>(null);

  const dataset = useMemo(() => new Set(levels.flatMap((l) => Array.from(l.characters))), [levels]);
  const parsed = useMemo(() => parseSet(text, dataset), [text, dataset]);
  const options: SheetOptions = useMemo(() => ({ layout, rows, grid }), [layout, rows, grid]);
  const chunks = useMemo(() => printChunks(parsed.kanji, options), [parsed.kanji, options]);
  const inSet = useMemo(() => new Set(parsed.kanji), [parsed.kanji]);

  // Prefill from the page's own URL, once, after mount: the page stays
  // prerendered, and a shared link still opens on the set it names. Lenient
  // where the API is strict: a bad value here falls back to the default, since
  // the visitor can see and fix the form.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const characters = params.get('characters');
    if (characters) {
      setText(characters);
      setSources(new Set<Source>(['link']));
    }
    if (params.get('layout') === 'rows') setLayout('rows');
    if (params.get('grid') === 'genkou') setGrid('genkou');
    const rowsParam = Number(params.get('rows'));
    if (Number.isInteger(rowsParam) && rowsParam >= MIN_ROWS && rowsParam <= MAX_ROWS) setRows(rowsParam);
    setReadUrl(true);
  }, []);

  // And keep the address bar in step, so the URL is always this set.
  useEffect(() => {
    if (!readUrl) return;
    const url = `${window.location.pathname}${shareQuery(parsed.kanji, options)}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [readUrl, parsed.kanji, options]);

  // The skipped-characters line is announced, but not on every keystroke: an
  // IME composing たべる would otherwise read out three updates.
  const skippedMessage = useMemo(() => {
    const parts: string[] = [];
    if (parsed.otherSkipped > 0) {
      parts.push(`Left out ${plural(parsed.otherSkipped, 'character that is not a kanji', 'characters that are not kanji')} (kana, letters, punctuation).`);
    }
    if (parsed.missingKanji.length > 0) {
      parts.push(`Not in our dataset yet, so no sheet: ${parsed.missingKanji.join(' ')}.`);
    }
    return parts.join(' ');
  }, [parsed.otherSkipped, parsed.missingKanji]);
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(skippedMessage), 600);
    return () => window.clearTimeout(timer);
  }, [skippedMessage]);

  // After a chip is removed, keep focus in the list (or hand it back to the box).
  useEffect(() => {
    const index = focusChipAfterRemoval.current;
    if (index === null) return;
    focusChipAfterRemoval.current = null;
    if (parsed.kanji.length === 0) {
      textareaRef.current?.focus();
      return;
    }
    const next = Math.min(index, parsed.kanji.length - 1);
    setActiveChip(next);
    chipRefs.current[next]?.focus();
  }, [parsed.kanji]);

  function addSource(source: Source) {
    setSources((current) => new Set(current).add(source));
  }

  function toggleCharacters(characters: string, source: Source) {
    const chars = Array.from(characters);
    if (chars.every((char) => inSet.has(char))) {
      setText((current) => removeCharacters(current, new Set(chars)));
    } else {
      setText((current) => appendCharacters(current, chars.filter((char) => !inSet.has(char)).join('')));
      addSource(source);
    }
  }

  function removeChip(index: number) {
    focusChipAfterRemoval.current = index;
    setText((current) => removeCharacters(current, new Set([parsed.kanji[index]])));
  }

  function onChipKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = parsed.kanji.length - 1;
    const move = (to: number) => {
      event.preventDefault();
      setActiveChip(to);
      chipRefs.current[to]?.focus();
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') move(Math.min(index + 1, last));
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') move(Math.max(index - 1, 0));
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(last);
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeChip(index);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${shareQuery(parsed.kanji, options)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }
  useEffect(() => setCopyStatus('idle'), [parsed.kanji, options]);

  const count = parsed.kanji.length;
  const source: Source | 'mixed' | undefined =
    sources.size > 1 ? 'mixed' : sources.size === 1 ? Array.from(sources)[0] : count > 0 ? 'paste' : undefined;
  const pages = totalPrintedPages(count, options);
  const perPage = kanjiPerPage(options);
  const summary =
    count === 0
      ? 'No kanji yet. Type some above, or add a level or a theme.'
      : [
          plural(count, 'kanji', 'kanji'),
          layout === 'page'
            ? 'one page each'
            : grid === 'genkou'
              ? `${plural(rows, 'column', 'columns')} each`
              : `${plural(rows, 'row', 'rows')} each`,
          plural(pages, 'printed page', 'printed pages'),
        ].join(' · ');

  const textareaId = `${ids}-text`;
  const skippedId = `${ids}-skipped`;
  const chipHelpId = `${ids}-chip-help`;
  const rowsId = `${ids}-rows`;
  // On genkōyōshi a kanji's lines run down the page, so the control says so.
  const line = grid === 'genkou' ? { one: 'column', many: 'columns' } : { one: 'row', many: 'rows' };
  const pageSquares = grid === 'genkou' ? GENKOU_GEOMETRY.pageColumns * GENKOU_GEOMETRY.pageSquares : 80;

  return (
    // Without JavaScript this is a plain GET form to the API: the box and the
    // layout are named fields, and the page's <noscript> submit button names
    // this form. The rows control has no name, so the API's default of 2 rows
    // applies there; anything else in the box gets the API's own 400 message.
    <form
      id={formId}
      action="/api/kanji-sheets"
      method="get"
      target="_blank"
      onSubmit={(event) => event.preventDefault()}
      className="rounded-xl border border-border bg-card p-5 md:p-8"
    >
      <fieldset>
        <legend className="text-lg font-semibold text-japan-deep-ocean">1. Choose your kanji</legend>
        <label htmlFor={textareaId} className="mt-3 block text-sm text-japan-mountain-mist">
          Type or paste anything — a word, a sentence, a vocabulary list. Only the kanji are kept, in
          order, once each.
        </label>
        <textarea
          ref={textareaRef}
          id={textareaId}
          name="characters"
          lang="ja"
          rows={4}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            addSource('paste');
          }}
          aria-describedby={skippedId}
          placeholder="日本語を勉強します"
          className={cn(
            'mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-lg leading-relaxed text-japan-ink-black shadow-sm placeholder:text-muted-foreground',
            FOCUS_RING
          )}
        />
        <p id={skippedId} aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm text-japan-mountain-mist">
          {announced}
        </p>

        <div className="js-only mt-4">
          <p className="text-sm font-medium text-japan-ink-black">Or add a whole level</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {levels.map((level) => {
              const size = Array.from(level.characters).length;
              const pressed = Array.from(level.characters).every((char) => inSet.has(char));
              return (
                <button
                  key={level.level}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleCharacters(level.characters, 'level')}
                  className={cn(buttonVariants({ variant: pressed ? 'default' : 'outline', size: 'sm' }))}
                >
                  {pressed && <Check aria-hidden />}
                  All {size.toLocaleString('en-US')} {level.level}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm font-medium text-japan-ink-black">Or an N5 theme</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {groups.map((group) => {
              const pressed = Array.from(group.characters).every((char) => inSet.has(char));
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleCharacters(group.characters, 'group')}
                  className={cn(buttonVariants({ variant: pressed ? 'default' : 'outline', size: 'sm' }))}
                >
                  {pressed && <Check aria-hidden />}
                  {group.title}
                  <span className="text-xs opacity-80">{Array.from(group.characters).length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="js-only mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <p id={`${ids}-chips-label`} className="text-sm font-medium text-japan-ink-black">
              Your set{count > 0 ? ` (${count.toLocaleString('en-US')})` : ''}
            </p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setSources(new Set());
                  textareaRef.current?.focus();
                }}
                className={cn('rounded-sm text-sm text-japan-deep-ocean underline underline-offset-4 hover:no-underline', FOCUS_RING)}
              >
                Clear all
              </button>
            )}
          </div>
          {count > 0 ? (
            <>
              <p id={chipHelpId} className="sr-only">
                Arrow keys move between kanji. Delete, or Enter, removes one.
              </p>
              <ul
                aria-labelledby={`${ids}-chips-label`}
                aria-describedby={chipHelpId}
                className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border bg-japan-soft-mist p-2"
              >
                {parsed.kanji.map((char, index) => (
                  <li key={char}>
                    <button
                      ref={(element) => {
                        chipRefs.current[index] = element;
                      }}
                      type="button"
                      tabIndex={index === Math.min(activeChip, count - 1) ? 0 : -1}
                      onClick={() => removeChip(index)}
                      onKeyDown={(event) => onChipKeyDown(event, index)}
                      onFocus={() => setActiveChip(index)}
                      aria-label={`Remove ${char}`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border border-border bg-card py-0.5 pl-2 pr-1 text-xl text-japan-ink-black hover:border-japan-mountain-mist',
                        FOCUS_RING
                      )}
                    >
                      <span lang="ja">{char}</span>
                      <X aria-hidden className="h-3.5 w-3.5 text-japan-mountain-mist" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 rounded-md border border-dashed border-border p-3 text-sm text-japan-mountain-mist">
              The kanji you add appear here. Click one to take it out.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-lg font-semibold text-japan-deep-ocean">2. Lay them out</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg border p-4',
              layout === 'page' ? 'border-japan-deep-ocean bg-japan-soft-mist' : 'border-border'
            )}
          >
            <input
              type="radio"
              name="layout"
              value="page"
              checked={layout === 'page'}
              onChange={() => setLayout('page')}
              className="mt-1 h-4 w-4 accent-[var(--deep-ocean)]"
            />
            <span>
              <span className="block font-medium text-japan-ink-black">One page per kanji</span>
              <span className="mt-1 block text-sm text-japan-mountain-mist">
                The full sheet: a large stroke-order diagram, the readings and {pageSquares} squares.
              </span>
            </span>
          </label>
          <label
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg border p-4',
              layout === 'rows' ? 'border-japan-deep-ocean bg-japan-soft-mist' : 'border-border'
            )}
          >
            <input
              type="radio"
              name="layout"
              value="rows"
              checked={layout === 'rows'}
              onChange={() => setLayout('rows')}
              className="mt-1 h-4 w-4 accent-[var(--deep-ocean)]"
            />
            <span>
              <span className="block font-medium text-japan-ink-black">Several kanji per page</span>
              <span className="mt-1 block text-sm text-japan-mountain-mist">
                {grid === 'genkou'
                  ? 'Readings and a small diagram beside columns of ten squares.'
                  : 'A line of readings and a small diagram, then rows of ten squares.'}
              </span>
            </span>
          </label>
        </div>

        <div className={cn('mt-3 flex items-center gap-3', layout !== 'rows' && 'opacity-60')}>
          <label htmlFor={rowsId} className="text-sm font-medium text-japan-ink-black">
            {grid === 'genkou' ? 'Columns per kanji' : 'Rows per kanji'}
          </label>
          {/* No `name`: without JavaScript the API's default applies, and a
              `rows` sent with the page layout would be refused. */}
          <select
            id={rowsId}
            value={rows}
            disabled={layout !== 'rows'}
            onChange={(event) => setRows(Number(event.target.value))}
            className={cn('h-9 rounded-md border border-input bg-background px-2 text-sm text-japan-ink-black', FOCUS_RING)}
          >
            {Array.from({ length: MAX_ROWS - MIN_ROWS + 1 }, (_, i) => MIN_ROWS + i).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? line.one : line.many} ({n * 10} squares)
              </option>
            ))}
          </select>
          {layout === 'rows' && (
            <span className="text-sm text-japan-mountain-mist">
              {plural(perPage, 'kanji', 'kanji')} to a page
            </span>
          )}
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-japan-ink-black">Squares</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-4',
                grid === 'cross' ? 'border-japan-deep-ocean bg-japan-soft-mist' : 'border-border'
              )}
            >
              <input
                type="radio"
                name="grid"
                value="cross"
                checked={grid === 'cross'}
                onChange={() => setGrid('cross')}
                className="mt-1 h-4 w-4 accent-[var(--deep-ocean)]"
              />
              <span>
                <span className="block font-medium text-japan-ink-black">Squares with guide lines</span>
                <span className="mt-1 block text-sm text-japan-mountain-mist">
                  A cross through each square to place the strokes, written left to right.
                </span>
              </span>
            </label>
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-4',
                grid === 'genkou' ? 'border-japan-deep-ocean bg-japan-soft-mist' : 'border-border'
              )}
            >
              <input
                type="radio"
                name="grid"
                value="genkou"
                checked={grid === 'genkou'}
                onChange={() => setGrid('genkou')}
                className="mt-1 h-4 w-4 accent-[var(--deep-ocean)]"
              />
              <span>
                <span className="block font-medium text-japan-ink-black">
                  Genkouyoushi (<span lang="ja">原稿用紙</span>)
                </span>
                <span className="mt-1 block text-sm text-japan-mountain-mist">
                  Plain squares in columns, top to bottom and right to left, with a strip beside each
                  for readings.
                </span>
              </span>
            </label>
          </div>
          <p className="mt-2 text-sm text-japan-mountain-mist">
            Want it blank?{' '}
            <Link
              href={GENKOUYOUSHI_PATH}
              prefetch={false}
              className={cn('rounded-sm text-japan-deep-ocean underline underline-offset-4 hover:no-underline', FOCUS_RING)}
            >
              Free printable genkouyoushi paper
            </Link>
          </p>
        </fieldset>
      </fieldset>

      <fieldset className="js-only mt-8">
        <legend className="text-lg font-semibold text-japan-deep-ocean">3. Print</legend>
        <p className="mt-3 font-medium text-japan-ink-black">{summary}</p>
        {chunks.length > 1 && (
          <p className="mt-1 text-sm text-japan-mountain-mist">
            That is more than one document holds, so it prints in {chunks.length} parts. Open each
            one and print it, or save each as a PDF.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {count === 0 ? (
            <button type="button" disabled className={buttonVariants({ size: 'lg' })}>
              <Printer aria-hidden />
              Print
            </button>
          ) : (
            chunks.map((chunk, index) => {
              const start = chunks.slice(0, index).reduce((n, c) => n + c.length, 1);
              const end = start + chunk.length - 1;
              return (
                <a
                  key={`${index}-${chunk.length}`}
                  href={customSheetsHref(chunk, options)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-fast-goal={CUSTOM_SHEETS_GOAL}
                  data-fast-goal-count={String(chunk.length)}
                  data-fast-goal-layout={layout}
                  data-fast-goal-rows={layout === 'rows' ? String(rows) : undefined}
                  data-fast-goal-grid={grid}
                  data-fast-goal-source={source}
                  className={buttonVariants({ size: 'lg', variant: index === 0 ? 'default' : 'outline' })}
                >
                  <Printer aria-hidden />
                  {chunks.length === 1 ? `Print ${plural(count, 'kanji', 'kanji')}` : `Print ${start}–${end}`}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              );
            })
          )}

          {count > 0 && (
            <button
              type="button"
              onClick={copyLink}
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              {copyStatus === 'copied' ? <Check aria-hidden /> : <Link2 aria-hidden />}
              {copyStatus === 'copied' ? 'Link copied' : 'Copy link to this set'}
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm text-japan-mountain-mist">
          {copyStatus === 'copied' && 'Anyone with the link opens this page with the same set and layout.'}
          {copyStatus === 'failed' && 'Your browser would not copy it. The address bar holds the same link.'}
        </p>
      </fieldset>
    </form>
  );
}
