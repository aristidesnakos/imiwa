import Image from 'next/image';
import type { Panel } from '@/lib/stories/types';

/**
 * One comic panel: the art, with real HTML speech bubbles positioned over it.
 *
 * ---------------------------------------------------------------------------
 * Why the bubbles are markup and not part of the image
 * ---------------------------------------------------------------------------
 *
 * `build.py` composites the Japanese into the PNGs it posts to Pinterest and
 * Instagram, because those surfaces only accept pixels. A web page does not
 * have that constraint, and taking it anyway would cost everything the page
 * exists for: text in an image is not crawlable, not selectable, not
 * translatable, not screen-readable, and not resizable by a reader who needs
 * bigger type. The entire SEO case for `/stories` is that the Japanese is text.
 *
 * So the art ships without lettering (the model is instructed never to draw
 * any) and the page re-does the compositing job in CSS, reading the exact same
 * percentage geometry out of `bubbles[]` that `build.py` reads. One source, two
 * renderers, no second copy of the dialogue to drift.
 *
 * ---------------------------------------------------------------------------
 * Why the type scale is in `cqw`
 * ---------------------------------------------------------------------------
 *
 * The strip renders at a fixed 1080px, so `build.py` can use pixels. A panel on
 * this page is whatever width the viewport gives it — three across on a desktop,
 * one on a phone — and a fixed px size would either overflow the bubble on
 * small screens or float inside it on large ones. Container query units make
 * the text a constant fraction of the panel, which is what the fixed-width
 * render gets for free.
 *
 * The numbers are ported, not invented: the strip uses a 27px face inside a
 * 506px cell, so 27/506 ≈ 5.3cqw, and every other measurement here is that same
 * ratio applied to the strip's own padding, border and radius.
 */

/** Everything below is `strip px / 506px cell`, so the page matches the export. */
const JA_SIZE = '5.3cqw';
const PAD = '1.8cqw 2.4cqw';
const BORDER = 'max(2px, 0.6cqw)';
const RADIUS = '3.2cqw';
const TAIL = '3.2cqw';
const TAIL_DROP = '-2.2cqw';

export function StoryPanel({ panel, priority = false }: { panel: Panel; priority?: boolean }) {
  const caption = panel.lines.map(l => l.en).join(' / ');

  return (
    <figure className="m-0">
      {/*
        `container-type: inline-size` is what makes every cqw above resolve
        against THIS panel rather than the viewport. Without it the units are
        still valid and silently resolve against the nearest ancestor container
        — or the small viewport — which is the kind of failure that looks like
        a font-size typo.
      */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border-[3px] border-japan-ink-black [container-type:inline-size]"
        style={{ backgroundColor: 'var(--temple-stone)' }}
      >
        <Image
          src={panel.art}
          /*
            The beat, not the dialogue. The dialogue is already on the page as
            text directly below, and repeating it here would make a screen
            reader read every line twice. What the image adds is what is
            happening in it, which is exactly what `beat` records.
          */
          alt={panel.beat}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover"
          priority={priority}
        />

        {panel.lines.map((line, i) => {
          const narration = line.bubble.tail === null;
          return (
            <div
              key={`${panel.id}-${i}`}
              lang="ja"
              /*
                keep-all + overflow-wrap:normal + line-break:strict together.
                The episode text is word-spaced (wakachigaki) and the browser
                must break ONLY at those spaces — the default breaks Japanese
                anywhere, which splits あります into あり / ます mid-bubble.
              */
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
                /*
                  Narration is not speech: a square sage box, no tail. The
                  distinction has to survive here or a narrated line reads as
                  someone talking, and the tail points at nobody.
                */
                background: narration
                  ? 'color-mix(in srgb, var(--sakura-waters) 18%, var(--speech-paper))'
                  : 'var(--speech-paper)',
                borderRadius: narration ? '1.2cqw' : RADIUS,
                fontWeight: narration ? 600 : 700,
              }}
            >
              {line.ja}
              {!narration && (
                <span
                  aria-hidden
                  className="absolute block"
                  style={{
                    width: TAIL,
                    height: TAIL,
                    bottom: TAIL_DROP,
                    [line.bubble.tail === 'bl' ? 'left' : 'right']: '14%',
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
        {caption}
      </figcaption>
    </figure>
  );
}
