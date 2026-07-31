import { ReactNode } from "react";
import { Viewport } from "next";
import Script from "next/script";
import { getSEOTags } from "@/lib/seo";
import { SITE_URL, SITE_NAME, SITE_LOGO } from "@/lib/seo/site";
import { AppProviders } from './providers';
import ClientLayout from "@/components/LayoutClient";
// Import JsonLd component
import { JsonLd } from "@/lib/jsonld";
import { CookieConsent } from "@/components/CookieConsent";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import Footer from "@/components/sections/Footer";
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

        {/* DataFast Analytics - Privacy-friendly, loads immediately */}
        <script
          defer
          data-website-id="dfid_yWGzMf4z22IEHANBbTIqo"
          data-domain="michikanji.com"
          src="https://datafa.st/js/script.js"
        />

        {/* Site-wide entity graph. Every URL derives from config.domainName so the
            entity resolves to the canonical host rather than the redirecting apex. */}
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: SITE_NAME,
              url: SITE_URL,
              logo: {
                '@type': 'ImageObject',
                url: SITE_LOGO.url,
                width: SITE_LOGO.width,
                height: SITE_LOGO.height
              },
              sameAs: [
                'https://twitter.com/just_aristides',
              ]
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: `${SITE_NAME} - Japanese Kanji Stroke Order Dictionary`,
              url: SITE_URL,
              description: 'Learn Japanese kanji with interactive stroke order diagrams. Master the correct way to write JLPT kanji characters with animated guides.',
              publisher: {
                '@type': 'Organization',
                name: SITE_NAME,
                url: SITE_URL,
                logo: {
                  '@type': 'ImageObject',
                  url: SITE_LOGO.url,
                  width: SITE_LOGO.width,
                  height: SITE_LOGO.height
                }
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE_URL}/kanji?search={search_term_string}`,
                'query-input': 'required name=search_term_string'
              }
            },
            {
              '@context': 'https://schema.org',
              '@type': 'EducationalOrganization',
              name: `${SITE_NAME} Dictionary`,
              url: SITE_URL,
              description: 'Interactive Japanese kanji learning platform with stroke order animations for JLPT exam preparation.'
            }
          ]
        }} />
      </head>
      <body>
        {/* react-scan render profiler - dev only, never shipped to production */}
        {process.env.NODE_ENV !== 'production' && (
          <Script
            src="//unpkg.com/react-scan/dist/auto.global.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
        {/* AnalyticsProvider handles consent-gated analytics (Ahrefs) */}
        <AppProviders>
          <AnalyticsProvider />
          <ClientLayout>
            {children}
            {/* Site-wide, NOT per-page. The footer carries the KanjiVG
                (CC BY-SA 3.0) attribution, and will carry the EDRDG and Tatoeba
                acknowledgements. EDRDG's licence requires the acknowledgement
                "on each screen display", and CC BY-SA attribution must travel
                with the copies you distribute — so it has to render on
                /kanji/[character], which is where the licensed SVGs actually
                appear. It previously did not.
                See docs/prd/content-source-licence-investigation.md §0. */}
            <Footer />
            <CookieConsent />
            <FeedbackWidget />
          </ClientLayout>
        </AppProviders>
      </body>
    </html>
  );
}
