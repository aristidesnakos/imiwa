# DataFast Analytics Implementation Guide

## Overview

This document details the implementation of DataFast analytics tracking in our Next.js application, including client-side script integration, server-side API tracking capabilities, and visitor data retrieval.

## Architecture

Our DataFast implementation consists of four main components:

1. **Client-side tracking script** - Automatic pageview and interaction tracking
2. **Server-side API integration** - Custom goal tracking and payment tracking
3. **Visitor data API** - Retrieve visitor information and analytics data
4. **Consent management** - GDPR-compliant analytics initialization

## Implementation Details

### 1. Client-Side Script Integration

**File**: `/lib/analytics/index.ts`

The DataFast tracking script is dynamically loaded based on user consent and environment:

```typescript
// Initialize DataFast
if (!document.querySelector('script[src*="datafa.st/js/script.js"]')) {
  // Get current domain dynamically
  const currentDomain = window.location.hostname;
  const isProduction = currentDomain === 'llanai.com' || currentDomain === 'www.llanai.com';
  const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
  
  // Only initialize on production domain or localhost for testing
  if (isProduction || isLocalhost) {
    var datafast_script = document.createElement('script');
    datafast_script.defer = true;
    datafast_script.src = 'https://datafa.st/js/script.js';
    datafast_script.setAttribute('data-website-id', 'dfid_FAsFY9Wwgku8ZuScfcbZ1');
    
    // Use appropriate domain for DataFast
    const datafastDomain = isProduction ? 'llanai.com' : 'localhost';
    datafast_script.setAttribute('data-domain', datafastDomain);
    
    document.getElementsByTagName('head')[0].appendChild(datafast_script);
    console.log(`DataFast initialized for domain: ${datafastDomain}`);
  }
}
```

**Key Features**:
- Dynamic domain detection for development vs production
- Consent-based initialization
- Duplicate script prevention
- Environment-specific configuration

### 2. Server-Side API Integration

**File**: `/app/api/datafast/route.ts`

Handles custom goal and payment tracking via DataFast API:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    switch (type) {
      case 'goal':
        endpoint = 'https://datafa.st/api/v1/goals';
        // DataFast expects: { datafast_visitor_id, name, metadata? }
        payload = {
          datafast_visitor_id: data.datafast_visitor_id,
          name: data.name,
          ...(data.metadata && { metadata: data.metadata })
        };
        break;
      case 'payment':
        endpoint = 'https://datafa.st/api/v1/payments';
        payload = data as DataFastPayment;
        break;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json({ error: 'Failed to process DataFast request' }, { status: 500 });
  }
}
```

### 3. Visitor Data Retrieval

**File**: `/app/api/datafast/route.ts`

Retrieve visitor analytics data via GET request:

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitor_id');

    if (!visitorId) {
      return NextResponse.json(
        { error: 'visitor_id parameter required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://datafa.st/api/v1/visitors/${visitorId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`DataFast API error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor data' },
      { status: 500 }
    );
  }
}
```

### 4. Analytics Provider Component

**File**: `/components/AnalyticsProvider.tsx`

React component that initializes DataFast analytics when the app mounts:

```typescript
export function AnalyticsProvider(): React.ReactNode {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Initialize DataFast analytics if consent already given
    initializeAnalytics();

    // Setup listener for future consent changes
    setupConsentListener();
  }, [mounted]);

  return null; // This component doesn't render anything
}
```

**Integration in layout**: Added to [app/layout.tsx:115](app/layout.tsx#L115) alongside CookieConsent component.

**Note**: The `initializeAnalytics()` function in `/lib/analytics/index.ts` handles DataFast script injection (lines 206-229) along with consent validation.

## Environment Configuration

### Required Environment Variables

```bash
# .env.local
DATAFAST_API_KEY=your_datafast_api_key_here
```

### DataFast Dashboard Configuration

- **Website ID**: `dfid_FAsFY9Wwgku8ZuScfcbZ1`
- **Allowed Domains**: 
  - Production: `llanai.com`
  - Development: `localhost` (for testing)

## API Payload Formats

### Goal Tracking

**Endpoint**: `POST /api/datafast`

```json
{
  "type": "goal",
  "datafast_visitor_id": "visitor_abc123xyz789",
  "name": "newsletter_signup",
  "metadata": {
    "page_url": "https://llanai.com/signup",
    "page_title": "Sign Up - Llanai",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2025-12-19T11:56:11.351Z"
  }
}
```

**DataFast API Requirements**:
- `datafast_visitor_id`: Required - Unique visitor identifier
- `name`: Required - Goal name (lowercase, max 64 chars)
- `metadata`: Optional - Custom properties (max 10, specific naming rules)

### Payment Tracking

**Endpoint**: `POST /api/datafast`

```json
{
  "type": "payment",
  "amount": 2999,
  "currency": "USD",
  "transaction_id": "txn_abc123",
  "datafast_visitor_id": "visitor_abc123xyz789",
  "email": "user@example.com",
  "timestamp": "2025-12-19T11:56:11.351Z"
}
```

### Visitor Data Retrieval

**Endpoint**: `GET /api/datafast?visitor_id={visitor_id}`

Retrieves visitor analytics data including pageviews, goals, and other tracked events.

## Client-Side Usage

### Tracking Conversions

```typescript
import { trackConversion } from '@/lib/analytics';

