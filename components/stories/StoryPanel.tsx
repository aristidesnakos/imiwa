import Image from 'next/image';
import type { Panel } from '@/lib/stories/types';

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
 * whatever width the viewport gives it. Every number below is the strip's own
 * `px / 506px cell` ratio, so a fluid panel matches the fixed export.
 */
const JA_SIZE = '5.3cqw'; // a 27px face in a 506px cell
const PAD = '1.8cqw 2.4cqw';
const BORDER = 'max(2px, 0.6cqw)';
const RADIUS = '3.2cqw';
const TAIL = '3.2cqw';
const TAIL_DROP = '-2.2cqw';

export function StoryPanel({ panel, priority = false }: { panel: Panel; priority?: boolean }) {
  return (
    <figure className="m-0">
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
                borderRadius: narration ? '1.2cqw' : RADIUS,
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

      <figcaption className="mt-2 text-center text-sm font-medium italic text-japan-mountain-mist">
        {panel.lines.map(l => l.en).join(' / ')}
      </figcaption>
    </figure>
  );
}
