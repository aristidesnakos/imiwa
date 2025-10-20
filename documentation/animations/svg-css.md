# SVG CSS Animation Guide

## Overview

This document covers best practices for animating SVG elements with CSS, based on the successful implementation of kanji stroke order animations in the StrokeOrderViewer component.

## Working Solution: CSS Stroke Animation

### The Problem We Solved

**Issue**: Kanji stroke order animations needed to show individual strokes appearing sequentially in traditional writing order.

**Failed Approaches**:
1. **Opacity/visibility with setTimeout** - Browser DOM batching caused all strokes to appear simultaneously
2. **requestAnimationFrame loops** - Complex timing management with inconsistent results  
3. **stroke-width manipulation** - Still suffered from timing issues
4. **nth-child selectors** - Wrong stroke order (DOM order ≠ writing order)

### The Working Solution

**Method**: CSS animations with `stroke-dasharray` and `stroke-dashoffset` combined with KanjiVG stroke IDs.

#### Key Components

**1. SVG Preparation**
```css
.stroke-animation path {
  stroke-dasharray: 1000;        /* Large dash covers entire stroke */
  stroke-dashoffset: 1000;       /* Initially hidden (offset = length) */
  transition: stroke-dashoffset 0.1s ease;
  stroke: #2c2c2c;
  stroke-width: 2;
  fill: none;
}
```

**2. Animation Trigger**
```css
.stroke-animation.animate path {
  animation: draw-stroke 0.8s ease-in-out forwards;
}

@keyframes draw-stroke {
  to {
    stroke-dashoffset: 0;        /* Animate to fully visible */
  }
}
```

**3. Stroke Order Sequencing**
```css
/* Use KanjiVG stroke IDs for proper order */
.stroke-animation.animate path[id$="s1"] { animation-delay: 0s; }
.stroke-animation.animate path[id$="s2"] { animation-delay: 0.8s; }
.stroke-animation.animate path[id$="s3"] { animation-delay: 1.6s; }
/* ... continue for s4, s5, etc. */
```

**4. JavaScript Control**
```javascript
const toggleAnimation = () => {
  const element = document.querySelector(`#stroke-${kanji.charCodeAt(0)}`);
  if (element) {
    element.classList.remove('animate');
    setTimeout(() => element.classList.add('animate'), 10);
  }
};
```

## Why This Works

### 1. **Reliable CSS Timing**
- CSS animation delays are handled by the browser's animation engine
- No JavaScript timing conflicts or DOM batching issues
- Consistent cross-browser behavior

### 2. **Stroke-Dash Drawing Effect**
- `stroke-dasharray: 1000` creates a dash pattern that covers the entire stroke
- `stroke-dashoffset: 1000` initially hides the stroke by offsetting the dash
- Animating `stroke-dashoffset` to `0` reveals the stroke progressively
- Creates natural "drawing" appearance

### 3. **Proper Stroke Order**
- KanjiVG SVGs include stroke order in path IDs (`s1`, `s2`, `s3`, etc.)
- CSS attribute selectors `path[id$="s1"]` target strokes by writing order
- Avoids `nth-child` issues where DOM order ≠ stroke order

### 4. **Simple State Management**
- Animation controlled by single CSS class toggle
- No complex JavaScript state or timers to manage
- Easy to pause, reset, and restart

## Implementation Checklist

When implementing SVG stroke animations:

- [ ] **Set up stroke-dash properties** (`stroke-dasharray`, `stroke-dashoffset`)
- [ ] **Create draw animation** with CSS `@keyframes`
- [ ] **Use semantic selectors** for stroke order (IDs, not `nth-child`)
- [ ] **Test timing delays** for smooth sequential appearance
- [ ] **Add class toggle control** for start/stop functionality
- [ ] **Include reset mechanism** to remove animation class

## Common Pitfalls to Avoid

### ❌ Don't Use nth-child for Stroke Order
```css
/* WRONG - DOM order ≠ stroke order */
.animate path:nth-child(1) { animation-delay: 0s; }
.animate path:nth-child(2) { animation-delay: 0.8s; }
```

### ❌ Don't Rely on JavaScript Timing
```javascript
// WRONG - Browser batching causes issues
paths.forEach((path, index) => {
  setTimeout(() => {
    path.style.opacity = '1';
  }, index * 800);
});
```

### ❌ Don't Use Complex Animation Loops
```javascript
// WRONG - Unnecessary complexity
const animateFrame = (timestamp) => {
  // Complex timing calculations...
  requestAnimationFrame(animateFrame);
};
```

## Best Practices

1. **Use CSS for timing** - Let the browser handle animation scheduling
2. **Leverage SVG semantics** - Use meaningful IDs for stroke order
3. **Keep JavaScript simple** - Only toggle classes, don't manage timing
4. **Test cross-browser** - CSS animations have good support
5. **Provide fallbacks** - Ensure SVG displays even without animation

## Related Files

- `/components/StrokeOrderViewer.tsx` - React component implementation
- `/app/globals.css` - CSS animation definitions
- `/lib/stroke-order.ts` - SVG loading service

## Performance Notes

- CSS animations are GPU-accelerated when possible
- `stroke-dashoffset` animation is performant for SVG paths
- No JavaScript timer overhead
- Scales well with multiple simultaneous animations

---

*Last updated: October 2024*
*Implementation: StrokeOrderViewer component*