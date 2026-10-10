import EmailCapture from '@/components/EmailCapture';

/**
 * The homepage's weekly story newsletter capture.
 *
 * Homepage first, not /kanji: /kanji has ~9 kB of script headroom left against
 * an error-level budget and has already drifted ~32 kB past its recorded
 * baseline, so it is the assertion that trips first. `/` has ~25 kB. See
 * docs/prd/weekly-story-newsletter.md.
 *
 * `title=""` and `description=""`, NOT `{undefined}`: the section's own <h2>
 * and line above already say what this is, and the card's default heading
 * ("Get new study material by email") and blurb only repeated it in vaguer
 * words. EmailCapture renders both only when truthy, but its props have
 * default values, and a default parameter applies to `undefined` — so
 * `{undefined}` rendered the defaults, which is what this page showed until
 * 2026-09-24. An empty string is falsy AND not undefined, so it is the value
 * that actually hides them.
 *
 * The band is a real surface, not a wash. Soft mist at 60% opacity, written
 * as an opacity modifier, drew NOTHING: Tailwind cannot fold an opacity
 * modifier into a colour that is a bare `var(--x)` holding a hex, so it
 * drops the whole utility silently — the
 * same class of failure as the dropped HSL triplets in app/globals.css, and it
 * is why the tints here are `color-mix` on the token rather than `/25`.
 * Verified against compiled CSS, not by reading the class list.
 *
 * The gradient ends on the accent so the page cools from warm off-white
 * through this band into the navy closing CTA. The hairline is `border-t`
 * only: the navy edge below is already a hard contrast step, and a light rule
 * on top of it reads as an artifact.
 */
export function NewsletterBand() {
  return (
    <section className="border-t border-border bg-gradient-to-b from-japan-soft-mist to-[color-mix(in_srgb,var(--sakura-waters)_25%,var(--temple-stone))] py-16 md:py-20">
      <div className="container mx-auto px-4">
        {/* The homepage's one DataFast scroll marker: "saw the signup
            card", the denominator for this band's `email_signup`. The
            scroll-depth markers on the features, levels, popular-kanji and
            closing-CTA headings were removed on 2026-09-28. The question
            they were built for is answered (1,053 → 575 → 415 → 270 → 158
            → 15 visitors over 30 days), and they kept spending events
            after it was.

            The marker is on the HEADING BLOCK, never on the <section>. The
            DataFast script registers its IntersectionObserver with
            `threshold: [0, t]` and fires on `isIntersecting`, so it fires
            the moment the FIRST PIXEL of the observed element enters the
            viewport — not at the 50% the docs describe. On a full-height
            section that measures "they left the section above", not "they
            saw the card". A heading block is short enough that first-pixel
            and saw-it are the same event.

            The script clears its `fired` flag when the element leaves the
            viewport, so scrolling back past the heading re-fires the goal.
            Funnel steps count VISITORS, so read the funnel, not the raw
            goal counter. */}
        <div className="mx-auto mb-8 max-w-2xl text-center" data-fast-scroll="home_scroll_newsletter">
          {/* coral-sunset-INK, never coral-sunset: the fill is 2.7:1 here and
              cannot legally carry a label. The ink is 4.70:1 against the top
              of the gradient, which this line sits on. See app/globals.css. */}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
            Free weekly newsletter
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold text-japan-deep-ocean md:text-3xl">
            A weekly story you can actually read
          </h2>
          <p className="mt-3 text-pretty text-japan-mountain-mist">
            One short story a week, written with beginner (N5) kanji and grammar only.
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          {/* `border-[color:...]`, not `border-[...]`: without the type hint
              tailwind-merge reads the arbitrary value as a border-WIDTH and
              strips the card's own `border` class, and preflight sets
              border-width to 0 — so the card loses its border entirely. */}
          <EmailCapture
            source="homepage-weekly-story"
            title=""
            description=""
            cta="Send me the stories"
            className="border-[color:color-mix(in_srgb,var(--sakura-waters)_55%,var(--temple-stone))] shadow-md"
          />
        </div>
      </div>
    </section>
  );
}
