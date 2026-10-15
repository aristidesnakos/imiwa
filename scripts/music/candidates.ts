/**
 * The tunes up for audition (`pnpm music:render`). "Route" is the one in the
 * game today (lib/play/theme.ts); "Dash" and "Town" live only here, so a tune
 * that is not chosen never reaches the /play bundle. Choosing one means moving
 * its data into lib/play/theme.ts and deleting it from this file.
 *
 * All original, in the manner of Game Boy-era overworld themes. Notation:
 * lib/play/tune.ts.
 */

import { THEME } from '../../lib/play/theme';
import type { TuneSource } from '../../lib/play/tune';

/** The four-chord cycle (Am F C G) laid over 16 bars. */
const cycle = (bars: [string, string, string, string]): string =>
  Array.from({ length: 16 }, (_, i) => bars[i % 4]).join(' | ');

/**
 * A minor, 144 bpm, driving: a syncopated 3-3-2 hook over Am F C G, 16th-note
 * arpeggios and an octave-bouncing bass under it, four on the floor. The
 * second half drops the melody an octave and climbs to a high C.
 */
const DASH: TuneSource = {
  bpm: 144,
  scale: 'c d e f g a b',
  lead: [
    'e5:3 e5:3 a5:2 g5:2 e5:2 r:2 d5:2',
    'c5:3 c5:3 f5:2 e5:2 c5:2 r:2 a4:2',
    'e5:3 e5:3 g5:2 e5:2 c5:2 r:2 e5:2',
    'd5:3 d5:3 g5:2 f5:2 d5:2 b4:2 d5:2',
    'e5:3 e5:3 a5:2 c6:2 b5:2 a5:2 g5:2',
    'a5:3 a5:3 f5:2 a5:2 c6:2 a5:2 f5:2',
    'g5:3 g5:3 e5:2 g5:2 c6:4 g5:2',
    'd6:3 b5:3 g5:2 b5:2 d6:4 r:2',
    'a4:2 c5:2 e5:4 d5:2 c5:2 a4:4',
    'a4:2 c5:2 f5:4 e5:2 c5:2 a4:4',
    'g4:2 c5:2 e5:4 d5:2 c5:2 g4:4',
    'b4:2 d5:2 g5:4 f5:2 d5:2 b4:4',
    'e5:2 a5:2 c6:4 b5:2 a5:2 e5:4',
    'f5:2 a5:2 c6:4 a5:2 f5:2 c5:4',
    'e5:2 g5:2 c6:4 g5:2 e5:2 c5:4',
    'd5:2 g5:2 b5:2 d6:2 b5:2 g5:2 d5:2 r:2',
  ].join(' | '),
  // Am F C G, four times round: a 16th-note arpeggio, then the octave-bouncing bass.
  harmony: cycle([
    'c4:1 e4:1 a4:1 e4:1 c4:1 e4:1 a4:1 e4:1 c4:1 e4:1 a4:1 e4:1 c4:1 e4:1 a4:1 e4:1',
    'c4:1 f4:1 a4:1 f4:1 c4:1 f4:1 a4:1 f4:1 c4:1 f4:1 a4:1 f4:1 c4:1 f4:1 a4:1 f4:1',
    'c4:1 e4:1 g4:1 e4:1 c4:1 e4:1 g4:1 e4:1 c4:1 e4:1 g4:1 e4:1 c4:1 e4:1 g4:1 e4:1',
    'd4:1 g4:1 b4:1 g4:1 d4:1 g4:1 b4:1 g4:1 d4:1 g4:1 b4:1 g4:1 d4:1 g4:1 b4:1 g4:1',
  ]),
  bass: cycle([
    'a3:2 a4:2 a3:2 a4:2 a3:2 a4:2 a3:2 a4:2',
    'f3:2 f4:2 f3:2 f4:2 f3:2 f4:2 f3:2 f4:2',
    'c3:2 c4:2 c3:2 c4:2 c3:2 c4:2 c3:2 c4:2',
    'g3:2 g4:2 g3:2 g4:2 g3:2 g4:2 g3:2 g4:2',
  ]),
  drums: Array.from({ length: 16 }, (_, i) => ((i + 1) % 4 === 0 ? 'k.hhs.hhk.hhshsh' : 'k.hhs.hhk.hhs.hh')).join(' | '),
};

/**
 * G major, 112 bpm, warm: long singing notes over a walking root-and-fifth bass
 * and slow broken chords, a soft kick and snare. The town theme to Route's
 * road. The turnaround climbs a scale into the loop.
 */
const TOWN: TuneSource = {
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

export const CANDIDATES: { id: string; name: string; source: TuneSource }[] = [
  { id: 'route', name: 'Route', source: THEME },
  { id: 'dash', name: 'Dash', source: DASH },
  { id: 'town', name: 'Town', source: TOWN },
];
