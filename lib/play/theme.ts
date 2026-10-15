/**
 * The tune that plays during a run: original, in the manner of a Game Boy
 * route theme (two pulse voices, a triangle bass, a light noise kit; bright
 * major key, a bouncy hook repeated and answered). Format and rules:
 * lib/play/tune.ts. Parsed by the engine at start-up; `pnpm validate:play`
 * (section 9) parses it, checks its bars and range, and replays the scheduler
 * over it.
 *
 * Sixteen bars of C major at 128 bpm, about 30 s a loop. Bars 1-8 state the
 * hook (the same long-short-long rhythm over C, Am, F, G); bars 9-16 answer it
 * with runs and leaps over F, G, Em, Am and a turnaround that ends on the
 * leading tone, so the loop wants to start again.
 *
 * Audition the candidates with `pnpm music:render`; the others live in
 * scripts/music/candidates.ts so an unchosen tune never reaches the bundle.
 */

import type { TuneSource } from './tune';

export const THEME: TuneSource = {
  bpm: 128,
  scale: 'c d e f g a b',
  lead: [
    'g4:2 c5:2 e5:3 e5:1 d5:2 c5:2 e5:4',
    'a4:2 c5:2 e5:3 e5:1 d5:2 c5:2 a4:4',
    'a4:2 c5:2 f5:3 f5:1 e5:2 d5:2 c5:4',
    'b4:2 d5:2 g5:3 g5:1 f5:2 e5:2 d5:2 r:2',
    'g4:2 c5:2 e5:3 e5:1 g5:2 e5:2 c6:4',
    'b4:2 e5:2 g5:3 g5:1 e5:2 d5:2 b4:4',
    'c5:2 f5:2 a5:3 a5:1 g5:2 f5:2 e5:2 d5:2',
    'd5:4 g5:4 f5:2 d5:2 b4:4',
    'f5:2 e5:2 d5:2 c5:2 a4:4 c5:2 d5:2',
    'b4:2 c5:2 d5:2 e5:2 d5:4 b4:4',
    'g5:4 e5:2 g5:2 b5:4 g5:4',
    'a5:4 e5:2 c5:2 a4:4 r:4',
    'f5:3 f5:1 a5:2 f5:2 c5:3 c5:1 f5:2 a5:2',
    'g5:3 g5:1 b5:2 g5:2 d5:3 d5:1 g5:2 b5:2',
    'c6:4 g5:2 e5:2 g5:2 e5:2 c5:2 e5:2',
    'd5:2 d5:2 d5:2 f5:2 e5:2 d5:2 b4:4',
  ].join(' | '),
  // The chord as an arpeggio of eighths: C, Am, F, G, C, Em, F, G, F, G, Em, Am, F, G, C, G.
  harmony: [
    'c4:2 e4:2 g4:2 e4:2 c4:2 e4:2 g4:2 e4:2',
    'c4:2 e4:2 a4:2 e4:2 c4:2 e4:2 a4:2 e4:2',
    'c4:2 f4:2 a4:2 f4:2 c4:2 f4:2 a4:2 f4:2',
    'd4:2 g4:2 b4:2 g4:2 d4:2 g4:2 b4:2 g4:2',
    'c4:2 e4:2 g4:2 e4:2 c4:2 e4:2 g4:2 e4:2',
    'e4:2 g4:2 b4:2 g4:2 e4:2 g4:2 b4:2 g4:2',
    'c4:2 f4:2 a4:2 f4:2 c4:2 f4:2 a4:2 f4:2',
    'd4:2 g4:2 b4:2 g4:2 d4:2 g4:2 b4:2 g4:2',
    'c4:2 f4:2 a4:2 f4:2 c4:2 f4:2 a4:2 f4:2',
    'd4:2 g4:2 b4:2 g4:2 d4:2 g4:2 b4:2 g4:2',
    'e4:2 g4:2 b4:2 g4:2 e4:2 g4:2 b4:2 g4:2',
    'c4:2 e4:2 a4:2 e4:2 c4:2 e4:2 a4:2 e4:2',
    'c4:2 f4:2 a4:2 f4:2 c4:2 f4:2 a4:2 f4:2',
    'd4:2 g4:2 b4:2 g4:2 d4:2 g4:2 b4:2 g4:2',
    'c4:2 e4:2 g4:2 e4:2 c4:2 e4:2 g4:2 e4:2',
    'd4:2 g4:2 b4:2 g4:2 d4:2 g4:2 b4:2 g4:2',
  ].join(' | '),
  // Root and fifth, a beat-and-a-half bounce: C, Am, F, G, C, Em, F, G, F, G, Em, Am, F, G, C, G.
  bass: [
    'c3:4 c3:2 g3:2 c3:4 g3:2 c3:2',
    'a3:4 a3:2 e3:2 a3:4 e3:2 a3:2',
    'f3:4 f3:2 c3:2 f3:4 c3:2 f3:2',
    'g3:4 g3:2 d3:2 g3:4 d3:2 g3:2',
    'c3:4 c3:2 g3:2 c3:4 g3:2 c3:2',
    'e3:4 e3:2 b2:2 e3:4 b2:2 e3:2',
    'f3:4 f3:2 c3:2 f3:4 c3:2 f3:2',
    'g3:4 g3:2 d3:2 g3:4 d3:2 g3:2',
    'f3:4 f3:2 c3:2 f3:4 c3:2 f3:2',
    'g3:4 g3:2 d3:2 g3:4 d3:2 g3:2',
    'e3:4 e3:2 b2:2 e3:4 b2:2 e3:2',
    'a3:4 a3:2 e3:2 a3:4 e3:2 a3:2',
    'f3:4 f3:2 c3:2 f3:4 c3:2 f3:2',
    'g3:4 g3:2 d3:2 g3:4 d3:2 g3:2',
    'c3:4 c3:2 g3:2 c3:4 g3:2 c3:2',
    'g3:4 g3:2 d3:2 g3:4 d3:2 g3:2',
  ].join(' | '),
  // Kick on the beat, snare on 2 and 4, offbeat hats; a fill every fourth bar.
  drums: Array.from({ length: 16 }, (_, i) => ((i + 1) % 4 === 0 ? 'k.h.s.h.k.h.shsh' : 'k.h.s.h.k.h.s.h.')).join(' | '),
};
