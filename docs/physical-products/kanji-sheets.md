# JLPT Kanji Practice Sheets Generator

## Overview

Building on the successful implementation of the kana practice sheets, this documents the kanji practice sheet generator for all JLPT levels (N5-N1). Each sheet is dedicated to a single kanji character with extensive repetition practice grids, stroke order diagrams, and essential learning information - designed for intensive handwriting practice and memorization.

**Implementation Status:**
- ✅ N5 (~90 characters) - LIVE
- 🔄 N4 (~170 characters) - Coming Soon
- 🔄 N3 (~370 characters) - Coming Soon
- 🔄 N2 (~370 characters) - Coming Soon
- 🔄 N1 (~1000+ characters) - Coming Soon

## Goals

- Generate high-quality single-character practice sheets for all JLPT kanji levels
- Provide intensive repetition practice with large practice grids (80 practice squares per character)
- Include comprehensive character information: meaning, readings, and stroke count
- Display clear stroke order diagrams for proper writing technique from KanjiVG
- Enable guided practice (with stroke order in first column) and independent practice (empty grids)
- Integrate seamlessly with the existing Japanese learning platform
- Scalable architecture to easily add new JLPT levels

## Key Features

### 1. Single-Character Focus Design

Each practice sheet is dedicated to one N5 kanji character, following this layout structure:

#### Top Information Section
- **Large character display** - Bold, clear representation of the kanji
- **Stroke count indicator** - Visual count (e.g., "3 strokes") 
- **Character details panel** containing:
  - **Meaning**: English translation
  - **Onyomi**: Chinese reading with hiragana
  - **Kunyomi**: Japanese reading with hiragana  
  - **Vocabulary**: Common vocabulary examples using the character
  - **Reference note**: External stroke order verification link

#### Stroke Order Diagram Section
- **Complete stroke order diagram** - Full character with numbered stroke sequence
- **Mathematical context** (for number kanji) - e.g., "三 is the result of 一 + 二, 1 + 2 = 3"
- **Visual progression** - Clear stroke-by-stroke build-up

#### Practice Grid Section
- **Large practice grid** - 10 columns × 8 rows (80 practice squares)
- **First column guided practice** - Stroke order diagram in each square
- **Progressive fading** - Stroke order guides fade from column 1 to 3
- **Empty practice area** - Columns 4-10 for independent practice
- **Proper proportions** - Square grids sized for optimal character practice

### 2. JLPT Level Coverage

#### Multi-Level Architecture
- **Landing page** at `/free-resources/kanji-sheets` - Level selection hub
- **Level-specific pages** at `/free-resources/kanji-sheets/[level]-sheets`
- Individual sheet generation for any selected character
- Scalable structure for adding N4, N3, N2, N1

#### Current Implementation (N5)
- All ~90 N5 JLPT kanji characters
- Individual sheet generation via API route
- Print-to-PDF workflow for user-generated downloads

#### Single Standard Format
- **Complete information**: Kanji details, meanings, readings, stroke count
- **Stroke order diagram**: Clear visual guide from KanjiVG
- **Practice grid**: 80 squares (10×8) with guided practice in first column

## Technical Implementation

### On-Demand HTML Generation Architecture

**Core Strategy**: Following the proven kana-sheets pattern, generate HTML practice sheets on-demand via API route. Users print to PDF client-side.

**Benefits:**
- No build complexity or static file management
- No PDF generation libraries needed
- Zero server cost (HTML generation only)
- Users generate PDFs on-demand via browser print
- Can iterate quickly without rebuilds

### Data Structure

Uses existing JLPT kanji data structures from `/lib/constants/`:

```typescript
export interface KanjiData {
  kanji: string;      // The character
  onyomi: string;     // Chinese reading
  kunyomi: string;    // Japanese reading
  meaning: string;    // English meaning
}

// Stroke count extracted dynamically from KanjiVG SVG
// Unicode calculated via charCodeAt(0).toString(16)
```

### Application Architecture

```
app/
├── api/
│   └── kanji-sheets/
│       └── route.ts                    # Generates HTML for individual sheets
└── free-resources/
    └── kanji-sheets/
        ├── page.tsx                    # Landing page - level selection
        ├── n5-sheets/
        │   └── page.tsx                # N5 character grid
        ├── n4-sheets/
        │   └── page.tsx                # N4 character grid (future)
        ├── n3-sheets/
        │   └── page.tsx                # N3 character grid (future)
        ├── n4-sheets/
        │   └── page.tsx                # N2 character grid (future)
        └── n1-sheets/
            └── page.tsx                # N1 character grid (future)
```

### Frontend Interface

#### Landing Page (`/free-resources/kanji-sheets`)
- **Level selection cards** - N5, N4, N3, N2, N1
- Shows character counts and descriptions for each level
- "Available" badge for implemented levels (currently N5)
- "Coming Soon" for future levels
- Clean, scalable card-based layout

