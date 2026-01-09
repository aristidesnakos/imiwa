# PDF Generation Utility Charter

## Overview

This charter defines the build-time PDF generation utility that creates static kanji practice sheets during the application build process. This approach eliminates server load, provides instant downloads, and ensures predictable costs while scaling infinitely.

## Strategic Goals

### Primary Objectives
- **Zero Runtime Cost**: Generate all PDFs once during build, serve as static files
- **Instant User Experience**: Direct file downloads with no generation wait time
- **Infinite Scalability**: Static files can handle unlimited concurrent downloads
- **Cost Predictability**: Fixed storage costs, no compute spikes or API limits

### Secondary Benefits
- **Simplified Architecture**: No complex API endpoints or dynamic generation
- **Better Performance**: CDN-served files with optimal caching
- **Reliability**: No runtime failures during PDF generation
- **Offline Capability**: Pre-generated files work in all scenarios

## Technical Architecture

### Build-Time Generation Process

```typescript
// scripts/generate-kanji-sheets.ts
export interface GenerationConfig {
  outputDir: string;           // ./public/kanji-sheets/
  characters: string[];        // All N5 kanji characters
  cacheDir: string;           // ./cache/kanji-svgs/ - cache SVGs locally
  maxConcurrency: number;     // 5 - limit concurrent PDF generation
}

interface GenerationResult {
  totalSheets: number;         // ~100 individual PDFs
  totalSize: string;          // Estimated storage requirement
  buildTime: number;          // Generation duration
}
```

### Directory Structure

```
public/kanji-sheets/
└── 一.pdf
    二.pdf
    三.pdf
    ...100 files (~35MB total)
```

### Generation Pipeline

#### Phase 1: Data Preparation
```typescript
interface KanjiSheetData {
  kanji: string;
  unicode: number;
  strokeCount: number;
  meaning: string;
  onyomi: string;
  kunyomi: string;
  vocabulary: string[];
  mathContext?: string;
  strokeOrderSvg: string;      // Fetched and cached during build
}
```

