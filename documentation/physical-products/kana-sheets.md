# Kana Practice Sheet Generator - Build Instructions

## Overview

This document provides step-by-step instructions to create a Python tool that generates printable kana practice sheets (4 PDFs total):
1. **Empty Hiragana Grid** - blank practice sheet with grid lines
2. **Empty Katakana Grid** - blank practice sheet with grid lines  
3. **Filled Hiragana Grid** - shows stroke order for each character
4. **Filled Katakana Grid** - shows stroke order for each character

## Prerequisites

### Required Software
- Python 3.9+
- Git

### Required Python Packages
```bash
pip install reportlab cairosvg svglib pillow requests
```

### Data Source
Clone the animCJK repository for stroke order SVGs:
```bash
git clone https://github.com/parsimonhi/animCJK.git
```

The kana SVGs are in `animCJK/svgsJaKana/` named by unicode decimal (e.g., `12354.svg` for あ).

---

## Project Structure

```
kana-practice-sheets/
├── animCJK/                 # Cloned repo (stroke order data)
├── generate_sheets.py       # Main script
├── kana_data.py            # Kana unicode mappings
├── output/                  # Generated PDFs
│   ├── hiragana_empty.pdf
│   ├── hiragana_filled.pdf
│   ├── katakana_empty.pdf
│   └── katakana_filled.pdf
└── README.md
```

---

## Step 1: Create Kana Data Mapping

Create `kana_data.py` with the complete kana grid structure:

