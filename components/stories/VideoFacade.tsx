'use client';

import { useState } from 'react';

/**
 * A thumbnail that becomes the YouTube player when it is clicked.
 *
 * The iframe is the expensive part (hundreds of kB of YouTube script, plus
 * third-party cookies), so it does not exist until someone asks for it, and it
 * uses the privacy-enhanced youtube-nocookie.com host. Until then this is one
 * lazy `<img>` and one `<button>`, which is why the whole component is this
 * small. The URLs are passed in rather than built here so the client bundle
 * carries no id logic.
 *
 * A plain `<img>`, not `next/image`: i.ytimg.com is not in `images.remotePatterns`
 * and is not worth adding there, because the optimiser would only proxy a
 * 480x360 JPEG that YouTube already serves from its own CDN.
 */
export function VideoFacade({
  title,
  thumbnailUrl,
  embedUrl,
}: {
  title: string;
  thumbnailUrl: string;
  embedUrl: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border-[3px] border-japan-ink-black bg-japan-deep-ocean">
      {playing ? (
        <iframe
          src={`${embedUrl}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play the video: ${title}`}
          className="group absolute inset-0 block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* hqdefault carries letterbox bars; object-cover in a 16:9 box crops them off. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- see the header: i.ytimg.com is deliberately not an optimiser host */}
          <img
            src={thumbnailUrl}
            alt=""
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:brightness-90"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
