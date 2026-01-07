// Analytics service to handle conditional loading of analytics scripts

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

// Track conversion event via DataFast
export async function trackConversion(event: ConversionEvent): Promise<void> {
  if (typeof window === 'undefined') return;
  
  if (!hasAnalyticsConsent()) {
    console.log('Analytics consent not given, skipping conversion tracking');
    return;
  }

  try {
    const visitorId = event.visitor_id || getDataFastVisitorId();
    
    // If no visitor ID is available, skip server-side tracking
    // DataFast client-side script will handle it when it loads
    if (!visitorId) {
      console.log('DataFast visitor ID not available, skipping server-side tracking');
      return;
    }
    
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
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
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
    // Initialize Ahrefs
    if (!document.querySelector('script[src*="analytics.ahrefs.com"]')) {
      var ahrefs_analytics_script = document.createElement('script');
      ahrefs_analytics_script.async = true;
      ahrefs_analytics_script.src = 'https://analytics.ahrefs.com/analytics.js';
      ahrefs_analytics_script.setAttribute('data-key', 'y2KOOjqcvhiNu078UeIYyw');
      document.getElementsByTagName('head')[0].appendChild(ahrefs_analytics_script);
    }

    // Initialize DataFast
    if (!document.querySelector('script[src*="datafa.st/js/script.js"]')) {
      // Get current domain dynamically
      const currentDomain = window.location.hostname;
      const isProduction = currentDomain === 'michikanji.com' || currentDomain === 'www.michikanji.com';
      const isLocalhost = currentDomain === 'localhost' || currentDomain === '127.0.0.1';
      
      // Only initialize on production domain or localhost for testing
      if (isProduction || isLocalhost) {
        var datafast_script = document.createElement('script');
        datafast_script.defer = true;
        datafast_script.src = 'https://datafa.st/js/script.js';
        datafast_script.setAttribute('data-website-id', 'dfid_yWGzMf4z22IEHANBbTIqo');
        
        // Use appropriate domain for DataFast
        const datafastDomain = isProduction ? 'michikanji.com' : 'localhost';
        datafast_script.setAttribute('data-domain', datafastDomain);
        
        document.getElementsByTagName('head')[0].appendChild(datafast_script);
        console.log(`DataFast initialized for domain: ${datafastDomain}`);
      } else {
        console.log(`DataFast not initialized for domain: ${currentDomain}`);
      }
    }
    
    console.log('Analytics initialized');
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
      // Remove analytics scripts if consent is withdrawn
      const ahrefsScripts = document.querySelectorAll('script[src*="analytics.ahrefs.com"]');
      const datafastScripts = document.querySelectorAll('script[src*="datafa.st/js/script.js"]');
      [...ahrefsScripts, ...datafastScripts].forEach(script => script.remove());
    }
  });
}