// Track a conversion event
await trackConversion({
  name: 'signup_completed',
  properties: {
    signup_method: 'email',
    referrer: document.referrer,
    utm_source: 'google'
  }
});
```

### Tracking Payments

```typescript
import { trackPayment } from '@/lib/analytics';

// Track a payment event
await trackPayment({
  amount: 2999,
  currency: 'USD',
  transaction_id: 'stripe_pi_abc123',
  email: 'user@example.com',
  customer_id: 'cus_abc123'
});
```

### Retrieving Visitor Data

```typescript
import { getVisitorData } from '@/lib/analytics';

// Get visitor analytics data
const visitorData = await getVisitorData();
// Or with a specific visitor ID
const visitorData = await getVisitorData('visitor_abc123xyz789');
```

## Consent Management

### Analytics Consent Check

```typescript
import { hasAnalyticsConsent } from '@/lib/analytics';

if (hasAnalyticsConsent()) {
  // Analytics tracking is enabled
  await trackConversion({ name: 'feature_used' });
}
```

### Debug Consent Issues

```typescript
import { debugAnalyticsConsent } from '@/lib/analytics';

// In browser console for debugging
debugAnalyticsConsent();
```

## Debugging

### Common Issues

1. **Script Not Loading**
   - Check browser console for errors
   - Verify consent is granted
   - Check ad blockers aren't blocking the script

2. **API 400 Errors**
   - Verify payload format matches DataFast requirements
   - Check visitor has prior pageviews
   - Ensure goal names follow naming conventions

3. **Domain Issues**
   - Verify domain configuration in DataFast dashboard
   - Check environment-specific domain handling

### Debug Commands

```javascript
// Check if DataFast script is loaded
document.querySelector('script[src*="datafa.st/js/script.js"]');

// Check analytics consent
debugAnalyticsConsent();

// Check visitor ID
getDataFastVisitorId();

// Manual consent for testing
localStorage.setItem('cookie-consent', '{"analytics": true}');
```

## Key Learnings from Implementation

### 1. API Payload Structure
- **Issue**: Initially sent `{type: "goal", ...data}` format
- **Solution**: DataFast expects direct payload `{datafast_visitor_id, name, metadata}`
- **Lesson**: Always verify API documentation for exact payload requirements

### 2. Domain Configuration
- **Issue**: Hardcoded domain prevented localhost testing
- **Solution**: Dynamic domain detection based on environment
- **Lesson**: Make domain configuration environment-aware

### 3. Consent Dependencies
- **Issue**: Analytics not initializing due to missing consent
- **Solution**: Added debug functions and consent validation
- **Lesson**: Provide clear debugging tools for consent issues

### 4. Error Handling
- **Issue**: Generic errors made debugging difficult
- **Solution**: Added detailed logging throughout the flow
- **Lesson**: Comprehensive logging is essential for API integrations

## Testing Checklist

- [ ] DataFast script loads on production domain (`llanai.com`)
- [ ] DataFast script loads on localhost for development
- [ ] Analytics consent properly blocks/enables DataFast tracking
- [ ] Goal tracking API returns 200 status
- [ ] Payment tracking API returns 200 status
- [ ] Visitor data retrieval API returns valid data
- [ ] Visitor ID generation and persistence works
- [ ] Error handling provides useful feedback
- [ ] GDPR consent management functions correctly for DataFast

## Security Considerations

1. **API Key Management**
   - Store in environment variables only
   - Never expose in client-side code
   - Use separate keys for development/production if available

2. **PII Handling**
   - Hash email addresses if required
   - Avoid sending sensitive data in metadata
   - Respect user privacy preferences

3. **Script Integrity**
   - Scripts loaded from DataFast CDN (https://datafa.st/js/script.js)
   - Consider implementing Subresource Integrity if supported

## Performance Impact

- **Script Size**: Minimal - DataFast script is lightweight
- **Load Time**: Deferred loading prevents blocking page render
- **API Calls**: Asynchronous with proper error handling
- **Client Storage**: Uses cookies for visitor ID persistence (DataFast manages this automatically)

## Summary

This implementation provides a robust, GDPR-compliant DataFast analytics solution with:

- **Automatic pageview tracking** via client-side script
- **Custom goal tracking** for conversion events
- **Payment tracking** for revenue analytics
- **Visitor data retrieval** for detailed analytics
- **Consent-based initialization** respecting user privacy preferences
- **Environment-aware configuration** for production and development testing