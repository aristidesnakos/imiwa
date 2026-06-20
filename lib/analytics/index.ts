// Analytics service for DataFast tracking and consent-gated analytics (Ahrefs)
// Note: DataFast script loads directly in layout.tsx without consent requirement

// Type definitions for DataFast events
export interface ConversionEvent {
  name: string;
  properties?: Record<string, any>;
  visitor_id?: string;
}

// Check if analytics consent is given
export function hasAnalyticsConsent(): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const consent = localStorage.getItem('cookie-consent');
    if (!consent) return false;

    const { analytics } = JSON.parse(consent);
    return !!analytics;
  } catch (error) {
    console.error('Error checking analytics consent:', error);
    return false;
  }
}

// Get DataFast visitor ID from cookie
export function getDataFastVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    // DataFast stores visitor ID in a cookie named 'datafast_visitor_id'
    // Extract from document.cookie since we're on client-side
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'datafast_visitor_id') {
        return decodeURIComponent(value);
      }
    }
    
    // If no cookie found, DataFast hasn't loaded yet or user is new
    // Return empty string so the event can be queued until DataFast initializes
    return '';
  } catch (error) {
    console.error('Error getting DataFast visitor ID:', error);
    return '';
  }
}

// Wait for the DataFast visitor cookie to appear.
//
// The DataFast script loads with `defer` (see app/layout.tsx), so its cookie is
// set *after* the page parses. A conversion fired early — e.g. an email signup
// or Pro CTA click in the first moments on a page — would read an empty cookie
// and be dropped. That biased every conversion rate downward by an unknown,
// device-dependent amount, which broke the Phase 0 decision gate. We now poll
// briefly for the cookie before giving up so timing no longer loses goals.
async function waitForVisitorId(timeoutMs = 5000, intervalMs = 250): Promise<string> {
  let id = getDataFastVisitorId();
  const deadline = Date.now() + timeoutMs;
  while (!id && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    id = getDataFastVisitorId();
  }
  return id;
}

// POST a goal to our DataFast proxy. Pulled out so both the fast (cookie ready)
// and deferred (cookie pending) paths share one body.
async function sendGoal(visitorId: string, event: ConversionEvent): Promise<void> {
  await fetch('/api/datafast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'goal',
      datafast_visitor_id: visitorId,
      name: event.name,
      metadata: {
        ...event.properties,
        page_url: window.location.href,
        page_title: document.title,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    }),
  });
}

