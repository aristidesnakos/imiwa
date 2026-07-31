/**
 * app/admin/layout.tsx
 *
 * First gate on the whole `/admin` subtree.
 *
 * The tool this was ported from gated only its API routes. Its `/admin/*` PAGES
 * shipped to production and rendered a broken shell against dead endpoints —
 * leaking the existence and shape of an internal tool and looking like a bug to
 * anyone who found it. `notFound()` here makes the entire subtree
 * indistinguishable from a route that was never built.
 *
 * This layout is belt; each page calls `assertLocalOnlyPage()` as braces, so a
 * future page added outside this layout cannot quietly escape the gate.
 */

import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { assertLocalOnlyPage } from '@/lib/sentences/local-only';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Local review tools',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  assertLocalOnlyPage();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-dashed border-amber-500/60 bg-amber-50 px-4 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        local development tool · not available in production · writes directly to
        data/sentences/decisions/
      </div>
      {children}
    </div>
  );
}
