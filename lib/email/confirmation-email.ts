import { SITE_URL } from '@/lib/seo/site';
import config from '@/config';

/**
 * The double-opt-in confirmation email, inlined.
 *
 * ---------------------------------------------------------------------------
 * Why this is a template literal and not a file
 * ---------------------------------------------------------------------------
 *
 * There are two `.html` files under `lib/emails/templates/` and they must not
 * be used. They are read by `loadTemplate` (`lib/utils/emailUtils.ts:10`),
 * which does `fs.readFile(path.join(process.cwd(), ..., name + '.html'))` with
 * the name as a RUNTIME VARIABLE, so Next's file tracing cannot see the path
 * and `next.config.js` sets no `outputFileTracingIncludes`. It works under
 * `pnpm dev` and 500s in a serverless function — the identical trap CLAUDE.md
 * records for `lib/sentences/published.ts`.
 *
 * Both of that loader's callers (`sendSubConfirmEmail`, `sendDailyDigest`) have
 * zero call sites, so the bug has never fired. Wiring the consent email to it
 * would have made the one email we are legally obliged to deliver the first
 * thing ever to run that path.
 *
 * ---------------------------------------------------------------------------
 * Constraints on the markup
 * ---------------------------------------------------------------------------
 *
 * Transactional, and it should look it: one action, no images, no marketing.
 * Outlook blocks images by default, so the email has to read correctly with
 * none — the easiest way to guarantee that is to ship none. Styles are inline
 * because email clients strip <style> blocks. Colours are literals here on
 * purpose: `lib/` is outside the palette validator's scope and email clients
 * do not resolve CSS custom properties.
 */

/** Where the confirmation link points. A page with a button, not a bare GET. */
export function confirmUrl(token: string): string {
  return `${SITE_URL}/confirm?token=${encodeURIComponent(token)}`;
}

const DEEP_OCEAN = '#1B365D';
const MOUNTAIN_MIST = '#2C5F7C';
const TEMPLE_STONE = '#FAF8F5';

export function confirmationEmailSubject(): string {
  return `Confirm your ${config.appName} subscription`;
}

export function confirmationEmailText(token: string): string {
  return [
    `Confirm your ${config.appName} subscription`,
    '',
    'Someone — hopefully you — asked for the weekly story from MichiKanji.',
    'Open this link and press the button to confirm:',
    '',
    confirmUrl(token),
    '',
    'The link works for 48 hours. If this was not you, ignore this email:',
    'nothing happens until the button is pressed, and we have not added you to',
    'anything.',
  ].join('\n');
}

export function confirmationEmailHtml(token: string): string {
  const url = confirmUrl(token);
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${TEMPLE_STONE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TEMPLE_STONE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <tr>
            <td style="font-size:20px;font-weight:700;color:${DEEP_OCEAN};padding-bottom:16px;">
              One tap and you&rsquo;re in
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:${MOUNTAIN_MIST};padding-bottom:24px;">
              Someone &mdash; hopefully you &mdash; asked for the weekly story from ${config.appName}.
              Press the button and I&rsquo;ll start sending it.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${url}" style="display:inline-block;background:${DEEP_OCEAN};color:${TEMPLE_STONE};font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">
                Yes, subscribe
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:${MOUNTAIN_MIST};padding-bottom:8px;">
              The link works for 48 hours. If this wasn&rsquo;t you, just ignore this email &mdash;
              nothing happens until that button is pressed, and you haven&rsquo;t been added to anything.
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;line-height:1.6;color:${MOUNTAIN_MIST};padding-top:16px;word-break:break-all;">
              Button not working? Open this link:<br />
              <a href="${url}" style="color:${DEEP_OCEAN};">${url}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
