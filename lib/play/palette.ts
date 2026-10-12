/**
 * Tan Dash's own colours: the arcade cabinet, the cream panels and every pixel
 * the canvas draws. Ported from the prototype's `COL` and `:root` blocks.
 *
 * Why the game has a palette of its own and is not built on app/globals.css:
 * the canvas cannot read a CSS custom property per pixel, the scene is a warm
 * dusk-and-earth set (ink brown, terracotta, gold) that the site's blues do not
 * contain, and the HTML overlays must match the canvas pixel for pixel or the
 * cream sign and the cream panel next to it read as two different papers. So
 * this file is the one source for both: the engine takes the hex values, and
 * the island exposes the same values to its stylesheet as `--td-*` custom
 * properties (PLAY_CSS_VARS, set inline on the island root). The stylesheet
 * and the TSX therefore never hold a literal, which is what
 * `pnpm validate:palette` checks.
 *
 * Where a colour IS a brand token the island uses the token instead: the sky
 * (#DCEBD4) is exactly --narration-paper, the strip's sage, so the stage's
 * pre-canvas background is var(--narration-paper).
 */

export const PLAY_PALETTE = {
  // The cabinet and the HTML overlays
  cab: '#1E1814',
  ink: '#2B211B',
  bezel: '#3A2E26',
  cream: '#FAF6EE',
  /** The mix-up tiles and the Kanji-dex block on the results card. */
  creamChip: '#EFE6D4',
  terra: '#CC543C',
  terraDeep: '#9B3A26',
  gold: '#E8B84A',
  goldDeep: '#B9862A',
  /** Small print on a cream panel: 6.1:1 on cream. */
  inkSoft: '#6B5A50',
  /** The cabinet's outer ring and drop shadow. */
  void: '#000000',

  // The canvas
  brown: '#4A382E',
  fur: '#967052',
  /** The shaded edge of a cream tile. */
  cream2: '#E9DFCB',
  sky: '#DCEBD4',
  far: '#B3CBB0',
  mid: '#8FB08A',
  grass: '#6F9466',
  grassHi: '#93B884',
  dirt: '#4A382E',
  dirt2: '#5C4739',
  pink: '#E88C78',
  sun: '#F6EEDC',
  stick: '#6E543E',
  heartEmpty: '#7A6A60',
} as const;

export type PlayColour = keyof typeof PLAY_PALETTE;

/**
 * The subset the island's stylesheet reads, as custom properties. Set as the
 * island root's inline style; components/play/TanDash.module.css refers to
 * these names only.
 */
export const PLAY_CSS_VARS: Readonly<Record<string, string>> = {
  '--td-cab': PLAY_PALETTE.cab,
  '--td-ink': PLAY_PALETTE.ink,
  '--td-bezel': PLAY_PALETTE.bezel,
  '--td-cream': PLAY_PALETTE.cream,
  '--td-cream-chip': PLAY_PALETTE.creamChip,
  '--td-terra': PLAY_PALETTE.terra,
  '--td-terra-deep': PLAY_PALETTE.terraDeep,
  '--td-gold': PLAY_PALETTE.gold,
  '--td-ink-soft': PLAY_PALETTE.inkSoft,
  '--td-void': PLAY_PALETTE.void,
  '--td-dirt': PLAY_PALETTE.dirt,
};
