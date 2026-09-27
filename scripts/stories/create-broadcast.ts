/**
 * Create a Resend Broadcast draft for one published episode: the manual
 * fallback to the weekly job.
 *
 * Run: pnpm stories:create-broadcast <episode-slug>
 *
 * This script never sends or schedules. Since 2026-09-27 scheduling is the
 * weekly job's (scripts/stories/schedule-weekly-broadcast.ts, run by
 * .github/workflows/weekly-broadcast.yml), and this stays for the cases it does
 * not cover: a draft to look at before the job runs, or a broadcast for an
 * episode outside the queue. Both scripts build the email with the same
 * builder, lib/email/broadcast.ts, so a draft made here is the one the job
 * would make, and the job treats it as the episode's draft: if this episode is
 * next in the queue, its next run schedules the draft (after checking it is
 * still exactly this build) rather than making a duplicate. Delete the draft
 * in Resend if that is not what you want.
 *
 * It prints the next send slot, derived from `config.newsletter`, the same
 * definition the job, the runbook and the episode calendar use. See
 * docs/runbooks/newsletter.md.
 */
import { config as loadEnv } from 'dotenv';

import config from '../../config';
import { postalAddressProblems } from '../../lib/business/postal-address';
import { episodeBroadcast } from '../../lib/email/broadcast';
import { formatUtcInstant, nextSendAt } from '../../lib/email/send-schedule';
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

  // The shared builder: `kind: 'weekly'` tagging, the Resend unsubscribe
  // placeholder, and no `send` or `scheduled_at`, so creation is draft-only.
  const response = await fetch(`${RESEND_API}/broadcasts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Resend rejects a request without one (403).
      'User-Agent': 'michikanji-create-broadcast',
    },
    body: JSON.stringify(episodeBroadcast(episode, segmentId)),
  });

  if (!response.ok) throw new Error(`Resend broadcast creation failed (${response.status}): ${await response.text()}`);
  const result = (await response.json()) as { id: string };
  console.log(`Created Resend draft ${result.id} for episode ${episode.number} (${episode.slug}).`);
  console.log(`The next send slot is ${formatUtcInstant(nextSendAt())}.`);
  console.log(
    'If this episode is next in the queue, the weekly job schedules this draft on its next run (Wednesday or\n' +
      'Friday, 12:00 UTC). Delete it in Resend if that is not what you want, or review it, send a test and\n' +
      'schedule it yourself in the Resend dashboard.'
  );
  console.log('Pre-send checklist: docs/prd/episode-spec.md §A7. Procedure: docs/runbooks/newsletter.md.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
