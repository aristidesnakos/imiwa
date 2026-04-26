import Link from 'next/link';
import { ExternalLink, Megaphone } from 'lucide-react';
import { getActiveAd } from '@/lib/constants/ads';

export function AdBanner() {
  const ad = getActiveAd();

  if (!ad) {
    // Fallback: invite advertisers to claim this slot
    return (
      <div className="rounded-lg border-2 border-dashed border-japan-coral-sunset bg-japan-coral-sunset/5 p-5 text-center animate-pulse-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-japan-coral-sunset mb-2">
          Your Ad Here
        </p>
        <div className="flex flex-col items-center gap-3">
          <Megaphone className="w-7 h-7 text-japan-coral-sunset" />
          <p className="text-sm text-japan-deep-ocean font-medium max-w-xs">
            Reach thousands of Japanese language learners every month.
          </p>
          <Link
            href="/advertise"
            className="inline-flex items-center gap-1.5 rounded-md bg-japan-coral-sunset text-white px-4 py-2 text-sm font-semibold hover:bg-japan-coral-sunset/90 transition-colors shadow-sm"
          >
            Advertise here
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-japan-coral-sunset/60 bg-japan-coral-sunset/5 p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-japan-coral-sunset">
          Sponsored
        </p>
        {ad.badge && (
          <span className="text-xs bg-japan-coral-sunset/10 text-japan-coral-sunset px-2 py-0.5 rounded-full border border-japan-coral-sunset/30 font-medium">
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
        className="inline-flex items-center gap-1.5 rounded-md bg-japan-coral-sunset text-white px-4 py-2 text-sm font-semibold hover:bg-japan-coral-sunset/90 transition-colors shadow-sm"
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