```python
"""
Kana unicode mappings organized by consonant rows (gojūon order).
Each row contains: (romaji, character, unicode_decimal)
Empty cells use None.
"""

# Grid structure: rows are consonants, columns are vowels (A, I, U, E, O)
VOWELS = ['a', 'i', 'u', 'e', 'o']
CONSONANTS = ['', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'n_final']

# Hiragana mapping: (char, unicode_decimal)
HIRAGANA = {
    # Vowels (no consonant)
    ('', 'a'): ('あ', 12354),
    ('', 'i'): ('い', 12356),
    ('', 'u'): ('う', 12358),
    ('', 'e'): ('え', 12360),
    ('', 'o'): ('お', 12362),
    
    # K-row
    ('k', 'a'): ('か', 12363),
    ('k', 'i'): ('き', 12365),
    ('k', 'u'): ('く', 12367),
    ('k', 'e'): ('け', 12369),
    ('k', 'o'): ('こ', 12371),
    
    # S-row
    ('s', 'a'): ('さ', 12373),
    ('s', 'i'): ('し', 12375),  # shi
    ('s', 'u'): ('す', 12377),
    ('s', 'e'): ('せ', 12379),
    ('s', 'o'): ('そ', 12381),
    
    # T-row
    ('t', 'a'): ('た', 12383),
    ('t', 'i'): ('ち', 12385),  # chi
    ('t', 'u'): ('つ', 12388),  # tsu
    ('t', 'e'): ('て', 12390),
    ('t', 'o'): ('と', 12392),
    
    # N-row
    ('n', 'a'): ('な', 12394),
    ('n', 'i'): ('に', 12395),
    ('n', 'u'): ('ぬ', 12396),
    ('n', 'e'): ('ね', 12397),
    ('n', 'o'): ('の', 12398),
    
    # H-row
    ('h', 'a'): ('は', 12399),
    ('h', 'i'): ('ひ', 12402),
    ('h', 'u'): ('ふ', 12405),  # fu
    ('h', 'e'): ('へ', 12408),
    ('h', 'o'): ('ほ', 12411),
    
    # M-row
    ('m', 'a'): ('ま', 12414),
    ('m', 'i'): ('み', 12417),
    ('m', 'u'): ('む', 12416),
    ('m', 'e'): ('め', 12417),
    ('m', 'o'): ('も', 12418),
    
    # Y-row (only 3 characters)
    ('y', 'a'): ('や', 12420),
    ('y', 'i'): None,  # doesn't exist
    ('y', 'u'): ('ゆ', 12422),
    ('y', 'e'): None,  # doesn't exist
    ('y', 'o'): ('よ', 12424),
    
    # R-row
    ('r', 'a'): ('ら', 12425),
    ('r', 'i'): ('り', 12426),
    ('r', 'u'): ('る', 12427),
    ('r', 'e'): ('れ', 12428),
    ('r', 'o'): ('ろ', 12429),
    
    # W-row (only 2 main characters + archaic)
    ('w', 'a'): ('わ', 12431),
    ('w', 'i'): None,  # archaic ゐ (12432) - optional
    ('w', 'u'): None,  # doesn't exist
    ('w', 'e'): None,  # archaic ゑ (12433) - optional
    ('w', 'o'): ('を', 12434),
    
    # Final N
    ('n_final', 'a'): ('ん', 12435),
    ('n_final', 'i'): None,
    ('n_final', 'u'): None,
    ('n_final', 'e'): None,
    ('n_final', 'o'): None,
}

# Katakana mapping: (char, unicode_decimal)
KATAKANA = {
    # Vowels
    ('', 'a'): ('ア', 12450),
    ('', 'i'): ('イ', 12452),
    ('', 'u'): ('ウ', 12454),
    ('', 'e'): ('エ', 12456),
    ('', 'o'): ('オ', 12458),
    
    # K-row
    ('k', 'a'): ('カ', 12459),
    ('k', 'i'): ('キ', 12461),
    ('k', 'u'): ('ク', 12463),
    ('k', 'e'): ('ケ', 12465),
    ('k', 'o'): ('コ', 12467),
    
    # S-row
    ('s', 'a'): ('サ', 12469),
    ('s', 'i'): ('シ', 12471),
    ('s', 'u'): ('ス', 12473),
    ('s', 'e'): ('セ', 12475),
    ('s', 'o'): ('ソ', 12477),
    
    # T-row
    ('t', 'a'): ('タ', 12479),
    ('t', 'i'): ('チ', 12481),
    ('t', 'u'): ('ツ', 12484),
    ('t', 'e'): ('テ', 12486),
    ('t', 'o'): ('ト', 12488),
    
    # N-row
    ('n', 'a'): ('ナ', 12490),
    ('n', 'i'): ('ニ', 12491),
    ('n', 'u'): ('ヌ', 12492),
    ('n', 'e'): ('ネ', 12493),
    ('n', 'o'): ('ノ', 12494),
    
    # H-row
    ('h', 'a'): ('ハ', 12495),
    ('h', 'i'): ('ヒ', 12498),
    ('h', 'u'): ('フ', 12501),
    ('h', 'e'): ('ヘ', 12504),
    ('h', 'o'): ('ホ', 12507),
    
    # M-row
    ('m', 'a'): ('マ', 12510),
    ('m', 'i'): ('ミ', 12511),
    ('m', 'u'): ('ム', 12512),
    ('m', 'e'): ('メ', 12513),
    ('m', 'o'): ('モ', 12514),
    
    # Y-row
    ('y', 'a'): ('ヤ', 12516),
    ('y', 'i'): None,
    ('y', 'u'): ('ユ', 12518),
    ('y', 'e'): None,
    ('y', 'o'): ('ヨ', 12520),
    
    # R-row
    ('r', 'a'): ('ラ', 12521),
    ('r', 'i'): ('リ', 12522),
    ('r', 'u'): ('ル', 12523),
    ('r', 'e'): ('レ', 12524),
    ('r', 'o'): ('ロ', 12525),
    
    # W-row
    ('w', 'a'): ('ワ', 12527),
    ('w', 'i'): None,
    ('w', 'u'): None,
    ('w', 'e'): None,
    ('w', 'o'): ('ヲ', 12530),
    
    # Final N
    ('n_final', 'a'): ('ン', 12531),
    ('n_final', 'i'): None,
    ('n_final', 'u'): None,
    ('n_final', 'e'): None,
    ('n_final', 'o'): None,
}

# Row labels for the grid
ROW_LABELS = {
    '': '',      # vowel row (no consonant label)
    'k': 'K',
    's': 'S',
    't': 'T',
    'n': 'N',
    'h': 'H',
    'm': 'M',
    'y': 'Y',
    'r': 'R',
    'w': 'W',
    'n_final': 'N',  # final n
}

def get_grid_order():
    """Return consonants and vowels in display order."""
    return CONSONANTS, VOWELS
```

---

## Step 2: Create Main Generator Script

Create `generate_sheets.py`:

