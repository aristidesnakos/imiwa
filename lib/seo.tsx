import type { Metadata } from "next";
import config from "@/config";
import { shareCardImage } from "@/lib/seo/share-cards";

type LocationInfo = {
  cityName: string;
  regionName: string;
  countryCode: string;
  state?: string;
};

export const getSEOTags = ({
  title,
  description,
  keywords,
  openGraph,
  canonicalUrlRelative,
  extraTags
}: Metadata & {
  canonicalUrlRelative?: string;
  extraTags?: Record<string, any>;
  location?: LocationInfo;
} = {}): Metadata => {
  const pageTitle = title || `${config.appName} - ${config.appDescription}`;

  const pageDescription = description || config.appDescription;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: keywords || config.keywords || [
      'saas',
      'startup',
      'nextjs',
      config.appName
    ],
    applicationName: config.appName,
    metadataBase: new URL(
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/"
        : `https://${config.domainName}/`
    ),

    openGraph: {
      // og:type is always emitted: Facebook's debugger flags a page without
      // one, and until 2026-10-13 this dropped the `type` every page passed.
      type: (openGraph && 'type' in openGraph && openGraph.type) || 'website',
      title: openGraph?.title || pageTitle,
      description: openGraph?.description || pageDescription,
      url: openGraph?.url || `https://${config.domainName}${canonicalUrlRelative || ''}`,
      siteName: config.appName,
      // A page that names no card of its own shares as the homepage's, the
      // branded one (lib/seo/share-cards.ts). Until 2026-10-23 this was the
      // navy app/opengraph-image.tsx card, which had no Tan and no palette.
      images: openGraph?.images || [shareCardImage('home')],
      locale: openGraph?.locale || 'en_US',
    },

    twitter: {
      title: openGraph?.title || pageTitle,
      description: openGraph?.description || pageDescription,
      card: "summary_large_image",
      images: openGraph?.images ? undefined : [shareCardImage('home').url],
    },

    alternates: {
      canonical: `https://${config.domainName}${canonicalUrlRelative || ''}`,
    },

    ...extraTags,
  };
};

// Export renderSchemaTags if needed
export const renderSchemaTags = (/* parameters */) => {
  // Existing function logic...
};