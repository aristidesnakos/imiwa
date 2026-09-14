import { SITE_URL } from '@/lib/seo/site';
import config from '@/config';
import type { Episode } from '@/lib/stories/types';

/**
 * The quiz card, as an email — the thing `/stories` has been promising.
 *
 * ---------------------------------------------------------------------------
 * Why this is generated text and not the PNG
 * ---------------------------------------------------------------------------
 *
 * `build.py` composites a real quiz card (`out/<slug>-quiz.png`), and CLAUDE.md
 * records that it is deliberately NOT copied into `public/` because it is the
 * email offer rather than page content. The obvious move is therefore to attach
 * it. Three reasons not to, in order of weight:
 *
 *  - **Outlook blocks images by default**, and so do most clients on first
 *    contact from an unfamiliar sender. The first email off a young sending
 *    domain is the worst possible moment to send one whose entire content is a
 *    picture. `confirmation-email.ts` ships no images for the same reason.
 *  - **The file lives outside this repo**, in the strips working tree. Pulling
 *    it in at runtime means an `fs` read whose path Next's file tracing cannot
 *    see — the exact trap documented for `lib/sentences/published.ts` and for
 *    `lib/utils/emailUtils.ts`, which works under `pnpm dev` and 500s in a
 *    serverless function.
 *  - **Text is the same content and more of it.** A learner can copy a kana
 *    option out of an email; they cannot copy it out of a PNG.
 *
 * So the card is rendered from the same typed episode the page renders from.
 * One source, three renderers — page, strip, email — which is the whole point
 * of `lib/stories/types.ts` (see `story-pages.md` §6).
 *
 * ---------------------------------------------------------------------------
 * Constraints on the markup
 * ---------------------------------------------------------------------------
 *
 * Identical to `confirmation-email.ts`, and for the same reasons: styles inline
 * because clients strip `<style>` blocks, colours as literals because `lib/` is
 * outside the palette validator's scope and no email client resolves a CSS
 * custom property, tables for layout because Outlook uses the Word engine.
 *
 * One rule specific to this email: **every link points at a page we own, and
 * none of them is percent-encoded here.** `episode-spec.md` §A5 records that a
 * `/kanji/%E5%B1%B1` URL survives exactly one encoding pass; an ESP link
 * rewriter is a second one, which is why click tracking is off. The only link
 * below is `/stories/<slug>`, and slugs are ASCII precisely so this never comes
 * up.
 */

const DEEP_OCEAN = '#1B365D';
const MOUNTAIN_MIST = '#2C5F7C';
const TEMPLE_STONE = '#FAF8F5';
const SOFT_MIST = '#F0F4F7';
const INK_BLACK = '#1A1A1A';

/** Matches the page's labels. Three options today; the validator allows more. */
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Minimal HTML escaping for the episode's own strings.
 *
 * The content is ours and committed, so this is not an XSS boundary — it is
 * correctness. A meaning gloss like "big, large & tall" or an option containing
 * `<` would otherwise render as broken markup in the one email a new subscriber
 * ever judges us on.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function episodeUrl(episode: Episode): string {
  return `${SITE_URL}/stories/${episode.slug}`;
}

export function quizEmailSubject(episode: Episode): string {
  return `Your quiz card — ${episode.titleEn}`;
}

export function quizEmailText(episode: Episode): string {
  const lines: string[] = [
    `Your quiz card — ${episode.titleEn}`,
    '',
    `Episode ${episode.number} of The Travels of Tan. Three questions on the words it`,
    `teaches, with the answers at the bottom. Every word is JLPT ${episode.level}.`,
    '',
    'Read the episode:',
    episodeUrl(episode),
    '',
    '---',
    '',
  ];

  episode.quiz.forEach((question, i) => {
    lines.push(`${i + 1}. ${question.prompt}`);
    if (question.ask) lines.push(`   ${question.ask}`);
    lines.push(`   ${question.askEn}`);
    question.options.forEach((option, j) => {
      lines.push(`   ${OPTION_LETTERS[j]}. ${option}`);
    });
    lines.push('');
  });

  lines.push('---', '', 'Answers');
  episode.quiz.forEach((question, i) => {
    lines.push(`${i + 1}. ${OPTION_LETTERS[question.answer]} — ${question.options[question.answer]}`);
  });

  lines.push(
    '',
    'The words this episode teaches:',
    ...episode.targets.map(t => `  ${t.word} (${t.reading}) — ${t.en}`),
    '',
    'A new episode goes up every week. Reply to this email if you get stuck on',
    'anything — it reaches a person, not a robot.',
  );

  return lines.join('\n');
}