// Track conversion event via DataFast
// Note: DataFast is privacy-friendly and doesn't require consent
export async function trackConversion(event: ConversionEvent): Promise<void> {
  if (typeof window === 'undefined') return;

  const immediateId = event.visitor_id || getDataFastVisitorId();

  // Fast path: cookie is already set, so send now and let the caller await
  // delivery — useful when the goal is fired right before a navigation.
  if (immediateId) {
    try {
      await sendGoal(immediateId, event);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
    return;
  }

  // Slow path: the DataFast script loads `defer`, so on early clicks the cookie
  // isn't set yet. Poll for it in the BACKGROUND and resolve immediately — many
  // callers `await` this inside click handlers (incl. external target="_blank"
  // CTAs), so blocking here would hang the UI for up to 5s. Backgrounding still
  // recovers goals that previously dropped, without the UX cost.
  void (async () => {
    try {
      const visitorId = await waitForVisitorId();
      // Cookie never appeared (ad-blocker, privacy browser, or script blocked).
      // Warn distinctly so genuine drops are countable, not confused with timing.
      if (!visitorId) {
        console.warn(`DataFast goal "${event.name}" dropped: no visitor ID after wait`);
        return;
      }
      await sendGoal(visitorId, event);
    } catch (error) {
      console.error('Error tracking conversion (deferred):', error);
    }
  })();
}

// Get visitor data from DataFast
export async function getVisitorData(visitorId?: string): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  try {
    const id = visitorId || getDataFastVisitorId();
    
    if (!id) {
      console.log('DataFast visitor ID not available');
      return null;
    }
    
    const response = await fetch(`/api/datafast?visitor_id=${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch visitor data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching visitor data:', error);
    return null;
  }
}

// Debug function to check consent status
export function debugAnalyticsConsent(): void {
  if (typeof window === 'undefined') return;
  
  const consent = localStorage.getItem('cookie-consent');
  console.log('Cookie consent raw:', consent);
  
  if (consent) {
    try {
      const parsed = JSON.parse(consent);
      console.log('Cookie consent parsed:', parsed);
      console.log('Analytics consent:', parsed.analytics);
    } catch (error) {
      console.error('Failed to parse consent:', error);
    }
  }
  
  console.log('hasAnalyticsConsent():', hasAnalyticsConsent());
}

// Initialize analytics if consent is given
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;
  
  if (!hasAnalyticsConsent()) {
    console.log('Analytics consent not given, skipping initialization');
    console.log('To debug consent, call debugAnalyticsConsent() in console');
    return;
  }

  try {
    // DataFast is loaded directly in layout.tsx head (privacy-friendly, no consent needed)

    // Initialize Ahrefs (consent-gated)
    if (!document.querySelector('script[src*="analytics.ahrefs.com"]')) {
      var ahrefs_analytics_script = document.createElement('script');
      ahrefs_analytics_script.async = true;
      ahrefs_analytics_script.src = 'https://analytics.ahrefs.com/analytics.js';
      ahrefs_analytics_script.setAttribute('data-key', 'y2KOOjqcvhiNu078UeIYyw');
      document.getElementsByTagName('head')[0].appendChild(ahrefs_analytics_script);
      console.log('Ahrefs analytics initialized');
    }
  } catch (error) {
    console.error('Error initializing analytics:', error);
  }
}

// Listen for consent changes
export function setupConsentListener(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('consentUpdated', (event) => {
    const { detail } = event as CustomEvent;

    if (detail?.analytics) {
      initializeAnalytics();
    } else {
      // Remove consent-gated analytics scripts if consent is withdrawn
      // Note: DataFast remains as it's privacy-friendly and doesn't require consent
      const ahrefsScripts = document.querySelectorAll('script[src*="analytics.ahrefs.com"]');
      ahrefsScripts.forEach(script => script.remove());
    }
  });
}

// Named DataFast goal-event wrappers
// These keep raw goal-name strings out of call sites so callers use typed helpers

// Generic goal passthrough to trackConversion
export async function trackGoal(name: string, properties?: Record<string, any>): Promise<void> {
  await trackConversion({ name, properties });
}

// Where a Pro CTA was shown/clicked. The decision gate compares conversion by
// location ("if milestone prompts out-convert the nav CTA, retention anxiety is
// the buying trigger"), so every Pro event MUST carry its location — otherwise
// that comparison can't be run at all.
export type ProCtaLocation = 'nav' | 'review' | 'milestone' | 'pro_page';

// Track an email signup; source identifies which page/offer the signup came from
export async function trackEmailSignup(source: string, properties?: Record<string, any>): Promise<void> {
  await trackGoal('email_signup', { source, ...properties });
}

// Track a click on a Pro call-to-action. `location` is required so clicks from
// the nav (every page) are never conflated with clicks on the review page when
// computing the gate's rate.
export async function trackProCtaClick(location: ProCtaLocation, properties?: Record<string, any>): Promise<void> {
  await trackGoal('pro_cta_click', { location, ...properties });
}

// Track a signup for the Pro waitlist. `location` ties the conversion back to
// the CTA that drove it, mirroring trackProCtaClick.
export async function trackProWaitlistSignup(location: ProCtaLocation, properties?: Record<string, any>): Promise<void> {
  await trackGoal('pro_waitlist_signup', { location, ...properties });
}