```python
#!/usr/bin/env python3
"""
Kana Practice Sheet Generator

Generates 4 PDF practice sheets:
- Empty hiragana grid
- Empty katakana grid  
- Filled hiragana grid (with stroke order)
- Filled katakana grid (with stroke order)
"""

import os
from pathlib import Path
from io import BytesIO

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, gray, lightgrey, Color

# For SVG rendering
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPDF

from kana_data import HIRAGANA, KATAKANA, CONSONANTS, VOWELS, ROW_LABELS


# Configuration
CONFIG = {
    'page_size': letter,  # or A4
    'margin_top': 0.75 * inch,
    'margin_bottom': 0.5 * inch,
    'margin_left': 0.75 * inch,
    'margin_right': 0.5 * inch,
    'header_height': 0.4 * inch,
    'row_label_width': 0.4 * inch,
    'col_label_height': 0.35 * inch,
    'grid_line_color': lightgrey,
    'grid_line_width': 0.5,
    'cell_guide_color': Color(0.9, 0.9, 0.9),  # very light gray for cross guides
    'animcjk_path': './animCJK/svgsJaKana',
}


def get_svg_path(unicode_decimal: int) -> Path:
    """Get path to SVG file for a character."""
    return Path(CONFIG['animcjk_path']) / f"{unicode_decimal}.svg"


def calculate_grid_dimensions(c: canvas.Canvas) -> dict:
    """Calculate grid cell dimensions based on page size."""
    page_width, page_height = CONFIG['page_size']
    
    # Available space
    available_width = page_width - CONFIG['margin_left'] - CONFIG['margin_right'] - CONFIG['row_label_width']
    available_height = page_height - CONFIG['margin_top'] - CONFIG['margin_bottom'] - CONFIG['header_height'] - CONFIG['col_label_height']
    
    # Grid is 5 columns (vowels) x 11 rows (consonant groups including final n)
    num_cols = 5
    num_rows = 11
    
    cell_width = available_width / num_cols
    cell_height = available_height / num_rows
    
    # Use square cells (take the smaller dimension)
    cell_size = min(cell_width, cell_height)
    
    return {
        'cell_size': cell_size,
        'num_cols': num_cols,
        'num_rows': num_rows,
        'grid_left': CONFIG['margin_left'] + CONFIG['row_label_width'],
        'grid_top': page_height - CONFIG['margin_top'] - CONFIG['header_height'] - CONFIG['col_label_height'],
        'grid_width': cell_size * num_cols,
        'grid_height': cell_size * num_rows,
    }


def draw_header(c: canvas.Canvas, title: str, subtitle: str = ""):
    """Draw page header."""
    page_width, page_height = CONFIG['page_size']
    
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(page_width / 2, page_height - CONFIG['margin_top'], title)
    
    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawCentredString(page_width / 2, page_height - CONFIG['margin_top'] - 20, subtitle)


def draw_column_labels(c: canvas.Canvas, dims: dict):
    """Draw A I U E O column headers."""
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(black)
    
    for i, vowel in enumerate(VOWELS):
        x = dims['grid_left'] + (i + 0.5) * dims['cell_size']
        y = dims['grid_top'] + 10
        c.drawCentredString(x, y, vowel.upper())


def draw_row_labels(c: canvas.Canvas, dims: dict):
    """Draw consonant row labels."""
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(black)
    
    for i, consonant in enumerate(CONSONANTS):
        label = ROW_LABELS.get(consonant, consonant.upper())
        x = CONFIG['margin_left'] + CONFIG['row_label_width'] / 2
        y = dims['grid_top'] - (i + 0.5) * dims['cell_size'] - 5
        c.drawCentredString(x, y, label)


def draw_cell_guides(c: canvas.Canvas, x: float, y: float, size: float):
    """Draw light cross guidelines inside a cell (like practice paper)."""
    c.setStrokeColor(CONFIG['cell_guide_color'])
    c.setLineWidth(0.25)
    
    # Vertical center line
    c.line(x + size/2, y, x + size/2, y + size)
    
    # Horizontal center line
    c.line(x, y + size/2, x + size, y + size/2)


def draw_grid(c: canvas.Canvas, dims: dict, draw_guides: bool = True):
    """Draw the practice grid."""
    c.setStrokeColor(CONFIG['grid_line_color'])
    c.setLineWidth(CONFIG['grid_line_width'])
    
    # Draw cells with guides
    for row in range(dims['num_rows']):
        for col in range(dims['num_cols']):
            x = dims['grid_left'] + col * dims['cell_size']
            y = dims['grid_top'] - (row + 1) * dims['cell_size']
            
            # Draw cell rectangle
            c.rect(x, y, dims['cell_size'], dims['cell_size'])
            
            # Draw internal guides
            if draw_guides:
                draw_cell_guides(c, x, y, dims['cell_size'])


def render_svg_to_cell(c: canvas.Canvas, svg_path: Path, x: float, y: float, size: float):
    """Render an SVG file into a grid cell."""
    if not svg_path.exists():
        print(f"  Warning: SVG not found: {svg_path}")
        return False
    
    try:
        # Load SVG
        drawing = svg2rlg(str(svg_path))
        if drawing is None:
            print(f"  Warning: Could not parse SVG: {svg_path}")
            return False
        
        # Scale to fit cell with padding
        padding = size * 0.1
        target_size = size - 2 * padding
        
        # Calculate scale factor
        scale_x = target_size / drawing.width if drawing.width else 1
        scale_y = target_size / drawing.height if drawing.height else 1
        scale = min(scale_x, scale_y)
        
        # Apply scaling
        drawing.width = drawing.width * scale
        drawing.height = drawing.height * scale
        drawing.scale(scale, scale)
        
        # Center in cell
        offset_x = x + (size - drawing.width) / 2
        offset_y = y + (size - drawing.height) / 2
        
        # Render
        renderPDF.draw(drawing, c, offset_x, offset_y)
        return True
        
    except Exception as e:
        print(f"  Warning: Error rendering {svg_path}: {e}")
        return False


def draw_kana_characters(c: canvas.Canvas, dims: dict, kana_map: dict):
    """Draw all kana characters in their grid positions."""
    for row_idx, consonant in enumerate(CONSONANTS):
        for col_idx, vowel in enumerate(VOWELS):
            key = (consonant, vowel)
            entry = kana_map.get(key)
            
            if entry is None:
                continue
                
            char, unicode_dec = entry
            svg_path = get_svg_path(unicode_dec)
            
            # Calculate cell position
            x = dims['grid_left'] + col_idx * dims['cell_size']
            y = dims['grid_top'] - (row_idx + 1) * dims['cell_size']
            
            render_svg_to_cell(c, svg_path, x, y, dims['cell_size'])


def create_empty_sheet(output_path: str, title: str, kana_type: str):
    """Create an empty practice sheet."""
    c = canvas.Canvas(output_path, pagesize=CONFIG['page_size'])
    dims = calculate_grid_dimensions(c)
    
    draw_header(c, title, "Practice Sheet")
    draw_column_labels(c, dims)
    draw_row_labels(c, dims)
    draw_grid(c, dims, draw_guides=True)
    
    c.save()
    print(f"Created: {output_path}")


def create_filled_sheet(output_path: str, title: str, kana_map: dict):
    """Create a filled practice sheet with stroke order characters."""
    c = canvas.Canvas(output_path, pagesize=CONFIG['page_size'])
    dims = calculate_grid_dimensions(c)
    
    draw_header(c, title, "Stroke Order Reference")
    draw_column_labels(c, dims)
    draw_row_labels(c, dims)
    draw_grid(c, dims, draw_guides=False)
    draw_kana_characters(c, dims, kana_map)
    
    c.save()
    print(f"Created: {output_path}")


def main():
    """Generate all four practice sheets."""
    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Verify animCJK data exists
    svg_dir = Path(CONFIG['animcjk_path'])
    if not svg_dir.exists():
        print(f"Error: animCJK SVG directory not found at {svg_dir}")
        print("Please clone the repository first:")
        print("  git clone https://github.com/parsimonhi/animCJK.git")
        return
    
    print("Generating kana practice sheets...")
    print()
    
    # Generate empty sheets
    print("Creating empty sheets...")
    create_empty_sheet(
        str(output_dir / "hiragana_empty.pdf"),
        "Hiragana ひらがな",
        "hiragana"
    )
    create_empty_sheet(
        str(output_dir / "katakana_empty.pdf"),
        "Katakana カタカナ",
        "katakana"
    )
    
    # Generate filled sheets
    print("\nCreating filled sheets with stroke order...")
    create_filled_sheet(
        str(output_dir / "hiragana_filled.pdf"),
        "Hiragana ひらがな",
        HIRAGANA
    )
    create_filled_sheet(
        str(output_dir / "katakana_filled.pdf"),
        "Katakana カタカナ",
        KATAKANA
    )
    
    print("\nDone! PDFs saved to ./output/")


if __name__ == "__main__":
    main()
```

