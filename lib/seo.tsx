import type { Metadata } from "next";
import config from "@/config";

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
      title: openGraph?.title || pageTitle,
      description: openGraph?.description || pageDescription,
      url: openGraph?.url || `https://${config.domainName}${canonicalUrlRelative || ''}`,
      siteName: config.appName,
      images: openGraph?.images,
      locale: openGraph?.locale || 'en_US',
    },

    twitter: {
      title: openGraph?.title || pageTitle,
      description: openGraph?.description || pageDescription,
      card: "summary_large_image",
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