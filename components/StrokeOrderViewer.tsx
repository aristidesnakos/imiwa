'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { strokeOrderService } from '@/lib/stroke-order';
import { Loader2, Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  kanji: string;
  className?: string;
}

const STROKE_DURATION_MS = 800;
const DOM_REFLOW_DELAY_MS = 10;
const ANIMATION_BUFFER_MS = 50;

export function StrokeOrderViewer({ kanji, className = '' }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  // Controls the CSS 'animate' class via React state to avoid conflicts with reconciliation
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const element = document.querySelector(`#stroke-${kanji.charCodeAt(0)}`);
      if (element) {
        setStrokeCount(element.querySelectorAll('path').length);
      }
    }
  }, [svg, kanji]);

  // Reset animation state whenever the kanji changes
  useEffect(() => {
    setPlaying(false);
    setFinished(false);
    setAnimating(false);
    setStrokeCount(0);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
  }, [kanji]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const startAnimation = useCallback(() => {
    if (strokeCount === 0) return;

    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    // Remove 'animate' class first so CSS animation resets, then re-add after a reflow
    setAnimating(false);
    // Brief delay ensures the browser reflows before re-adding the class
    setTimeout(() => setAnimating(true), DOM_REFLOW_DELAY_MS);

    const totalDurationMs = strokeCount * STROKE_DURATION_MS;
    // Small buffer ensures the finished state is set after all CSS animations complete
    animationTimerRef.current = setTimeout(() => {
      setPlaying(false);
      setFinished(true);
    }, totalDurationMs + ANIMATION_BUFFER_MS);
  }, [strokeCount]);
  
  const handleButtonClick = useCallback(() => {
    if (strokeCount === 0) return;

    if (finished) {
      // Replay
      setFinished(false);
      setPlaying(true);
      startAnimation();
    } else if (!playing) {
      // Play
      setPlaying(true);
      startAnimation();
    } else {
      // Pause
      setPlaying(false);
      setAnimating(false);
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    }
  }, [strokeCount, finished, playing, startAnimation]);

  const getButtonContent = () => {
    if (playing) {
      return <><Pause className="w-4 h-4 mr-2" />Pause</>;
    }
    if (finished) {
      return <><RotateCcw className="w-4 h-4 mr-2" />Replay</>;
    }
    return <><Play className="w-4 h-4 mr-2" />Play</>;
  };

  const getInstructionText = () => {
    if (finished) return 'Click Replay to watch the animation again';
    if (playing) return 'Playing stroke order animation…';
    return 'Click Play to see the stroke order animation';
  };
  
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
        <div className="text-gray-500">Loading stroke order...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-gray-500 mb-4 text-center">
          <div className="text-lg mb-2">Stroke order not available</div>
          <div className="text-sm">This kanji may not be in the KanjiVG database</div>
        </div>
        <Button variant="outline" size="sm" onClick={loadStrokeOrder}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* SVG Display */}
      <div className="flex items-center justify-center h-64 bg-white border rounded-lg p-4">
        <div 
          id={`stroke-${kanji.charCodeAt(0)}`}
          className={`stroke-animation${animating ? ' animate' : ''}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex justify-center">
        <Button
          onClick={handleButtonClick}
          variant={playing ? "secondary" : "default"}
          size="sm"
          disabled={strokeCount === 0}
        >
          {getButtonContent()}
        </Button>
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center">
        {getInstructionText()}
      </div>
    </div>
  );
}
