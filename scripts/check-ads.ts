/**
 * scripts/check-ads.ts
 *
 * Daily ad slot status checker.
 * Run manually:  npx tsx scripts/check-ads.ts
 * Run in CI:     .github/workflows/ad-slot-check.yml (daily at 08:00 UTC)
 *
 * What it does:
 *  - Reads lib/constants/ads.ts and checks each ad's status against today's date.
 *  - Prints a human-readable report to stdout.
 *  - If there are notable events (campaign starts/ends/expiring-soon/stale),
 *    creates a GitHub Issue so you get a notification in your inbox.
 *  - Optionally posts the same summary to a webhook (Slack, Discord, etc.)
 *    if INQUIRY_WEBHOOK_URL is set.
 *
 * NOTE: lib/constants/ads.ts already handles runtime activation/deactivation
 * automatically (getActiveAd checks today's date on every page render).
 * This script is purely for owner notifications — you don't need to manually
 * change any code when a campaign starts or ends.
 */

import { ADS, getAdStatus } from '../lib/constants/ads';

interface AdEvent {
  emoji: string;
  label: string;
  advertiser: string;
  id: string;
  detail: string;
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" — computed at execution time

  function daysUntilDate(dateStr: string): number {
    const target = new Date(dateStr + 'T00:00:00Z').getTime();
    const now = new Date(today + 'T00:00:00Z').getTime();
    return Math.round((target - now) / (1000 * 60 * 60 * 24));
  }

  const events: AdEvent[] = [];
  const warnings: AdEvent[] = [];
  const info: AdEvent[] = [];

  for (const ad of ADS) {
    const status = getAdStatus(ad);
    const daysLeft = daysUntilDate(ad.endDate);
    const daysUntilStart = daysUntilDate(ad.startDate);

    switch (status) {
      case 'active':
        if (ad.startDate === today) {
          events.push({
            emoji: '🟢',
            label: 'Campaign started today',
            advertiser: ad.advertiser,
            id: ad.id,
            detail: `Runs until ${ad.endDate}`,
          });
        } else if (ad.endDate === today) {
          events.push({
            emoji: '🔴',
            label: 'Campaign ends today',
            advertiser: ad.advertiser,
            id: ad.id,
            detail: 'Follow up with the advertiser about renewal.',
          });
        } else if (daysLeft <= 7 && daysLeft > 0) {
          events.push({
            emoji: '🟡',
            label: `Expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
            advertiser: ad.advertiser,
            id: ad.id,
            detail: `Ends on ${ad.endDate}. Good time to ask about renewal.`,
          });
        } else {
          info.push({
            emoji: '✅',
            label: 'Running normally',
            advertiser: ad.advertiser,
            id: ad.id,
            detail: `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining (ends ${ad.endDate})`,
          });
        }
        break;

      case 'upcoming':
        if (daysUntilStart <= 3) {
          events.push({
            emoji: '📅',
            label: `Starting in ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'}`,
            advertiser: ad.advertiser,
            id: ad.id,
            detail: `Starts ${ad.startDate} — verify the ad copy is correct before it goes live.`,
          });
        } else {
          info.push({
            emoji: '⏳',
            label: 'Upcoming campaign',
            advertiser: ad.advertiser,
            id: ad.id,
            detail: `Starts ${ad.startDate} (${daysUntilStart} days away)`,
          });
        }
        break;

      case 'expired':
        warnings.push({
          emoji: '⚠️',
          label: 'Stale expired entry',
          advertiser: ad.advertiser,
          id: ad.id,
          detail: `Ended ${ad.endDate}. The ad will not show (date range past). No action required — keeps a historical record.`,
        });
        break;

      case 'paused':
        info.push({
          emoji: '⏸️',
          label: 'Manually paused',
          advertiser: ad.advertiser,
          id: ad.id,
          detail: `active: false. Set active: true to re-enable within ${ad.startDate}–${ad.endDate}.`,
        });
        break;
    }
  }

  const hasNotableEvents = events.length > 0 || warnings.length > 0;

  // ─── Console output (always) ────────────────────────────────────────────────

  console.log('\n═══ MichiKanji Ad Slot Check ═══');
  console.log(`Date: ${today}`);
  console.log(`Total ad entries: ${ADS.length}`);
  if (events.length > 0) {
    console.log('\n⚠️  Notable events:');
    events.forEach((e) => console.log(`  ${e.emoji} ${e.label}: ${e.advertiser}`));
  }
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach((e) => console.log(`  ${e.emoji} ${e.label}: ${e.advertiser}`));
  }
  if (info.length > 0) {
    console.log('\nInfo:');
    info.forEach((e) => console.log(`  ${e.emoji} ${e.label}: ${e.advertiser}`));
  }
  if (ADS.length === 0) {
    console.log('\nNo ads configured. Nothing to check.');
  }
  console.log('\n═══════════════════════════════\n');

  if (!hasNotableEvents) {
    console.log('No notable events today — skipping notifications.');
    return;
  }

  // ─── Build report for notifications ────────────────────────────────────────

  function formatSection(title: string, items: AdEvent[]): string {
    if (items.length === 0) return '';
    const lines = items.map(
      (e) => `- ${e.emoji} **${e.label}** — ${e.advertiser} (\`${e.id}\`)\n  ${e.detail}`
    );
    return `## ${title}\n\n${lines.join('\n\n')}\n`;
  }

  const reportBody = [
    `**Date checked:** ${today}`,
    `**Total ad entries:** ${ADS.length}`,
    '',
    formatSection('Action required', events),
    formatSection('Warnings', warnings),
    formatSection('Informational', info),
  ]
    .join('\n')
    .trim();

  const issueTitle =
    `[Ads] Action required — ${events.length + warnings.length} item` +
    `${events.length + warnings.length === 1 ? '' : 's'} need attention (${today})`;

  // ─── GitHub Issue ───────────────────────────────────────────────────────────

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPOSITORY; // e.g. "aristidesnakos/imiwa"

  if (githubToken && githubRepo) {
    console.log('Creating GitHub Issue for notable events…');
    const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ad-slot-check-script',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: reportBody,
        labels: ['advertising'],
      }),
    });

    if (response.ok) {
      const issue = (await response.json()) as { html_url: string };
      console.log(`✅ GitHub Issue created: ${issue.html_url}`);
    } else {
      const text = await response.text();
      console.error(`❌ Failed to create GitHub Issue (${response.status}): ${text}`);
    }
  }

  // ─── Webhook notification ───────────────────────────────────────────────────

  const webhookUrl = process.env.INQUIRY_WEBHOOK_URL;

  if (webhookUrl) {
    console.log('Posting to webhook…');
    const text =
      `📢 *MichiKanji Ad Slot Check — ${today}*\n` +
      events.map((e) => `${e.emoji} ${e.label}: ${e.advertiser} — ${e.detail}`).join('\n') +
      (warnings.length > 0
        ? '\n' + warnings.map((e) => `${e.emoji} ${e.label}: ${e.advertiser}`).join('\n')
        : '');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, content: text }),
    });

    if (res.ok) {
      console.log('✅ Webhook notification sent.');
    } else {
      console.error(`❌ Webhook returned ${res.status}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error('check-ads script failed:', err);
  process.exit(1);
});

