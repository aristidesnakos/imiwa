import type { Episode } from '@/lib/stories/types';
import { SECTION_BAND, SECTION_HEADING } from '@/components/kanji/section';
import {
  videoForSlug,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/stories/videos';
import { VideoFacade } from './VideoFacade';

/**
 * The episode's companion video, or nothing.
 *
 * No video mapped means no heading and no empty state, the same convention as
 * `ExampleSentencesSection`. The server HTML carries a real heading, the
 * thumbnail and a plain "Watch on YouTube" link, so the section still works
 * with no JavaScript; the client part (`VideoFacade`) only swaps the thumbnail
 * for the player. Which videos exist lives in `data/stories/videos.ts`.
 */
export function EpisodeVideoSection({ episode }: { episode: Episode }) {
  const video = videoForSlug(episode.slug);
  if (!video) return null;

  const title = `${episode.titleEn} — ${episode.titleJa}`;

  return (
    <section className={SECTION_BAND} aria-labelledby="video-heading">
      <h2 id="video-heading" className={`${SECTION_HEADING} mb-6`}>
        Watch the episode
      </h2>
      <VideoFacade
        title={title}
        thumbnailUrl={youtubeThumbnailUrl(video.youtubeId, video.aspect)}
        embedUrl={youtubeEmbedUrl(video.youtubeId)}
        aspect={video.aspect}
      />
      <p className={`mt-3 text-sm ${video.aspect === 'portrait' ? 'text-center' : ''}`}>
        <a
          href={youtubeWatchUrl(video.youtubeId)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-japan-deep-ocean hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Watch on YouTube
        </a>
      </p>
    </section>
  );
}