export function quizEmailHtml(episode: Episode): string {
  const url = episodeUrl(episode);

  const questions = episode.quiz
    .map((question, i) => {
      const options = question.options
        .map(
          (option, j) => `
                <tr>
                  <td style="padding:4px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};">
                    <span style="color:${MOUNTAIN_MIST};font-weight:600;">${OPTION_LETTERS[j]}.</span>
                    &nbsp;${escapeHtml(option)}
                  </td>
                </tr>`
        )
        .join('');

      // `ask` is empty when the prompt is already the question — a whole
      // sentence rather than a single word. Emitting an empty row would leave a
      // visible gap in Outlook, which collapses nothing.
      const ask = question.ask
        ? `
              <tr>
                <td style="padding-bottom:2px;font-size:16px;line-height:1.5;color:${INK_BLACK};">${escapeHtml(question.ask)}</td>
              </tr>`
        : '';

      return `
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT_MIST};border-radius:6px;padding:16px;">
                <tr>
                  <td style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${MOUNTAIN_MIST};padding-bottom:8px;">
                    Question ${i + 1}
                  </td>
                </tr>
                <tr>
                  <td style="font-size:20px;font-weight:700;color:${DEEP_OCEAN};padding-bottom:4px;">${escapeHtml(question.prompt)}</td>
                </tr>${ask}
                <tr>
                  <td style="font-size:14px;line-height:1.5;color:${MOUNTAIN_MIST};padding-bottom:10px;">${escapeHtml(question.askEn)}</td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${options}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
    })
    .join('');

  const answers = episode.quiz
    .map(
      (question, i) => `
                <tr>
                  <td style="padding:4px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};">
                    <span style="color:${MOUNTAIN_MIST};">${i + 1}.</span>
                    &nbsp;<strong>${OPTION_LETTERS[question.answer]}</strong>
                    &mdash; ${escapeHtml(question.options[question.answer])}
                  </td>
                </tr>`
    )
    .join('');

  const targets = episode.targets
    .map(
      target => `
                <tr>
                  <td style="padding:3px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};">
                    <strong>${escapeHtml(target.word)}</strong>
                    <span style="color:${MOUNTAIN_MIST};">（${escapeHtml(target.reading)}）&mdash; ${escapeHtml(target.en)}</span>
                  </td>
                </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:${TEMPLE_STONE};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TEMPLE_STONE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <tr>
            <td style="font-size:20px;font-weight:700;color:${DEEP_OCEAN};padding-bottom:8px;">
              Your quiz card &mdash; ${escapeHtml(episode.titleEn)}
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:${MOUNTAIN_MIST};padding-bottom:20px;">
              Episode ${episode.number} of <em>The Travels of Tan</em>. Three questions on the words it
              teaches, with the answers at the bottom. Every word is JLPT ${escapeHtml(episode.level)}.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${url}" style="display:inline-block;background:${DEEP_OCEAN};color:${TEMPLE_STONE};font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">
                Read the episode
              </a>
            </td>
          </tr>${questions}
          <tr>
            <td style="font-size:16px;font-weight:700;color:${DEEP_OCEAN};padding:8px 0;border-top:1px solid ${SOFT_MIST};">
              Answers
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${answers}
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-size:16px;font-weight:700;color:${DEEP_OCEAN};padding:8px 0;border-top:1px solid ${SOFT_MIST};">
              The words this episode teaches
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${targets}
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:${MOUNTAIN_MIST};border-top:1px solid ${SOFT_MIST};padding-top:16px;">
              A new episode goes up every week. Reply to this email if you get stuck on anything &mdash;
              it reaches a person, not a robot.
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;line-height:1.6;color:${MOUNTAIN_MIST};padding-top:12px;">
              ${escapeHtml(config.appName)} &middot; <a href="${SITE_URL}/stories" style="color:${DEEP_OCEAN};">every episode</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
