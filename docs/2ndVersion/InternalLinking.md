# Internal Linking System for Kanji Pages

**Version**: 1.0
**Date**: January 23, 2026
**Status**: Planned
**Depends On**: Phase 1 SEO optimization (completed)

## Overview

Add intelligent internal links to kanji pages to improve SEO, user engagement, and learning progression. This system connects related kanji based on semantic meaning using a simple, scalable approach.

## Problem Statement

### Current State
- Kanji pages have excellent SEO foundations but zero internal linking
- Users can't discover related kanji naturally
- No topical clustering signals for search engines
- Limited session depth (users view 1 page and leave)

### Opportunity
- **SEO**: Internal links create topical authority clusters
- **User Journey**: Help learners discover related concepts
- **Engagement**: Increase pages per session and time on site
- **Crawlability**: Ensure all 2000+ kanji pages get link equity

## Solution: Semantic Clustering

### Core Principle
Connect kanji that share conceptual meaning (family, nature, time, etc.) to create natural learning pathways and strong topical signals.

### Why Semantic Clustering?
1. **Pedagogically Sound**: Learners naturally study kanji by topic
2. **SEO Value**: Creates strong semantic signals for concept-based queries
3. **Simple to Implement**: Pre-defined clusters, no complex algorithms
4. **Scalable**: Works for all kanji levels without manual maintenance

## Technical Implementation

### File Structure
```
lib/
  linking/
    semantic-clusters.ts        # Kanji categorization data
    kanji-links.ts              # Link generation logic

components/
  kanji/
    RelatedKanjiSection.tsx     # UI component
```

### Semantic Clusters

Six core categories based on common learning themes:

```typescript
// lib/linking/semantic-clusters.ts
export const SEMANTIC_CLUSTERS = {
  numbers: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '円'],
  time: ['日', '月', '年', '時', '分', '前', '後', '今', '昨', '明', '午', '半'],
  family: ['人', '男', '女', '子', '父', '母', '兄', '弟', '姉', '妹', '家', '友'],
  nature: ['水', '火', '木', '土', '金', '山', '川', '海', '風', '雨', '天', '空'],
  actions: ['見', '行', '来', '食', '飲', '読', '書', '聞', '話', '買', '売', '作'],
  body: ['手', '足', '目', '口', '耳', '頭', '心', '体', '顔', '首']
} as const;

export type ClusterName = keyof typeof SEMANTIC_CLUSTERS;

export function findCluster(kanji: string): ClusterName | null {
  for (const [name, kanji] of Object.entries(SEMANTIC_CLUSTERS)) {
    if (kanjiList.includes(kanji)) return name as ClusterName;
  }
  return null;
}
```

### Link Generation Logic

Simple algorithm: Find cluster → Return up to 5 other kanji from same cluster

```typescript
// lib/linking/kanji-links.ts
import { findCluster, SEMANTIC_CLUSTERS } from './semantic-clusters';
import type { KanjiData } from '@/lib/constants/n5-kanji';

export interface RelatedKanji {
  kanji: string;
  meaning: string;
  level: string;
}

export function getRelatedKanji(
  currentKanji: KanjiData,
  allKanji: KanjiData[]
): RelatedKanji[] {
  // Find which cluster this kanji belongs to
  const cluster = findCluster(currentKanji.kanji);
  if (!cluster) return [];

  // Get all kanji in same cluster (excluding current)
  const clusterKanji = SEMANTIC_CLUSTERS[cluster];

  // Find full data for cluster members
  const relatedKanji = allKanji
    .filter(k =>
      k.kanji !== currentKanji.kanji &&
      clusterKanji.includes(k.kanji)
    )
    .slice(0, 5) // Max 5 related kanji
    .map(k => ({
      kanji: k.kanji,
      meaning: k.meaning,
      level: k.level
    }));

  return relatedKanji;
}
```

### UI Component

Clean card grid placed after main content, before CTA section:

