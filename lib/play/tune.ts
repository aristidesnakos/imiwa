/**
 * The notation Tan Dash's music is written in, and the one thing that reads it.
 * Pure: no Web Audio and no DOM, so the game (lib/play/music.ts), `pnpm
 * validate:play` and the audition renderer (scripts/music/render-tunes.ts) all
 * parse the same text.
 *
 * A tune is four channels in the Game Boy's mould, on a grid of 16th notes
 * (a "step"; four to a beat, sixteen to a bar):
 *
 *   lead     a pulse wave, the melody
 *   harmony  a second pulse wave, the chord as an arpeggio
 *   bass     a triangle wave
 *   drums    noise and a pitched thump
 *
 * Melodic channels are bars separated by `|`. A token is `c5:2` (note name,
 * octave, length in steps; length defaults to 1) or `r:2` (a rest). Names are a
 * letter, an optional `#` or `b`, and an octave, with C4 = middle C. Every bar
 * must add up to exactly 16 steps: a bar of 15 is a typo that would slide the
 * whole tune off the drums, so the parser refuses it rather than playing it.
 *
 * Drums are 16 characters a bar: `k` kick, `s` snare, `h` hat, `.` nothing.
 *
 * `scale` lists the pitch classes the tune lives in. It exists to catch a
 * wrong accidental, the commonest and most audible mistake in hand-typed
 * notes: any note outside it is refused.
 */

export const STEPS_PER_BAR = 16;

export interface TuneSource {
  /** Beats per minute at tempo scale 1. */
  bpm: number;
  /** The pitch classes in use, e.g. `'c d e f g a b'`. */
  scale: string;
  lead: string;
  harmony: string;
  bass: string;
  drums: string;
}

export interface Note {
  /** The step the note begins on, from the start of the loop. */
  step: number;
  /** How many steps it lasts. */
  len: number;
  midi: number;
}

export type Hit = 'k' | 's' | 'h';

/** What begins on one step. */
export interface StepEvents {
  lead?: Note;
  harmony?: Note;
  bass?: Note;
  drum?: Hit;
}

export interface Tune {
  bpm: number;
  bars: number;
  /** The loop's length in steps. */
  steps: number;
  lead: Note[];
  harmony: Note[];
  bass: Note[];
  drums: { step: number; hit: Hit }[];
  /** `at[s]` is what begins on step `s`; the scheduler reads this and nothing else. */
  at: StepEvents[];
}

const SEMITONE: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NOTE = /^([a-g])([#b]?)(-?\d)$/;

/** Middle C (c4) is 60, A4 is 69. */
export function noteMidi(name: string): number {
  const m = NOTE.exec(name);
  if (!m) throw new Error(`"${name}" is not a note name`);
  return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function midiHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 'c#' for midi 61: sharps only, which is how the scale list is written. */
export function pitchClass(midi: number): string {
  return ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'][((midi % 12) + 12) % 12];
}

/** Normalises a scale entry ('Db', 'F#') to the sharps-only spelling `pitchClass` returns. */
function scaleClass(name: string): string {
  const m = /^([a-g])([#b]?)$/.exec(name.toLowerCase());
  if (!m) throw new Error(`"${name}" is not a pitch class (use c d e f g a b, with # or b)`);
  return pitchClass(SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
}

function parseMelodic(channel: string, text: string, scale: Set<string>): Note[] {
  const notes: Note[] = [];
  let step = 0;
  text.split('|').forEach((bar, b) => {
    let used = 0;
    for (const token of bar.trim().split(/\s+/).filter(Boolean)) {
      const [name, lenText = '1'] = token.split(':');
      const len = Number(lenText);
      if (!Number.isInteger(len) || len < 1) throw new Error(`${channel} bar ${b + 1}: "${token}" has no whole length`);
      if (name !== 'r') {
        let midi: number;
        try {
          midi = noteMidi(name);
        } catch {
          throw new Error(`${channel} bar ${b + 1}: "${token}" is not a note name`);
        }
        if (!scale.has(pitchClass(midi))) {
          throw new Error(`${channel} bar ${b + 1}: "${token}" is outside the scale (${[...scale].join(' ')})`);
        }
        notes.push({ step: step + used, len, midi });
      }
      used += len;
    }
    if (used !== STEPS_PER_BAR) throw new Error(`${channel} bar ${b + 1}: ${used} steps, not ${STEPS_PER_BAR}`);
    step += STEPS_PER_BAR;
  });
  return notes;
}

function parseDrums(text: string): { step: number; hit: Hit }[] {
  const hits: { step: number; hit: Hit }[] = [];
  text.split('|').forEach((bar, b) => {
    const cells = bar.replace(/\s+/g, '');
    if (cells.length !== STEPS_PER_BAR) throw new Error(`drums bar ${b + 1}: ${cells.length} steps, not ${STEPS_PER_BAR}`);
    [...cells].forEach((c, i) => {
      if (c === '.') return;
      if (c !== 'k' && c !== 's' && c !== 'h') throw new Error(`drums bar ${b + 1}: "${c}" is not k, s, h or .`);
      hits.push({ step: b * STEPS_PER_BAR + i, hit: c });
    });
  });
  return hits;
}

const barCount = (text: string): number => text.split('|').length;

/** Throws, naming the channel, bar and token, on anything the notation does not allow. */
export function parseTune(src: TuneSource): Tune {
  const scale = new Set(src.scale.trim().split(/\s+/).map(scaleClass));
  const bars = barCount(src.lead);
  for (const [name, text] of [['harmony', src.harmony], ['bass', src.bass], ['drums', src.drums]] as const) {
    if (barCount(text) !== bars) throw new Error(`${name} has ${barCount(text)} bars, lead has ${bars}`);
  }
  const lead = parseMelodic('lead', src.lead, scale);
  const harmony = parseMelodic('harmony', src.harmony, scale);
  const bass = parseMelodic('bass', src.bass, scale);
  const drums = parseDrums(src.drums);
  const steps = bars * STEPS_PER_BAR;
  const at: StepEvents[] = Array.from({ length: steps }, () => ({}));
  for (const n of lead) at[n.step].lead = n;
  for (const n of harmony) at[n.step].harmony = n;
  for (const n of bass) at[n.step].bass = n;
  for (const d of drums) at[d.step].drum = d.hit;
  return { bpm: src.bpm, bars, steps, lead, harmony, bass, drums, at };
}

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

/**
 * How much faster the music gets as the run does: 1 at the start speed, up to
 * 1 + TEMPO_GAIN at the cap. Kept small on purpose: the pace of the run was
 * deliberately slowed (SPEED_RAMP in engine.ts), and a tune that raced would
 * undo it by ear.
 */
export const TEMPO_GAIN = 0.1;

/** `progress` is 0 at the run's start speed and 1 at its cap; anything else is clamped. */
export function tempoScale(progress: number): number {
  return 1 + TEMPO_GAIN * Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
}

/** Seconds in one step (a 16th note). */
export function stepSeconds(bpm: number, scale: number): number {
  return 60 / (bpm * scale) / 4;
}
