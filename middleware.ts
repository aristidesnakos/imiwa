import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { trackAICrawlerRequest } from "@datafast/ai-crawl";

export function middleware(request: NextRequest) {
  // Fire-and-forget: do not await so response is not delayed
  trackAICrawlerRequest(request, {
    websiteId: "dfid_yWGzMf4z22IEHANBbTIqo",
  });

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     * Crawlers hit real pages, not _next/ assets.
     */
    "/((?!_next/static|_next/image|favicon|assets/).*)",
  ],
};
