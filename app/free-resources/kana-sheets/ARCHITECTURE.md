# Kana Sheets Architecture

## Overview
This document explains the separation of concerns applied to the kana practice sheets feature, making the codebase more maintainable, testable, and scalable.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Page Layer                           │
│  app/free-resources/kana-sheets/page.tsx (128 lines)        │
│  - SEO metadata                                              │
│  - Page layout and structure                                 │
│  - Maps over configuration data                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ imports
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Layer                       │
│  app/free-resources/kana-sheets/constants.ts                │
│  - SHEET_CONFIGS: Array of sheet metadata                   │
│  - Centralized content management                            │
│  - Easy to add/modify sheets                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ uses
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Type Layer                             │
│  types/kana-sheets.ts                                        │
│  - SheetCardProps interface                                  │
│  - SheetConfig interface                                     │
│  - BadgeColorVariant type                                    │
│  - SHEET_TYPES, KANA_TYPES constants                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ enforces
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Component Layer                           │
│  components/kana/SheetCard.tsx                               │
│  - Reusable card UI component                                │
│  - Self-contained styling logic                              │
│  - Props-driven rendering                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Utility Layer                            │
│  lib/utils/kana-sheets.ts                                    │
│  - buildDownloadUrl(): URL construction                      │
│  - buildAriaLabel(): Accessibility helpers                   │
│  - Pure functions, easy to test                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
imiwa/
├── app/
│   └── free-resources/
│       └── kana-sheets/
│           ├── page.tsx              # Page component (128 lines, down from 252)
│           └── constants.ts          # Sheet configuration data
├── components/
│   └── kana/
│       └── SheetCard.tsx             # Reusable card component
├── lib/
│   └── utils/
│       └── kana-sheets.ts            # Business logic utilities
└── types/
    └── kana-sheets.ts                # TypeScript type definitions
```

---

## Separation of Concerns

### 1. **Presentation Layer** (`components/kana/SheetCard.tsx`)
**Responsibility**: UI rendering only

- **What it does**:
  - Renders a single sheet card with image, badge, description, and button
  - Handles visual styling (colors, hover effects, layout)
  - No business logic or data fetching

- **Why separate**:
  - Reusable in other contexts (e.g., related products, recommendations)
  - Testable in isolation with Storybook or Jest
  - Design changes isolated to one file

- **Example Usage**:
  ```tsx
  <SheetCard
    title="Hiragana ひらがな"
    badge="Empty Practice Grid"
    badgeColor="sakura"
    downloadUrl="/api/kana-sheets?..."
    {...otherProps}
  />
  ```

---

### 2. **Configuration Layer** (`app/free-resources/kana-sheets/constants.ts`)
**Responsibility**: Content management

- **What it does**:
  - Defines all available sheets in a single array
  - Contains copy, images, metadata for each sheet
  - Acts as a CMS for sheet content

- **Why separate**:
  - Adding new sheets requires editing only this file
  - Marketing team can update copy without touching component code
  - Easy to A/B test different descriptions

- **Example**:
  ```tsx
  export const SHEET_CONFIGS: SheetConfig[] = [
    {
      id: 'hiragana-empty',
      title: 'Hiragana ひらがな',
      badge: 'Empty Practice Grid',
      // ... rest of config
    },
    // Add new sheet here
  ];
  ```

---

### 3. **Type Layer** (`types/kana-sheets.ts`)
**Responsibility**: Type safety and contracts

- **What it does**:
  - Defines TypeScript interfaces and types
  - Exports constants (SHEET_TYPES, KANA_TYPES)
  - Ensures type safety across layers

- **Why separate**:
  - Single source of truth for type definitions
  - Shared between multiple files
  - Prevents type drift and runtime errors

- **Example**:
  ```tsx
  export interface SheetConfig {
    id: string;
    title: string;
    badgeColor: 'sakura' | 'coral';
    // ...
  }
  ```

---

### 4. **Utility Layer** (`lib/utils/kana-sheets.ts`)
**Responsibility**: Business logic

- **What it does**:
  - Builds download URLs with query parameters
  - Generates accessible ARIA labels
  - Pure functions with no side effects

- **Why separate**:
  - Testable with unit tests (no component mounting needed)
  - Reusable in API routes or other pages
  - Logic changes don't affect UI rendering

- **Example**:
  ```tsx
  buildDownloadUrl('hiragana', 'empty')
  // Returns: '/api/kana-sheets?type=hiragana&format=empty'
  ```

---

### 5. **Page Layer** (`app/free-resources/kana-sheets/page.tsx`)
**Responsibility**: Layout and composition

- **What it does**:
  - Defines page structure (header, gallery, instructions)
  - Maps configuration to components
  - Handles SEO metadata

- **Why separate**:
  - Clean, readable page code (128 lines vs 252 before)
  - Easy to see page structure at a glance
  - Changes to layout don't affect component logic

- **Before vs After**:
  ```tsx
  // BEFORE: 252 lines with everything mixed together
  // Component definition, styling, types, data, all in page.tsx

  // AFTER: 128 lines, clean separation
  {SHEET_CONFIGS.map((config) => (
    <SheetCard
      key={config.id}
      downloadUrl={buildDownloadUrl(...)}
      {...config}
    />
  ))}
  ```

---

## Benefits of This Architecture

### 1. **Maintainability**
- **Before**: Change badge color → edit inline styles in page component
- **After**: Change badge color → update SheetCard.tsx once, applies everywhere

### 2. **Testability**
```tsx
// Test utility functions (pure logic)
test('buildDownloadUrl with romaji', () => {
  expect(buildDownloadUrl('hiragana', 'stroke-order', true))
    .toBe('/api/kana-sheets?type=hiragana&format=stroke-order&romaji=true');
});

