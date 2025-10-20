'use client';

import { useState, useEffect } from 'react';
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
  
  const loadStrokeOrder = async () => {
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
  };
  
  useEffect(() => {
    loadStrokeOrder();
  }, [kanji]);
  
  const toggleAnimation = () => {
    if (!playing) {
      // Start animation
      setPlaying(true);
      const element = document.querySelector(`#stroke-${kanji.charCodeAt(0)}`);
      if (element) {
        element.classList.remove('animate');
        setTimeout(() => element.classList.add('animate'), 10);
      }
    } else {
      // Pause animation
      setPlaying(false);
      const element = document.querySelector(`#stroke-${kanji.charCodeAt(0)}`);
      if (element) {
        element.classList.remove('animate');
      }
    }
  };
  
  const resetAnimation = () => {
    setPlaying(false);
    const element = document.querySelector(`#stroke-${kanji.charCodeAt(0)}`);
    if (element) {
      element.classList.remove('animate');
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
          id={`stroke-${kanji.charCodeAt(0)}`}
          className="stroke-animation"
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