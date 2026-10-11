'use client';

/**
 * Tan Dash, the /play island: the 9:16 stage, the canvas engine
 * (lib/play/engine.ts), the title / pause / results overlays, input, storage
 * and every goal in lib/play/measure.ts except site_visit_return.
 *
 * Rendered by app/play/page.tsx inside the page's <main> as
 * `<TanDash data={buildPlayData()} />`. The data arrives as a prop, built on
 * the server: nothing here may import lib/play/build.ts or a kanji list.
 *
 * - The title screen is server HTML (the page's LCP), sized by CSS alone
 *   (TanDash.module.css), so hydration moves nothing. Stored stats hydrate in
 *   an effect from DEFAULT_SAVE (./usePlaySave.ts).
 * - Keys are the game's only while a run is in play or paused, or while focus
 *   is in the stage; otherwise the page keeps them. Taps go to the stage only
 *   (touch-action: none there and nowhere else).
 * - Goals are budgeted (lib/play/measure.ts): run start once per page view,
 *   catches 1 and 3 per page view, every share click, the app door once.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { trackGoal } from '@/lib/analytics';
import { createTanDash, type PlayState, type RunResult, type TanDashEngine } from '@/lib/play/engine';
import {
  CATCH_MILESTONES,
  localDay,
  onCatch as visitOnCatch,
  PLAY_GOALS,
  readVisit,
  writeVisit,
} from '@/lib/play/measure';
import { PLAY_CSS_VARS } from '@/lib/play/palette';
import type { SignSetting } from '@/lib/play/rules';
import type { PlayData } from '@/lib/play/types';
import { SITE_URL } from '@/lib/seo/site';
import { dotFont, pixelFont } from './fonts';
import { PLAY_APP_WAITLIST_COPY } from './copy';
import { dexCount, streakAfterRun, streakNow, type PlayOptions } from './save';
import { usePlaySave } from './usePlaySave';
import styles from './TanDash.module.css';

// Loaded on the first click of the app door, so the form costs /play nothing until then.
const EmailCapture = dynamic(() => import('@/components/EmailCapture'), { ssr: false });

const SHARE_URL = `${SITE_URL}/play?utm_source=tan-dash&utm_medium=share`;
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyX', 'KeyZ'];
const SIGN_ORDER: SignSetting[] = ['mix', 'en', 'kana'];
const SIGN_LABEL: Record<SignSetting, { short: string; spoken: string }> = {
  mix: { short: 'MIX', spoken: 'English, then kana for kanji you know' },
  en: { short: 'ENGLISH', spoken: 'English only' },
  kana: { short: 'かな', spoken: 'kana only' },
};
/** The sticky header's height (components/sections/Header.tsx); the stage is "on screen" below it. */
const HEADER_PX = 73;

const fmt = (n: number) => n.toLocaleString('en-US');
const noop = (): void => {};
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function isTypingTarget(el: Element): boolean {
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return !!el.closest('input, textarea, select');
}

type Result = RunResult & { isBest: boolean };

