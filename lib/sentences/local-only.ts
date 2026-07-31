/**
 * lib/sentences/local-only.ts
 *
 * The production kill-switch for the sentence review tool.
 *
 * The review dashboard is a LOCAL DEVELOPER TOOL. It reads and writes flat
 * files under `data/sentences/` with Node `fs`, which is meaningless on a
 * read-only serverless filesystem, and it exposes an unauthenticated write
 * surface. It must not function in production, full stop.
 *
 * Two guards, because the two runtimes fail differently:
 *
 *   - `blockedResponse()` is the FIRST statement of every admin route handler.
 *   - `assertLocalOnlyPage()` is the FIRST statement of every admin page/layout.
 *
 * The page guard is the one that is easy to forget. Gating only the APIs ships
 * the pages, which then render as broken UI (or leak the shape of the tool)
 * against dead endpoints. `notFound()` makes them indistinguishable from a
 * route that was never built.
 */

import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Returns a 404 response when running in production, otherwise `null`.
 *
 * Usage — must be the first thing in the handler:
 *
 *   const blocked = blockedResponse();
 *   if (blocked) return blocked;
 */
export function blockedResponse(): NextResponse | null {
  if (isProductionRuntime()) {
    return NextResponse.json({ error: 'not_available' }, { status: 404 });
  }
  return null;
}

/** Renders the 404 page when running in production. Never returns there. */
export function assertLocalOnlyPage(): void {
  if (isProductionRuntime()) {
    notFound();
  }
}
