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
  
  // Helper function to get stroke paths in correct order
  const getStrokePathsInOrder = (svgElement: SVGSVGElement): SVGPathElement[] => {
    const allPaths = Array.from(svgElement.querySelectorAll('path'));
    const strokePaths = allPaths.filter(path => {
      const id = path.getAttribute('id');
      return id && id.includes('-s') && /s\d+$/.test(id);
    }) as SVGPathElement[];
    
    // Sort paths by stroke number (e.g., s1, s2, s3...)
    strokePaths.sort((a, b) => {
      const aNum = parseInt(a.getAttribute('id')?.split('-s')[1] || '0');
      const bNum = parseInt(b.getAttribute('id')?.split('-s')[1] || '0');
      return aNum - bNum;
    });
    
    return strokePaths;
  };
  
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
      console.error('Failed to load stroke order:', err);
      setError(true);
    }
    
    setLoading(false);
  }, [kanji]);
  
  useEffect(() => {
    loadStrokeOrder();
  }, [kanji, loadStrokeOrder]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Prepare SVG for animation when it loads
  useEffect(() => {
    if (svg && svgContainerRef.current) {
      console.log('Initializing SVG for animation...');
      setTimeout(() => {
        const svgElement = svgContainerRef.current?.querySelector('svg');
        if (svgElement) {
          console.log('SVG element found for initialization');
          const strokePaths = getStrokePathsInOrder(svgElement);
          console.log('Stroke paths for initialization:', strokePaths.length);
          
          if (strokePaths.length === 0) {
            // Fallback: initialize all paths
            const allPaths = Array.from(svgElement.querySelectorAll('path'));
            console.log('Using fallback - initializing all paths:', allPaths.length);
            allPaths.forEach((path) => {
              // Try opacity-based animation instead
              path.style.opacity = '0';
              path.style.stroke = '#2c2c2c';
              path.style.strokeWidth = '2';
              path.style.fill = 'none';
              path.style.transition = 'opacity 0.8s ease-in-out';
            });
          } else {
            // Initialize stroke paths for animation
            strokePaths.forEach((path) => {
              console.log('Initializing path:', path.getAttribute('id'));
              // Get the actual path length
              const pathLength = path.getTotalLength();
              console.log('Path length:', pathLength);
              
              // Use proper stroke-dash animation with actual path length
              path.style.strokeDasharray = `${pathLength}`;
              path.style.strokeDashoffset = `${pathLength}`;
              path.style.stroke = '#2c2c2c';
              path.style.strokeWidth = '2';
              path.style.fill = 'none';
              path.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
            });
          }
        }
      }, 100);
    }
  }, [svg]);
  
  const toggleAnimation = () => {
    console.log('Play button clicked!', { playing, svgContainerRef: !!svgContainerRef.current });
    
    if (svgContainerRef.current && !playing) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      console.log('SVG element found:', !!svgElement);
      
      if (svgElement) {
        setPlaying(true);
        const strokePaths = getStrokePathsInOrder(svgElement);
        console.log('Found stroke paths:', strokePaths.length, strokePaths.map(p => p.getAttribute('id')));
        
        if (strokePaths.length === 0) {
          // Fallback: use all paths if no stroke paths found
          const allPaths = Array.from(svgElement.querySelectorAll('path'));
          console.log('Using fallback - all paths:', allPaths.length);
          
          allPaths.forEach((path, index) => {
            setTimeout(() => {
              console.log(`Animating path ${index + 1}/${allPaths.length}`);
              path.style.opacity = '1';
            }, index * 800);
          });
          
          const totalDuration = allPaths.length * 800 + 800;
          animationTimeoutRef.current = setTimeout(() => {
            setPlaying(false);
          }, totalDuration);
        } else {
          // Animate each stroke one by one in correct order
          strokePaths.forEach((path, index) => {
            setTimeout(() => {
              console.log(`Animating stroke ${index + 1}/${strokePaths.length}:`, path.getAttribute('id'));
              path.style.strokeDashoffset = '0';
            }, index * 800);
          });
          
          // Reset playing state after all animations complete
          const totalDuration = strokePaths.length * 800 + 800;
          animationTimeoutRef.current = setTimeout(() => {
            setPlaying(false);
          }, totalDuration);
        }
      }
    }
  };
  
  const resetAnimation = () => {
    setPlaying(false);
    
    // Clear any pending animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    if (svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (svgElement) {
        const strokePaths = getStrokePathsInOrder(svgElement);
        
        if (strokePaths.length === 0) {
          const allPaths = Array.from(svgElement.querySelectorAll('path'));
          allPaths.forEach(path => {
            path.style.opacity = '0';
            path.style.stroke = '#2c2c2c';
            path.style.strokeWidth = '2';
            path.style.fill = 'none';
            path.style.transition = 'opacity 0.8s ease-in-out';
          });
        } else {
          // Reset stroke paths to initial hidden state
          strokePaths.forEach(path => {
            const pathLength = path.getTotalLength();
            path.style.strokeDasharray = `${pathLength}`;
            path.style.strokeDashoffset = `${pathLength}`;
            path.style.stroke = '#2c2c2c';
            path.style.strokeWidth = '2';
            path.style.fill = 'none';
            path.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
          });
        }
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