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

export const metadata = getSEOTags({
  title: "Learn Japanese Kanji with Stroke Order - Interactive Kanji Dictionary",
  description: "Master Japanese kanji with interactive stroke order diagrams. Search JLPT N5, N4, N3, N2, and N1 kanji by character, meaning, or reading. Learn proper stroke order through animated guides.",
  canonicalUrlRelative: "/",
});

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
              name: 'MichiKanji',
              url: 'https://michikanji.com',
              logo: 'https://michikanji.com/logo.png',
              sameAs: [
                'https://twitter.com/just_aristides',
              ]
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'MichiKanji - Japanese Kanji Stroke Order Dictionary',
              url: 'https://michikanji.com',
              description: 'Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write JLPT kanji characters with animated guides.',
              publisher: {
                '@type': 'Organization',
                name: 'MichiKanji',
                url: 'https://michikanji.com',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://michikanji.com/logo.png'
                }
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://michikanji.com/kanji?search={search_term_string}',
                'query-input': 'required name=search_term_string'
              }
            },
            {
              '@context': 'https://schema.org',
              '@type': 'EducationalOrganization',
              name: 'MichiKanji Dictionary',
              url: 'https://michikanji.com',
              description: 'Interactive Japanese kanji learning platform with stroke order animations for JLPT exam preparation.'
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
