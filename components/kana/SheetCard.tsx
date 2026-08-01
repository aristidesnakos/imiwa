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
  // These were arbitrary hexes, including two darker corals (#D94E2A, #E55A3A)
  // that existed nowhere else in the palette — someone hit the coral contrast
  // problem here first and patched locally, and neither literal actually
  // cleared AA. They are palette tokens now so the fix cannot drift again.
  const badgeStyles = badgeColor === 'sakura'
    ? 'bg-japan-sakura-waters/10 text-japan-mountain-mist border-japan-sakura-waters/30'
    : 'bg-japan-coral-sunset/10 text-japan-coral-sunset-ink border-japan-coral-sunset/30';

  // The sakura button is white text on #7BB3D3 — 2.3:1, a worse failure than
  // the coral one. Mountain mist is the palette's own dark blue and gives
  // 6.5:1, so the two branches now behave the same way: a solid ink fill that
  // can carry white, darkened on hover by a filter rather than by an alpha
  // (an alpha would composite against the card and LIGHTEN it).
  const buttonStyles = badgeColor === 'sakura'
    ? 'bg-japan-mountain-mist hover:brightness-90'
    : 'bg-japan-coral-sunset-ink hover:brightness-90';

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
          /* The focus ring was `focus:ring-[#FF6B47]/20` next to
             `focus:outline-none`: 20% coral over the card is 1.22:1, so this
             link removed the browser's own indicator and replaced it with one
             that is effectively invisible. It now uses --ring (deep ocean),
             matching every other focusable control on the site, and
             focus-visible so it does not fire on mouse click. */
          className={`w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-base text-white transition-[filter,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${buttonStyles}`}
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
