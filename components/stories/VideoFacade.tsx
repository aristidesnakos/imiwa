'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * The shape of the video, which is the shape of the box. Declared here as a
 * string union rather than imported from `data/stories/videos`, so the client
 * bundle carries no data module (the same reason the URLs are passed in).
 */
type Aspect = 'portrait' | 'landscape';

// The box is the video's own shape. A portrait video (a YouTube Short, 1080x1920)
// in a 16:9 box is pillarboxed by the player and cropped to a strip in the
// thumbnail, so portrait gets a true 9:16 box. It is capped at 18rem (288px, about
// the width of a phone held in the hand) because `w-full` of the 832px column
// would make it 1480px tall; centring it under a left-aligned heading is the same
// "a moment, not content" use of centring the rest of the site makes.
const BOX: Record<Aspect, string> = {
  landscape: 'aspect-video w-full',
  portrait: 'mx-auto aspect-[9/16] w-full max-w-[18rem]',
};
// What the box is at its widest, so next/image picks a file no bigger than the
// box needs: 18rem (288px) for a Short, the 832px column for landscape.
const THUMB_SIZES: Record<Aspect, string> = {
  landscape: '(min-width: 896px) 832px, 100vw',
  portrait: '288px',
};

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
 * The thumbnail goes through `next/image` (i.ytimg.com is in
 * `images.remotePatterns`, for exactly the two files `youtubeThumbnailUrl`
 * builds). A portrait `oar2.jpg` is a 1080x1920 JPEG of ~155 kB shown in a
 * 288px-wide box; resized it is a fraction of that, which is the difference
 * between the episode page being inside its Lighthouse byte budget and 108 kB
 * over it. It also means the visitor's browser talks to this site rather than
 * i.ytimg.com when the thumbnail loads, which the privacy policy's YouTube
 * bullet promises: keep EVERY thumbnail on this path, or that bullet is wrong.
 *
 * `aspect` defaults to landscape. The caller passes the thumbnail that matches
 * it (`youtubeThumbnailUrl(id, aspect)`): a landscape `hqdefault` is 4:3 with
 * letterbox bars that `object-cover` crops off in 16:9, while a Short needs a
 * genuinely portrait image, because cropping a 4:3 one into 9:16 would keep
 * only the middle third of the picture.
 */
export function VideoFacade({
  title,
  thumbnailUrl,
  embedUrl,
  aspect = 'landscape',
}: {
  title: string;
  thumbnailUrl: string;
  embedUrl: string;
  aspect?: Aspect;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={`relative ${BOX[aspect]} overflow-hidden rounded-xl border-[3px] border-japan-ink-black bg-japan-deep-ocean`}
    >
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
          {/* The thumbnail already has the box's shape (see the header); object-cover only trims hqdefault's letterbox bars in a landscape box. */}
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes={THUMB_SIZES[aspect]}
            className="object-cover"
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