---

## Step 3: Fix Unicode Mappings

The `kana_data.py` above has a few typos. Here are the corrected hiragana M-row values:

```python
# M-row (corrected)
('m', 'a'): ('ま', 12414),
('m', 'i'): ('み', 12415),  # Fixed: was 12417
('m', 'u'): ('む', 12416),
('m', 'e'): ('め', 12417),
('m', 'o'): ('も', 12418),
```

---

## Step 4: Running the Generator

```bash
# 1. Clone animCJK if not already done
git clone https://github.com/parsimonhi/animCJK.git

# 2. Install dependencies
pip install reportlab svglib pillow

# 3. Run the generator
python generate_sheets.py
```

Output:
```
Generating kana practice sheets...

Creating empty sheets...
Created: output/hiragana_empty.pdf
Created: output/katakana_empty.pdf

Creating filled sheets with stroke order...
Created: output/hiragana_filled.pdf
Created: output/katakana_filled.pdf

Done! PDFs saved to ./output/
```

---

## Step 5: Canva Integration

### Option A: Direct Import
1. Upload PDFs to Canva
2. Use as page backgrounds
3. Add your branding, titles, decorative elements

### Option B: Convert to Images First
```bash
# Install poppler-utils for pdftoppm
sudo apt-get install poppler-utils

# Convert PDF pages to high-res PNG
pdftoppm -png -r 300 output/hiragana_filled.pdf hiragana_filled
```

