# Internal Linking System for Kanji Pages

**Status**: ✅ Implemented and Live
**Version**: 2.0 (as-built)
**Originally Planned**: January 23, 2026
**Reconciled with code**: June 14, 2026
**Source of truth**: This document. (Supersedes and replaces the retired
`docs/marketing/phase-2-internal-linking-strategy.md`.)

## Overview

Every kanji detail page renders a "Related Kanji" section that links to other
kanji sharing the same semantic theme (numbers, family, nature, etc.). This
improves SEO topical clustering, increases session depth, and gives learners a
natural path between related characters.

> **Note on history**: This was originally drafted with 6 example clusters and a
> "Planned" status. The system was subsequently built out and shipped with **22
> semantic clusters**. This document now reflects the code as it actually exists.

## What's Live

### Files
```
lib/linking/semantic-clusters.ts          # 22 cluster definitions + lookup helpers
lib/linking/kanji-links.ts                # getRelatedKanji() link generation
components/kanji/RelatedKanjiSection.tsx   # UI component (grid of related kanji)
app/kanji/[character]/page.tsx            # renders <RelatedKanjiSection> on every page
```

### Semantic Clusters (22)

Defined in `lib/linking/semantic-clusters.ts` as `SEMANTIC_CLUSTERS`:

`numbers`, `time`, `seasons`, `family`, `nature`, `actions`, `body`, `places`,
`directions`, `education`, `colors`, `sizes`, `qualities`, `transport`, `work`,
`mind`, `food`, `health`, `arts`, `society`, `materials`, `bladeRadical`

Each cluster is a flat list of kanji that share a concept. Example:

```typescript
export const SEMANTIC_CLUSTERS = {
  numbers: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
            '百', '千', '万', '円'],
  family:  ['人', '男', '女', '子', '父', '母', '兄', '弟', '姉', '妹',
            '家', '友', '親', '族'],
  nature:  ['水', '火', '木', '土', '金', '山', '川', '海', '風', '雨',
            '天', '空', '石', '林', '森', '花', '草', '気', '電', '洋', '田', '犬'],
  // ... 19 more clusters
} as const;

export type ClusterName = keyof typeof SEMANTIC_CLUSTERS;
```

### Lookup Helpers

```typescript
// Returns the cluster a kanji belongs to, or null
export function findCluster(kanji: string): ClusterName | null

// Returns the other members of a kanji's cluster (excludes the kanji itself)
export function getClusterMembers(kanji: string): string[]
```

### Link Generation

`lib/linking/kanji-links.ts` — finds the current kanji's cluster, then returns up
to **8** cluster siblings that exist in the kanji database, with the data needed
to render a card:

```typescript
export interface RelatedKanji {
  kanji: string;
  meaning: string;
  level: string;
}

export function getRelatedKanji(
  currentKanji: KanjiData & { level: string },
  allKanji: (KanjiData & { level: string })[]
): RelatedKanji[] {
  const cluster = findCluster(currentKanji.kanji);
  if (!cluster) return [];

  const clusterMembers = getClusterMembers(currentKanji.kanji);

  return allKanji
    .filter(k => clusterMembers.includes(k.kanji))
    .slice(0, 8)
    .map(k => ({ kanji: k.kanji, meaning: k.meaning, level: k.level }));
}
```

### UI Component

`components/kanji/RelatedKanjiSection.tsx` renders a responsive card grid
(`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`) after the main content. Each card
links to `/kanji/{character}` and shows the character, meaning, and JLPT badge.
The section returns `null` when no related kanji are found, so pages with a kanji
outside any cluster simply omit it.

It is wired into the kanji detail page:

```tsx
// app/kanji/[character]/page.tsx
<RelatedKanjiSection currentKanji={kanjiData} allKanji={ALL_KANJI_DATA} />
```

## Design Rationale

### Why semantic clustering?
1. **Pedagogically sound** — learners naturally study kanji by topic.
2. **SEO value** — creates strong semantic signals for concept-based queries.
3. **Simple & scalable** — static, pre-defined clusters; no runtime algorithm.
4. **Zero maintenance** — links are computed at build time from static data.

### Performance
- **Build time**: links resolved during static generation (negligible cost).
- **Runtime**: zero — fully pre-computed.
- **Bundle**: cluster data is a small static object.

## Expected Benefits

- **SEO**: topical authority clusters + internal link equity to all kanji pages.
- **User journey**: discover thematically connected kanji; lower bounce rate.
- **Engagement**: more pages per session and longer time on site.

## Future Enhancements (not yet built)

These were explored in the original strategy and remain candidates for a v3:

1. **JLPT progression links** — link to slightly harder/easier related kanji.
2. **Compound-word links** — show kanji that form common words together.
3. **Visual/radical similarity** — link kanji that share radicals (note: a
   `bladeRadical` cluster already groups 刀-radical characters as a first step).
4. **Dynamic prioritization** — use Search Console / analytics to order links.

## Success Metrics (track in Search Console + Analytics)

- Organic traffic growth to kanji pages.
- Average pages per session / session depth.
- Click-through rate on related-kanji cards.
- Bounce rate on kanji detail pages.

## Maintenance

- Clusters are static — no ongoing maintenance required.
- When new kanji are added to the database, add them to the appropriate cluster
  in `semantic-clusters.ts` so they participate in linking.
- Review cluster membership periodically against Search Console performance.
