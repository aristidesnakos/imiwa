import Link from 'next/link';
import { ExternalLink, Megaphone } from 'lucide-react';
import { getActiveAd } from '@/lib/constants/ads';

export function AdBanner() {
  const ad = getActiveAd();

  if (!ad) {
    // Fallback: invite advertisers to claim this slot
    return (
      <div className="rounded-lg border border-dashed border-japan-sakura-waters/40 bg-japan-soft-mist/30 p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-japan-mountain-mist mb-2">
          Sponsored
        </p>
        <div className="flex flex-col items-center gap-3">
          <Megaphone className="w-7 h-7 text-japan-sakura-waters/60" />
          <p className="text-sm text-japan-mountain-mist max-w-xs">
            Reach thousands of Japanese language learners every month.
          </p>
          <Link
            href="/advertise"
            className="inline-flex items-center gap-1.5 rounded-md bg-japan-sakura-waters/10 border border-japan-sakura-waters/30 px-4 py-2 text-sm font-medium text-japan-deep-ocean hover:bg-japan-sakura-waters/20 transition-colors"
          >
            Advertise here
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-japan-sakura-waters/20 bg-japan-soft-mist/30 p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-japan-mountain-mist">
          Sponsored
        </p>
        {ad.badge && (
          <span className="text-xs bg-japan-sakura-waters/10 text-japan-deep-ocean px-2 py-0.5 rounded-full border border-japan-sakura-waters/20">
            {ad.badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-japan-deep-ocean mb-1">{ad.headline}</h3>
      <p className="text-sm text-japan-mountain-mist mb-4 leading-relaxed">{ad.description}</p>
      <a
        href={ad.ctaUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-flex items-center gap-1.5 rounded-md bg-japan-deep-ocean text-white px-4 py-2 text-sm font-medium hover:bg-japan-deep-ocean/90 transition-colors"
      >
        {ad.ctaText}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <p className="text-xs text-japan-mountain-mist/60 mt-3">
        Ad by {ad.advertiser} ·{' '}
        <Link href="/advertise" className="underline hover:text-japan-mountain-mist">
          advertise here
        </Link>
      </p>
    </div>
  );
}
