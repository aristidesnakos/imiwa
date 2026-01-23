# Product Requirements Document: GDPR Cookie Consent System

## Document Info
- **Version**: 1.0
- **Created**: 2026-01-13
- **Status**: Approved
- **Reusability**: Multi-project implementation ready

---

## Executive Summary

A reusable, GDPR-compliant cookie consent system that integrates seamlessly with analytics providers (DataFast, Ahrefs, Google Analytics, etc.) and provides a superior user experience through modern UI patterns and persistent storage.

---

## Problem Statement

Modern websites require GDPR-compliant cookie consent management that:
1. Respects user privacy preferences
2. Integrates with multiple analytics providers
3. Provides granular control over cookie categories
4. Persists across sessions and page navigations
5. Can be reused across multiple projects with minimal configuration

---

## Goals & Success Metrics

### Primary Goals
- **Compliance**: 100% GDPR compliance with explicit user consent
- **User Experience**: Non-intrusive, clear, and accessible interface
- **Developer Experience**: Drop-in component with minimal configuration
- **Performance**: Zero impact on page load metrics
- **Reusability**: Works across Next.js, React, and vanilla JS projects

### Success Metrics
- Analytics consent rate > 60%
- Time to implement in new project < 15 minutes
- Zero GDPR compliance issues
- Page load impact < 50ms
- User consent preference persistence: 12 months

---

## User Stories

### End Users
1. **First-time visitor**: "I want to understand what cookies are used and make an informed choice without feeling overwhelmed"
2. **Privacy-conscious user**: "I want to opt-out of analytics while still using the site's core functionality"
3. **Returning user**: "I don't want to see the banner on every page after I've made my choice"
4. **Settings changer**: "I want to easily change my cookie preferences later if I change my mind"

### Developers
1. **New project setup**: "I want to add GDPR-compliant cookie consent in under 15 minutes"
2. **Multi-analytics setup**: "I need to integrate DataFast, Ahrefs, and GA4 with one consent system"
3. **Custom categories**: "I want to define custom cookie categories beyond the defaults"
4. **Testing**: "I need to test analytics in development without affecting production data"

---

## Technical Requirements

### Core Architecture

#### 1. Cookie Categories
```typescript
interface ConsentOptions {
  necessary: boolean;    // Always true, cannot be disabled
  functional: boolean;   // User preferences, saved forms
  analytics: boolean;    // Usage tracking, pageviews
  marketing: boolean;    // Optional: Ad tracking, retargeting
  lastUpdated: number;   // Timestamp for expiration
}
```

#### 2. Storage Strategy
- **Primary**: `localStorage` with key `cookie-consent`
- **Expiration**: 12 months from `lastUpdated`
- **Format**: JSON stringified `ConsentOptions`
- **Backup**: Cookie fallback for browsers with localStorage disabled

#### 3. Component Structure
```
CookieConsent/
├── CookieConsent.tsx        # Main banner component
├── AnalyticsProvider.tsx    # Analytics initialization
├── lib/analytics/
│   ├── index.ts             # Core analytics functions
│   ├── datafast.ts          # DataFast integration
│   ├── ahrefs.ts            # Ahrefs integration
│   └── ga4.ts               # Google Analytics 4 (optional)
└── hooks/
    └── useConsent.ts        # React hook for consent state
```

#### 4. Analytics Integration Pattern
```typescript
// Each analytics provider follows this pattern:
export function initializeProvider(): void {
  if (!hasAnalyticsConsent()) return;

  if (!isScriptLoaded(scriptSelector)) {
    injectScript(config);
    console.log('Provider initialized');
  }
}

export function removeProvider(): void {
  removeScript(scriptSelector);
  clearCookies(providerCookies);
}
```

### Component Specifications

#### CookieConsent Component

**Props:**
```typescript
interface CookieConsentProps {
  position?: 'bottom' | 'top';           // Banner position
  theme?: 'light' | 'dark' | 'auto';     // Visual theme
  accentColor?: string;                   // Brand color for buttons
  companyName?: string;                   // For privacy policy link
  privacyPolicyUrl?: string;              // Link to privacy policy
  showMarketingOption?: boolean;          // Include marketing cookies
  onConsentChange?: (consent: ConsentOptions) => void;
}
```

