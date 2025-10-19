import React from 'react';
import config from '@/config';

// Define a type for JSON-LD schema objects
export type JsonLdSchema = Record<string, unknown>;

// Base Organization schema
export const getOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.appName,
    url: `https://${config.domainName}`,
    logo: `https://${config.domainName}/logo.png`,
    sameAs: [
      'https://twitter.com/just_aristides',
      // Add other social profiles here
    ]
  };
};

// Blog article schema
export const getBlogPostSchema = (article: {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  slug: string;
  image: {
    src: string;
    alt: string;
  };
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: article.image.src,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author
    },
    publisher: {
      '@type': 'Organization',
      name: config.appName,
      logo: {
        '@type': 'ImageObject',
        url: `https://${config.domainName}/logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://${config.domainName}/blog/${article.slug}`
    }
  };
};


// BreadcrumbList schema
export const getBreadcrumbListSchema = (items: Array<{ name: string; url: string }>) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://${config.domainName}${item.url}`
    }))
  };
};

// Component to render JSON-LD structured data
export const JsonLd = ({ data }: { data: JsonLdSchema }) => {
  // Remove undefined values from the data
  const cleanData = JSON.parse(
    JSON.stringify(data, (key, value) => (value === undefined ? null : value))
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanData) }}
    />
  );
};

// Helper to combine multiple schema objects
export const combineSchemas = (...schemas: JsonLdSchema[]): JsonLdSchema => {
  // Combine all schemas into a single object with @graph property
  return {
    '@context': 'https://schema.org',
    '@graph': schemas.filter(Boolean)
  };
};
