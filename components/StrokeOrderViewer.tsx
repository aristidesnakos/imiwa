'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { strokeOrderService } from '@/lib/stroke-order';
import { strokeOrderImageAlt, strokeOrderImagePath } from '@/lib/stroke-order-image';
import { Loader2, Play, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  kanji: string;
  /** The character's primary English meaning, for the resting image's alt text. */
  meaning: string;
  className?: string;
}

const DOM_REFLOW_DELAY_MS = 10;
// Highest sN index with a CSS-defined animation-delay (see globals.css)
const MAX_CSS_STROKE_INDEX = 20;
// The diagram box, h-48 w-48. The resting image and the animated SVG both fill
// exactly this box, so swapping one for the other cannot move anything.
const DIAGRAM_SIZE_PX = 192;

const PLAY_FAILED_MESSAGE = 'The stroke order animation could not be loaded. Press Play to try again.';

export function StrokeOrderViewer({ kanji, meaning, className = '' }: Props) {
  // codePointAt, not charCodeAt: for characters above U+FFFF charCodeAt returns
  // only the leading surrogate, so two different kanji in the same supplementary
  // plane can collide on one DOM id. The current JLPT N5-N1 dataset is entirely
  // BMP, so this is a latent hazard rather than a bug anyone has hit — but the
  // id is derived once here so the lookups and the rendered element cannot drift
  // apart the way three inline copies of the expression could.
  const diagramId = `stroke-${kanji.codePointAt(0)}`;
  const diagramLabelId = `${diagramId}-label`;
  // The role="img" wrapper, which is what Play controls and what the label
  // names. Distinct from diagramId, which stays on the inner element the
  // animation code looks up — see the render for why they had to separate.
  const diagramFigureId = `${diagramId}-figure`;

  // At rest the diagram is an <img> of /kanji/<char>/stroke-order.svg, in the
  // server HTML. It used to be KanjiVG's SVG fetched after hydration and
  // injected inline, which put the page's main content out of reach of Google
  // Images (it indexes <img src>, not markup a script adds) and showed every
  // visitor a loading box first. The image is styled to look exactly like the
  // inline SVG at rest; see lib/kanjivg.ts.
  const imageSrc = strokeOrderImagePath(kanji);

  // The inline SVG the animation runs on: KanjiVG's source file through
  // /api/kanji-svg, which CSS can reach into and an <img> cannot. Nothing
  // fetches it until the first Play, because the resting state no longer needs
  // it. Once it arrives it replaces the image in the same box.
  const [svg, setSvg] = useState<string>('');
  // The first Play press is waiting for that SVG.
  const [fetchingSvg, setFetchingSvg] = useState(false);
  // The last Play press could not load the SVG. The image is still showing, so
  // this is a message and a second chance, not the error state.
  const [playFailed, setPlayFailed] = useState(false);
  // The resting image itself failed to load: the only state with no diagram.
  const [imageFailed, setImageFailed] = useState(false);
  // Bumped by Retry, to remount the <img> and request it again.
  const [imageAttempt, setImageAttempt] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  // Controls the CSS 'animate' class via React state to avoid conflicts with reconciliation
  const [animating, setAnimating] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  // Tracks the pending reflow/fallback timer so it can be cancelled
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the cleanup function for animationend listeners on stroke paths
  const animationCleanupRef = useRef<(() => void) | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // Set when a Play press has fetched the SVG, cleared once it has started the
  // animation on it (which has to wait until the SVG is in the DOM).
  const playPendingRef = useRef(false);
  // The character on screen now, so a fetch that resolves after the kanji has
  // changed is dropped instead of animating the wrong diagram.
  const kanjiRef = useRef(kanji);

  useEffect(() => {
    kanjiRef.current = kanji;
  }, [kanji]);

  // What the live region says. Deliberately NOT the instruction text.
  //
  // Feeding it the instruction meant two bugs. The component was server-rendered
  // in a loading state, so every visitor to every kanji page heard "Loading…"
  // flip to "Click Play to see the stroke order animation" without having done
  // anything — an unsolicited announcement on a page they came to read. And the
  // instruction only ever changes once, when hasStarted flips, so the second and
  // every later Replay was silent: the text was already identical and identical
  // text is not re-announced.
  //
  // So this reports events, not instructions. Empty until something actually
  // happens, and `announce` clears before setting so a repeated press is a real
  // change to the node.
  const [status, setStatus] = useState('');

  const announce = useCallback((message: string) => {
    setStatus('');
    // A frame, not a microtask: React batches both setStates in the same commit
    // otherwise, and the region never sees the empty value.
    requestAnimationFrame(() => setStatus(message));
  }, []);

  useEffect(() => {
    if (imageFailed) {
      setStatus('Stroke order diagram is not available for this kanji.');
    }
  }, [imageFailed]);

  const cancelAnimation = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
      animationCleanupRef.current = null;
    }
  }, []);

  // Reset everything whenever the kanji changes
  useEffect(() => {
    setSvg('');
    setFetchingSvg(false);
    setPlayFailed(false);
    setImageFailed(false);
    setHasStarted(false);
    setAnimating(false);
    setStrokeCount(0);
    playPendingRef.current = false;
    cancelAnimation();
  }, [kanji, cancelAnimation]);

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  // onError alone misses an image that failed before hydration: the event fired
  // before React was listening. A finished image with no width is a broken one,
  // so check once per image as well.
  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) {
      setImageFailed(true);
    }
  }, [kanji, imageAttempt]);

  const startAnimation = useCallback(() => {
    // Cancel any in-flight timer and listener cleanup
    cancelAnimation();

    // Remove 'animate' class first so CSS animation resets, then re-add after a reflow
    setAnimating(false);

    // Brief delay ensures the browser reflows before re-adding the class
    animationTimerRef.current = setTimeout(() => {
      animationTimerRef.current = null;
      setAnimating(true);

      const container = document.getElementById(diagramId);
      if (!container) return;

      // Find the highest sN stroke index present in the SVG
      let maxN = 0;
      container.querySelectorAll('path[id]').forEach(path => {
        const id = path.getAttribute('id') ?? '';
        const match = /s(\d+)$/.exec(id);
        if (!match) return;
        const n = parseInt(match[1], 10);
        if (n > maxN) maxN = n;
      });

      // Cap at the highest stroke index with a CSS-defined animation-delay
      const effectiveLastN = Math.min(maxN, MAX_CSS_STROKE_INDEX);

      if (effectiveLastN === 0) {
        // No recognisable stroke IDs — nothing to listen for, animation runs on its own
        return;
      }

      // Listen on the stable container via event bubbling rather than on a specific
      // path element — path references can become stale after React re-renders the
      // className, whereas the container element itself always persists.
      const handleAnimationEnd = (e: Event) => {
        const ae = e as AnimationEvent;
        if (ae.animationName !== 'draw-stroke') return;
        const targetId = (ae.target as Element)?.getAttribute('id') ?? '';
        const match = /s(\d+)$/.exec(targetId);
        if (!match || parseInt(match[1], 10) !== effectiveLastN) return;

        container.removeEventListener('animationend', handleAnimationEnd);
        animationCleanupRef.current = null;
      };

      container.addEventListener('animationend', handleAnimationEnd);
      animationCleanupRef.current = () => {
        container.removeEventListener('animationend', handleAnimationEnd);
        animationCleanupRef.current = null;
      };
    }, DOM_REFLOW_DELAY_MS);
  }, [diagramId, cancelAnimation]);

  const play = useCallback((count: number) => {
    setHasStarted(true);
    setPlayFailed(false);
    startAnimation();
    // The one thing worth announcing: the animation is purely visual, so
    // without this a non-sighted user gets no confirmation the button did
    // anything. Re-announced on every press, including repeats.
    announce(`Playing stroke order animation, ${count} ${count === 1 ? 'stroke' : 'strokes'}.`);
  }, [startAnimation, announce]);

  // Once the inline SVG is in the DOM: count its strokes, and start the
  // animation for the Play press that fetched it.
  useEffect(() => {
    if (!svg) return;
    const element = document.getElementById(diagramId);
    if (!element) return;
    const count = element.querySelectorAll('path').length;
    setStrokeCount(count);

    if (!playPendingRef.current) return;
    playPendingRef.current = false;
    if (count > 0) {
      play(count);
    } else {
      setPlayFailed(true);
      announce(PLAY_FAILED_MESSAGE);
    }
  }, [svg, diagramId, play, announce]);

  const handleButtonClick = useCallback(async () => {
    if (svg) {
      if (strokeCount > 0) play(strokeCount);
      return;
    }
    if (fetchingSvg) return;

    const requested = kanji;
    setFetchingSvg(true);
    setPlayFailed(false);
    const svgContent = await strokeOrderService.loadSVG(requested);
    if (kanjiRef.current !== requested) return;
    setFetchingSvg(false);

    if (!svgContent) {
      setPlayFailed(true);
      announce(PLAY_FAILED_MESSAGE);
      return;
    }
    playPendingRef.current = true;
    setSvg(svgContent);
  }, [svg, strokeCount, fetchingSvg, kanji, play, announce]);

  const retryImage = useCallback(() => {
    setStatus('');
    setImageFailed(false);
    setImageAttempt(attempt => attempt + 1);
  }, []);

  const getButtonContent = () => {
    if (hasStarted) {
      return <><RotateCcw className="w-4 h-4 mr-2" />Replay</>;
    }
    // While the first press fetches the animation the icon becomes a spinner.
    // The label stays "Play", so the button's name does not change under a
    // screen reader's focus; the live region reports what happened.
    if (fetchingSvg) {
      return <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Play</>;
    }
    return <><Play className="w-4 h-4 mr-2" />Play</>;
  };

  const getInstructionText = () => {
    if (playFailed) return 'The animation could not load. Click Play to try again.';
    if (hasStarted) return 'Click Replay to restart the animation';
    return 'Click Play to see the stroke order animation';
  };


  return (
    // One persistent wrapper across every state. The states used to be early
    // returns, which meant any live region inside them was mounted and
    // unmounted along with the state it described — and assistive tech only
    // announces changes to a region that was already in the accessibility tree,
    // so a region that arrives carrying its own message stays silent. Keeping
    // the wrapper (and the status node below) mounted is what makes the
    // transitions audible at all.
    <div className={className}>
      {/* Empty on mount, so landing on the page is silent. Only a Play press or
          a failed load ever puts anything in here. */}
      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>

      {/* Fixed three-row shape (diagram / controls / instructions) in every
          state — only the CONTENTS of each row change, never whether the row
          exists. There used to be a loading state whose placeholder reserved
          only the diagram box's height, so the controls and instructions rows
          appeared from nothing once the KanjiVG fetch resolved and pushed
          everything below down: the dominant field CLS source on every kanji
          detail page, per Search Console's Core Web Vitals report. The diagram
          is now in the server HTML, so there is no loading state at all; the
          error state still hides the controls and instructions with
          `invisible` (not absent) so they keep their row's height, and they
          are not tab-reachable while hidden that way. */}
      <div className="space-y-4">
        {/* Diagram / status box — always h-64 */}
        <div
          className={`flex items-center justify-center h-64 rounded-lg p-4 ${
            imageFailed ? 'bg-gray-50' : 'bg-white border'
          }`}
        >
          {imageFailed ? (
            <div className="flex flex-col items-center justify-center">
              <div className="text-gray-600 mb-4 text-center">
                <div className="text-lg mb-2">Stroke order not available</div>
                <div className="text-sm">The diagram could not be loaded right now</div>
              </div>
              <Button variant="outline" size="sm" onClick={retryImage}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            // aria-labelledby rather than aria-label, even though the label is a
            // fixed English sentence: the kanji itself has to sit inside a
            // lang="ja" run or an English voice mangles or skips it, and an
            // aria-label is a flat string that inherits the document's lang="en"
            // with no way to mark the Japanese portion. Referencing real markup
            // is the only vehicle that carries the language switch, and it
            // matches how the rest of the page tags Japanese (see
            // app/kanji/[character]/page.tsx).
            //
            // Neither thing this wrapper can hold names itself for assistive
            // tech: the KanjiVG files carry no <title>/<desc>, and the resting
            // image's alt is hidden by the rule below. Without this label the
            // site's headline feature is an unnamed graphic.
            //
            // The label sits INSIDE the role="img" element, not beside it.
            // aria-labelledby does not remove its target from the accessibility
            // tree, and role="img" prunes only its own descendants — so a
            // sibling label is announced twice, once as ordinary text in
            // reading order and again as the image's name. Nested, the same
            // span computes the name and is then hidden by the
            // presentational-children rule. That rule hides the <img> below
            // too, so its alt is not read out as a second name; it is there
            // for search engines, which read it from the HTML.
            //
            // Two ids because of that nesting: the wrapper cannot carry the
            // inline SVG (dangerouslySetInnerHTML forbids children), so the
            // inner element keeps diagramId for the animation lookups and the
            // wrapper takes diagramFigureId for role, name and aria-controls.
            <div
              id={diagramFigureId}
              role="img"
              aria-labelledby={diagramLabelId}
            >
              <span id={diagramLabelId} className="sr-only">
                {'Stroke order diagram for the kanji '}
                <span lang="ja">{kanji}</span>
                {/* strokeCount is 0 until the animation's SVG has been fetched
                    and measured (the first Play), so the count is appended only
                    once it is real — a diagram briefly labelled "(0 strokes)"
                    would be worse than one labelled without a count at all. */}
                {strokeCount > 0 && ` (${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'})`}
              </span>
              {svg ? (
                // A fixed box, because the injected SVG otherwise renders at its
                // intrinsic 109px inside a panel reserved at 256px. The panel's
                // height is already fixed (h-64, above), so sizing the diagram
                // up cannot shift the layout.
                <div
                  id={diagramId}
                  className={`stroke-animation h-48 w-48${animating ? ' animate' : ''}`}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                // A plain <img>, not next/image: the file is a vector, so there
                // is nothing for the optimiser to resize, and next/image refuses
                // SVG without dangerouslyAllowSVG anyway. Eager (the default),
                // because this is above the fold and is the page's main image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${kanji}-${imageAttempt}`}
                  ref={imageRef}
                  src={imageSrc}
                  alt={strokeOrderImageAlt(kanji, meaning)}
                  width={DIAGRAM_SIZE_PX}
                  height={DIAGRAM_SIZE_PX}
                  className="h-48 w-48"
                  onError={() => setImageFailed(true)}
                />
              )}
            </div>
          )}
        </div>

        {/* Controls — reserved even in the error state (see note above); the
            error state's own Retry button lives inside the box above, so this
            row just stays invisible then. */}
        <div className="flex justify-center">
          <Button
            onClick={handleButtonClick}
            variant="default"
            size="sm"
            aria-controls={diagramFigureId}
            className={imageFailed ? 'invisible' : ''}
          >
            {getButtonContent()}
          </Button>
        </div>

        {/* Instructions — the on-screen twin of the live region above, hidden
            from assistive tech so the identical sentence is not read twice in
            a row. Deliberately not wired to announce each stroke: the drawing
            is the point, and a per-stroke commentary would bury the one thing
            worth hearing (that the animation finished and can be replayed). */}
        {/* gray-600 throughout, not gray-500. gray-500 is 4.56:1 on the page
            background — passing AA by 1.3%, which is not a margin worth
            keeping on the only instructions the Play button has. */}
        <div
          className={`text-xs text-gray-600 text-center ${imageFailed ? 'invisible' : ''}`}
          aria-hidden="true"
        >
          {getInstructionText()}
        </div>
      </div>
    </div>
  );
}
