/**
 * The part of the audition renderer that runs inside headless Chrome (bundled
 * and injected by render-tunes.ts). It plays a tune through the game's own
 * `playStep` into an OfflineAudioContext, so the file it returns is what the
 * game's synth makes, not a second implementation of it.
 */

import { MUSIC_LEVEL, playStep } from '../../lib/play/music';
import { parseTune, stepSeconds, type TuneSource } from '../../lib/play/tune';

export interface Rendered {
  wavBase64: string;
  seconds: number;
  /** Largest sample, 0..1. Over ~0.9 and the mix is too hot. */
  peak: number;
  /** Root-mean-square over the file, 0..1. */
  rms: number;
}

const RATE = 44100;
/** Whole loops, then this many bars of the next, to hear the seam where it wraps. */
const TAIL_BARS = 4;

export async function renderTune(source: TuneSource, loops: number): Promise<Rendered> {
  const tune = parseTune(source);
  const sec = stepSeconds(tune.bpm, 1);
  const steps = tune.steps * loops + TAIL_BARS * 16;
  const seconds = steps * sec + 0.6;
  const ac = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const bus = ac.createGain();
  bus.gain.value = MUSIC_LEVEL;
  bus.connect(ac.destination);
  for (let s = 0; s < steps; s++) playStep(ac, bus, tune, s, 0.05 + s * sec, sec);
  const pcm = (await ac.startRendering()).getChannelData(0);

  let peak = 0;
  let sumSq = 0;
  for (const x of pcm) {
    peak = Math.max(peak, Math.abs(x));
    sumSq += x * x;
  }
  const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => wav.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  wav.setUint32(4, 36 + pcm.length * 2, true);
  text(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, RATE, true);
  wav.setUint32(28, RATE * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  text(36, 'data');
  wav.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) => wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 32767, true));

  const bytes = new Uint8Array(wav.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { wavBase64: btoa(bin), seconds, peak, rms: Math.sqrt(sumSq / pcm.length) };
}
