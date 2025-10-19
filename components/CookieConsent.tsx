'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Cookie consent options interface
interface ConsentOptions {
  analytics: boolean;
  functional: boolean;
  necessary: boolean; // Always true, cannot be toggled
  lastUpdated: number; // Timestamp for expiration calculation
}

// Default consent state - necessary cookies always accepted
const defaultConsent: ConsentOptions = {
  analytics: false,
  functional: false,
  necessary: true,
  lastUpdated: 0
};

export function CookieConsent() {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<ConsentOptions>(defaultConsent);
  const [mounted, setMounted] = useState(false);
  
  // Only show on home page
  const isHomePage = pathname === '/';

  // Only run on client-side to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for existing consent on mount
  useEffect(() => {
    if (!mounted) return;

    try {
      const storedConsent = localStorage.getItem('cookie-consent');

      if (storedConsent) {
        const parsedConsent = JSON.parse(storedConsent);

        // Check if consent has expired (12 months)
        const expirationTime = 365 * 24 * 60 * 60 * 1000; // 12 months in milliseconds
        const isExpired = Date.now() - parsedConsent.lastUpdated > expirationTime;

        if (isExpired) {
          setShowBanner(true);
        } else {
          setConsent(parsedConsent);
        }
      } else {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking cookie consent:', error);
      setShowBanner(true);
    }
  }, [mounted]);

  // Save consent to localStorage
  const saveConsent = (options: ConsentOptions) => {
    const consentWithTimestamp = {
      ...options,
      lastUpdated: Date.now()
    };

    localStorage.setItem('cookie-consent', JSON.stringify(consentWithTimestamp));
    setConsent(consentWithTimestamp);
    setShowBanner(false);

    // Dispatch custom event for analytics scripts to listen for
    window.dispatchEvent(new CustomEvent('consentUpdated', {
      detail: consentWithTimestamp
    }));
  };

  // Accept all cookies
  const acceptAll = () => {
    saveConsent({
      ...defaultConsent,
      analytics: true,
      functional: true,
      necessary: true,
      lastUpdated: Date.now()
    });
  };

  // Accept only necessary cookies
  const acceptNecessary = () => {
    saveConsent({
      ...defaultConsent,
      analytics: false,
      functional: false,
      necessary: true,
      lastUpdated: Date.now()
    });
  };

  // Update specific consent option
  const updateConsentOption = (option: keyof Omit<ConsentOptions, 'lastUpdated' | 'necessary'>, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [option]: value
    }));
  };

  // Save preferences from the detailed view
  const savePreferences = () => {
    saveConsent({
      ...consent,
      lastUpdated: Date.now()
    });
    setShowPreferences(false);
  };

  // Don't render anything during SSR to avoid hydration issues or if not on home page
  if (!mounted || !isHomePage) return null;

  if (!showBanner && !showPreferences) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 text-xs"
        onClick={() => setShowPreferences(true)}
      >
        Cookie Settings
      </Button>
    );
  }

  if (showPreferences) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md z-50 shadow-lg">
        <CardHeader>
          <CardTitle>Cookie Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="essential">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="essential">Essential</TabsTrigger>
              <TabsTrigger value="functional">Functional</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="essential">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="necessary" className="font-medium">Necessary Cookies</Label>
                  <p className="text-sm text-gray-500">Required for the website to function. Cannot be disabled.</p>
                </div>
                <Switch id="necessary" checked disabled />
              </div>
            </TabsContent>
            <TabsContent value="functional">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="functional" className="font-medium">Functional Cookies</Label>
                  <p className="text-sm text-gray-500">Enhance functionality and personalization.</p>
                </div>
                <Switch
                  id="functional"
                  checked={consent.functional}
                  onCheckedChange={(checked) => updateConsentOption('functional', checked)}
                />
              </div>
            </TabsContent>
            <TabsContent value="analytics">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="analytics" className="font-medium">Analytics Cookies</Label>
                  <p className="text-sm text-gray-500">Help us improve by collecting anonymous usage data.</p>
                </div>
                <Switch
                  id="analytics"
                  checked={consent.analytics}
                  onCheckedChange={(checked) => updateConsentOption('analytics', checked)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowPreferences(false)}>Cancel</Button>
          <Button onClick={savePreferences}>Save Preferences</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Cookie Consent</h3>
            <p className="text-sm text-gray-500">
              We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={() => setShowPreferences(true)}>
              Preferences
            </Button>
            <Button variant="outline" onClick={acceptNecessary}>
              Necessary Only
            </Button>
            <Button onClick={acceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
