/**
 * Converts a string to a URL-friendly slug format
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Ensures clean URL-friendly format
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word characters except hyphens
    .replace(/--+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Extracts a slug from a URL path
 */
export function extractSlug(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}
