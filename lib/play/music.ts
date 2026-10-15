/**
 * Tan Dash's music: the synth voices for a parsed tune (lib/play/tune.ts) and
 * the scheduler that keeps them a little ahead of the audio clock.
 *
 * Two entry points, one sound:
 *   playStep      schedules everything that begins on one step. The audition
 *                 renderer (scripts/music/render-tunes.ts) calls it from an
 *                 OfflineAudioContext, so the WAV it writes is what players hear.
 *   createMusic   the game's player. It owns no timer: the engine calls
 *                 `sync` every frame of a run, so when the loop stops (a
 *                 paused game, a hidden tab) the notes already queued run out
 *                 within LOOKAHEAD and the music is simply over. Nothing to
 *                 clean up and nothing left playing over a frozen game.
 *
 * The AudioContext is the engine's (created from a user gesture, never here).
 * Music runs through its own gain bus, so stopping it never touches a sound
 * effect, and a fresh bus per start means notes queued before a pause can never
 * sound over the notes queued after it.
 */

import { midiHz, stepSeconds, type Hit, type Tune } from './tune';

/** Seconds of music queued ahead of the audio clock. Long enough to survive a slow frame. */
export const LOOKAHEAD = 0.4;
/** The music bus. Sound effects go straight to the output at 0.035-0.07 a tone; this keeps the lead under them. */
export const MUSIC_LEVEL = 0.6;

/** Per-voice peak gains, before the bus. */
const VOL = { lead: 0.06, harmony: 0.03, bass: 0.09, kick: 0.12, snare: 0.07, hat: 0.035 } as const;
/** How much of a note's length it sounds for: below 1 so repeated notes are heard as separate. */
const GATE = { lead: 0.9, harmony: 0.7, bass: 0.95 } as const;

interface Voices {
  lead: PeriodicWave;
  harmony: PeriodicWave;
  noise: AudioBuffer;
}
const voices = new WeakMap<object, Voices>();

/** A pulse wave of the given duty cycle (0.5 is a square), as the Game Boy's pulse channels made. */
function pulseWave(ac: BaseAudioContext, duty: number): PeriodicWave {
  const N = 64;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
  }
  return ac.createPeriodicWave(real, imag);
}

function voicesFor(ac: BaseAudioContext): Voices {
  let v = voices.get(ac);
  if (v) return v;
  // A fixed noise table, so a render is the same every time.
  const len = Math.floor(ac.sampleRate * 0.4);
  const noise = ac.createBuffer(1, len, ac.sampleRate);
  const data = noise.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  v = { lead: pulseWave(ac, 0.25), harmony: pulseWave(ac, 0.5), noise };
  voices.set(ac, v);
  return v;
}

/*
 * Every envelope gain below is set to 0 before its first event. A new GainNode sits at 1.0 until
 * its first scheduled event, and a source that starts between two sample frames can leak one
 * full-scale sample through in that gap: a click 7-20x louder than the note, depending on tempo.
 */
function pitched(
  ac: BaseAudioContext,
  out: AudioNode,
  wave: PeriodicWave | 'triangle',
  midi: number,
  t: number,
  dur: number,
  vol: number,
): void {
  const o = ac.createOscillator();
  const g = ac.createGain();
  if (wave === 'triangle') o.type = 'triangle';
  else o.setPeriodicWave(wave);
  o.frequency.setValueAtTime(midiHz(midi), t);
  const end = t + dur;
  const attack = Math.min(0.004, dur / 4);
  g.gain.value = 0;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.linearRampToValueAtTime(vol * 0.6, Math.max(t + attack + 0.001, end - 0.008));
  g.gain.linearRampToValueAtTime(0.0001, end);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(end + 0.02);
}

function noiseBurst(
  ac: BaseAudioContext,
  out: AudioNode,
  v: Voices,
  hz: number,
  t: number,
  dur: number,
  vol: number,
  offset: number,
): void {
  const s = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  s.buffer = v.noise;
  f.type = 'highpass';
  f.frequency.value = hz;
  g.gain.value = 0;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(out);
  s.start(t, offset);
  s.stop(t + dur + 0.02);
}