**Behavior:**
- Shows banner on first visit to any page (not just homepage)
- Displays small "Cookie Settings" button when consent already given
- Auto-hides after user makes selection
- Smooth slide-in animation (bottom or top)
- Responsive design (mobile-first)
- Keyboard accessible (Tab navigation, Enter to accept)

**UI States:**
1. **Initial Banner** (full width, bottom of screen)
   - Heading: "Cookie Consent"
   - Description: Brief explanation (2-3 lines)
   - Actions: "Accept All" | "Necessary Only" | "Preferences"

2. **Preferences Modal** (card overlay)
   - Tabbed interface for each cookie category
   - Toggle switches for optional categories
   - Detailed description per category
   - Actions: "Cancel" | "Save Preferences"

3. **Settings Button** (small, fixed bottom-right)
   - Appears after consent given
   - Opens preferences modal
   - Allows users to change preferences

#### AnalyticsProvider Component

**Purpose**: Handles analytics script injection based on consent

**Implementation:**
```typescript
export function AnalyticsProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Initialize analytics if consent already given
    initializeAnalytics();

    // Listen for consent changes
    setupConsentListener();
  }, [mounted]);

  return null; // Doesn't render anything
}
```

**Integration Point**: Add to root layout
```tsx
<AppProviders>
  <AnalyticsProvider />
  <Layout>
    {children}
    <CookieConsent />
  </Layout>
</AppProviders>
```

### API Design

#### Core Functions

```typescript
// Check if analytics consent is granted
export function hasAnalyticsConsent(): boolean;

// Get current consent state
export function getConsent(): ConsentOptions | null;

// Update consent programmatically
export function updateConsent(options: Partial<ConsentOptions>): void;

// Debug consent state (development only)
export function debugConsent(): void;

// Clear all consent data
export function clearConsent(): void;
```

#### Event System

```typescript
// Dispatched when consent changes
window.addEventListener('consentUpdated', (event: CustomEvent<ConsentOptions>) => {
  // Handle consent change
});

// Dispatched when consent is first granted
window.addEventListener('consentGranted', (event: CustomEvent<ConsentOptions>) => {
  // Initialize tracking
});

// Dispatched when consent is withdrawn
window.addEventListener('consentWithdrawn', (event: CustomEvent) => {
  // Remove tracking scripts
});
```

### DataFast Integration Specifics

#### Environment Configuration
```bash
# Required environment variables
DATAFAST_API_KEY=df_xxx...        # API key for server-side tracking
DATAFAST_WEBSITE_ID=dfid_xxx...   # Website identifier
NEXT_PUBLIC_SITE_DOMAIN=example.com  # Your domain (optional)
```

#### Client-Side Script Injection
```typescript
function initializeDataFast() {
  if (!hasAnalyticsConsent()) return;

  const currentDomain = window.location.hostname;
  const isProduction = currentDomain === 'yourdomain.com' ||
                       currentDomain === 'www.yourdomain.com';
  const isLocalhost = currentDomain === 'localhost' ||
                      currentDomain === '127.0.0.1';

  // Only initialize on production or localhost
  if (isProduction || isLocalhost) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://datafa.st/js/script.js';
    script.setAttribute('data-website-id', process.env.DATAFAST_WEBSITE_ID);
    script.setAttribute('data-domain', isProduction ? 'yourdomain.com' : 'localhost');

    document.head.appendChild(script);
  }
}
```

#### Server-Side API Route
**File**: `app/api/datafast/route.ts`

**Endpoints:**
- `POST /api/datafast` - Track goals and payments
- `GET /api/datafast?visitor_id={id}` - Retrieve visitor data

**Request Format (Goal Tracking):**
```json
{
  "type": "goal",
  "datafast_visitor_id": "visitor_xxx",
  "name": "goal_name",
  "metadata": {
    "custom_property": "value"
  }
}
```

