import fs from 'fs/promises';
import path from 'path';

/**
 * Loads an email template from a file.
 *
 * @param templateName The name of the template file (without extension) or path (e.g., 'stripe/purchase-confirmation')
 * @returns The content of the template file as a string
 */
export async function loadTemplate(templateName: string): Promise<string> {
  // Try multiple possible locations for templates
  const possiblePaths = [
    // Check in lib/emails/stripe for Stripe-specific templates
    path.join(process.cwd(), 'lib', 'emails', 'stripe', `${templateName}.html`),
    // Check in lib/emails/templates for general templates
    path.join(process.cwd(), 'lib', 'emails', 'templates', `${templateName}.html`),
    // Legacy path for backward compatibility
    path.join(process.cwd(), 'email-templates', `${templateName}.html`),
    // If templateName includes a path separator, use it as-is
    templateName.includes('/') ? path.join(process.cwd(), 'lib', 'emails', `${templateName}.html`) : null,
  ].filter(Boolean) as string[];

  for (const templatePath of possiblePaths) {
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      // Continue to next path if file not found
      continue;
    }
  }

  console.error(`Error loading template ${templateName}: Template not found in any location`);
  throw new Error(`Failed to load email template: ${templateName}`);
}

/**
 * Replaces variables in a template string with provided values.
 * 
 * @param template The template string containing placeholders
 * @param variables An object with key-value pairs for replacement
 * @returns The template with variables replaced
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(regex, value);
  }, template);
}