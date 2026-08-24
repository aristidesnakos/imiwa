'use client';

import Image from 'next/image';
import { Download } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { trackConversion } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * components/kana/KanaWorkbookCTA.tsx
 *
 * The kana twin of KanjiN5WorkbookCTA — read that file's header for why the
 * pack is free, why "Free" appears in the button as well as the body, and why
 * the store URL is a single const.
 *
 * One thing specific to this one: the old href carried a `_gl` linker parameter
 * copied out of a browser address bar — a cross-domain Google Analytics handoff
 * blob, minted in a session in 2026 and stale ever since. It was never doing
 * anything except making the link unreadable in review, which is part of how
 * the dead `llanai.gumroad.com` host underneath it went unnoticed.
 */

const PACK_URL = 'https://michikanji.gumroad.com/l/kana-workbook-beginners';

interface KanaWorkbookCTAProps {
  className?: string;
}

export function KanaWorkbookCTA({ className = '' }: KanaWorkbookCTAProps) {
  return (
    <div className={cn('my-8', className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-japan-soft-mist">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-6 md:p-8 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-japan-coral-sunset-ink">
              Free printable PDF
            </p>
            <h3 className="mb-3 mt-2 text-xl font-bold text-japan-deep-ocean md:text-2xl">
              Want both kana charts in one file?
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-japan-mountain-mist md:text-base">
              Hiragana and katakana together, with stroke-order guides and blank practice grids,
              collected into a single printable pack. Free, and yours to print as often as you
              like.
            </p>
            <div>
              <a
                href={PACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
                onClick={() => {
                  void trackConversion({
                    name: 'kana_workbook_gumroad_clicked',
                    properties: {
                      product: 'kana_workbook_beginners',
                      source: 'kana_sheets_page',
                      destination: 'gumroad',
                    },
                  });
                }}
              >
                <Download aria-hidden />
                Get the free kana pack
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          <div className="relative order-1 flex min-h-[200px] items-center justify-center p-6 md:p-8 lg:order-2 lg:h-full">
            <Image
              src="/assets/pack-cover-kana.jpg"
              alt="Free hiragana and katakana practice sheets — printable PDF"
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