function drum(ac: BaseAudioContext, out: AudioNode, v: Voices, hit: Hit, t: number, step: number): void {
  // Start inside the noise table at a step-dependent place so hats are not one repeated sample.
  const offset = (step * 0.0137) % 0.3;
  if (hit === 'h') {
    noiseBurst(ac, out, v, 7500, t, 0.03, VOL.hat, offset);
  } else if (hit === 's') {
    noiseBurst(ac, out, v, 1400, t, 0.11, VOL.snare, offset);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    g.gain.value = 0;
    g.gain.setValueAtTime(VOL.snare * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.09);
  } else {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.value = 0;
    g.gain.setValueAtTime(VOL.kick, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.16);
  }
}

/** Schedules whatever begins on `step` (it wraps at the loop's end) at time `t`, one step being `sec` long. */
export function playStep(ac: BaseAudioContext, out: AudioNode, tune: Tune, step: number, t: number, sec: number): void {
  const e = tune.at[step % tune.steps];
  const v = voicesFor(ac);
  if (e.lead) pitched(ac, out, v.lead, e.lead.midi, t, e.lead.len * sec * GATE.lead, VOL.lead);
  if (e.harmony) pitched(ac, out, v.harmony, e.harmony.midi, t, e.harmony.len * sec * GATE.harmony, VOL.harmony);
  if (e.bass) pitched(ac, out, 'triangle', e.bass.midi, t, e.bass.len * sec * GATE.bass, VOL.bass);
  if (e.drum) drum(ac, out, v, e.drum, t, step);
}

/* eslint-disable no-unused-vars */
export interface Music {
  /**
   * Call every frame while a run is on, and on every change of state or of the
   * sound setting. `on` false stops the music at once (a short fade); true
   * starts it, or keeps it queued. `tempo` is a scale from `tempoScale`.
   * It does nothing until the context is running, so the frame after a
   * gesture's resume() is what starts it.
   */
  sync(on: boolean, tempo: number): void;
  /** The next start begins at the first bar; a start after a pause carries on instead. */
  rewind(): void;
  close(): void;
}
/* eslint-enable no-unused-vars */

export function createMusic(getContext: () => AudioContext | null, tune: Tune): Music {
  let bus: GainNode | null = null;
  let ctx: AudioContext | null = null;
  /** The next step to queue, wrapped at the loop. */
  let step = 0;
  let nextTime = 0;
  /** Steps queued with the time they sound, so a pause can put the unsounded ones back. */
  const queued: { step: number; t: number }[] = [];

  function halt(): void {
    if (!bus || !ctx) return;
    const now = ctx.currentTime;
    const unsounded = queued.find(q => q.t > now);
    if (unsounded) step = unsounded.step;
    queued.length = 0;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0, now, 0.015);
    const old = bus;
    // Notes queued ahead still feed the muted bus; let them finish, then drop it.
    setTimeout(() => old.disconnect(), 200);
    bus = null;
  }

  return {
    sync(on, tempo) {
      const ac = getContext();
      if (!on || !ac || ac.state !== 'running') {
        halt();
        return;
      }
      if (!bus) {
        ctx = ac;
        bus = ac.createGain();
        bus.gain.value = MUSIC_LEVEL;
        bus.connect(ac.destination);
        nextTime = ac.currentTime + 0.06;
      }
      const now = ac.currentTime;
      // A frame that stalled past the queue: skip ahead rather than burst the backlog out at once.
      if (nextTime < now) nextTime = now + 0.02;
      const sec = stepSeconds(tune.bpm, tempo);
      while (nextTime < now + LOOKAHEAD) {
        playStep(ac, bus, tune, step, nextTime, sec);
        queued.push({ step, t: nextTime });
        step = (step + 1) % tune.steps;
        nextTime += sec;
      }
      while (queued.length && queued[0].t <= now) queued.shift();
    },
    rewind() {
      step = 0;
      queued.length = 0;
    },
    close() {
      halt();
    },
  };
}
