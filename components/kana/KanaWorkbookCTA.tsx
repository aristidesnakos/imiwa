import Image from 'next/image';

interface KanaWorkbookCTAProps {
  className?: string;
}

/**
 * KanaWorkbookCTA Component
 *
 * Promotional banner for the premium kana workbook with cover image.
 * Features a two-column responsive layout with compelling copy and CTA button.
 *
 * @param props - KanaWorkbookCTAProps
 */
export function KanaWorkbookCTA({ className = "" }: KanaWorkbookCTAProps) {
  return (
    <div className={`my-8 ${className}`}>
      <div className="bg-gradient-to-r from-[#7BB3D3]/10 to-[#E89CAE]/10 rounded-lg border-2 border-[#7BB3D3]/30 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Content Section */}
          <div className="p-6 md:p-8 flex flex-col justify-center order-2 lg:order-1">
            <h3 className="font-bold text-xl md:text-2xl text-card-foreground mb-3">
              Want a Cuter, Printable Version?
            </h3>
            <p className="text-muted-foreground mb-5 text-sm md:text-base leading-relaxed">
              Get beautifully designed kana workbook sheets perfect for beginners. Print-friendly layouts with enhanced visuals and guided practice.
            </p>
            <div>
              <a
                href="https://llanai.gumroad.com/l/kana-workbook-beginners?_gl=1*16ptcwb*_ga*MjE0MTg2MTczNS4xNzQ4NzI0ODk4*_ga_6LJN6D94N6*czE3NjgwNDU2MzckbzY2JGcxJHQxNzY4MDQ1NjYzJGozNCRsMCRoMA.."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#7BB3D3] text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-medium hover:bg-[#6AA2C2] transition-colors text-sm md:text-base shadow-sm"
              >
                View Premium Kana Workbook
              </a>
            </div>
          </div>

          {/* Image Section */}
          <div className="relative h-48 md:h-64 lg:h-full min-h-[200px] order-1 lg:order-2">
            <Image
              src="/assets/kana-workbook-cover.jpg"
              alt="Kana workbook cover for beginners"
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
