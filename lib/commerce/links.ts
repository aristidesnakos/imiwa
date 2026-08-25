/**
 * lib/commerce/links.ts
 *
 * Every destination a "get the pack" or "buy the book" control can point at,
 * in one file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ONE FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These URLs have moved twice and broken once. Renaming the Gumroad store from
 * `llanai` to `michikanji` released the old subdomain, and every buy button on
 * six pages served a 404 — silently, for days, because the href was written out
 * four times in four components and nothing asserted that any of them resolved.
 * The fix then was "one const per component", which is one const too many: it
 * still means four edits and four chances to miss one.
 *
 * So the rule is now the stronger one. A component does not name a destination.
 * It imports one from here. When a destination moves, it moves once.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO CHANNELS, AND ONLY TWO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Free things come from michikanji.com. Paid things come from Amazon. Gumroad
 * is retired — it was three $0+ listings and $2 of lifetime revenue against 865
 * product-page visits, and the free generator on this very site strictly
 * dominated the file it was selling.
 *
 * The packs are now static files under `public/downloads/`, served same-origin.
 * That is deliberate and is worth defending against the next good idea:
 *
 *   · no email gate. The pack's job is to be printed, not to be a form.
 *   · no redirect, no interstitial, no third-party host. One click, one file.
 *   · same origin, so no `target="_blank"` and no `rel="noopener"` — a download
 *     does not navigate the tab, so there is no new tab to warn about. If you
 *     copy one of these into an anchor, check the screen-reader text with it:
 *     "(opens in a new tab)" is now a lie.
 */

/**
 * The three printable packs, served from `public/downloads/`.
 *
 * `starter` is kana + kanji concatenated — 87 pages. It replaces what used to
 * be a Gumroad "bundle", which owned no file of its own and merely granted the
 * other two. On this side of the move a bundle has to be an actual file.
 *
 * Keep these in sync with the files in `public/downloads/`. There is no build
 * step that checks it; a typo here is a 404 that looks exactly like a working
 * button until someone clicks it.
 */
export const PACK_DOWNLOADS = {
  kana: '/downloads/michikanji-hiragana-katakana-practice-sheets.pdf',
  n5Kanji: '/downloads/michikanji-n5-kanji-practice-sheets.pdf',
  starter: '/downloads/michikanji-japanese-writing-starter-pack.pdf',
} as const;

/**
 * What the browser should call the file once it is saved.
 *
 * Without this the `download` attribute keeps the URL's basename, which is
 * already fine — these are named for humans, not for the router. It is spelled
 * out anyway so that renaming a file on disk cannot quietly change what lands
 * in someone's Downloads folder.
 */
export const PACK_FILENAMES = {
  kana: 'MichiKanji-Hiragana-Katakana-Practice-Sheets.pdf',
  n5Kanji: 'MichiKanji-N5-Kanji-Practice-Sheets.pdf',
  starter: 'MichiKanji-Japanese-Writing-Starter-Pack.pdf',
} as const;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE AMAZON LISTING — DELIBERATELY EMPTY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The paid product is an undated N5 stroke-order paperback on Amazon KDP. It is
 * not published yet, so there is no URL to put here.
 *
 * Fill this in with the listing URL — `https://www.amazon.com/dp/<ASIN>` — once
 * the book is live, and nothing else. Every surface that should offer the book
 * reads `hasAmazonListing()` and renders nothing while this is empty, so the
 * one edit turns the book on everywhere at once. Do not paste an affiliate tag
 * or a `?ref=` blob into it: those belong on the individual link if they are
 * ever wanted, not on the identity of the product.
 *
 * An empty string, not `null` or `undefined`, so that `hasAmazonListing` is the
 * only place the "is it live yet" question gets answered.
 */
export const AMAZON_BOOK_URL = '';

/** True once `AMAZON_BOOK_URL` has been filled in. Gate book CTAs on this. */
export function hasAmazonListing(): boolean {
  return AMAZON_BOOK_URL.trim().length > 0;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DATAFAST GOAL NAMES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * These sit beside the URLs because they describe the same events, and when a
 * destination moves the goal name is the thing most likely to be left behind
 * describing a platform that no longer exists.
 *
 * Which is exactly what happened: they were `kana_workbook_gumroad_clicked` and
 * `kanji_n5_workbook_gumroad_clicked`. A goal name should say what the visitor
 * did, not which vendor happened to be receiving it that quarter — otherwise
 * every vendor change either breaks the funnel or leaves a lie in the reports.
 *
 * The platform still gets recorded, as a `destination` PROPERTY. That is the
 * part that is allowed to change without renaming anything: filter on it when
 * you want the split, ignore it when you want the total.
 *
 * NOTE: renaming these starts the counters from zero — DataFast keys history on
 * the goal name, so the old series does not carry over. Note the switchover date
 * in DataFast so the discontinuity is legible later.
 */
export const PACK_DOWNLOAD_GOALS = {
  kana: 'pack_kana_download_clicked',
  n5Kanji: 'pack_n5_download_clicked',
} as const;

/** Recorded as a property on the goals above, never as part of their name. */
export const PACK_DESTINATION = 'michikanji_site';
