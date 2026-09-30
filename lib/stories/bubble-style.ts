/**
 * The speech-bubble type scale, in one place.
 *
 * Two renderers draw a panel's bubbles from the same `bubble` geometry:
 * `components/stories/StoryPanel.tsx` (live HTML on the site) and
 * `scripts/stories/render-email-panels.ts` (a baked JPEG for the weekly email,
 * because a mail client cannot position text over an image). They share these
 * numbers so the email cannot quietly drift from the page.
 *
 * Every value is in `cqw` against a `container-type: inline-size` panel: the
 * strip's own `px / 506px cell` ratios, so a fluid panel matches the fixed
 * 1080px export. Plain constants and no imports, so both a React component and
 * a tsx script can take them.
 */
export const JA_SIZE = '5.3cqw'; // a 27px face in a 506px cell
export const PAD = '1.8cqw 2.4cqw';
export const BORDER = 'max(2px, 0.6cqw)';
export const RADIUS = '3.2cqw';
export const NARRATION_RADIUS = '1.2cqw';
export const TAIL = '3.2cqw';
export const TAIL_DROP = '-2.2cqw';