export function TanDash({ data }: { data: PlayData }) {
  const { save, saveRef, update } = usePlaySave();
  const total = data.kanji.length;
  const known = useMemo(() => new Set(data.kanji.map(k => k.c)), [data]);
  const byChar = useMemo(() => new Map(data.kanji.map(k => [k.c, k])), [data]);

  const cabinetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const waitlistRef = useRef<HTMLElement>(null);
  const waitlistHeadingRef = useRef<HTMLHeadingElement>(null);
  const engineRef = useRef<TanDashEngine | null>(null);
  /** Per page view: a remount of /play is a new page view. */
  const fired = useRef({ runStart: false, appDoor: false, catches: 0 });

  const [phase, setPhase] = useState<PlayState>('title');
  const [result, setResult] = useState<Result | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied'>('idle');
  const [manualText, setManualText] = useState<string | null>(null);
  const [appDoorOpen, setAppDoorOpen] = useState(false);

  // ----- engine hooks -----

  const handleCatch = useCallback(
    (c: string) => {
      update(s => ({ ...s, dex: { ...s.dex, [c]: (s.dex[c] ?? 0) + 1 } }));
      const n = ++fired.current.catches;
      if (n === 1) {
        // The first catch of the page view moves this browser into the player
        // cohort of the return-visit test (lib/play/measure.ts).
        const next = visitOnCatch(readVisit(), localDay());
        if (next) writeVisit(next);
      }
      if ((CATCH_MILESTONES as readonly number[]).includes(n)) {
        void trackGoal(PLAY_GOALS.kanjiCatch, { n }).catch(noop);
      }
    },
    [update],
  );

  const handleRunEnd = useCallback(
    (r: RunResult) => {
      const isBest = r.score > saveRef.current.best;
      update(s => ({ ...s, best: Math.max(s.best, r.score), games: s.games + 1, streak: streakAfterRun(s) }));
      setResult({ ...r, isBest });
    },
    [saveRef, update],
  );

  // ----- the engine, its size, and when it runs -----

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let engine: TanDashEngine;
    try {
      engine = createTanDash(
        canvas,
        data,
        { ...saveRef.current.opt, fonts: { dot: dotFont.style.fontFamily, pix: pixelFont.style.fontFamily } },
        {
          onState: setPhase,
          onAnnounce: setAnnouncement,
          onCatch: handleCatch,
          onRunEnd: handleRunEnd,
          getDex: () => saveRef.current.dex,
        },
      );
    } catch {
      return; // No 2D canvas: the title screen stays, and nothing starts.
    }
    engineRef.current = engine;

    const fit = () => {
      const r = stage.getBoundingClientRect();
      engine.resize(r.width, r.height, window.devicePixelRatio || 1);
    };
    fit();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(fit);
      ro.observe(stage);
    } else {
      window.addEventListener('resize', fit);
    }

    // Off screen (under the sticky header counts as off): stop drawing, and
    // pause a run once less than half of the stage is showing.
    let onScreen = true;
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(
        entries => {
          const entry = entries[entries.length - 1];
          onScreen = entry.isIntersecting;
          engine.setVisible(onScreen && !document.hidden);
          if (entry.intersectionRatio < 0.5) engine.pause();
        },
        { threshold: [0, 0.5], rootMargin: `-${HEADER_PX}px 0px 0px 0px` },
      );
      io.observe(stage);
    }
    const onVisibility = () => {
      if (document.hidden) engine.pause();
      engine.setVisible(onScreen && !document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', fit);
      engine.destroy();
      engineRef.current = null;
    };
  }, [data, saveRef, handleCatch, handleRunEnd]);

  useEffect(() => {
    engineRef.current?.setOptions(save.opt);
  }, [save.opt]);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // ----- actions -----

  const startRun = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || (engine.state !== 'title' && engine.state !== 'over')) return;
    if (!fired.current.runStart) {
      fired.current.runStart = true;
      const first = dexCount(saveRef.current, known) === 0 ? 'yes' : 'no';
      void trackGoal(PLAY_GOALS.runStart, { first }).catch(noop);
    }
    setCopy('idle');
    setManualText(null);
    engine.start();
    const stage = stageRef.current;
    stage?.focus({ preventScroll: true });
    // Bring the whole stage into view under the header (on a phone, the screen).
    const cabinet = cabinetRef.current;
    if (stage && cabinet) {
      const r = stage.getBoundingClientRect();
      if (r.top < HEADER_PX - 1 || r.bottom > window.innerHeight + 1) {
        cabinet.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }, [known, saveRef]);

  const setOptions = useCallback(
    (patch: Partial<PlayOptions>) => update(s => ({ ...s, opt: { ...s.opt, ...patch } })),
    [update],
  );

  const toggleSound = useCallback(
    (chime: boolean) => {
      const on = !saveRef.current.opt.sound;
      setOptions({ sound: on });
      const engine = engineRef.current;
      if (engine && on && chime) {
        engine.setOptions({ sound: true });
        engine.chime();
      }
    },
    [saveRef, setOptions],
  );

  // ----- input -----

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as Element).closest('button, a')) return;
    const s = engine.state;
    if (s !== 'title' && s !== 'play' && s !== 'paused') return;
    e.preventDefault();
    stageRef.current?.focus({ preventScroll: true });
    if (s === 'title') startRun();
    else if (s === 'play') engine.jump();
    else engine.resume();
  };

  // A touch's pointerdown is not a user activation and its pointerup is: unlock
  // the audio on the way up, or a phone's first run would be silent.
  const onPointerUp = () => engineRef.current?.unlockAudio();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      const stage = stageRef.current;
      if (!engine || !stage || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target && isTypingTarget(target)) return;
      const s = engine.state;
      const running = s === 'play' || s === 'paused';
      const inStage = !!target && stage.contains(target);
      if (!running && !inStage) return;

      const code = e.code;
      const jumpKey = JUMP_KEYS.includes(code);
      if (jumpKey || code === 'Enter') {
        // A focused button or link keeps its own Space and Enter.
        if (target && target !== stage && target.closest('button, a, summary, [role="button"]')) return;
        e.preventDefault();
        if (e.repeat) return;
        if (s === 'title') startRun();
        else if (s === 'play') engine.jump();
        else if (s === 'paused') engine.resume();
        else if (s === 'over' && code === 'Enter') startRun();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        if (!running) return;
        e.preventDefault();
        if (e.repeat) return;
        if (s === 'play') engine.pause();
        else engine.resume();
        return;
      }
      if (code === 'KeyM') {
        e.preventDefault();
        if (!e.repeat) toggleSound(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startRun, toggleSound]);

  // ----- results -----

  useEffect(() => {
    if (phase !== 'over' || !result) return;
    againRef.current?.focus({ preventScroll: true });
    setAnnouncement(
      `Game over. ${fmt(result.score)} points, ${result.catches} kanji, best combo ${result.bestCombo}, world ${result.world}.` +
        (result.isBest ? ' New best!' : ''),
    );
  }, [phase, result]);

  const onShare = async () => {
    if (!result) return;
    const text = `TAN DASH 🦝 ${fmt(result.score)} pts · ${result.catches} kanji · combo ×${result.bestCombo} · world ${result.world} · ${saveRef.current.streak.n}-day streak`;
    if (canShare && typeof navigator.share === 'function') {
      void trackGoal(PLAY_GOALS.scoreShare, { method: 'share' }).catch(noop);
      try {
        await navigator.share({ title: 'Tan Dash', text, url: SHARE_URL });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // The sheet failed rather than being dismissed: fall through to copying.
      }
    } else {
      void trackGoal(PLAY_GOALS.scoreShare, { method: 'copy' }).catch(noop);
    }
    const full = `${text}\n${SHARE_URL}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopy('copied');
    } catch {
      setManualText(full);
    }
  };

  // The prototype's last resort: show the text and select it for the player.
  useEffect(() => {
    const note = noteRef.current;
    if (!manualText || !note) return;
    try {
      const range = document.createRange();
      range.selectNodeContents(note);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      // The text is on screen either way.
    }
  }, [manualText]);

  const onAppDoor = () => {
    if (!fired.current.appDoor) {
      fired.current.appDoor = true;
      void trackGoal(PLAY_GOALS.appWaitlistClick).catch(noop);
    }
    setAppDoorOpen(true);
  };

  useEffect(() => {
    if (!appDoorOpen) return;
    waitlistRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    waitlistHeadingRef.current?.focus({ preventScroll: true });
  }, [appDoorOpen]);

  // ----- render -----

  const dex = dexCount(save, known);
  const streak = streakNow(save);
  const enOf = (c: string) => byChar.get(c)?.en ?? '';
  const signLabel = SIGN_LABEL[save.opt.sign];
  const shareLabel = copy === 'copied' ? 'COPIED!' : canShare ? 'SHARE' : 'COPY SCORE';

  return (
    <div
      id="tan-dash"
      className={`${styles.root} ${pixelFont.variable} ${dotFont.variable}`}
      style={PLAY_CSS_VARS as CSSProperties}
    >
      <div ref={cabinetRef} className={styles.cabinet}>
        <div
          ref={stageRef}
          id="tan-dash-stage"
          className={styles.stage}
          role="application"
          aria-label="Tan Dash game. Tap or press Space to jump, P to pause, M for sound."
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
          <p className={styles.sr} aria-live="polite" aria-atomic="true">
            {announcement}
          </p>

          <div className={`${styles.ov} ${styles.title}`} hidden={phase !== 'title'}>
            <p className={styles.logo}>
              <span>TAN</span> <span>DASH</span>
            </p>
            <p className={styles.jp} lang="ja">
              タンの かんじ ダッシュ
            </p>
            <div className={styles.panel}>
              <dl className={styles.stats}>
                <div>
                  <dt>BEST</dt>
                  <dd>{fmt(save.best)}</dd>
                </div>
                <div>
                  <dt>KANJI-DEX</dt>
                  <dd>
                    {dex}/{total}
                  </dd>
                </div>
                <div>
                  <dt>STREAK</dt>
                  <dd>
                    {streak} day{streak === 1 ? '' : 's'}
                  </dd>
                </div>
              </dl>
            </div>
            <div className={styles.opts}>
              <button
                type="button"
                className={styles.btn}
                aria-label={`Speed: ${save.opt.speed}. Change speed`}
                onClick={() => setOptions({ speed: saveRef.current.opt.speed === 'chill' ? 'normal' : 'chill' })}
              >
                SPEED <b>{save.opt.speed === 'chill' ? 'CHILL' : 'NORMAL'}</b>
              </button>
              <button
                type="button"
                className={styles.btn}
                aria-label={`Signs: ${signLabel.spoken}. Change signs`}
                onClick={() =>
                  setOptions({
                    sign: SIGN_ORDER[(SIGN_ORDER.indexOf(saveRef.current.opt.sign) + 1) % SIGN_ORDER.length],
                  })
                }
              >
                SIGN <b>{signLabel.short}</b>
              </button>
              <button
                type="button"
                className={styles.btn}
                aria-label="Sound"
                aria-pressed={save.opt.sound}
                onClick={() => toggleSound(true)}
              >
                ♪ <b>{save.opt.sound ? 'ON' : 'OFF'}</b>
              </button>
            </div>
            <div className={styles.panel}>
              <ol className={styles.how}>
                <li>
                  <span>1</span>
                  <span>Tap to jump. Tap again in the air to jump higher.</span>
                </li>
                <li>
                  <span>2</span>
                  <span>Grab the kanji the sign asks for.</span>
                </li>
                <li>
                  <span>3</span>
                  <span>Wrong kanji and stumps cost a heart. Gold boxes help.</span>
                </li>
              </ol>
            </div>
            <p className={`${styles.tap} ${styles.blink}`}>TAP TO START</p>
            <p className={styles.foot}>A MichiKanji game · all {total} N5 kanji</p>
          </div>

          {phase === 'paused' && (
            <div className={`${styles.ov} ${styles.pause}`}>
              <div className={styles.panel}>
                <p className={styles.h}>PAUSED</p>
                <p className={`${styles.tap} ${styles.blink}`}>TAP TO GO ON</p>
              </div>
            </div>
          )}

          {phase === 'over' && result && (
            <div className={`${styles.ov} ${styles.over}`}>
              <div className={styles.panel}>
                <p className={styles.h}>GAME OVER</p>
                <p className={styles.score}>{fmt(result.score)}</p>
                {result.isBest && <p className={styles.newbest}>NEW BEST!</p>}
                <dl className={styles.stats}>
                  <div>
                    <dt>KANJI</dt>
                    <dd>{result.catches}</dd>
                  </div>
                  <div>
                    <dt>COMBO</dt>
                    <dd>×{result.bestCombo}</dd>
                  </div>
                  <div>
                    <dt>WORLD</dt>
                    <dd>{result.world}</dd>
                  </div>
                </dl>
                {result.mix.length > 0 && (
                  <div className={styles.group}>
                    <p className={styles.lbl}>Mix-ups</p>
                    <ul className={styles.mix}>
                      {result.mix.map(m => (
                        <li key={m.got + m.want}>
                          You grabbed <b lang="ja">{m.got}</b> {enOf(m.got)}, wanted <b lang="ja">{m.want}</b>{' '}
                          {enOf(m.want)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.caught.length > 0 && (
                  <div className={styles.group}>
                    <p className={styles.lbl}>Caught · tap one to see how it’s written</p>
                    <div className={styles.chips}>
                      {result.caught.map(c => (
                        <Link
                          key={c}
                          href={`/kanji/${encodeURIComponent(c)}`}
                          prefetch={false}
                          className={styles.chip}
                          title={`${c} · ${byChar.get(c)?.kana ?? ''} · ${enOf(c)}`}
                          aria-label={`${c}, ${enOf(c)}: how to write it`}
                        >
                          {c}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <p className={styles.small}>
                  Kanji-dex {dex}/{total} · {save.streak.n}-day streak · best {fmt(save.best)}
                </p>
                <div className={styles.row}>
                  <button
                    ref={againRef}
                    type="button"
                    className={`${styles.btn} ${styles.primary}`}
                    onClick={startRun}
                  >
                    PLAY AGAIN
                  </button>
                  <button type="button" className={styles.btn} onClick={onShare}>
                    {shareLabel}
                  </button>
                </div>
                {manualText && (
                  <p ref={noteRef} className={`${styles.small} ${styles.note}`}>
                    {manualText}
                  </p>
                )}
                {appDoorOpen ? (
                  <p className={styles.small}>{PLAY_APP_WAITLIST_COPY.ack}</p>
                ) : (
                  <button type="button" className={`${styles.btn} ${styles.door}`} onClick={onAppDoor}>
                    {PLAY_APP_WAITLIST_COPY.button}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {appDoorOpen && (
        <section
          ref={waitlistRef}
          id="play-app-waitlist"
          aria-labelledby="play-app-waitlist-heading"
          className="scroll-mt-24 space-y-4"
        >
          <h2
            ref={waitlistHeadingRef}
            id="play-app-waitlist-heading"
            tabIndex={-1}
            className="text-xl font-semibold text-japan-deep-ocean focus:outline-none"
          >
            {PLAY_APP_WAITLIST_COPY.heading}
          </h2>
          <p className="text-japan-ink-black">{PLAY_APP_WAITLIST_COPY.body}</p>
          <EmailCapture source="play-results" {...PLAY_APP_WAITLIST_COPY.signup} />
        </section>
      )}
    </div>
  );
}
