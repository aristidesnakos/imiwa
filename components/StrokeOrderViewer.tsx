'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { strokeOrderService } from '@/lib/stroke-order';
import { Loader2, Play, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  kanji: string;
  className?: string;
}

const DOM_REFLOW_DELAY_MS = 10;
// Highest sN index with a CSS-defined animation-delay (see globals.css)
const MAX_CSS_STROKE_INDEX = 20;

export function StrokeOrderViewer({ kanji, className = '' }: Props) {
  // codePointAt, not charCodeAt: for characters above U+FFFF charCodeAt returns
  // only the leading surrogate, so two different kanji in the same supplementary
  // plane can collide on one DOM id. The current JLPT N5-N1 dataset is entirely
  // BMP, so this is a latent hazard rather than a bug anyone has hit — but the
  // id is derived once here so the lookups and the rendered element cannot drift
  // apart the way three inline copies of the expression could.
  const diagramId = `stroke-${kanji.codePointAt(0)}`;
  const diagramLabelId = `${diagramId}-label`;

  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  // Controls the CSS 'animate' class via React state to avoid conflicts with reconciliation
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  // Tracks the pending reflow/fallback timer so it can be cancelled
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the cleanup function for animationend listeners on stroke paths
  const animationCleanupRef = useRef<(() => void) | null>(null);

  const loadStrokeOrder = useCallback(async () => {
    setLoading(true);
    setError(false);
    
    try {
      const svgContent = await strokeOrderService.loadSVG(kanji);
      
      if (svgContent) {
        setSvg(svgContent);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load stroke order:', err);
      setError(true);
    }
    
    setLoading(false);
  }, [kanji]);
  
  useEffect(() => {
    loadStrokeOrder();
  }, [loadStrokeOrder]);

  // Count strokes once the SVG is rendered into the DOM
  useEffect(() => {
    if (svg) {
      const element = document.getElementById(diagramId);
      if (element) {
        setStrokeCount(element.querySelectorAll('path').length);
      }
    }
  }, [svg, diagramId]);

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

  // Reset animation state whenever the kanji changes
  useEffect(() => {
    setHasStarted(false);
    setAnimating(false);
    setStrokeCount(0);
    cancelAnimation();
  }, [kanji, cancelAnimation]);

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  const startAnimation = useCallback(() => {
    if (strokeCount === 0) return;

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
  }, [diagramId, strokeCount, cancelAnimation]);
  
  const handleButtonClick = useCallback(() => {
    if (strokeCount === 0) return;
    if (!hasStarted) setHasStarted(true);
    startAnimation();
  }, [strokeCount, hasStarted, startAnimation]);

  const getButtonContent = () => {
    if (hasStarted) {
      return <><RotateCcw className="w-4 h-4 mr-2" />Replay</>;
    }
    return <><Play className="w-4 h-4 mr-2" />Play</>;
  };

  const getInstructionText = () => {
    if (hasStarted) return 'Click Replay to restart the animation';
    return 'Click Play to see the stroke order animation';
  };

  // Single sentence describing where the viewer currently is, fed to the live
  // region below. The three visual states are three different subtrees, so the
  // wording is centralised here rather than scraped out of whichever subtree
  // happens to be mounted.
  const getStatusMessage = () => {
    if (loading) return 'Loading stroke order diagram';
    if (error) return 'Stroke order not available. This kanji may not be in the KanjiVG database.';
    return getInstructionText();
  };

  return (
    // One persistent wrapper across loading / error / loaded. The states used to
    // be early returns, which meant any live region inside them was mounted and
    // unmounted along with the state it described — and assistive tech only
    // announces changes to a region that was already in the accessibility tree,
    // so a region that arrives carrying its own message stays silent. Keeping
    // the wrapper (and the status node below) mounted is what makes the
    // loading -> loaded -> error transitions audible at all.
    <div className={className}>
      {/* Visually hidden because every message here is already on screen in the
          state it belongs to; this node exists to announce the transition, not
          to repeat the text a second time. Its content on first mount is
          deliberately the loading message: mount-time content is not announced,
          so arriving on the page is quiet and only real changes speak. */}
      <div role="status" aria-live="polite" className="sr-only">
        {getStatusMessage()}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          {/* gray-600, not gray-400. The spinner is non-text content that is the
              sole indicator of the loading state, so WCAG 1.4.11 asks 3:1 of it;
              gray-400 is 2.43:1 on this bg-gray-50 panel. gray-600 is 7.2:1. */}
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mb-2" />
          <div className="text-gray-600">Loading stroke order...</div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-gray-600 mb-4 text-center">
            <div className="text-lg mb-2">Stroke order not available</div>
            <div className="text-sm">This kanji may not be in the KanjiVG database</div>
          </div>
          <Button variant="outline" size="sm" onClick={loadStrokeOrder}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SVG Display */}
          <div className="flex items-center justify-center h-64 bg-white border rounded-lg p-4">
            {/* aria-labelledby rather than aria-label, even though the label is a
                fixed English sentence: the kanji itself has to sit inside a
                lang="ja" run or an English voice mangles or skips it, and an
                aria-label is a flat string that inherits the document's lang="en"
                with no way to mark the Japanese portion. Referencing real markup
                is the only vehicle that carries the language switch, and it
                matches how the rest of the page tags Japanese (see
                app/kanji/[character]/page.tsx).

                The KanjiVG files we inject carry no <title>/<desc> of their own
                and the SVG proxy does not add one, so without this the site's
                headline feature is an unnamed graphic. */}
            <span id={diagramLabelId} className="sr-only">
              {'Stroke order diagram for the kanji '}
              <span lang="ja">{kanji}</span>
              {/* strokeCount is 0 until the injected SVG has been measured, so the
                  count is appended only once it is real — a diagram briefly
                  labelled "(0 strokes)" would be worse than one labelled without
                  a count at all. */}
              {strokeCount > 0 && ` (${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'})`}
            </span>
            <div
              id={diagramId}
              role="img"
              aria-labelledby={diagramLabelId}
              className={`stroke-animation${animating ? ' animate' : ''}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center">
            <Button
              onClick={handleButtonClick}
              variant="default"
              size="sm"
              disabled={strokeCount === 0}
              aria-controls={diagramId}
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
          <div className="text-xs text-gray-600 text-center" aria-hidden="true">
            {getInstructionText()}
          </div>
        </div>
      )}
    </div>
  );
}
