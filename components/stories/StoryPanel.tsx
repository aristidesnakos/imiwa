import Image from 'next/image';
import type { Panel } from '@/lib/stories/types';
import {
  BORDER,
  JA_SIZE,
  NARRATION_RADIUS,
  PAD,
  RADIUS,
  TAIL,
  TAIL_DROP,
} from '@/lib/stories/bubble-style';

/**
 * One comic panel: the art, with real HTML speech bubbles positioned over it.
 *
 * `build.py` composites the Japanese into the PNGs it posts to Pinterest and
 * Instagram, because those surfaces only accept pixels. A page does not have
 * that constraint, and taking it anyway would cost everything the page exists
 * for: text in an image is not crawlable, selectable, translatable,
 * screen-readable or resizable. So the art ships without lettering and this
 * re-does the compositing in CSS from the same percentage geometry in
 * `bubble` — one source, two renderers, no second copy of the dialogue.
 *
 * The type scale is in `cqw` against a `container-type: inline-size` panel:
 * the strip renders at a fixed 1080px and can use pixels, a panel here is
 * whatever width the viewport gives it. The numbers live in
 * `lib/stories/bubble-style.ts`, shared with the email panel renderer
 * (`scripts/stories/render-email-panels.ts`) so the two cannot drift.
 */
export function StoryPanel({
  panel,
  priority = false,
  romaji = null,
}: {
  panel: Panel;
  priority?: boolean;
  /** One romaji string per line (lib/stories/romaji-lines.ts), or null when the episode has no readings. */
  romaji?: string[] | null;
}) {
  return (
    <figure className="group relative m-0">
      {/*
        `container-type: inline-size` is what makes every cqw above resolve
        against THIS panel. Without it the units stay valid and silently
        resolve against the viewport, which looks like a font-size typo.
      */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border-[3px] border-japan-ink-black [container-type:inline-size]"
        style={{ backgroundColor: 'var(--temple-stone)' }}
      >
        <Image
          src={panel.art}
          /* Deliberately empty. `beat` is written for the artist ("The invitation
             and the yes", "payoff, bookending 大きい") — it names narrative
             function rather than the picture, and an alt attribute cannot carry
             `lang`, so the kanji in it reach an English voice as garbage. The
             panel's meaning is already in the bubble text and the figcaption
             below, both real DOM text. Give Panel a reader-facing `alt` from
             script.json and use it here; until then decorative is honest. */
          alt=""
          fill
          /* The panel is a FIXED width at every breakpoint above 768px because
             `main` is capped, so these are px, not vw — a vw hint here
             over-requests by up to 1.65x and buys nothing. */
          sizes="(min-width: 1280px) 350px, (min-width: 1024px) 410px, (min-width: 768px) 345px, calc(100vw - 64px)"
          className="object-cover"
          priority={priority}
        />

        {panel.lines.map((line, i) => {
          // Narration is not speech: a square tinted box, no tail. Read from
          // `speaker`, which is what actually means it; `tail: null` is the
          // presentational consequence, and validate:stories keeps them agreeing.
          const narration = line.speaker === 'narration';
          return (
            <div
              key={`${panel.id}-${i}`}
              lang="ja"
              /* The text is word-spaced (wakachigaki) and must break ONLY at
                 those spaces — the default breaks Japanese anywhere, which
                 splits あります into あり / ます mid-bubble. */
              className="absolute text-center font-bold [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]"
              style={{
                left: `${line.bubble.x}%`,
                top: `${line.bubble.y}%`,
                width: `${line.bubble.w}%`,
                padding: PAD,
                fontSize: JA_SIZE,
                lineHeight: 1.42,
                color: 'var(--ink-black)',
                border: `${BORDER} solid var(--ink-black)`,
                background: narration ? 'var(--narration-paper)' : 'var(--speech-paper)',
                borderRadius: narration ? NARRATION_RADIUS : RADIUS,
                fontWeight: narration ? 600 : 700,
              }}
            >
              {line.ja}
              {line.bubble.tail && (
                <span
                  aria-hidden
                  className="absolute block"
                  style={{
                    width: TAIL,
                    height: TAIL,
                    bottom: TAIL_DROP,
                    ...(line.bubble.tailX != null
                      ? { left: `calc(${line.bubble.tailX}% - ${TAIL} / 2)` }
                      : { [line.bubble.tail === 'bl' ? 'left' : 'right']: '14%' }),
                    background: 'var(--speech-paper)',
                    borderRight: `${BORDER} solid var(--ink-black)`,
                    borderBottom: `${BORDER} solid var(--ink-black)`,
                    transform: 'rotate(45deg)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {romaji && <RomajiToggle panelId={panel.id} />}

      <figcaption className="mt-2 text-center text-sm font-medium italic text-japan-mountain-mist">
        {/* In the server HTML whether or not it is showing (crawlable, no fetch);
            `display: none` until the toggle above is checked. */}
        {romaji && (
          <span lang="ja-Latn" className="mb-0.5 hidden text-[13px] font-normal group-has-[:checked]:block">
            {romaji.join(' / ')}
          </span>
        )}
        {panel.lines.map(l => l.en).join(' / ')}
      </figcaption>
    </figure>
  );
}

/**
 * The romaji switch, top right of the panel, with no client JavaScript: a real
 * checkbox inside a label, and the figure's `group-has-[:checked]` variants
 * reveal the romaji line in the caption and restyle the pill. A native
 * checkbox is keyboard-operable (Space) and announced as a checkbox with its
 * state by every screen reader, which is the whole of what a script would be
 * adding here; and 42 panels over 7 episodes is six islands per page that the
 * episode's script budget would otherwise pay for.
 *
 * WHERE IT SITS, AND WHY NOT ON THE ART. Bubbles start 2-5% from the top and
 * 28 of the 42 panels have one running out to 78-100% of the width, so any pill
 * inside the art's top-right corner covers a bubble in about half of them. The
 * pill therefore straddles the frame's top edge instead: it stands in the gap
 * above the panel and dips 4px over the border (1px into the picture, where no
 * bubble starts before 2%, about 6px at the narrowest panel). That is also why
 * the grid in app/stories/[slug]/page.tsx has a taller row gap.
 *
 * The visible pill is 28px tall; the label's hit area is ~44px (`before:`),
 * extended upwards and sideways only, never down over the art. On is shown by
 * a filled pill and a check mark, not colour alone.
 */
function RomajiToggle({ panelId }: { panelId: string }) {
  return (
    <label className="absolute -top-6 right-4 z-10 inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-japan-deep-ocean bg-background px-3 text-[13px] font-semibold leading-none text-japan-deep-ocean before:absolute before:-inset-x-2 before:-top-4 before:bottom-0 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background group-has-[:checked]:bg-primary group-has-[:checked]:text-primary-foreground">
      <input
        type="checkbox"
        className="sr-only"
        aria-label={`Show romaji reading, panel ${panelId.replace(/^P/, '')}`}
      />
      <span aria-hidden>Romaji</span>
      <span aria-hidden className="hidden group-has-[:checked]:inline">
        ✓
      </span>
    </label>
  );
}