```tsx
// components/kanji/RelatedKanjiSection.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getRelatedKanji, type RelatedKanji } from '@/lib/linking/kanji-links';
import type { KanjiData } from '@/lib/constants/n5-kanji';

interface Props {
  currentKanji: KanjiData;
  allKanji: KanjiData[];
}

export function RelatedKanjiSection({ currentKanji, allKanji }: Props) {
  const relatedKanji = getRelatedKanji(currentKanji, allKanji);

  if (relatedKanji.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-semibold mb-6">Related Kanji</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {relatedKanji.map(related => (
          <Link
            key={related.kanji}
            href={`/kanji/${encodeURIComponent(related.kanji)}`}
            className="block p-4 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-center group"
          >
            <div className="text-4xl font-bold mb-2 group-hover:scale-110 transition-transform">
              {related.kanji}
            </div>
            <p className="text-sm text-gray-700 mb-2">{related.meaning}</p>
            <Badge variant="secondary" className="text-xs">
              JLPT {related.level}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

### Integration

Update kanji detail page to include related kanji section:

```tsx
// app/kanji/[character]/page.tsx
import { RelatedKanjiSection } from '@/components/kanji/RelatedKanjiSection';

export default async function KanjiDetailPage({ params }: Props) {
  // ... existing code ...

  return (
    <>
      {/* ... existing content ... */}

      {/* Related Kanji - BEFORE CTA */}
      <RelatedKanjiSection
        currentKanji={kanjiData}
        allKanji={ALL_KANJI_DATA}
      />

      {/* CTA Section */}
      <section className="mt-12 pt-8 border-t border-gray-200">
        <CTASection variant="with-image" />
      </section>

      {/* ... SEO content ... */}
    </>
  );
}
```

## Expected Benefits

### SEO Impact
- **Topical Clustering**: Groups kanji by concept (family, nature, time, etc.)
- **Crawl Efficiency**: All kanji pages get internal link equity
- **Query Coverage**: Targets "related kanji" and concept-based searches
- **Authority Signals**: Shows expertise in kanji organization/pedagogy

### User Experience
- **Discovery**: Natural progression through related concepts
- **Engagement**: Reduces bounce rate, increases pages per session
- **Learning Value**: Helps learners find thematically connected kanji
- **Mobile Friendly**: Responsive grid works on all devices

### Technical Benefits
- **Performance**: Links generated at build time (static)
- **Scalability**: Works for all 2000+ kanji automatically
- **Maintainability**: Simple logic, no complex algorithms
- **Type Safety**: Full TypeScript coverage

## Performance Characteristics

- **Build Time**: < 1ms per kanji page (static generation)
- **Bundle Impact**: ~2KB for cluster data + link logic
- **Runtime**: Zero - all links pre-computed
- **Mobile**: Optimized grid, touch-friendly targets

## Future Enhancements (V2)

Once V1 is validated, consider adding:

1. **JLPT Progression Links**: Link to slightly harder/easier kanji
2. **Compound Word Links**: Show kanji that form common words together
3. **Visual Similarity**: Link kanji with shared radicals
4. **Dynamic Prioritization**: Use analytics to optimize link selection

## Success Metrics

### Technical
- Average internal links per page: ~3-5
- Cluster coverage: % of kanji with links
- Link distribution: All kanji receive inbound links

### SEO (Track in Search Console)
- Organic traffic growth to kanji pages
- Average pages per session increase
- "Related kanji" query impressions/clicks

### User Engagement (Track in Analytics)
- Click-through rate on related kanji links
- Session depth increase
- Bounce rate decrease

## Implementation Checklist

- [ ] Create semantic cluster definitions
- [ ] Build link generation utility
- [ ] Create RelatedKanjiSection component
- [ ] Integrate into kanji detail page
- [ ] Test on sample kanji (numbers, family, nature)
- [ ] Verify mobile responsiveness
- [ ] Deploy and monitor metrics

## Notes

### Why Start Simple?
- Faster to ship and validate
- Easy to understand and maintain
- Can add complexity based on real user data
- Lower risk of over-engineering

### Expansion Strategy
Add new clusters as needed based on:
- User search queries (Search Console data)
- Common kanji learning curricula
- Analytics showing gaps in coverage

### Maintenance
- Clusters are static - no ongoing maintenance needed
- Add new kanji to appropriate clusters as database grows
- Review cluster membership quarterly based on performance data
