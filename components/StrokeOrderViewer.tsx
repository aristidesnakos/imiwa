'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { strokeOrderService } from '@/lib/stroke-order';
import { Loader2, Play, Pause, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  kanji: string;
  className?: string;
}

export function StrokeOrderViewer({ kanji, className = '' }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const loadStrokeOrder = useCallback(async () => {
    setLoading(true);
    setError(false);
    setPlaying(false);
    
    try {
      const svgContent = await strokeOrderService.loadSVG(kanji);
      
      if (svgContent) {
        setSvg(svgContent);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('StrokeOrderViewer: Failed to load stroke order:', err);
      setError(true);
    }
    
    setLoading(false);
  }, [kanji]);
  
  useEffect(() => {
    loadStrokeOrder();
  }, [kanji, loadStrokeOrder]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const initializePaths = () => {
    if (!svgContainerRef.current) return;
    
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const paths = Array.from(svgElement.querySelectorAll('path'));
    paths.forEach((path) => {
      path.style.stroke = '#2c2c2c';
      path.style.strokeWidth = '2';
      path.style.fill = 'none';
      path.style.opacity = '0'; // Start hidden
      path.style.transition = 'opacity 0.3s ease-in-out';
    });
  };

  useEffect(() => {
    if (svg) {
      setTimeout(initializePaths, 100);
    }
  }, [svg]);
  
  const toggleAnimation = () => {
    if (!svgContainerRef.current || playing) return;
    
    const svgElement = svgContainerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    setPlaying(true);
    const paths = Array.from(svgElement.querySelectorAll('path'));
    console.log(`Found ${paths.length} paths for opacity animation`);
    
    // Hide all paths first
    paths.forEach((path, index) => {
      path.style.opacity = '0';
      console.log(`Hiding path ${index}`);
    });
    
    // Show each path one by one
    paths.forEach((path, index) => {
      const delay = index * 1000; // Increase to 1 second
      console.log(`Scheduling path ${index} to show after ${delay}ms`);
      setTimeout(() => {
        console.log(`Showing path ${index} now`);
        path.style.opacity = '1';
      }, delay);
    });
    
    const totalDuration = paths.length * 1000 + 300;
    animationTimeoutRef.current = setTimeout(() => {
      setPlaying(false);
    }, totalDuration);
  };
  
  const resetAnimation = () => {
    setPlaying(false);
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    // Reset all paths to hidden
    if (svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        const paths = Array.from(svgElement.querySelectorAll('path'));
        paths.forEach((path) => {
          path.style.opacity = '0';
        });
      }
    }
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
          ref={svgContainerRef}
          className="stroke-display"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex justify-center space-x-2">
        <Button 
          onClick={toggleAnimation} 
          variant={playing ? "secondary" : "default"}
          size="sm"
        >
          {playing ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play
            </>
          )}
        </Button>
        <Button onClick={resetAnimation} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center">
        Click Play to see the stroke order animation
      </div>
    </div>
  );
}