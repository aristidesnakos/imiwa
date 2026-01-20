# Kanji Sheet Downloader

This directory contains scripts for automating kanji practice sheet downloads.

## download-kanji-sheets.ts

Downloads kanji practice sheets from michikanji.com and saves them as PNG images.

### Usage

```bash
pnpm tsx scripts/download-kanji-sheets.ts <level>
```

### Examples

```bash
# Download all N5 kanji sheets
pnpm tsx scripts/download-kanji-sheets.ts n5
```

### Output

Sheets are saved to `kanji-sheets/<level>/` directory with the kanji character as the filename.

Example: `kanji-sheets/n5/日.png`

### Adding New Levels

To add support for additional JLPT levels (N4, N3, etc.):

1. Open [scripts/download-kanji-sheets.ts](download-kanji-sheets.ts)
2. Add a new entry to the `KANJI_LISTS` object:
   ```typescript
   const KANJI_LISTS = {
     n5: [...],
     n4: ['kanji1', 'kanji2', ...], // Add your kanji list here
   };
   ```
3. Run the script with the new level: `pnpm tsx scripts/download-kanji-sheets.ts n4`

### How It Works

1. Launches a headless Chrome browser using Puppeteer
2. Navigates to each kanji's practice sheet URL
3. Takes a full-page screenshot in A4 portrait format
4. Saves as PNG with 2x resolution for print quality

### Requirements

- Node.js
- Puppeteer (already installed in this project)
- Internet connection
