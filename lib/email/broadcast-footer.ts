import config from '@/config';
import { SITE_URL } from '@/lib/seo/site';

/**
 * The footer every broadcast must carry, and the check that says whether it
 * does.
 *
 * ---------------------------------------------------------------------------
 * Why a module for six lines of HTML
 * ---------------------------------------------------------------------------
 *
 * Two obligations meet in this footer and both fail silently:
 *
 *   1. `{{{RESEND_UNSUBSCRIBE_URL}}}` is what makes unsubscribe work. Resend
 *      owns the flow — their hosted page, their state change, no code from us —
 *      but ONLY if the variable is present in the body. Leave it out and
 *      nothing warns you: not the SDK, not the types, not the dashboard. The
 *      broadcast sends, looks fine, and has no unsubscribe. That is a CAN-SPAM
 *      violation per recipient and the fastest known way to be marked spam.
 *
 *   2. CAN-SPAM (16 CFR 316.5) requires a valid physical postal address in
 *      every commercial email. There is no technical failure mode at all here —
 *      the email just sends without it.
 *
 * Neither is caught by anything else in this repo, and the broadcast is
 * composed by hand in the Resend dashboard (docs/prd/story-delivery-resend.md
 * §5 Phase 4 — deliberately manual, no cron). Hand-composed plus
 * silent-on-omission is the exact combination that wants a committed source of
 * truth and a gate. Paste `broadcastFooterHtml()` in; run
 * `pnpm validate:subscribe` to be told if the address is still missing.
 *
 * Colours are literals, like `confirmation-email.ts`: `lib/` is outside the
 * palette validator's scope and email clients do not resolve CSS custom
 * properties.
 */

/**
 * The Resend template variable that produces a working unsubscribe link.
 *
 * Triple braces are not a typo — Resend interpolates the URL unescaped, and the
 * two-brace form would HTML-escape it into a dead link.
 */
export const RESEND_UNSUBSCRIBE_VARIABLE = '{{{RESEND_UNSUBSCRIBE_URL}}}';

/** Do we have everything a commercial email is legally required to carry? */
export function missingBroadcastRequirements(): string[] {
  const missing: string[] = [];
  if (!config.business.postalAddress.trim()) {
    missing.push(
      'config.business.postalAddress is empty — CAN-SPAM requires a physical postal address in every commercial email'
    );
  }
  if (!config.business.legalName.trim()) {
    missing.push('config.business.legalName is empty');
  }
  return missing;
}

/**
 * Build the footer, or refuse.
 *
 * Throwing is the point. A footer that silently renders without a postal
 * address is indistinguishable from a correct one until someone complains, so
 * the missing value has to stop the build of the thing rather than degrade it.
 */
export function broadcastFooterHtml(): string {
  const missing = missingBroadcastRequirements();
  if (missing.length > 0) {
    throw new Error(`Refusing to build a broadcast footer:\n  - ${missing.join('\n  - ')}`);
  }

  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #E8EDF2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.6;color:#2C5F7C;">
  <p style="margin:0 0 8px;">
    You're getting this because you confirmed your address at
    <a href="${SITE_URL}" style="color:#1B365D;">${config.domainName}</a>.
    <a href="${RESEND_UNSUBSCRIBE_VARIABLE}" style="color:#1B365D;">Unsubscribe</a>
    and you'll hear nothing further.
  </p>
  <p style="margin:0;">
    ${config.business.legalName}, ${config.business.postalAddress}
  </p>
</div>`;
}

/** The same thing for the plain-text part. */
export function broadcastFooterText(): string {
  const missing = missingBroadcastRequirements();
  if (missing.length > 0) {
    throw new Error(`Refusing to build a broadcast footer:\n  - ${missing.join('\n  - ')}`);
  }

  return [
    '',
    '---',
    `You're getting this because you confirmed your address at ${config.domainName}.`,
    `Unsubscribe: ${RESEND_UNSUBSCRIBE_VARIABLE}`,
    `${config.business.legalName}, ${config.business.postalAddress}`,
  ].join('\n');
}

/**
 * Check a composed broadcast body before it is scheduled.
 *
 * Copy the body out of the Resend composer and pass it here. Returns the list
 * of problems; empty means it is safe to schedule.
 */
export function auditBroadcastBody(body: string): string[] {
  const problems = missingBroadcastRequirements();

  if (!body.includes(RESEND_UNSUBSCRIBE_VARIABLE)) {
    problems.push(
      `the body does not contain ${RESEND_UNSUBSCRIBE_VARIABLE} — the unsubscribe link will not exist`
    );
  }

  const postal = config.business.postalAddress.trim();
  if (postal && !body.includes(postal)) {
    problems.push('the body does not contain the postal address from config.business');
  }

  return problems;
}
