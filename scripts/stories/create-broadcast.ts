/**
 * Create a Resend Broadcast draft for one published episode.
 *
 * Run: pnpm stories:create-broadcast <episode-slug>
 *
 * This script never sends or schedules. Review the resulting draft and send a
 * test from the Resend dashboard before manually scheduling it there.
 *
 * It does print the send slot the draft is meant for, because the operator then
 * has to type a date into the dashboard by hand and "which Saturday" was
 * previously counted off a calendar. The date comes from `config.newsletter`,
 * the same definition the runbook and the episode calendar use. Printing it is
 * the whole extent of the automation: see docs/runbooks/newsletter.md.
 */
import { config as loadEnv } from 'dotenv';

import config from '../../config';
import { postalAddressProblems } from '../../lib/business/postal-address';
import { quizEmailHtml, quizEmailSubject, quizEmailText } from '../../lib/email/quiz-email';
import { nextSendDate, sendDayName } from '../../lib/email/send-schedule';
import { episodeBySlug } from '../../lib/stories';

const RESEND_API = 'https://api.resend.com';

// The application loads .env.local through Next. This standalone operator
// command runs under tsx, so load it explicitly without ever printing values.
loadEnv({ path: '.env.local' });
loadEnv();

async function main(): Promise<void> {
  const slug = process.argv[2];
  if (!slug || process.argv.length !== 3) {
    throw new Error('Usage: pnpm stories:create-broadcast <episode-slug>');
  }

  const episode = episodeBySlug(slug);
  if (!episode) throw new Error(`No published episode exists with slug "${slug}".`);

  // A broadcast is commercial email, and CAN-SPAM requires a valid physical
  // postal address in every one. Checked before the credentials and before
  // Resend is called, so a draft that could not lawfully be sent is never
  // created, and the operator learns that without needing a key first.
  const addressProblems = postalAddressProblems(config.business.postalAddress);
  if (addressProblems.length > 0) {
    throw new Error(
      `Refusing to create a broadcast:\n  - ${addressProblems.join('\n  - ')}\nSee docs/runbooks/newsletter.md.`
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_WEEKLY_STORIES_SEGMENT_ID;
  if (!apiKey || !segmentId) {
    throw new Error('RESEND_API_KEY and RESEND_WEEKLY_STORIES_SEGMENT_ID must be set.');
  }

  // This placeholder is resolved only by the Broadcast product. The direct
  // welcome send receives its signed URL as the renderer's second argument.
  const unsubscribe = '{{{RESEND_UNSUBSCRIBE_URL}}}';
  const response = await fetch(`${RESEND_API}/broadcasts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      segment_id: segmentId,
      from: config.resend.fromAdmin,
      reply_to: config.resend.supportEmail,
      name: `Episode ${episode.number}: ${episode.titleEn}`,
      subject: quizEmailSubject(episode),
      html: quizEmailHtml(episode, unsubscribe),
      text: quizEmailText(episode, unsubscribe),
      // Deliberately omit `send` and `scheduled_at`: creation is draft-only.
    }),
  });

  if (!response.ok) throw new Error(`Resend broadcast creation failed (${response.status}): ${await response.text()}`);
  const result = (await response.json()) as { id: string };
  console.log(`Created Resend draft ${result.id} for episode ${episode.number} (${episode.slug}).`);
  console.log(`Schedule it for ${sendDayName()} ${nextSendDate()}.`);
  console.log('Review it, send a test, and schedule it manually in the Resend dashboard.');
  console.log('Pre-send checklist: docs/prd/episode-spec.md §A7. Procedure: docs/runbooks/newsletter.md.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});