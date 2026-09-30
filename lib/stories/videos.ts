/**
 * Companion videos: lookup, URL builders and the VideoObject.
 *
 * Relative imports only, not `@/`: `pnpm validate:stories` runs this module
 * under tsx from scripts/, exactly as it does `./index`. It is also free of any
 * site URL, so the page passes its own canonical page URL in rather than this
 * module reaching for `lib/seo/site`.
 */
import type { Episode } from './types';
import { EPISODE_VIDEOS, type EpisodeVideo, type VideoAspect } from '../../data/stories/videos';

export type { EpisodeVideo, VideoAspect };

/** An `EpisodeVideo` with its optional fields resolved, which is what the page consumes. */
export type ResolvedVideo = EpisodeVideo & { aspect: VideoAspect };

/** The shape of every YouTube id: 11 characters of base64url. */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video for an episode, or undefined, with `aspect` resolved (an entry that
 * omits it is landscape). A malformed id is treated as absent rather than
 * rendered: the validator is what reports it, and an iframe pointed at a bad id
 * is a worse page than no video section. An unrecognised `aspect` falls back to
 * landscape for the same reason; the validator reports it.
 */
export function videoForSlug(slug: string): ResolvedVideo | undefined {
  const video = Object.prototype.hasOwnProperty.call(EPISODE_VIDEOS, slug)
    ? EPISODE_VIDEOS[slug]
    : undefined;
  if (!video || !YOUTUBE_ID_RE.test(video.youtubeId)) return undefined;
  return { ...video, aspect: video.aspect === 'portrait' ? 'portrait' : 'landscape' };
}

/**
 * The poster image for a video.
 *
 * Landscape: `hqdefault`, 480x360 with letterbox bars top and bottom; render it
 * `object-cover` in a 16:9 box. Portrait (a Short): `hqdefault` is that same
 * 4:3 picture with black pillars, useless in a 9:16 box, and `oardefault`
 * answers 404 for Shorts. `oar2` is YouTube's own 1080x1920 portrait frame of
 * the video (measured on all four mapped Shorts, ~160 kB, status 200). It is
 * not a documented URL, so the facade's `<img>` is the only place it is used
 * and a video without it would show an empty box with a working play button.
 */
export const youtubeThumbnailUrl = (id: string, aspect: VideoAspect = 'landscape') =>
  `https://i.ytimg.com/vi/${id}/${aspect === 'portrait' ? 'oar2' : 'hqdefault'}.jpg`;
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
    thumbnailUrl: [youtubeThumbnailUrl(video.youtubeId, video.aspect)],
    uploadDate: episode.publishedAt,
    embedUrl: youtubeEmbedUrl(video.youtubeId),
    inLanguage: ['ja', 'en'],
    isAccessibleForFree: true,
  };
}
