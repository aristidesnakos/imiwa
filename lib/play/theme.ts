/**
 * The tune that plays during a run: original, in the manner of a Game Boy
 * town theme (two pulse voices, a triangle bass, a light noise kit; a warm
 * major key, long singing notes over a walking bass). Format and rules:
 * lib/play/tune.ts. Parsed by the engine at start-up; `pnpm validate:play`
 * (section 9) parses it, checks its bars and range, and replays the scheduler
 * over it.
 *
 * Sixteen bars of G major at 112 bpm, about 34 s a loop. Bars 1-8 state the
 * theme over G, Em, C and D; bars 9-16 lift it over C, D, Bm, Em, C, D, G, and
 * the last bar climbs a scale back to the start of the loop. Chosen by ear
 * on 2026-10-15 from three candidates (Route, a bouncy C major at 128 bpm;
 * Dash, a driving A minor at 144; Town); the other two are in the git
 * history of this file's first commit.
 *
 * Hear it without the game with `pnpm music:render`.
 */

import type { TuneSource } from './tune';

export const THEME: TuneSource = {
  bpm: 112,
  scale: 'g a b c d e f#',
  lead: [
    'b4:4 d5:4 g5:6 f#5:2',
    'e5:4 g5:4 b5:6 a5:2',
    'g5:4 e5:4 c5:4 e5:4',
    'd5:6 f#5:2 a5:4 f#5:4',
    'b4:4 d5:4 g5:4 b5:4',
    'a5:6 g5:2 e5:4 b4:4',
    'c5:2 d5:2 e5:2 g5:2 e5:4 c5:4',
    'd5:8 r:4 a4:2 d5:2',
    'e5:6 g5:2 c6:6 b5:2',
    'a5:6 f#5:2 d5:6 f#5:2',
    'd5:4 f#5:4 b5:8',
    'g5:6 e5:2 b4:4 e5:4',
    'c6:4 b5:2 a5:2 g5:4 e5:4',
    'f#5:4 a5:4 d6:8',
    'b5:6 g5:2 d5:4 g5:4',
    'd5:2 e5:2 f#5:2 g5:2 a5:4 r:4',
  ].join(' | '),
  // G, Em, C, D, G, Em, C, D, C, D, Bm, Em, C, D, G, D.
  harmony: [
    'b3:4 d4:4 g4:4 d4:4',
    'b3:4 e4:4 g4:4 e4:4',
    'c4:4 e4:4 g4:4 e4:4',
    'a3:4 d4:4 f#4:4 d4:4',
    'b3:4 d4:4 g4:4 d4:4',
    'b3:4 e4:4 g4:4 e4:4',
    'c4:4 e4:4 g4:4 e4:4',
    'a3:4 d4:4 f#4:4 d4:4',
    'c4:4 e4:4 g4:4 e4:4',
    'a3:4 d4:4 f#4:4 d4:4',
    'b3:4 d4:4 f#4:4 d4:4',
    'b3:4 e4:4 g4:4 e4:4',
    'c4:4 e4:4 g4:4 e4:4',
    'a3:4 d4:4 f#4:4 d4:4',
    'b3:4 d4:4 g4:4 d4:4',
    'a3:4 d4:4 f#4:4 d4:4',
  ].join(' | '),
  bass: [
    'g3:4 d4:4 g3:4 d4:4',
    'e3:4 b3:4 e3:4 b3:4',
    'c3:4 g3:4 c3:4 g3:4',
    'd3:4 a3:4 d3:4 a3:4',
    'g3:4 d4:4 g3:4 d4:4',
    'e3:4 b3:4 e3:4 b3:4',
    'c3:4 g3:4 c3:4 g3:4',
    'd3:4 a3:4 d3:4 a3:4',
    'c3:4 g3:4 c3:4 g3:4',
    'd3:4 a3:4 d3:4 a3:4',
    'b2:4 f#3:4 b2:4 f#3:4',
    'e3:4 b3:4 e3:4 b3:4',
    'c3:4 g3:4 c3:4 g3:4',
    'd3:4 a3:4 d3:4 a3:4',
    'g3:4 d4:4 g3:4 d4:4',
    'd3:4 a3:4 d3:4 a3:4',
  ].join(' | '),
  drums: Array.from({ length: 16 }, (_, i) => ((i + 1) % 4 === 0 ? 'k...h...s...hhhh' : 'k...h...s...h...')).join(' | '),
};
