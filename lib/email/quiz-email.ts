import { SITE_URL } from '@/lib/seo/site';
import config from '@/config';
import { postalAddressLine } from '@/lib/business/postal-address';
import type { Episode } from '@/lib/stories/types';

/**
 * A Travels of Tan episode, quiz and answers as an email.
 *
 * One renderer for both sends that carry an episode — the welcome card from
 * `/api/subscribe/confirm` and the weekly broadcast from
 * `stories:create-broadcast` — so the footer's legal lines cannot drift apart
 * between them. The postal address is rendered whenever
 * `config.business.postalAddress` is set; the broadcast script refuses to run
 * while it is not, and `pnpm validate:subscribe` asserts both footers carry it.
 */

/** The sender and postal address as one footer line, or null while none is set. */
function senderLine(): string | null {
  const address = config.business.postalAddress;
  return address ? `${config.business.legalName} · ${postalAddressLine(address)}` : null;
}

const DEEP_OCEAN = '#1B365D';
const MOUNTAIN_MIST = '#2C5F7C';
const TEMPLE_STONE = '#FAF8F5';
const SOFT_MIST = '#F0F4F7';
const INK_BLACK = '#1A1A1A';
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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

/** The website uses WebP; email clients receive the compatible JPEG derivative. */
export function emailPanelUrl(panelArt: string): string {
  return `${SITE_URL}${panelArt.replace(/\.webp$/, '.jpg')}`;
}

export function quizEmailSubject(episode: Episode): string {
  return `The Travels of Tan — ${episode.titleEn}`;
}