// Test component in isolation
render(<SheetCard {...mockProps} />);
expect(screen.getByRole('link')).toHaveAttribute('href', expectedUrl);
```

### 3. **Scalability**
Adding a new sheet type (e.g., "Quiz Mode"):
1. Add entry to `SHEET_CONFIGS` array
2. Create new image asset
3. Done! No component code changes needed.

### 4. **Reusability**
```tsx
// Use SheetCard in other pages
import { SheetCard } from '@/components/kana/SheetCard';

<SheetCard
  title="N5 Kanji Sheet"
  badgeColor="coral"
  {...props}
/>
```

### 5. **Developer Experience**
- **Clear file organization**: Know exactly where to make changes
- **Type safety**: Catch errors at compile time
- **Code navigation**: Jump to definitions, find usages easily
- **Onboarding**: New developers understand architecture quickly

---

## Design Patterns Used

### 1. **Composition Pattern**
Page composes smaller, focused components rather than one monolithic component.

### 2. **Configuration-Driven Rendering**
Data-driven approach where UI is generated from configuration arrays.

### 3. **Pure Functions**
Utility functions have no side effects, making them predictable and testable.

### 4. **Single Responsibility Principle**
Each file/function does one thing well.

### 5. **Dependency Inversion**
Page depends on abstractions (interfaces) rather than concrete implementations.

---

## Future Enhancements

### 1. **Add Unit Tests**
```tsx
// lib/utils/__tests__/kana-sheets.test.ts
// components/kana/__tests__/SheetCard.test.tsx
```

### 2. **Add Storybook Stories**
```tsx
// components/kana/SheetCard.stories.tsx
export const Default: Story = {
  args: {
    title: 'Hiragana ひらがな',
    badgeColor: 'sakura',
    // ...
  }
};
```

### 3. **Internationalization**
Move strings to i18n files, keep component structure.

### 4. **Dynamic Content**
Replace constants.ts with CMS integration or API fetch.

### 5. **Analytics Tracking**
Add utility function for download tracking without polluting component code.

---

## Code Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| page.tsx lines | 252 | 128 | -49% |
| Component reusability | 0% | 100% | ∞ |
| Testable functions | 0 | 2 | +2 |
| Files | 1 | 5 | Better organization |
| Type safety | Inline | Centralized | Consistent |

---

## Conclusion

This architecture follows modern React and Next.js best practices:
- **Clean Code**: Easy to read and understand
- **SOLID Principles**: Single responsibility, dependency inversion
- **Separation of Concerns**: Each layer has a clear purpose
- **Scalability**: Easy to extend with new features
- **Maintainability**: Changes are localized and predictable

The investment in proper architecture pays dividends as the codebase grows and more team members contribute.
