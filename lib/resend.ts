import { Resend } from 'resend';
import config from "@/config";
import { loadTemplate, replaceVariables } from '@/lib/utils/emailUtils';

// Initialize Resend with your API key only if the key is available
let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else if (process.env.NODE_ENV === "development") {
  console.group("⚠️ RESEND_API_KEY missing from .env");
  console.error("It's required to send emails.");
  console.error("If you don't need it, remove the code from /libs/resend.ts");
  console.groupEnd();
}

/**
 * Sends an email using Resend.
 *
 * @async
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text content of the email.
 * @param {string} html - The HTML content of the email.
 * @param {string} replyTo - The email address to set as the "Reply-To" address.
 * @returns {Promise} A Promise that resolves when the email is sent.
 */
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}): Promise<any> => {
  if (!resend) {
    console.warn('Resend service not available. Skipping email send.');
    return { id: 'mock-email-id', message: 'Email sending disabled (no API key)' };
  }

  try {
    const data = {
      from: config.resend.fromAdmin,
      to: [to],
      subject,
      text,
      html,
      reply_to: replyTo,
    };

    const { data: result, error } = await resend.emails.send(data);

    if (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    return result;
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};

interface SendSubConfirmEmailParams {
  to: string;
  subject: string;
  htmlTemplate: string;
  replyTo: string;
  emailVariables: Record<string, string | string[] | number>;
}

export const sendSubConfirmEmail = async ({
  to,
  subject,
  htmlTemplate,
  replyTo,
  emailVariables
}: SendSubConfirmEmailParams): Promise<any> => {
  if (!resend) {
    console.warn('Resend service not available. Skipping subscription confirmation email.');
    return { id: 'mock-sub-confirm-id', message: 'Email sending disabled (no API key)' };
  }

  try {
    let template = await loadTemplate(htmlTemplate);
    
    // Add logo URL to emailVariables
    emailVariables.logo_url = `${process.env.NEXT_PUBLIC_BASE_URL}/app/icon.png`;

    // Convert any non-string values to their appropriate template format
    const processedVariables = Object.entries(emailVariables).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        // For arrays, create a list item for each entry
        acc[key] = value.map(item => `<li>${item}</li>`).join('\n');
      } else if (typeof value === 'number') {
        acc[key] = value.toString();
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    const html = replaceVariables(template, processedVariables);
    
    return await sendEmail({
      to,
      subject,
      html,
      replyTo
    });
  } catch (error) {
    console.error('Error in sendSubConfirmEmail:', error);
    throw error;
  }
};

export async function sendDailyDigest({
  to,
  total_feedback,
  positive_feedback,
  pending_ratings,
  product_id,
  product_name,
  points,
  ranking
}: {
  to: string;
  total_feedback: number;
  positive_feedback: string;
  pending_ratings: number;
  product_id: string;
  product_name: string;
  points: number;
  ranking: number;
}) {
  if (!resend) {
    console.warn('Resend service not available. Skipping daily digest email.');
    return { id: 'mock-digest-id', message: 'Email sending disabled (no API key)' };
  }

  try {
    const template = await loadTemplate('sofaast-daily-digest');

    // Generate ranking message
    const rankingMessage = ranking <= 5
      ? '🏆 Congratulations on being in the top 5!'
      : `💪 Keep going! You're just ${ranking - 5} positions away from the top 5.`;

    const html = replaceVariables(template, {
      logo_url: `${config.domainName}/images/twitter-image.png`,
      base_url: config.domainName,
      date: new Date().toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      points: points.toString(),
      ranking: ranking.toString(),
      ranking_message: rankingMessage,
      total_feedback: total_feedback.toString(),
      positive_feedback: positive_feedback,
      pending_ratings: pending_ratings.toString(),
      product_url: `${config.domainName}/products/${product_id}`,
      product_name: product_name
    });

    return sendEmail({
      to,
      subject: `${product_name} Feedback Digest - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      html
    });
  } catch (error) {
    console.error('Failed to send daily digest:', error);
    throw error;
  }
}