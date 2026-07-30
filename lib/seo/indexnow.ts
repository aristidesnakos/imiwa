/**
 * IndexNow verification key. NOT a secret — it grants no access to anything;
 * it only proves domain ownership via the plain-text file it points at
 * (`public/${INDEXNOW_KEY}.txt`), the same trust model as a Search Console
 * HTML-verification file. Safe to commit; no env var / GitHub Secret needed.
 */
export const INDEXNOW_KEY = '9b5153df571eb339ad61703e3da5cf4b';
