// Analytics service to handle conditional loading of analytics scripts

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Analytics configuration
const ANALYTICS_CONFIG = {
  ahrefs: {
    src: 'https://analytics.ahrefs.com/analytics.js',
    dataKey: 'y2KOOjqcvhiNu078UeIYyw', //change this to the data-key value provided by Ahrefs
    selector: 'script[src*="analytics.ahrefs.com"]'
  },
  datafast: {
    src: 'https://datafa.st/js/script.js',
    websiteId: 'dfid_yWGzMf4z22IEHANBbTIqo',
    selector: 'script[src*="datafa.st/js/script.js"]'
  }
};

export interface ConversionData {
  name: string;
  properties?: Record<string, any>;
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

// Initialize all analytics scripts if consent is given
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  if (!hasAnalyticsConsent()) {
    console.log('Analytics consent not given, skipping initialization');
    return;
  }

  initializeAhrefsAnalytics();
  initializeDataFastAnalytics();
}

// Initialize Ahrefs analytics
function initializeAhrefsAnalytics(): void {
  try {
    const { src, dataKey, selector } = ANALYTICS_CONFIG.ahrefs;

    // Check if script already exists to avoid duplicates
    if (document.querySelector(selector)) {
      console.log('Ahrefs analytics script already loaded');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.setAttribute('data-key', dataKey);
    document.head.appendChild(script);
    console.log('Ahrefs analytics initialized');
  } catch (error) {
    console.error('Error initializing Ahrefs analytics:', error);
  }
}

// Initialize DataFast analytics
function initializeDataFastAnalytics(): void {
  try {
    const { src, websiteId, selector } = ANALYTICS_CONFIG.datafast;

    // Check if script already exists to avoid duplicates
    if (document.querySelector(selector)) {
      console.log('DataFast analytics script already loaded');
      return;
    }

    // Get current domain dynamically
    const currentDomain = window.location.hostname;
    const isProduction = currentDomain === 'michikanji.com' || currentDomain === 'www.michikanji.com';
    const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    
    // Only initialize on production domain or localhost for testing
    if (isProduction || isLocalhost) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = src;
      script.setAttribute('data-website-id', websiteId);
      
      // Use appropriate domain for DataFast
      const datafastDomain = isProduction ? 'michikanji.com' : 'localhost';
      script.setAttribute('data-domain', datafastDomain);
      
      document.head.appendChild(script);
      console.log(`DataFast analytics initialized for domain: ${datafastDomain}`);
    } else {
      console.log(`DataFast not initialized for domain: ${currentDomain}`);
    }
  } catch (error) {
    console.error('Error initializing DataFast analytics:', error);
  }
}

// Remove all analytics scripts
function removeAnalyticsScripts(): void {
  try {
    // Remove Ahrefs scripts
    const ahrefsScripts = document.querySelectorAll(ANALYTICS_CONFIG.ahrefs.selector);
    ahrefsScripts.forEach(script => script.remove());

    // Remove DataFast scripts
    const datafastScripts = document.querySelectorAll(ANALYTICS_CONFIG.datafast.selector);
    datafastScripts.forEach(script => script.remove());

    console.log('Analytics scripts removed');
  } catch (error) {
    console.error('Error removing analytics scripts:', error);
  }
}

// Get DataFast visitor ID
export function getDataFastVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // DataFast typically stores visitor ID in localStorage or as a cookie
    const visitorId = localStorage.getItem('datafast_visitor_id') || 
                     document.cookie
                       .split('; ')
                       .find(row => row.startsWith('datafast_visitor_id='))
                       ?.split('=')[1];
    
    return visitorId || null;
  } catch (error) {
    console.warn('Error getting DataFast visitor ID:', error);
    return null;
  }
}

// Debug analytics consent
export function debugAnalyticsConsent(): void {
  if (typeof window === 'undefined') {
    console.log('Server-side: Cannot check consent');
    return;
  }
  
  const consent = localStorage.getItem('cookie-consent');
  console.log('Cookie consent data:', consent);
  
  if (consent) {
    try {
      const parsed = JSON.parse(consent);
      console.log('Parsed consent:', parsed);
      console.log('Analytics consent granted:', parsed.analytics === true);
    } catch (error) {
      console.error('Error parsing consent:', error);
    }
  } else {
    console.log('No consent data found');
  }
}

// Track conversion/goal events
export async function trackConversion(data: ConversionData): Promise<void> {
  if (!hasAnalyticsConsent()) {
    console.log('Analytics consent not granted, skipping conversion tracking');
    return;
  }
  
  const visitorId = getDataFastVisitorId();
  if (!visitorId) {
    console.warn('No DataFast visitor ID found, cannot track conversion');
    return;
  }
  
  try {
    const response = await fetch('/api/datafast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'goal',
        datafast_visitor_id: visitorId,
        name: data.name,
        metadata: {
          page_url: window.location.href,
          page_title: document.title,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ...data.properties
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`DataFast API error: ${response.status}`);
    }
    
    console.log('Conversion tracked successfully:', data.name);
  } catch (error) {
    console.error('Error tracking conversion:', error);
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
      removeAnalyticsScripts();
    }
  });
}
