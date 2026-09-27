import { SITE_URL } from '@/lib/seo/site';

/**
 * Campaign tags for the links in an episode email, so DataFast can say which
 * email a visit came from.
 *
 * ---------------------------------------------------------------------------
 * Why UTM, and not Resend's click tracking
 * ---------------------------------------------------------------------------
 *
 * Open and click tracking are off on the sending domain, so Resend holds no
 * click data at all. A tag does not need either: every content link in the
 * episode email points at a page we own, DataFast already counts the arrival
 * there, and it reads `utm_*` off the landing URL with no setup (its UTM tab).
 * Nothing is redirected, which is what docs/prd/story-delivery-resend.md §3
 * turned Resend's click tracking off to avoid.
 *
 * A tag names the email, never the reader. It is identical for every
 * recipient of a send, so it says which email a visit came from and nothing
 * about who made it; `pnpm validate:subscribe` asserts that.
 *
 * ---------------------------------------------------------------------------
 * What is never tagged
 * ---------------------------------------------------------------------------
 *
 *  - The unsubscribe link, and the `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder
 *    Resend swaps for it. Leaving is not a campaign arrival, an API route runs
 *    no DataFast script so a tag there measures nothing, and it is the one
 *    link that must always work exactly as signed.
 *  - `mailto:` links and anything off this site: DataFast cannot see them.
 *  - Images. An `<img src>` is not a visit.
 *  - Anything in the confirmation email. It is transactional and pre-consent:
 *    it reaches someone who has not agreed to anything yet.
 *
 * The first three are refused here as well as left out by the callers, so a
 * future edit that routes one of them through this function gets it back
 * unchanged rather than tagged.
 */

/** Which send an episode email is: the one-off welcome card, or the weekly broadcast. */
export type EpisodeEmailKind = 'welcome' | 'weekly';

const SITE_ORIGIN = new URL(SITE_URL).origin;

/**
 * `url` with `utm_source=newsletter&utm_medium=email&utm_campaign=<campaign>&utm_content=<kind>`,
 * or `url` unchanged when it is not a page on this site.
 *
 * Pure: no I/O, and the same input always gives the same output.
 */
export function withNewsletterUtm(url: string, campaign: string, kind: EpisodeEmailKind): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not an absolute URL: the Resend unsubscribe placeholder, typically.
    return url;
  }
  // A mailto: link has an opaque origin, another site a different one, and
  // /api/ is where the unsubscribe endpoint lives. None of them is a page.
  if (parsed.origin !== SITE_ORIGIN || parsed.pathname.startsWith('/api/')) return url;

  parsed.searchParams.set('utm_source', 'newsletter');
  parsed.searchParams.set('utm_medium', 'email');
  parsed.searchParams.set('utm_campaign', campaign);
  parsed.searchParams.set('utm_content', kind);
  return parsed.toString();
}
