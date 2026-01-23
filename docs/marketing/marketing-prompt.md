# Marketing & Conversion Tracking Guide

## Purpose
This document serves as a reference for Claude Code when working on marketing initiatives, conversion tracking, and analytics implementation for MichiKanji.

## When to Use
Use this guide when:
- Adding new conversion tracking to any page or feature
- Creating marketing funnels for user journey analysis
- Implementing A/B testing or experimentation
- Optimizing conversion rates for key user actions
- Measuring effectiveness of CTAs or page elements

## Quick Reference: Track New Goals

When you need to track a new goal/conversion on the platform, **use the DataFast goal tracking skill**:

```
/track-datafast-goal
```

Or reference the skill documentation directly at: [.claude/skills/track-datafast-goal.md](../../.claude/skills/track-datafast-goal.md)

## Current Conversion Tracking

### Home Page Goals
These goals measure engagement on the homepage ([app/page.tsx](../../app/page.tsx)):

1. **`explore_all_kanji_clicked`**
   - **Location**: Homepage hero section
   - **Element**: "Explore All {count} Kanji" button
   - **Implementation**: [app/page.tsx:146-159](../../app/page.tsx#L146-L159)
   - **Purpose**: Measures how many visitors engage with the main CTA to explore the kanji library
   - **Properties tracked**:
     - `kanji_count`: Total number of kanji in the database
     - `source`: 'homepage_hero'

2. **`free_resources_clicked`**
   - **Location**: Header navigation
   - **Element**: "Free Resources" link
   - **Implementation**: [components/sections/Header.tsx:31-43](../../components/sections/Header.tsx#L31-L43)
   - **Purpose**: Tracks interest in additional learning resources
   - **Properties tracked**:
     - `source`: 'header_nav'

### Recommended Funnels

Based on the current tracking, here are suggested funnels to create in the DataFast dashboard:

#### 1. Homepage Engagement Funnel
**Purpose**: Measure how visitors engage with the homepage and take action

**Steps**:
1. Page visit: URL equals `/`
2. Goal: `explore_all_kanji_clicked` completed
3. Page visit: URL matches `/kanji*` (visitor reached kanji page)

**What to optimize**: If conversion from step 1→2 is low, test different CTA copy, button placement, or value propositions on the homepage.

#### 2. Resource Discovery Funnel
**Purpose**: Track visitors seeking additional learning materials

**Steps**:
1. Page visit: URL equals `/`
2. Goal: `free_resources_clicked` completed
3. Page visit: URL equals `/free-resources` (visitor reached resources page)

**What to optimize**: If step 2→3 conversion is low, check for broken links or loading issues on the resources page.

## DataFast Integration

### Current Setup
- **DataFast Script**: Loaded directly in [app/layout.tsx:41-46](../../app/layout.tsx#L41-L46)
- **Website ID**: `dfid_yWGzMf4z22IEHANBbTIqo`
- **Domain**: `michikanji.com`
- **Analytics Utilities**: [lib/analytics/index.ts](../../lib/analytics/index.ts)
- **API Route**: [app/api/datafast/route.ts](../../app/api/datafast/route.ts)

### Tracking Methods Available

1. **Client-side click tracking** (most common)
   ```tsx
   import { trackConversion } from '@/lib/analytics';

   <Button onClick={async () => {
     await trackConversion({
       name: 'button_clicked',
       properties: { source: 'page_name' }
     });
   }}>
     Click Me
   </Button>
   ```

2. **Scroll depth tracking**
   ```html
   <section data-fast-scroll="scroll_to_section_name">
     <!-- Content -->
   </section>
   ```

3. **Server-side tracking** (for API-driven events)
   - Use [app/api/datafast/route.ts](../../app/api/datafast/route.ts)
   - See [docs/marketing/datafast-guide.md](./datafast-guide.md) for details

## Expanding Conversion Tracking

### Process for Adding New Goals

When you need to track a new conversion or goal:

1. **Identify the Goal**
   - What user action do you want to measure?
   - What conversion/outcome does it represent?
   - Examples: form submissions, feature usage, navigation patterns

2. **Use the Skill**
   - Reference [.claude/skills/track-datafast-goal.md](../../.claude/skills/track-datafast-goal.md)
   - Follow the implementation steps for your specific use case

3. **Name the Goal**
   - Use lowercase snake_case
   - Be descriptive: `feature_name_action`
   - Examples: `kanji_search_used`, `progress_saved`, `level_completed`

4. **Implement Tracking**
   - Add `trackConversion()` call to the appropriate component
   - Include relevant context in properties
   - Test that the event fires correctly

5. **Create Funnel (Optional)**
   - In DataFast dashboard, create funnel if tracking multi-step journey
   - Name it descriptively: "Feature X Usage Flow"
   - Add steps: page visits and goal completions

6. **Document It**
   - Add the goal to this file's "Current Conversion Tracking" section
   - Note the goal name, location, purpose, and properties tracked

### Common Goals to Consider Tracking

Here are suggested goals for future implementation:

#### User Engagement
- `kanji_card_clicked` - When user clicks on a kanji card
- `stroke_animation_played` - When user plays stroke order animation
- `kanji_marked_learned` - When user marks a kanji as learned
- `search_performed` - When user searches for kanji
- `level_filter_used` - When user filters by JLPT level (N5, N4, etc.)

#### Learning Progress
- `first_kanji_learned` - User's first marked kanji (milestone)
- `ten_kanji_learned` - Reached 10 learned kanji
- `level_completed` - Completed all kanji in a JLPT level
- `progress_viewed` - Viewed progress/analytics page

#### Feature Discovery
- `about_page_visited` - Visited about/how-it-works page
- `mobile_app_banner_clicked` - If you add PWA install prompt
- `share_button_clicked` - If you add social sharing

#### Navigation Patterns
- `footer_link_clicked` - Track which footer links are used
- `header_logo_clicked` - Track return to home behavior
- `external_resource_clicked` - When clicking external learning resources

## Analytics Best Practices

### Goal Naming
- ✅ Use lowercase_snake_case: `feature_name_action`
- ✅ Be specific: `explore_all_kanji_clicked` not `button_clicked`
- ✅ Include action verb: `_clicked`, `_viewed`, `_completed`, `_submitted`
- ❌ Avoid generic names: `click`, `event`, `action`
- ❌ Don't use spaces or special characters

### Property Tracking
Include context that helps understand user behavior:
- **Source/Location**: Where on the page (`source: 'header_nav'`)
- **User State**: Logged in status, progress level
- **Content Context**: Which kanji, what level, search query
- **Device Info**: Automatically included by DataFast

### Testing
Before deploying new tracking:
- [ ] Goal fires when expected action occurs
- [ ] Properties contain expected values
- [ ] No console errors
- [ ] DataFast script is loaded (check Network tab)
- [ ] Goal appears in DataFast dashboard within 5-10 minutes

## Performance Considerations

### DataFast Impact
- **Script size**: ~3KB (minimal)
- **Load strategy**: Deferred, non-blocking
- **Cookie usage**: `datafast_visitor_id` (automatic)
- **Privacy**: GDPR-friendly, no PII by default

### Optimization Tips
1. **Batch tracking calls** - Don't track every tiny interaction
2. **Use meaningful goals** - Focus on business-critical actions
3. **Limit properties** - Max 10 custom properties per goal
4. **Async tracking** - Use `await trackConversion()` without blocking UI
5. **Error handling** - trackConversion fails gracefully if network issues occur

## Marketing Analytics Stack

### Current Tools
1. **DataFast** (Primary)
   - Privacy-friendly web analytics
   - Conversion tracking and funnels
   - No consent required (respects DNT)
   - Real-time dashboard

2. **Ahrefs** (Consent-gated)
   - SEO and search analytics
   - Requires user consent
   - Initialized in [lib/analytics/index.ts](../../lib/analytics/index.ts)

### Future Considerations
- **Email marketing**: Consider ConvertKit or Mailchimp for newsletters
- **A/B testing**: Consider implementing feature flags with PostHog or similar
- **Heatmaps**: Consider Hotjar for visual user behavior analysis
- **User feedback**: Consider integrating feedback widgets for qualitative data

## Funnel Analysis

### Reading Funnel Data
When analyzing funnels in DataFast dashboard:

1. **Conversion Rate**: % of users progressing from one step to next
2. **Drop-off Rate**: % of users who don't complete a step
3. **Top Sources**: Which referrers/campaigns drive best conversions
4. **Geographic Performance**: Which countries/regions convert best

### Optimization Strategy
1. **Identify biggest drop-off** - Focus on the step with highest drop rate
2. **Hypothesize why** - User confusion? Technical issue? Value proposition?
3. **Test solutions** - A/B test changes to improve conversion
4. **Measure impact** - Track if changes improve the metric
5. **Iterate** - Repeat for next biggest bottleneck

## Support & Resources

### Documentation
- [DataFast Goal Tracking Skill](../../.claude/skills/track-datafast-goal.md) - Implementation guide
- [DataFast Guide](./datafast-guide.md) - Complete implementation details
- [DataFast Official Docs](https://docs.datafa.st) - API reference

### Getting Help
- **DataFast Support**: marc@datafa.st
- **MichiKanji Team**: ari@llanai.com
- **Bug Reports**: Document in project issues

## Change Log

### 2025-01-23
- ✅ Created marketing-prompt.md documentation
- ✅ Implemented `explore_all_kanji_clicked` goal on homepage
- ✅ Implemented `free_resources_clicked` goal in header navigation
- ✅ Created [.claude/skills/track-datafast-goal.md](../../.claude/skills/track-datafast-goal.md) skill
- ✅ Documented suggested funnels for homepage engagement

### Future Tracking Roadmap
- [ ] Add search tracking when search functionality is enhanced
- [ ] Add progress/milestone tracking when progress features are built
- [ ] Add kanji interaction tracking for engagement metrics
- [ ] Create email subscription goal tracking if newsletter added
- [ ] Implement A/B testing framework for CTA optimization