#### Level-Specific Pages (e.g., `/free-resources/kanji-sheets/n5-sheets`)
- **Character grid** - Interactive grid showing all kanji for that level
- Click any character opens its practice sheet in new tab
- Character info on hover: meaning and readings
- Print instructions and feature list

#### API Route (`/api/kanji-sheets?character=日`)
- Accepts character query parameter
- Fetches stroke order SVG from KanjiVG
- Extracts stroke count from SVG data
- Generates complete HTML with embedded CSS
- Returns HTML (user prints to PDF via browser)

```typescript
// Level-specific page example
import { N5_KANJI } from '@/lib/constants/n5-kanji';

export default function N5KanjiSheetsPage() {
  return (
    <div className="grid">
      {N5_KANJI.map((kanji) => (
        <a
          href={`/api/kanji-sheets?character=${encodeURIComponent(kanji.kanji)}`}
          target="_blank"
        >
          {kanji.kanji}
        </a>
      ))}
    </div>
  );
}
```

### Print Optimization

#### Single-Page Layout Design
- **A4 portrait orientation** optimized for standard printing
- **Fixed layout structure**:
  - Top 25%: Character info and stroke order diagram
  - Bottom 75%: 10×8 practice grid (80 squares)
- **High-contrast elements** for clear printing
- **Proper margins** ensuring no content cutoff

#### Grid Specifications
- **Square size**: 60px height for optimal handwriting practice
- **Grid lines**: 1px solid #333 for clear boundaries
- **Crosshair guides**: Center lines in each square using CSS pseudo-elements
- **Stroke order in first column**: Shows reference diagram at 30% opacity
- **Empty practice area**: Columns 2-10 with clean crosshair guides only

#### Print CSS Optimizations
```css
@page {
  size: A4 portrait;
  margin: 15mm;
}

.practice-grid {
  width: 100%;
  height: 600px; /* Fixed height for consistent layout */
  border-collapse: collapse;
}

.practice-square {
  width: 20mm;
  height: 20mm;
  border: 1px solid #ccc;
  position: relative;
}
```

## Integration Points

### Runtime Integration
- **Kanji datasets**: Use existing `/lib/constants/n*-kanji.ts` data for all levels
- **KanjiVG stroke order**: Fetch SVG data on-demand via API route
- **Stroke order service**: Reuse existing `strokeOrderService` from kanji detail pages
- **HTML generation**: Server-side rendering in API route
- **No build process**: Pure runtime generation, no static files needed

### Cross-Feature Links
- **Character pages**: Can link to practice sheets from detail pages (e.g., `/kanji/三` → `/api/kanji-sheets?character=三`)
- **Free resources hub**: Landing page accessible from main navigation
- **Progress tracking**: Could integrate with existing localStorage learning progress

### Performance
- **Caching**: HTML responses cached by browser/CDN
- **KanjiVG CDN**: External SVG fetching from jsDelivr
- **Zero build overhead**: No static file generation needed

## User Experience Flow

### Simple Discovery Path
1. **Main site → Free Resources → Kanji Practice Sheets** (landing page)
2. **Select JLPT level** - Choose from N5, N4, N3, N2, or N1 cards
3. **Browse character grid** - Visual overview of all characters for that level
4. **Click character** → Opens HTML practice sheet in new tab
5. **Print to PDF** - Ctrl+P / Cmd+P → Save as PDF

### Focused Practice Workflow
1. **Open practice sheet** - Character info, stroke order, and grid displayed
2. **Study character information** - Review meaning, readings, and stroke count
3. **Reference stroke order** - Check diagram and first column guides
4. **Practice writing** - Fill 80 squares with repeated writing
5. **Multiple sheets** - Print same character multiple times for spaced repetition

### Teacher/Student Usage
1. **Assign specific characters** - Share direct links to practice sheets
2. **Progressive learning** - Start with N5, advance through levels
3. **Homework assignments** - Students print their own practice sheets
4. **Assessment preparation** - Practice writing before tests

## Success Metrics

- **Download volume**: Individual sheet downloads per character
- **N5 coverage**: Practice across all N5 kanji characters
- **Print success**: PDF generation and download completion rates
- **User retention**: Return visits for additional character sheets
- **Quality feedback**: Print clarity and layout usability ratings

## Technical Challenges & Solutions

### Single-Character Layout Optimization
**Challenge**: Fitting comprehensive character info + large practice grid on one A4 page
**Solution**: Fixed proportional layout (25% info, 75% grid) with optimized typography and spacing

### Practice Grid Design
**Challenge**: Creating 80 practice squares with proper proportions and stroke order guides
**Solution**: 60px height squares in 10×8 grid with crosshair guides and stroke order in first column only

### Multi-Level Data Management
**Challenge**: Supporting all JLPT levels (~2000+ total characters)
**Solution**: Simple API route that works with any level's data structure, on-demand generation only

