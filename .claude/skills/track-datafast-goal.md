# Track DataFast Goal Skill

## Purpose
This skill provides a systematic approach to add DataFast conversion/goal tracking to UI elements across the MichiKanji platform.

## When to Use
- Adding click tracking to CTAs (Call-to-Actions)
- Tracking scroll depth to key sections
- Measuring conversion funnels
- Monitoring user engagement with features
- Any time you need to track user interactions for analytics

## Prerequisites
- DataFast is already initialized in [app/layout.tsx:41-46](app/layout.tsx#L41-L46)
- Analytics utilities available in [lib/analytics/index.ts](lib/analytics/index.ts)
- DataFast API route exists at [app/api/datafast/route.ts](app/api/datafast/route.ts)

## Implementation Steps

### 1. Identify the Goal
**What to track:**
- Button/link clicks (CTAs)
- Form submissions
- Scroll milestones
- Feature usage
- Navigation patterns

**Naming convention:**
- Use lowercase snake_case
- Be descriptive and consistent
- Max 64 characters
- Examples: `explore_kanji_clicked`, `free_resources_clicked`, `scroll_to_pricing`, `signup_completed`

### 2. Choose Tracking Method

#### Method A: Client-Side Click Tracking (Recommended for buttons/links)
Best for: User interactions that don't require server verification

**Implementation:**
```tsx
import { trackConversion } from '@/lib/analytics';

// On button/link click
<Button
  onClick={async () => {
    // Track the conversion
    await trackConversion({
      name: 'goal_name_here',
      properties: {
        button_text: 'Button Label',
        section: 'hero',
        // Add any relevant context
      }
    });

    // Continue with original action
    // e.g., navigation, state change, etc.
  }}
>
  Button Text
</Button>
```

**For Link components:**
```tsx
<Link
  href="/target-page"
  onClick={async () => {
    await trackConversion({
      name: 'link_clicked',
      properties: {
        destination: '/target-page',
        link_text: 'Link Text'
      }
    });
  }}
>
  Link Text
</Link>
```

#### Method B: Scroll Depth Tracking
Best for: Measuring engagement with page sections

**Implementation:**
```html
<section
  id="section-name"
  className="min-h-screen"
  data-fast-scroll="scroll_to_section_name"
>
  <!-- Section content -->
</section>
```

**Note:** DataFast's client-side script automatically handles scroll tracking for elements with `data-fast-scroll` attribute.

#### Method C: Server-Side Tracking
Best for: Goals triggered by API calls, form submissions, or server actions

**Implementation:**
```typescript
// In API route or server action
const response = await fetch('/api/datafast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'goal',
    datafast_visitor_id: visitorId, // From cookie
    name: 'goal_name_here',
    metadata: {
      // Add relevant context
      success: true,
      timestamp: new Date().toISOString(),
    },
  }),
});
```

### 3. Create the Funnel in DataFast Dashboard

After implementing goal tracking:

1. Go to DataFast dashboard at https://datafa.st
2. Click **"+ Funnel"** at the bottom
3. Name your funnel descriptively (e.g., "Home Page Engagement")
4. Add steps:
   - **Step 1 (Page visit)**: URL equals `/` (or your target page)
   - **Step 2 (Goal)**: First goal name completed
   - **Step 3 (Goal)**: Second goal name completed
   - **Step N (Goal)**: Final conversion goal completed

5. Save and monitor conversion rates

### 4. Testing Checklist

- [ ] Goal name follows naming convention (lowercase_snake_case)
- [ ] Event fires when expected action occurs
- [ ] DataFast script is loaded (check Network tab)
- [ ] No console errors related to tracking
- [ ] Goal appears in DataFast dashboard within 5-10 minutes
- [ ] Funnel steps are configured correctly
- [ ] Conversion rates are calculating properly

### 5. Document the Goal

Add to your marketing documentation or analytics tracking sheet:
- Goal name
- Where it's triggered (component/page)
- What user action causes it
- What conversion/outcome it measures
- Part of which funnel(s)

## Common Patterns

### CTA Button Tracking
```tsx
<Button
  asChild
  onClick={async () => {
    await trackConversion({
      name: 'cta_clicked',
      properties: {
        cta_text: 'Get Started',
        page: '/',
        section: 'hero'
      }
    });
  }}
>
  <Link href="/signup">Get Started</Link>
</Button>
```

### Navigation Link Tracking
```tsx
<Link
  href="/kanji"
  onClick={async () => {
    await trackConversion({
      name: 'explore_kanji_clicked',
      properties: {
        source_page: '/',
        link_position: 'hero'
      }
    });
  }}
>
  Explore All Kanji
</Link>
```

### Form Submission Tracking
```tsx
const handleSubmit = async (data: FormData) => {
  // Submit form
  const result = await submitForm(data);

  // Track conversion
  if (result.success) {
    await trackConversion({
      name: 'form_submitted',
      properties: {
        form_type: 'contact',
        fields_filled: Object.keys(data).length
      }
    });
  }
};
```

## Best Practices

1. **Start Simple**: Track 2-3 key conversions first
2. **Be Consistent**: Use similar naming patterns across goals
3. **Add Context**: Include relevant properties for better insights
4. **Test Thoroughly**: Verify goals fire before deploying
5. **Document Everything**: Keep track of what each goal measures
6. **Review Regularly**: Check funnel performance and optimize bottlenecks
7. **Avoid Over-Tracking**: Only track meaningful user actions

## Troubleshooting

### Goal Not Appearing in Dashboard
- **Check**: DataFast script loaded (Network tab)
- **Check**: No console errors
- **Check**: Visitor ID exists (cookie: `datafast_visitor_id`)
- **Wait**: Goals may take 5-10 minutes to appear

### TypeScript Errors
```typescript
// If trackConversion is not recognized, check import
import { trackConversion } from '@/lib/analytics';

// If ConversionEvent type is needed
import type { ConversionEvent } from '@/lib/analytics';
```

### Async/Await Issues
```tsx
// For onClick handlers, use async function
onClick={async () => {
  await trackConversion({ name: 'goal' });
  // Other actions
}}

// Or handle promise
onClick={() => {
  trackConversion({ name: 'goal' })
    .then(() => console.log('Tracked'))
    .catch(err => console.error(err));
}}
```

## Examples from This Project

### Home Page: Explore All Kanji Button
```tsx
<Button asChild size="lg">
  <Link
    href="/kanji"
    onClick={async () => {
      await trackConversion({
        name: 'explore_all_kanji_clicked',
        properties: {
          kanji_count: ALL_KANJI_COUNT,
          source: 'homepage_hero'
        }
      });
    }}
  >
    Explore All {ALL_KANJI_COUNT} Kanji
    <ArrowRight className="w-4 h-4 ml-2" />
  </Link>
</Button>
```

### Header: Free Resources Link
```tsx
<Link
  href="/resources"
  onClick={async () => {
    await trackConversion({
      name: 'free_resources_clicked',
      properties: {
        source: 'header_nav'
      }
    });
  }}
>
  Free Resources
</Link>
```

## Related Documentation
- [DataFast Guide](../../docs/marketing/datafast-guide.md) - Full implementation details
- [DataFast Funnels](https://docs.datafa.st/docs/conversion-funnels) - Official docs
- [DataFast Goals](https://docs.datafa.st/docs/custom-goals) - Custom goals guide

## Support
If you encounter issues:
1. Check [docs/marketing/datafast-guide.md](../../docs/marketing/datafast-guide.md)
2. Review DataFast documentation
3. Contact DataFast support: marc@datafa.st
