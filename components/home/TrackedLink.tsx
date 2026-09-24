'use client';

import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { trackConversion, type ConversionEvent } from '@/lib/analytics';

/**
 * components/home/TrackedLink.tsx
 *
 * A `next/link` that records a DataFast goal when it is clicked.
 *
 * It exists so that the homepage can be a server component. A click handler
 * cannot be passed from a server component to a client one, but the goal can:
 * it is plain data. So the page still names the goal and its properties where
 * they can be grepped, and this is the only part of the link that runs in the
 * browser.
 *
 * Works as the child of `<Button asChild>`: the Slot merges the button's
 * classes into these props, and everything else passes through to the anchor,
 * `data-fast-*` attributes included.
 */
type TrackedLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  /**
   * Sent as it is. Renaming `name` starts a new goal in DataFast and strands
   * the old one's history, so treat it as an identifier, not copy.
   */
  conversion: ConversionEvent;
};

export function TrackedLink({ conversion, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        // Not awaited. A client-side navigation does not unload the page, so
        // the request finishes on its own, and trackConversion already waits
        // out the DataFast cookie on a click that comes before it is set.
        void trackConversion(conversion);
        onClick?.(event);
      }}
    />
  );
}

export default TrackedLink;