Then upload the PNG to Canva for more flexibility.

### Option C: Export as SVG (for vector editing)
Modify the script to output SVG instead of PDF:
```python
from reportlab.graphics import renderSVG
# Replace renderPDF calls with renderSVG
```

---

## Customization Options

### Change Page Size
```python
CONFIG['page_size'] = A4  # or letter
```

### Adjust Cell Appearance
```python
CONFIG['cell_guide_color'] = Color(0.85, 0.85, 0.85)  # darker guides
CONFIG['grid_line_width'] = 1.0  # thicker grid lines
```

### Add Romaji Labels
Modify `draw_kana_characters()` to add small romaji text below each character:
```python
c.setFont("Helvetica", 6)
c.drawCentredString(x + size/2, y + 5, romaji)
```

### Include Dakuten/Handakuten Variations
Extend the kana maps to include:
- が (12364), ぎ (12366), etc. for voiced consonants
- ぱ (12401), ぴ (12404), etc. for p-sounds

---

## Troubleshooting

### SVG Not Rendering
- Ensure `svglib` is installed: `pip install svglib`
- Check animCJK path in CONFIG
- Some SVGs have complex CSS animations; svglib renders static version

### Missing Characters
- animCJK's svgsJaKana contains 177 characters including all basic kana
- Archaic characters (ゐ, ゑ) are available if needed

### Font Issues
- reportlab uses standard fonts by default
- For Japanese title text, register a Japanese font:
```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('NotoSansJP', 'NotoSansJP-Regular.ttf'))
```

---

## Alternative: HTML/Browser-Based Generation

If Python SVG rendering is problematic, use a browser-based approach:

1. Create an HTML page that loads the SVGs
2. Use CSS Grid for layout
3. Use `html2pdf.js` or browser print-to-PDF
4. Screenshot with Puppeteer for high-res images

This can give better SVG rendering since browsers handle the animCJK CSS natively.

---

## License Notes

- animCJK: Arphic Public License (for kanji/hanzi SVGs), GNU LGPL (for kana SVGs)
- Your generated practice sheets can be freely used and distributed
- Attribution to animCJK is appreciated but not required for kana

---

## Next Steps for Your Japanese Learning App

This same approach can be extended to:
1. Generate kanji practice sheets (use `svgsJa/` folder)
2. Add spaced repetition tracking
3. Create interactive web versions with stroke animation
4. Build quiz modes that test stroke order recall

The animCJK data is comprehensive and well-maintained - it's a solid foundation for any Japanese learning tool.