export function quizEmailText(episode: Episode, unsubscribeUrl?: string): string {
  const lines = [
    `The Travels of Tan — ${episode.titleEn}`,
    '',
    `Episode ${episode.number}. Read the story, then try three questions on the words it teaches.`,
    `Every word is JLPT ${episode.level}.`,
    '',
    'Read the episode:',
    episodeUrl(episode),
    '',
  ];

  episode.panels.forEach((panel, i) => {
    lines.push(`--- Panel ${i + 1} ---`, panel.beat);
    panel.lines.forEach(line => lines.push(line.ja, line.en));
    lines.push('');
  });

  lines.push('---', '', 'Quiz');
  episode.quiz.forEach((question, i) => {
    lines.push(`${i + 1}. ${question.prompt}`);
    if (question.ask) lines.push(`   ${question.ask}`);
    lines.push(`   ${question.askEn}`);
    question.options.forEach((option, j) => lines.push(`   ${OPTION_LETTERS[j]}. ${option}`));
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
  if (unsubscribeUrl) lines.push('', `Unsubscribe: ${unsubscribeUrl}`);
  const sender = senderLine();
  if (sender) lines.push('', sender);
  return lines.join('\n');
}

export function quizEmailHtml(episode: Episode, unsubscribeUrl?: string): string {
  const story = episode.panels
    .map(
      (panel, i) => `
        <tr><td style="padding:0 0 24px;">
          <img src="${emailPanelUrl(panel.art)}" alt="${escapeHtml(panel.beat)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;" />
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT_MIST};">
            <tr><td style="padding:12px 16px 2px;font-size:16px;line-height:1.55;color:${INK_BLACK};"><strong>Panel ${i + 1}</strong></td></tr>${panel.lines
              .map(
                line => `
            <tr><td style="padding:6px 16px 0;font-size:16px;line-height:1.55;color:${INK_BLACK};">${escapeHtml(line.ja)}</td></tr>
            <tr><td style="padding:0 16px 8px;font-size:14px;line-height:1.5;color:${MOUNTAIN_MIST};">${escapeHtml(line.en)}</td></tr>`
              )
              .join('')}
          </table>
        </td></tr>`
    )
    .join('');
  const questions = episode.quiz
    .map(
      (question, i) => `
        <tr><td style="padding-bottom:20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT_MIST};border-radius:6px;padding:16px;">
          <tr><td style="padding-bottom:4px;font-size:14px;font-weight:700;color:${MOUNTAIN_MIST};">Question ${i + 1}</td></tr>
          <tr><td style="padding-bottom:2px;font-size:16px;line-height:1.5;color:${INK_BLACK};">${escapeHtml(question.prompt)}</td></tr>
          ${question.ask ? `<tr><td style="padding-bottom:2px;font-size:16px;line-height:1.5;color:${INK_BLACK};">${escapeHtml(question.ask)}</td></tr>` : ''}
          <tr><td style="padding-bottom:8px;font-size:14px;line-height:1.5;color:${MOUNTAIN_MIST};">${escapeHtml(question.askEn)}</td></tr>
          ${question.options.map((option, j) => `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};"><span style="color:${MOUNTAIN_MIST};font-weight:600;">${OPTION_LETTERS[j]}.</span>&nbsp;${escapeHtml(option)}</td></tr>`).join('')}
        </table></td></tr>`
    )
    .join('');
  const answers = episode.quiz
    .map((question, i) => `<tr><td style="padding:3px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};"><strong>${i + 1}. ${OPTION_LETTERS[question.answer]}</strong> &mdash; ${escapeHtml(question.options[question.answer])}</td></tr>`)
    .join('');
  const targets = episode.targets
    .map(target => `<tr><td style="padding:3px 0;font-size:15px;line-height:1.5;color:${INK_BLACK};"><strong>${escapeHtml(target.word)}</strong> <span style="color:${MOUNTAIN_MIST};">（${escapeHtml(target.reading)}）&mdash; ${escapeHtml(target.en)}</span></td></tr>`)
    .join('');
  const url = episodeUrl(episode);
  const sender = senderLine();

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="color-scheme" content="light only" /></head>
<body style="margin:0;padding:0;background:${TEMPLE_STONE};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TEMPLE_STONE};padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="font-size:20px;font-weight:700;color:${DEEP_OCEAN};padding-bottom:8px;">The Travels of Tan &mdash; ${escapeHtml(episode.titleEn)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:${MOUNTAIN_MIST};padding-bottom:20px;">Episode ${episode.number}. Read the story, then try three questions on the words it teaches. Every word is JLPT ${escapeHtml(episode.level)}.</td></tr>
<tr><td style="padding-bottom:24px;"><a href="${url}" style="display:inline-block;background:${DEEP_OCEAN};color:${TEMPLE_STONE};font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Read the episode</a></td></tr>
${story}<tr><td style="font-size:16px;font-weight:700;color:${DEEP_OCEAN};padding:8px 0;border-top:1px solid ${SOFT_MIST};">Quiz</td></tr>${questions}
<tr><td style="font-size:16px;font-weight:700;color:${DEEP_OCEAN};padding:8px 0;border-top:1px solid ${SOFT_MIST};">Answers</td></tr><tr><td style="padding-bottom:20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${answers}</table></td></tr>
<tr><td style="font-size:16px;font-weight:700;color:${DEEP_OCEAN};padding:8px 0;border-top:1px solid ${SOFT_MIST};">The words this episode teaches</td></tr><tr><td style="padding-bottom:24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${targets}</table></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:${MOUNTAIN_MIST};border-top:1px solid ${SOFT_MIST};padding-top:16px;">A new episode goes up every week. Reply to this email if you get stuck on anything &mdash; it reaches a person, not a robot.</td></tr>
<tr><td style="font-size:12px;line-height:1.6;color:${MOUNTAIN_MIST};padding-top:12px;">${escapeHtml(config.appName)} &middot; <a href="${SITE_URL}/stories" style="color:${DEEP_OCEAN};">every episode</a>${unsubscribeUrl ? ` &middot; <a href="${unsubscribeUrl}" style="color:${DEEP_OCEAN};">unsubscribe</a>` : ''}</td></tr>
${sender ? `<tr><td style="font-size:12px;line-height:1.6;color:${MOUNTAIN_MIST};padding-top:4px;">${escapeHtml(sender)}</td></tr>\n` : ''}</table></td></tr></table></body></html>`;
}