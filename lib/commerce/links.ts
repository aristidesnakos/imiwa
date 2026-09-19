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
export const AMAZON_BOOK_URL = 'https://www.amazon.com/dp/B0HK9GYNNS';

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
 * 2 Sep 2026: the three pack downloads were firing under three different
 * naming systems — `pack_kana_download_clicked`, `pack_n5_download_clicked` and
 * `resources_pack_download` — depending on which page the button sat on. They
 * are now one grammar, `<place>_<thing>_<action>`, and they stay THREE names.
 *
 * The line between a name and a property is whether the split changes a
 * decision. These three are three different offers on three different pages:
 * the kana pack under the kana sheets, the N5 pack under the N5 sheets, the
 * 87-page starter pack on the hub. Any one of them can be rewritten, moved or
 * killed on its own, so each needs its own series. The destination — which host
 * serves the PDF — never changes a decision by itself, so it stays a property.
 *
 * The pooled total is still available: three numbers added. The reverse is not
 * — a pooled goal cannot be split back apart without tool support we have not
 * verified. Addition is free; division is not.
 *
 * NOTE: renaming these starts the counters from zero — DataFast keys history on
 * the goal name, so the old series does not carry over. Note the switchover date
 * in DataFast so the discontinuity is legible later, and repoint the
 * "Downloaded the pack" step in both /free-resources funnels at
 * `resources_pack_starter_download` — that hub button is the one they measure.
 */
export const PACK_DOWNLOAD_GOALS = {
  kana: 'resources_pack_kana_download',
  n5Kanji: 'resources_pack_n5_download',
  starter: 'resources_pack_starter_download',
} as const;

/** Recorded as a property on the goals above, never as part of their name. */
export const PACK_DESTINATION = 'michikanji_site';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BOOK — GOAL NAMES, TAGS, AND THE PER-SURFACE URL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Amazon is off-site. DataFast can record the click OUT and can never record
 * the sale, so these names measure intent leaving michikanji.com and nothing
 * more. What happens after the click is joined back by hand — see
 * `data/book-sales/README.md`.
 *
 * ONE BOOK, THREE NAMES. The same rule that kept the three pack downloads
 * apart keeps these apart: a split you would act on separately belongs in the
 * name, and the surfaces lead to different decisions.
 *
 *   · `n5_sheets_book_click` — the print-intent page. High if the people who
 *     print sheets will also buy a bound one → the book belongs on every print
 *     surface and N4 is justified by our own traffic. Low, on a page whose FREE
 *     pack CTA takes ~20% of visitors → people who want free print material do
 *     not convert to a paperback; stop giving the book that slot.
 *
 *   · `kanji_detail_book_click` — the ~1,896-page template, 51,550 impressions
 *     a month at average position 9.68. High → those pages are a commercial
 *     asset and the title/meta work to land searchers on them stops being an
 *     SEO hobby and becomes a revenue project. Low → they are reference
 *     lookups, the line goes, and the N5 plan's "link it from the kanji pages"
 *     is answered *no*. This is the highest-value number on the list.
 *
 * A funnel step matches a goal NAME and ignores properties (verified: the
 * dashboard's step editor takes a goal name, and the shipped script sends
 * properties as event metadata). Pooling these behind one name with a `source`
 * property would make both questions above unanswerable in a funnel, and a
 * pooled series cannot be divided back later. Addition is free; division is not.
 *
 * The cost of the split, stated so nobody rediscovers it: there is no single
 * "book clicks" series, so the book can never be the #1 KPI without pooling.
 * Recovering that would take a second, pooled goal fired from the same element
 * — and the shipped script reads ONE `data-fast-goal` per element and resolves
 * only the NEAREST such ancestor, so dual-firing needs JavaScript, which means
 * a client boundary on 1,896 pages. Not worth it. Read three numbers and add.
 *
 * NOT HERE, ON PURPOSE: the sheets INDEX (`/free-resources/kanji-sheets`). Its
 * only job is to send a visitor to a level page; an offer placed high competes
 * with that, and placed low it reads a near-zero that cannot be told apart
 * from "nobody scrolled". Its name is decided — `kanji_sheets_book_click` —
 * and it is not defined until something renders it, because an unused goal name
 * is a permanent line in a list that never shrinks.
 */