### Print Consistency
**Challenge**: Ensuring consistent layout across different printers and browsers
**Solution**: Fixed CSS dimensions, print-specific media queries, and A4 page optimization

### Stroke Order Integration
**Challenge**: Embedding KanjiVG stroke order diagrams in practice grid squares
**Solution**: SVG cleaning pipeline with responsive sizing for small grid squares

## Implementation Status

### ✅ Phase 1: N5 Implementation (COMPLETE)
- Created API route `/app/api/kanji-sheets/route.ts`
- HTML generation with embedded CSS for A4 printing
- Stroke order fetching from KanjiVG
- Automatic stroke count extraction
- Landing page with level selection
- N5 character grid page
- Full print-to-PDF workflow

### 🔄 Phase 2: Additional Levels (Future)
To add N4, N3, N2, or N1:
1. Create `/app/free-resources/kanji-sheets/n*-sheets/page.tsx`
2. Import appropriate level data (e.g., `N4_KANJI`)
3. Update landing page: set `available: true` for that level
4. No API changes needed - already supports all characters

### 🔄 Phase 3: Enhancements (Optional)
- Bulk zip downloads for entire levels
- Custom character selection
- Additional sheet formats
- Vocabulary examples integration

## Success Criteria

1. **Functional**: ✅ Generate printable practice sheets for all ~90 N5 kanji characters
2. **Quality**: ✅ Print-ready single-page layouts with clear character info and 80-square practice grids
3. **Performance**: ✅ On-demand HTML generation, users print to PDF client-side
4. **Usability**: ✅ Two-click workflow (select character → print to PDF)
5. **Integration**: ✅ Uses existing kanji datasets and KanjiVG integration
6. **Scalability**: ✅ Architecture ready for N4-N1 implementation
7. **Adoption**: Track individual sheet opens and print usage

## Lessons Learned from Kana Sheets

### What Worked Well
- ✅ **Web-based approach**: More flexible than Python PDF generation
- ✅ **KanjiVG integration**: Excellent stroke order data source
- ✅ **HTML/CSS print**: Better than programmatic PDF creation
- ✅ **Simple interface**: Users prefer straightforward options over complexity
- ✅ **On-demand generation**: No build complexity, instant updates

### Applied to Kanji Sheets
- ✅ **Same architecture**: Reused kana-sheets API pattern exactly
- ✅ **Print workflow**: Users print HTML to PDF via browser
- ✅ **No static files**: Eliminated build process entirely
- ✅ **User guidance**: Clear print-to-PDF instructions
- ✅ **Responsive design**: Works on all devices and browsers

### Key Improvements
- ✅ **Multi-level scalability**: Landing page + level-specific routes
- ✅ **Automatic stroke count**: Extracted from KanjiVG SVG data
- ✅ **Crosshair guides**: CSS pseudo-elements for practice grid
- ✅ **First column guidance**: Stroke order reference at 30% opacity

## Resources Used

### Development (N5 Implementation)
- ✅ API route: `/app/api/kanji-sheets/route.ts` - 200 lines
- ✅ Landing page: `/app/free-resources/kanji-sheets/page.tsx` - 215 lines
- ✅ N5 page: `/app/free-resources/kanji-sheets/n5-sheets/page.tsx` - 145 lines
- ✅ Total: ~560 lines of code, simple and maintainable

### Data Sources
- ✅ Existing JLPT kanji datasets from `/lib/constants/n*-kanji.ts`
- ✅ KanjiVG stroke order data via existing CDN integration
- ✅ Stroke count extracted dynamically from SVG
- ⏳ Vocabulary examples - optional future enhancement

### Infrastructure
- ✅ Next.js API routes (already available)
- ✅ KanjiVG CDN (already integrated)
- ✅ No additional infrastructure needed

## Risk Mitigation

### Data Quality
- ✅ Fallback rendering for missing stroke orders (returns null, displays without diagram)
- ✅ SVG cleaning handles malformed data gracefully
- ⏳ User reporting mechanism for data issues (future)

### Performance
- ✅ On-demand generation - no pagination needed for grids
- ✅ KanjiVG CDN handles stroke order caching
- ✅ Browser-side PDF generation eliminates server load
- ✅ Simple HTML responses are fast and cacheable

### User Experience
- ✅ Print testing across browsers (Chrome, Safari, Firefox)
- ✅ Clear print-to-PDF instructions on every page
- ✅ Responsive design works on desktop and mobile
- ✅ Tooltips show character meaning and readings

## Summary

This implementation successfully delivers kanji practice sheets using the simple, proven kana-sheets pattern. The architecture is:

- **Simple**: 560 lines of code, no build complexity
- **Scalable**: Ready for N4-N1 with minimal work
- **Performant**: On-demand HTML generation, zero server cost
- **Maintainable**: Follows existing patterns, easy to extend

N5 is complete and live. Adding additional JLPT levels requires only creating new page files - the API route already supports all characters.