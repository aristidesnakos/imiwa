'use client';

import Image from 'next/image';
import { trackConversion } from '@/lib/analytics';

interface KanjiN5WorkbookCTAProps {
  className?: string;
}

/**
 * KanjiN5WorkbookCTA Component
 *
 * Promotional banner for the premium Kanji N5 workbook with cover image.
 * Features a two-column responsive layout with compelling copy and CTA button.
 *
 * @param props - KanjiN5WorkbookCTAProps
 */
export function KanjiN5WorkbookCTA({ className = "" }: KanjiN5WorkbookCTAProps) {
  return (
    <div className={`my-8 ${className}`}>
      <div className="bg-gradient-to-r from-[#7BB3D3]/10 to-[#E89CAE]/10 rounded-lg border-2 border-[#7BB3D3]/30 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Content Section */}
          <div className="p-6 md:p-8 flex flex-col justify-center order-2 lg:order-1">
            <h3 className="font-bold text-xl md:text-2xl text-card-foreground mb-3">
              Want a Complete N5 Kanji Workbook?
            </h3>
            <p className="text-muted-foreground mb-5 text-sm md:text-base leading-relaxed">
              Get all JLPT N5 kanji in one beautifully designed workbook. Perfect for systematic practice with stroke order diagrams and guided practice grids.
            </p>
            <div>
              <a
                href="https://llanai.gumroad.com/l/kanji-n5-sheets-workbook"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#7BB3D3] text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-medium hover:bg-[#6AA2C2] transition-colors text-sm md:text-base shadow-sm"
                onClick={async () => {
                  await trackConversion({
                    name: 'kanji_n5_workbook_gumroad_clicked',
                    properties: {
                      product: 'kanji_n5_workbook',
                      source: 'n5_kanji_sheets_page',
                      destination: 'gumroad'
                    }
                  });
                }}
              >
                View Kanji N5 Workbook
              </a>
            </div>
          </div>

          {/* Image Section */}
          <div className="relative h-48 md:h-64 lg:h-full min-h-[200px] order-1 lg:order-2 p-6 md:p-8 flex items-center justify-center">
            <Image
              src="/assets/kanji-n5-workbook.png"
              alt="Kanji JLPT N5 workbook cover"
              fill
              className="object-contain object-center p-4"
              sizes="(max-width: 1024px) 90vw, 50vw"
              priority={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