export type BookSurface = 'n5Sheets' | 'kanjiDetail';

export const BOOK_CLICK_GOALS = {
  n5Sheets: 'n5_sheets_book_click',
  kanjiDetail: 'kanji_detail_book_click',
} as const satisfies Record<BookSurface, string>;

/**
 * Scroll markers for the book offer. Deliberately only ONE.
 *
 * On `/free-resources/kanji-sheets/n5-sheets` the card sits below an 82-cell
 * grid and a full-width free-pack block, so "did they ever see it" is a real
 * question with a real answer, and a click rate without it cannot separate a
 * placement problem from a copy problem. ~331 pageviews a month, and scroll
 * goals re-fire on viewport re-entry, so budget ~600–700 events a month.
 *
 * The detail pages get NO marker. The line sits immediately under the action
 * bar, well above the example sentences, so "seen" is close to certain and the
 * marker would buy a predictable answer for ~3–4k events a month against the
 * N5 subset's ~2k pageviews. If `kanji_detail_book_click` comes back near zero,
 * THEN add `kanji_detail_scroll_book` to tell unseen from unconvincing — that
 * is a second-cycle question and the event budget is better spent then.
 *
 * The marker goes on the heading block, never on the section: the shipped
 * script registers its observer with `threshold: [0, t]` and fires on the
 * first intersecting pixel regardless of the threshold attribute, so a marker
 * on a full-height section records "they left the section above it".
 */
export const BOOK_SCROLL_GOALS: Partial<Record<BookSurface, string>> = {
  n5Sheets: 'n5_sheets_scroll_book',
};

/**
 * How long the heading must stay in view before the marker fires, in ms.
 *
 * `data-fast-scroll-delay` is the only real dwell control in the script — it
 * re-reads the element's rect after the timeout and drops the goal if the
 * visitor has already scrolled past. `data-fast-scroll-threshold` does not
 * gate the fire at all; it only changes recorded metadata. Here the difference
 * between "glanced past on the way to the instructions" and "considered the
 * offer" is exactly the distinction the funnel is built to report.
 */
export const BOOK_SCROLL_DELAY_MS = 1500;

/** Recorded as a property on the goals above, never as part of their name. */
export const BOOK_DESTINATION = 'amazon';

/**
 * Amazon Attribution tags, one per surface. Empty until they exist.
 *
 * Amazon Attribution has been open to KDP authors since 2022 in the US, CA,
 * UK, DE, ES, FR and IT, and it reports clicks, detail-page views, purchases
 * and sales PER TAG on a 14-day last-touch window. If Ari's account is
 * eligible, that turns the reconciliation below from a date-coincidence table
 * into real attribution — and because a tag is per link, each surface can
 * carry its own, so Amazon's purchase counts line up one-to-one with the goal
 * names above.
 *
 * A tag is a query blob (`?maas=…&ref_=aa_maas`, plus `aa_*` campaign params).
 * It goes HERE, on the individual link, and never into `AMAZON_BOOK_URL` —
 * that constant is the identity of the product, and a tracking blob baked into
 * it would travel into canonical URLs, JSON-LD and anything else that ever
 * reads it. Verify eligibility in the ad console at listing time; leaving these
 * empty is a supported state, not a TODO that breaks anything.
 */
export const BOOK_ATTRIBUTION_TAGS: Record<BookSurface, string> = {
  n5Sheets: '',
  kanjiDetail: '',
};

/**
 * The listing URL for one surface, with that surface's Attribution tag if it
 * has one.
 *
 * Returns the bare URL when the tag is empty, so nothing has to change here
 * for the site to go live before Attribution is set up — or if it never is.
 */
export function bookUrlFor(surface: BookSurface): string {
  const tag = BOOK_ATTRIBUTION_TAGS[surface].trim().replace(/^[?&]/, '');
  if (!tag) return AMAZON_BOOK_URL;
  return `${AMAZON_BOOK_URL}${AMAZON_BOOK_URL.includes('?') ? '&' : '?'}${tag}`;
}