**Request Format (Payment Tracking):**
```json
{
  "type": "payment",
  "amount": 2999,
  "currency": "USD",
  "transaction_id": "txn_xxx",
  "datafast_visitor_id": "visitor_xxx",
  "email": "user@example.com"
}
```

---

## UI/UX Specifications

### Visual Design

#### Banner (Initial State)
```
┌────────────────────────────────────────────────────────────┐
│ Cookie Consent                                              │
│                                                              │
│ We use cookies to enhance your experience and analyze       │
│ traffic. Choose your preferences below.                     │
│                                                              │
│  [Preferences]  [Necessary Only]  [Accept All]              │
└────────────────────────────────────────────────────────────┘
```

#### Preferences Modal
```
┌──────────────────────────────────────┐
│ Cookie Preferences               × │
├──────────────────────────────────────┤
│ [Essential] [Functional] [Analytics] │
├──────────────────────────────────────┤
│                                       │
│ Analytics Cookies                     │
│ Help us improve by collecting        │
│ anonymous usage data.                 │
│                                       │
│                           [Toggle: ●] │
│                                       │
├──────────────────────────────────────┤
│           [Cancel]  [Save Preferences]│
└──────────────────────────────────────┘
```

#### Settings Button (After Consent)
```
                    ┌──────────────┐
                    │Cookie Settings│
                    └──────────────┘
```

### Accessibility

- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Screen Readers**: Proper heading hierarchy and descriptions
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)

### Responsive Behavior

**Desktop (> 768px)**
- Banner: Full width, 80px height, bottom fixed
- Modal: Center screen, max-width 500px
- Settings button: Fixed bottom-right, 16px padding

**Mobile (≤ 768px)**
- Banner: Full width, auto height, bottom fixed
- Modal: Full width, slides up from bottom
- Settings button: Smaller, 8px padding
- Buttons stack vertically

---

## Implementation Guide

### Step 1: Copy Component Files
```bash
# Copy these files to your project:
components/CookieConsent.tsx
components/AnalyticsProvider.tsx
lib/analytics/index.ts
lib/analytics/datafast.ts
```

### Step 2: Install Dependencies
```bash
# If using shadcn/ui components:
pnpm add @radix-ui/react-switch @radix-ui/react-tabs

# Or copy these components:
components/ui/button.tsx
components/ui/card.tsx
components/ui/switch.tsx
components/ui/tabs.tsx
components/ui/label.tsx
```

### Step 3: Configure Environment
```bash
# Add to .env.local:
DATAFAST_API_KEY=your_api_key
DATAFAST_WEBSITE_ID=your_website_id
```

### Step 4: Add to Layout
```tsx
// app/layout.tsx
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { CookieConsent } from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

### Step 5: Update Analytics Config
```typescript
// lib/analytics/index.ts
// Update these values for your project:
const isProduction = currentDomain === 'yourdomain.com';
script.setAttribute('data-website-id', 'YOUR_DATAFAST_ID');
```

### Step 6: Test
```bash
# Test in development:
pnpm dev

