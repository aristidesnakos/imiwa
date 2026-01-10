import Image from 'next/image';
import { SheetCardProps } from '@/types/kana-sheets';

/**
 * SheetCard Component
 *
 * Displays a visual card for a kana practice sheet with preview image,
 * badge, description, and download button.
 *
 * @param props - SheetCardProps
 */
export function SheetCard({
  title,
  badge,
  badgeColor,
  description,
  imageUrl,
  imageAlt,
  downloadUrl,
  ariaLabel
}: SheetCardProps) {
  const badgeStyles = badgeColor === 'sakura'
    ? 'bg-[#7BB3D3]/10 text-[#2C5F7C] border-[#7BB3D3]/30'
    : 'bg-[#FF6B47]/10 text-[#D94E2A] border-[#FF6B47]/30';

  const buttonStyles = badgeColor === 'sakura'
    ? 'bg-[#7BB3D3] hover:bg-[#2C5F7C] focus:ring-[#7BB3D3]/20'
    : 'bg-[#FF6B47] hover:bg-[#E55A3A] focus:ring-[#FF6B47]/20';

  return (
    <div className="bg-card border-2 border-border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden group">
      {/* Preview Image */}
      <div className="relative w-full aspect-[1/1.414] border-b-2 border-border overflow-hidden">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className="object-fit"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-card-foreground mb-2">
          {title}
        </h3>

        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 border ${badgeStyles}`}>
          {badge}
        </span>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>

        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          className={`w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-base text-white transition-colors duration-200 focus:outline-none focus:ring-4 ${buttonStyles}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Sheet
        </a>
      </div>
    </div>
  );
}
