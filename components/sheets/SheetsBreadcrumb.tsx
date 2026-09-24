import Link from 'next/link';
import { SITE_URL } from '@/lib/seo/site';

/**
 * components/sheets/SheetsBreadcrumb.tsx
 *
 * Where a sheets page sits: Home › Free resources › Kanji practice sheets › N5.
 *
 * These pages are landing pages — most visitors arrive from a search for
 * "kanji practice sheets" or "n5 kanji worksheets" and have never seen the page
 * above them — so the way back up has to be on the page, not only in the
 * header's menu. The visible trail and the BreadcrumbList JSON-LD are built from
 * the same array, so the two cannot drift apart.
 *
 * A server component: plain links, nothing to hydrate.
 */

export interface Crumb {
  name: string;
  /** Site-relative path, starting with `/`. The last crumb is the current page. */
  href: string;
}

export function SheetsBreadcrumb({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-japan-mountain-mist">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {trail.map((crumb, index) => {
          const isCurrent = index === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden className="text-japan-sakura-waters">
                  /
                </span>
              )}
              {isCurrent ? (
                <span aria-current="page" className="font-medium text-japan-ink-black">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  prefetch={false}
                  className="rounded-sm underline-offset-4 hover:text-japan-deep-ocean hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The same trail as schema.org BreadcrumbList, on the canonical host. */
export function breadcrumbJsonLd(trail: readonly Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.href === '/' ? SITE_URL : `${SITE_URL}${crumb.href}`,
    })),
  };
}
