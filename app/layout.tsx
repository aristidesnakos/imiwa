import { ReactNode } from "react";
import { Viewport } from "next";
import Script from "next/script";
import { getSEOTags } from "@/lib/seo";
import { AppProviders } from './providers';
import ClientLayout from "@/components/LayoutClient";
// Import JsonLd component
import { JsonLd } from "@/lib/jsonld";
import { CookieConsent } from "@/components/CookieConsent";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "./globals.css";

// Font is managed through globals.css with Nunito and Bangers

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata = getSEOTags();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="font-nunito">
      <head>
        {/* Resource hints for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://pbs.twimg.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        
        {/* Analytics scripts are now loaded conditionally via AnalyticsProvider */}
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Llanai',
              url: 'https://llanai.com',
              logo: 'https://llanai.com/logo.png',
              sameAs: [
                'https://twitter.com/just_aristides',
              ]
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Llanai - Language Learning Journal',
              url: 'https://llanai.com',
              description: 'Your personal language learning journal with minimal AI guidance. Practice writing in multiple languages and track your progress over time.',
              publisher: {
                '@type': 'Organization',
                name: 'Llanai',
                url: 'https://llanai.com',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://llanai.com/logo.png'
                }
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://llanai.com/search?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              }
            }
          ]
        }} />
      </head>
      <body>
        <Script
          src="//unpkg.com/react-scan/dist/auto.global.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        {/* Peasy analytics is now handled by AnalyticsProvider */}
        <AppProviders>
          <AnalyticsProvider>
            <ClientLayout>
              {children}
              <CookieConsent />
            </ClientLayout>
          </AnalyticsProvider>
        </AppProviders>
      </body>
    </html>
  );
}