# In browser console:
debugAnalyticsConsent()  # Check consent state
localStorage.clear()      # Reset consent for testing
```

---

## Configuration Options

### Customization Points

```typescript
// lib/analytics/config.ts
export const analyticsConfig = {
  // DataFast
  datafast: {
    enabled: true,
    websiteId: process.env.DATAFAST_WEBSITE_ID,
    domains: {
      production: 'yourdomain.com',
      development: 'localhost'
    }
  },

  // Ahrefs
  ahrefs: {
    enabled: true,
    key: 'your_ahrefs_key'
  },

  // Google Analytics 4 (optional)
  ga4: {
    enabled: false,
    measurementId: 'G-XXXXXXXXXX'
  },

  // Consent settings
  consent: {
    expirationMonths: 12,
    showMarketingOption: false,
    defaultPosition: 'bottom',
    theme: 'auto'
  }
};
```

---

## Testing Checklist

### Functional Testing
- [ ] Banner appears on first visit to any page
- [ ] Banner does not appear if consent already given
- [ ] "Accept All" grants all consents and hides banner
- [ ] "Necessary Only" grants only necessary consent
- [ ] "Preferences" opens detailed modal
- [ ] Preferences can be saved from modal
- [ ] Settings button appears after consent given
- [ ] Settings button reopens preferences modal
- [ ] Consent persists across page refreshes
- [ ] Consent expires after 12 months
- [ ] Analytics scripts load only with consent

### DataFast Testing
- [ ] Script loads on production domain
- [ ] Script loads on localhost
- [ ] Pageviews are tracked
- [ ] Visitor ID is generated and persisted
- [ ] Goal tracking API returns 200
- [ ] Payment tracking API works (if used)
- [ ] Visitor data retrieval works

### Cross-Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces properly
- [ ] Focus indicators visible
- [ ] Color contrast passes WCAG AA
- [ ] Touch targets > 44x44px (mobile)

### Performance Testing
- [ ] Lighthouse score impact < 5 points
- [ ] LCP impact < 50ms
- [ ] No CLS from banner appearance
- [ ] Script loads async/deferred

---

## Privacy & Compliance

### GDPR Requirements
✅ **Explicit Consent**: Users must actively accept cookies
✅ **Granular Control**: Users can choose cookie categories
✅ **Easy Withdrawal**: Settings accessible at any time
✅ **Information**: Clear explanation of cookie purposes
✅ **Storage Limitation**: 12-month expiration
✅ **No Consent = No Tracking**: Analytics blocked by default

### Cookie Categories Explained

**Necessary Cookies**
- Purpose: Essential site functionality
- Consent Required: No (legitimate interest)
- Examples: Session management, security tokens
- Storage: Session or persistent

**Functional Cookies**
- Purpose: Enhanced user experience
- Consent Required: Yes
- Examples: Language preference, theme selection
- Storage: Persistent (12 months)

**Analytics Cookies**
- Purpose: Usage statistics, performance monitoring
- Consent Required: Yes
- Examples: DataFast, Ahrefs, Google Analytics
- Storage: Persistent (varies by provider)

**Marketing Cookies** (Optional)
- Purpose: Advertising, retargeting
- Consent Required: Yes
- Examples: Meta Pixel, Google Ads
- Storage: Persistent (varies by provider)

---

## Troubleshooting

### Common Issues

#### 1. Analytics Not Tracking
**Symptoms**: No pageviews in DataFast dashboard

**Checks**:
```javascript
// In browser console:
debugAnalyticsConsent()  // Check consent status
document.querySelector('script[src*="datafa.st"]')  // Verify script loaded
document.cookie  // Check for datafast_visitor_id cookie
```

**Solutions**:
- Verify consent was granted (check localStorage)
- Check ad blockers aren't blocking DataFast
- Verify correct domain in DataFast dashboard
- Check browser console for errors

#### 2. Banner Shows on Every Page
**Symptoms**: Cookie banner reappears after refresh

**Checks**:
```javascript
localStorage.getItem('cookie-consent')  // Should return JSON object
```

**Solutions**:
- Check localStorage is not disabled
- Verify saveConsent() is called on button clicks
- Check for localStorage quota exceeded errors

#### 3. Analytics Loads Without Consent
**Symptoms**: Scripts load before user accepts

**Checks**:
- Verify AnalyticsProvider checks hasAnalyticsConsent()
- Check for hardcoded scripts in HTML
- Verify no duplicate initialization

**Solutions**:
- Remove any <script> tags in layout
- Ensure all analytics use consent-based loading
- Check for browser extensions auto-injecting scripts

#### 4. Server-Side API Errors
**Symptoms**: 503 errors from /api/datafast

**Checks**:
```bash
# Verify environment variable
echo $DATAFAST_API_KEY
```

**Solutions**:
- Add DATAFAST_API_KEY to .env.local
- Add to Vercel environment variables
- Restart dev server after adding
- Check API key is valid in DataFast dashboard

---

## Migration Guide

### From Existing Cookie Banner

**Step 1**: Audit current implementation
```bash
# Find existing cookie/consent code:
grep -r "cookie.*consent" .
grep -r "analytics.*init" .
```

**Step 2**: Remove old implementation
- Delete old cookie banner component
- Remove hardcoded analytics scripts
- Clear old localStorage keys

**Step 3**: Install new system (see Implementation Guide above)

**Step 4**: Migrate existing consent (optional)
```typescript
// One-time migration script
function migrateOldConsent() {
  const oldConsent = localStorage.getItem('old-consent-key');
  if (oldConsent) {
    const newConsent = {
      necessary: true,
      functional: oldConsent.includes('functional'),
      analytics: oldConsent.includes('analytics'),
      lastUpdated: Date.now()
    };
    localStorage.setItem('cookie-consent', JSON.stringify(newConsent));
    localStorage.removeItem('old-consent-key');
  }
}
```

---

## Future Enhancements

### v1.1 (Planned)
- [ ] Cookie fallback for browsers without localStorage
- [ ] Multi-language support
- [ ] Custom consent categories
- [ ] Analytics provider plugins (GA4, Plausible, etc.)
- [ ] Consent documentation export (GDPR compliance proof)

### v1.2 (Ideas)
- [ ] A/B testing for consent rates
- [ ] Geolocation-based banner (GDPR regions only)
- [ ] Consent heatmaps
- [ ] Admin dashboard for consent analytics
- [ ] WordPress plugin
- [ ] Shopify app

---

## Support & Resources

### Documentation
- Implementation guide (this document)
- API reference: `/documentation/api/analytics.md`
- DataFast guide: `/documentation/marketing/datafast-guide.md`

### Example Projects
- Next.js 15: `michikanji.com` (reference implementation)
- Next.js 14: `llanai.com` (original implementation)

### Debug Commands
```javascript
// Browser console helpers:
debugAnalyticsConsent()        // Check consent state
localStorage.clear()           // Reset for testing
getDataFastVisitorId()        // Get visitor ID
trackConversion({name: 'test'}) // Test goal tracking
```

---

## Changelog

### v1.0 (2026-01-13)
- Initial release
- DataFast integration
- Ahrefs integration
- GDPR-compliant consent management
- Responsive UI with shadcn/ui
- Next.js 15 App Router support
- localStorage persistence
- 12-month expiration
- Reusable architecture

---

## License & Credits

**License**: MIT (use freely in any project)

**Credits**:
- UI Components: [shadcn/ui](https://ui.shadcn.com)
- Analytics: [DataFast](https://datafa.st)
- Icons: [Lucide](https://lucide.dev)

**Maintainer**: Ari / MichiKanji team

---

## Appendix: Code Snippets

### Complete AnalyticsProvider
```typescript
'use client';

import { useEffect, useState } from 'react';
import { initializeAnalytics, setupConsentListener } from '@/lib/analytics';

export function AnalyticsProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    initializeAnalytics();
    setupConsentListener();
  }, [mounted]);

  return null;
}
```

### DataFast Visitor ID Helper
```typescript
export function getDataFastVisitorId(): string {
  if (typeof window === 'undefined') return '';

  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'datafast_visitor_id') {
      return decodeURIComponent(value);
    }
  }
  return '';
}
```

### Custom Hook for Consent
```typescript
// hooks/useConsent.ts
import { useState, useEffect } from 'react';

export function useConsent() {
  const [consent, setConsent] = useState<ConsentOptions | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      setConsent(JSON.parse(stored));
    }

    const handler = (e: CustomEvent) => {
      setConsent(e.detail);
    };

    window.addEventListener('consentUpdated', handler as any);
    return () => window.removeEventListener('consentUpdated', handler as any);
  }, []);

  return {
    consent,
    hasAnalyticsConsent: consent?.analytics ?? false,
    hasFunctionalConsent: consent?.functional ?? false
  };
}
```

---

**End of Document**