#### Phase 2: HTML Template Generation
```typescript
// Generate print-ready HTML for each character/format combination
const generateSheetHTML = (data: KanjiSheetData, format: SheetFormat) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.kanji} Practice Sheet</title>
      <style>${printCSS}</style>
    </head>
    <body class="sheet-${format}">
      ${renderInfoSection(data, format)}
      ${renderStrokeOrderSection(data, format)}
      ${renderPracticeGrid(data, format)}
    </body>
    </html>
  `;
};
```

#### Phase 3: PDF Conversion
```typescript
// Convert HTML to PDF using headless browser
const generatePDF = async (html: string, filename: string) => {
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({
    path: filename,
    format: 'A4',
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    printBackground: true
  });
  await page.close();
};
```

#### Phase 4: Bulk Package Creation
```typescript
// Create common bulk download packages
const generateBulkPackages = async () => {
  const packages = [
    { name: 'n5-complete-standard', chars: allN5Chars, format: 'standard' },
    { name: 'n5-numbers-standard', chars: numberChars, format: 'standard' },
    { name: 'n5-first20-standard', chars: first20Chars, format: 'standard' }
  ];
  
  for (const pkg of packages) {
    const zip = new JSZip();
    for (const char of pkg.chars) {
      const pdfPath = `./public/kanji-sheets/individual/${pkg.format}/${char}.pdf`;
      const pdfBuffer = await fs.readFile(pdfPath);
      zip.file(`${char}.pdf`, pdfBuffer);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(`./public/kanji-sheets/bulk/${pkg.name}.zip`, zipBuffer);
  }
};
```

## Integration with Build Process

### Next.js Build Integration

```typescript
// next.config.js
module.exports = {
  // Simple static file caching
  async headers() {
    return [
      {
        source: '/kanji-sheets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ];
  }
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "npm run generate-sheets && next build",
    "generate-sheets": "node scripts/generate-kanji-sheets.js"
  }
}
```

### Vercel Deployment Configuration

```yaml
# vercel.json
{
  "buildCommand": "pnpm build-production",
  "outputDirectory": ".next",
  "functions": {
    "app/api/health/route.js": {
      "maxDuration": 10
    }
  }
}
```

## Frontend Implementation

### Direct File Links

```typescript
// components/KanjiSheetDownload.tsx
export function KanjiSheetDownload({ character }: { character: string }) {
  const downloadUrl = `/kanji-sheets/${character}.pdf`;
  
  return (
    <a 
      href={downloadUrl} 
      download={`${character}-practice.pdf`}
      className="download-button"
    >
      Download {character}
    </a>
  );
}
```

### Bulk Downloads (Client-Side Zip Generation)

```typescript
// components/BulkDownload.tsx
import JSZip from 'jszip';

export function BulkDownload() {
  const generateBulkZip = async (characters: string[], name: string) => {
    const zip = new JSZip();
    
    for (const char of characters) {
      const response = await fetch(`/kanji-sheets/${char}.pdf`);
      const pdfBlob = await response.blob();
      zip.file(`${char}.pdf`, pdfBlob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.zip`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bulk-downloads">
      <button onClick={() => generateBulkZip(allN5Characters, 'n5-complete')}>
        All N5 Characters (100 sheets)
      </button>
      <button onClick={() => generateBulkZip(numberCharacters, 'n5-numbers')}>
        Number Characters (10 sheets)
      </button>
    </div>
  );
}
```

### Dynamic Custom Selection

```typescript
// For custom character selection, generate zip client-side
export function CustomSelection() {
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  
  const downloadCustom = async () => {
    const zip = new JSZip();
    
    for (const char of selectedChars) {
      const response = await fetch(`/kanji-sheets/individual/standard/${char}.pdf`);
      const pdfBlob = await response.blob();
      zip.file(`${char}.pdf`, pdfBlob);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-kanji-sheets.zip';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <CharacterSelector 
        onSelectionChange={setSelectedChars}
        availableCharacters={allN5Characters}
      />
      <button onClick={downloadCustom} disabled={selectedChars.length === 0}>
        Download Selected ({selectedChars.length} sheets)
      </button>
    </div>
  );
}
```

## Performance Characteristics

### Storage Requirements

```typescript
interface StorageEstimate {
  individualPDFs: {
    count: 100;           // 100 N5 characters
    averageSize: '350KB'; // Optimized PDF size
    totalSize: '35MB';    // Minimal storage requirement
  };
  totalStorage: '35MB';   // Extremely efficient
  vercelLimit: '500MB';   // Well within platform limits
  cdnCosts: '$0.10/month'; // Estimated at 1TB transfer
}
```

### Build Time Impact

```typescript
interface BuildMetrics {
  pdfGeneration: '2-3 minutes';     // Simplified generation
  incrementalBuilds: '0 seconds';   // No regeneration needed
  deploymentTime: '+30 seconds';    // Minimal upload time
  buildFrequency: 'On content changes only';
}
```

### Runtime Performance

```typescript
interface RuntimeMetrics {
  downloadLatency: '0ms';           // Static file serving
  concurrentDownloads: 'Unlimited'; // CDN scalability
  serverLoad: '0 CPU/Memory';       // No dynamic generation
  cachingEffectiveness: '100%';     // Static files cache perfectly
}
```

## Error Handling & Fallbacks

### Build-Time Error Recovery

```typescript
const generateWithFallbacks = async (character: string) => {
  try {
    const strokeOrderSvg = await fetchKanjiVG(character);
    return generatePDF(character, strokeOrderSvg);
  } catch (strokeOrderError) {
    console.warn(`Stroke order unavailable for ${character}, using fallback`);
    return generatePDF(character, fallbackStrokeOrder);
  }
};
```

### Missing File Detection

```typescript
// Generate manifest for frontend validation
interface SheetManifest {
  lastGenerated: string;
  totalSheets: number;
  availableFormats: string[];
  characterCoverage: {
    [character: string]: {
      available: boolean;
      formats: string[];
      fileSize: number;
    }
  };
}
```

### Runtime Fallbacks

```typescript
// Frontend fallback for missing files
export function useSheetAvailability(character: string, format: string) {
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  
  const checkAvailability = async () => {
    const response = await fetch(`/kanji-sheets/individual/${format}/${character}.pdf`, { method: 'HEAD' });
    setIsAvailable(response.ok);
  };
  
  useEffect(() => {
    checkAvailability();
  }, [character, format]);
  
  return isAvailable;
}
```

## Quality Assurance

### Automated Testing

```typescript
// tests/pdf-generation.test.ts
describe('PDF Generation', () => {
  test('generates all N5 characters', async () => {
    const manifest = await import('../public/kanji-sheets/manifest.json');
    const n5Characters = await import('../lib/constants/n5-kanji.ts');
    
    expect(manifest.totalSheets).toBe(n5Characters.length * 3);
    
    for (const char of n5Characters) {
      expect(manifest.characterCoverage[char].available).toBe(true);
      expect(manifest.characterCoverage[char].formats).toEqual(['standard', 'review', 'assessment']);
    }
  });
  
  test('all PDF files are valid', async () => {
    const files = await glob('./public/kanji-sheets/individual/**/*.pdf');
    
    for (const file of files) {
      const stats = await fs.stat(file);
      expect(stats.size).toBeGreaterThan(10000); // Minimum 10KB
      expect(stats.size).toBeLessThan(2000000);  // Maximum 2MB
    }
  });
});
```

### Print Quality Validation

```typescript
// Visual regression testing for print layouts
describe('Print Quality', () => {
  test('practice grid dimensions', async () => {
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/test-sheets/三-standard.html`);
    
    const gridSquare = await page.$('.practice-square');
    const boundingBox = await gridSquare.boundingBox();
    
    expect(boundingBox.width).toBeCloseTo(75.59); // 20mm at 96 DPI
    expect(boundingBox.height).toBeCloseTo(75.59);
  });
});
```

## Deployment Strategy

### Vercel Integration

```typescript
// Vercel automatically serves public/ directory as static files
// No additional configuration needed for basic file serving
// CDN distribution included automatically
```

### Alternative CDN Strategy

```typescript
// Optional: Upload to external CDN during CI/CD
const uploadToCDN = async () => {
  const sheets = await glob('./public/kanji-sheets/**/*');
  
  for (const sheet of sheets) {
    await cloudflare.upload({
      file: sheet,
      path: sheet.replace('./public/', ''),
      cacheControl: 'public, max-age=31536000' // 1 year cache
    });
  }
};
```

## Success Metrics & Monitoring

### Key Performance Indicators

```typescript
interface SuccessMetrics {
  buildSuccess: {
    metric: 'Build completion rate';
    target: '100%';
    measurement: 'CI/CD logs';
  };
  fileAvailability: {
    metric: '404 error rate on sheet downloads';
    target: '<0.1%';
    measurement: 'CDN analytics';
  };
  downloadPerformance: {
    metric: 'Time to first byte';
    target: '<100ms';
    measurement: 'CDN metrics';
  };
  storageEfficiency: {
    metric: 'Storage cost per download';
    target: '<$0.001';
    measurement: 'CDN billing';
  };
}
```

### Monitoring Implementation

```typescript
// Simple analytics via headers or query params
export function trackDownload(character: string, format: string, source: string) {
  // Optional: ping analytics endpoint
  fetch('/api/analytics/download', {
    method: 'POST',
    body: JSON.stringify({ character, format, source, timestamp: Date.now() })
  }).catch(() => {}); // Non-blocking
}
```

## Risk Mitigation

### Build Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Build timeout | No sheets available | Implement incremental generation |
| Memory exhaustion | Build failure | Process characters in batches |
| External API failure | Missing stroke orders | Cache SVGs, implement fallbacks |
| Storage overflow | Deployment failure | Monitor size limits, implement cleanup |

### Runtime Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| File corruption | Download failures | Implement file integrity checks |
| CDN issues | Slow downloads | Multiple CDN endpoints |
| Cache invalidation | Stale content | Version-based file naming |
| Bandwidth costs | High bills | Monitor usage, implement rate limiting |

## Future Enhancements

### Incremental Generation
- Only regenerate changed characters
- Dependency tracking for data updates
- Faster build times for content updates

### Advanced Formats
- Multi-character practice sheets
- Custom vocabulary integration
- Difficulty-based progression sheets

### Internationalization
- Multiple language support for character information
- Localized practice instructions
- Regional print format optimization

This charter provides the foundation for a robust, scalable, and cost-effective PDF generation system that eliminates runtime complexity while providing instant user satisfaction.