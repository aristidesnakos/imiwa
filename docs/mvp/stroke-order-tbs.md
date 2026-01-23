# Stroke Order Animation Troubleshooting

## Problem Statement

The kanji stroke order animation in `StrokeOrderViewer.tsx` is not working as expected:

- **Expected**: Strokes should be painted/drawn one by one in traditional writing order when Play button is clicked
- **Actual**: All strokes appear simultaneously instead of sequentially
- **Component**: `/components/StrokeOrderViewer.tsx`
- **Data Source**: KanjiVG SVG files via `/api/kanji-svg/[hex]/route.ts`

## What We've Tried

### 1. CSS Stroke Drawing Animation (Initial Approach)
- **Method**: Used `stroke-dasharray` and `stroke-dashoffset` to progressively draw SVG paths
- **Implementation**: Set `strokeDashoffset = pathLength` (hidden), then animate to `0` (visible)
- **Issues**: 
  - Animation ran in reverse (strokes appeared then disappeared)
  - All strokes animated simultaneously despite setTimeout delays
  - CSS transitions seemed to be ignored or overridden

### 2. KanjivgAnimate Library Integration
- **Method**: Attempted to use external library `kanjivganimate`
- **Implementation**: Tried to integrate library for proper stroke order animation
- **Issues**: 
  - API mismatch - library expected CSS selector string, received DOM element
  - Error: `Failed to execute 'querySelectorAll' on 'Document'`
  - Abandoned due to integration complexity

### 3. Complex Stroke Detection & Sorting
- **Method**: Attempted to parse KanjiVG stroke IDs (s1, s2, s3) and sort paths by proper order
- **Implementation**: Complex path detection logic with stroke ordering
- **Issues**: 
  - Over-engineered solution
  - Still had fundamental timing issues
  - User feedback: stroke order still didn't make sense

### 4. Opacity-Based Sequential Animation (Current)
- **Method**: Simplified approach using `opacity: 0/1` to hide/show strokes
- **Implementation**: 
  ```javascript
  // Hide all paths
  paths.forEach(path => path.style.opacity = '0');
  
  // Show each path with delay
  paths.forEach((path, index) => {
    setTimeout(() => {
      path.style.opacity = '1';
    }, index * 1000);
  });
  ```
- **Issues**: 
  - Console logs show correct timing and scheduling
  - Visually all strokes still appear simultaneously
  - CSS transitions may not be working

### 5. Various Timing Adjustments
- **Attempted delays**: 600ms → 800ms → 1500ms → 1000ms
- **Transition durations**: 0.8s → 1.2s → 0.3s
- **Result**: No improvement in sequential behavior

### 6. Cache Clearing & Dev Server Restarts
- **Method**: Hard refresh, dev server restart, removed cached JavaScript
- **Result**: Confirmed latest code is running, but problem persists

## Current Code State

**File**: `/components/StrokeOrderViewer.tsx`

**Key Functions**:
- `initializePaths()`: Sets initial styles (opacity: 0, transitions)
- `toggleAnimation()`: Hides all paths, then shows them sequentially with setTimeout
- `resetAnimation()`: Hides all paths again

**Console Output** (shows timing is working):
```
Found 6 paths for opacity animation
Hiding path 0
Hiding path 1
...
Scheduling path 0 to show after 0ms
Scheduling path 1 to show after 1000ms
...
Showing path 0 now
Showing path 1 now
```

## Root Cause Analysis

The timing logic appears correct based on console logs, suggesting the issue is likely:

1. **CSS Specificity Problem**: Existing SVG styles may override our opacity changes
2. **CSS Transition Conflicts**: SVG may have conflicting transition properties
3. **Browser Rendering**: Opacity changes may not trigger visual updates on SVG paths
4. **DOM Structure**: SVG paths may not be separate animatable elements as expected

## Potential Solutions

### Option 1: Force DOM Reflow
```javascript
path.style.opacity = '0';
path.offsetHeight; // Force reflow
path.style.opacity = '1';
```

### Option 2: Use Different CSS Properties
- Try `visibility: hidden/visible` instead of opacity
- Try `display: none/block`
- Try `stroke-width: 0` to `stroke-width: 2`

### Option 3: Remove All CSS Transitions
```javascript
path.style.transition = 'none';
path.style.opacity = '0';
// Force immediate change without transition
```

### Option 4: Direct SVG Manipulation
- Clone and replace SVG elements instead of styling
- Manually build SVG with incrementally added paths
- Use SVG `<use>` elements with sequential reveals

### Option 5: CSS-in-JS Animation Library
- Use Framer Motion or similar for reliable animations
- Ensures proper timing and CSS application

## Recommended Next Steps

1. **Inspect Element**: Check if opacity styles are actually being applied in DevTools
2. **Test Simplest Case**: Try hiding/showing just one path manually
3. **CSS Override Check**: Ensure no existing styles conflict with our opacity changes
4. **Try Alternative Properties**: Test with `visibility` or `stroke-width` instead of opacity
5. **Consider Library Solution**: If manual approach continues to fail, consider animation library

## Technical Context

- **Framework**: Next.js 15 with React
- **SVG Source**: KanjiVG project (XML-based stroke order data)
- **Browser**: Need to test cross-browser compatibility
- **Performance**: Simple opacity changes should be performant