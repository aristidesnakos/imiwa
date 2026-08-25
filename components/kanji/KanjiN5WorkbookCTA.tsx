'use client';

import Image from 'next/image';
import { Download } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { trackConversion } from '@/lib/analytics';
import {
  PACK_DESTINATION,
  PACK_DOWNLOADS,
  PACK_DOWNLOAD_GOALS,
  PACK_FILENAMES,
} from '@/lib/commerce/links';
import { cn } from '@/lib/utils';

/**
 * components/kanji/KanjiN5WorkbookCTA.tsx
 *
 * The offer under a kanji-sheets page: the same sheets this page generates one
 * at a time, collected into one printable PDF.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE PACK IS FREE, AND WHY THE COPY SAYS SO TWICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It used to be $5.99 and called a "premium workbook". Over its lifetime that
 * listing took 777 product-page visits and made zero sales, which is the
 * rational outcome: the page a reader is standing on generates the same sheets
 * for nothing, so the paid file was strictly dominated by the free tool one
 * click away. The pack now costs nothing and its job is an email address.
 *
 * That makes "Free" load-bearing rather than decorative — it is the entire
 * reason to click — so it appears in the button as well as the body. A visitor
 * who has been trained by every other site to read "Get the pack" as "start a
 * checkout" will not click it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HREF IS A LIABILITY — TREAT IT AS ONE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This pointed at `llanai.gumroad.com` until the store was renamed to match the
 * brand, at which point Gumroad released the old subdomain and every one of
 * these buttons started serving a 404 — on five pages, silently, because
 * nothing here asserted the target resolves. "One const per component" was the
 * first fix and was still four consts; the destination now lives once, in
 * lib/commerce/links.ts, and the file it names is served from this domain, so
 * there is no third party left that can release a hostname out from under it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PALETTE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The previous version hard-coded `#7BB3D3` three times — which is
 * `--sakura-waters` written out by hand — and put white text on it at 2.3:1.
 * The button now goes through `buttonVariants`, so it inherits both the primary
 * pair and the focus ring rather than re-deciding them. See CLAUDE.md,
 * "Design tokens".
 */

interface KanjiN5WorkbookCTAProps {
  className?: string;
}

export function KanjiN5WorkbookCTA({ className = '' }: KanjiN5WorkbookCTAProps) {
  return (
    <div className={cn('my-8', className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-japan-soft-mist">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-6 md:p-8 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
              Free printable PDF
            </p>
            <h3 className="mb-3 mt-2 text-xl font-bold text-japan-deep-ocean md:text-2xl">
              Want all 82 N5 kanji in one file?
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-japan-mountain-mist md:text-base">
              The same sheets you can generate here, collected into a single printable pack —
              every JLPT N5 character with its stroke order, readings and an 80-square practice
              grid. Free, and yours to print as often as you like.
            </p>
            <div>
              <a
                href={PACK_DOWNLOADS.n5Kanji}
                download={PACK_FILENAMES.n5Kanji}
                className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
                onClick={() => {
                  // Not awaited: `trackConversion` wraps a bare fetch with no
                  // timeout, and the browser is already navigating. Awaiting it
                  // inside the handler delays the nav for an analytics call
                  // whose outcome nobody reads.
                  void trackConversion({
                    name: PACK_DOWNLOAD_GOALS.n5Kanji,
                    properties: {
                      product: 'kanji_n5_workbook',
                      source: 'n5_kanji_sheets_page',
                      destination: PACK_DESTINATION,
                    },
                  });
                }}
              >
                <Download aria-hidden />
                Get the free N5 pack
                <span className="sr-only"> (PDF, downloads to your device)</span>
              </a>
            </div>
          </div>

          <div className="relative order-1 flex min-h-[200px] items-center justify-center p-6 md:p-8 lg:order-2 lg:h-full">
            <Image
              src="/assets/pack-cover-kanji.jpg"
              alt="Free JLPT N5 kanji practice sheets — printable PDF"
              width={960}
              height={540}
              className="h-auto w-full rounded-md"
              sizes="(max-width: 1024px) 90vw, 45vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
