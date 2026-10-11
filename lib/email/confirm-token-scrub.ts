/**
 * The inline script /confirm runs to take the signup token out of the address
 * bar before DataFast can read it.
 *
 * ---------------------------------------------------------------------------
 * Why the address bar, and not the email link
 * ---------------------------------------------------------------------------
 *
 * The token's payload is base64url JSON holding the subscriber's address
 * (lib/email/subscribe-token.ts), and DataFast's page-view script
 * (app/layout.tsx) reports `window.location.href` with every event it sends.
 * That is the whole URL, query AND fragment, so moving the token into a `#…`
 * would not hide it from DataFast. It would hide it from the server, but then
 * only JavaScript could put it into the form, and the confirm button works
 * without JavaScript on purpose (app/confirm/page.tsx). The script has no
 * attribute for leaving a page untracked either. It reads the URL when it runs
 * and again only on a `pushState` that changes the path. It never watches
 * `replaceState`.
 *
 * So the page server-renders the token into its hidden form field, as before,
 * and this script removes it from the URL. Two orderings make that safe, and
 * neither depends on timing:
 *
 *  - DataFast's tag is `defer`. A deferred script runs only after the whole
 *    document is parsed, and this is an inline script inside the document, so
 *    it has always run first. DataFast's first page view is reported as plain
 *    `/confirm`.
 *  - Next's router takes its starting URL from `window.location` once the inline
 *    RSC payload has arrived (next/dist/client/app-index.js), and that payload
 *    follows the page's HTML. When it hydrates, the token is already gone, so it
 *    never writes it back. Its `replaceState` patch is not installed yet either.
 *
 * The URL the confirm button is pressed from is clean too, so the token does
 * not travel on as the referrer of `/subscribed`, the page the 303 lands on.
 * `/confirm` also sends `Referrer-Policy: strict-origin` (next.config.js) in
 * case this script never runs.
 *
 * What it does not reach: the server sees the GET URL, so the token is still in
 * Vercel's request log for that one request.
 *
 * Accepted: a reload after the scrub shows the page's "missing its confirmation
 * code" state, while the link in the email still works. Surviving a reload would
 * mean storing the token, and so the address, in the browser.
 *
 * Plain ES5 in a string, because it runs before any bundle and has to stay this
 * small. Only `token` is removed. Whatever else the URL carries stays, so a
 * future UTM tag still reaches DataFast. `URLSearchParams` decodes parameter
 * names the way the page's `searchParams` does, so a `%74oken=` the page would
 * accept is stripped too. `pnpm validate:subscribe` runs this exact string
 * against fake locations.
 */
export const CONFIRM_TOKEN_SCRUB_SCRIPT =
  '(function(){try{' +
  'var u=new URL(window.location.href);' +
  "if(!u.searchParams.has('token'))return;" +
  "u.searchParams.delete('token');" +
  "window.history.replaceState(window.history.state,'',u.pathname+u.search+u.hash);" +
  '}catch(e){}})();';
