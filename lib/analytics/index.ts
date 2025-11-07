// Analytics service to handle conditional loading of analytics scripts

// Analytics configuration
const ANALYTICS_CONFIG = {
  ahrefs: {
    src: 'https://analytics.ahrefs.com/analytics.js',
    dataKey: 'y2KOOjqcvhiNu078UeIYyw', //change this to the data-key value provided by Ahrefs
    selector: 'script[src*="analytics.ahrefs.com"]'
  },
  // PostHog is handled separately in app/providers.js
  // but we include it here for documentation purposes
  posthog: {
    // PostHog is initialized via its own provider
    isConfigured: true
  }
};

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

// Remove all analytics scripts
function removeAnalyticsScripts(): void {
  try {
    // Remove Ahrefs scripts
    const ahrefsScripts = document.querySelectorAll(ANALYTICS_CONFIG.ahrefs.selector);
    ahrefsScripts.forEach(script => script.remove());

    console.log('Analytics scripts removed');
  } catch (error) {
    console.error('Error removing analytics scripts:', error);
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
