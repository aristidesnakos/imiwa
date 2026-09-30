/**
 * Companion videos: lookup, URL builders and the VideoObject.
 *
 * Relative imports only, not `@/`: `pnpm validate:stories` runs this module
 * under tsx from scripts/, exactly as it does `./index`. It is also free of any
 * site URL, so the page passes its own canonical page URL in rather than this
 * module reaching for `lib/seo/site`.
 */
import type { Episode } from './types';
import { EPISODE_VIDEOS, type EpisodeVideo } from '../../data/stories/videos';

export type { EpisodeVideo };

/** The shape of every YouTube id: 11 characters of base64url. */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video for an episode, or undefined. A malformed id is treated as absent
 * rather than rendered: the validator is what reports it, and an iframe pointed
 * at a bad id is a worse page than no video section.
 */
export function videoForSlug(slug: string): EpisodeVideo | undefined {
  const video = Object.prototype.hasOwnProperty.call(EPISODE_VIDEOS, slug)
    ? EPISODE_VIDEOS[slug]
    : undefined;
  return video && YOUTUBE_ID_RE.test(video.youtubeId) ? video : undefined;
}

/** 480x360 with letterbox bars top and bottom; render it `object-cover` in a 16:9 box. */
export const youtubeThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
/** The privacy-enhanced host: no YouTube cookies until the visitor plays. */
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;

/**
 * The episode's VideoObject, or undefined when it has no video.
 *
 * `uploadDate` is the episode's `publishedAt` by design: the two go up
 * together, and that field is the only date this repo records. Linked into the
 * page's graph by `@id`: the LearningResource points at it through `video`.
 */
export function videoObjectJsonLd(
  episode: Episode,
  pageUrl: string,
): Record<string, unknown> | undefined {
  const video = videoForSlug(episode.slug);
  if (!video) return undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${pageUrl}#video`,
    name: `${episode.titleEn} — ${episode.titleJa}`,
    description: `Episode ${episode.number} of The Travels of Tan as a video: a Japanese comic written entirely within JLPT ${episode.level}, with English translations.`,
    thumbnailUrl: [youtubeThumbnailUrl(video.youtubeId)],
    uploadDate: episode.publishedAt,
    embedUrl: youtubeEmbedUrl(video.youtubeId),
    inLanguage: ['ja', 'en'],
    isAccessibleForFree: true,
  };
}
