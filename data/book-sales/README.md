# Joining site clicks to book sales

Amazon is off-site. DataFast records the click **out** of michikanji.com and can
never record the sale — there is no shared identifier between a click on
`/free-resources/kanji-sheets/n5-sheets` and a row in the KDP royalties report.
KDP reports units by marketplace and date, with no referrer, no click id and no
query string passed through. Nothing in this repo changes that.

So this file is a **coincidence table, not an attribution model**, and it is
kept by hand on purpose. One row per week, written in whichever spreadsheet is
convenient and pasted back here so the history is version-controlled and cannot
be lost with a dashboard account.

## The columns

| column | where it comes from |
|---|---|
| `week_start` | Monday, Europe/Athens. Same week boundary as the Search Console monitors. |
| `site_clicks_n5_sheets` | DataFast → Goals → `n5_sheets_book_click`, that week |
| `site_clicks_kanji_detail` | DataFast → Goals → `kanji_detail_book_click`, that week |
| `amzn_attr_clicks` | Amazon Attribution, per-tag clicks. Blank if no tags. |
| `amzn_attr_purchases` | Amazon Attribution, per-tag purchases. Blank if no tags. |
| `kdp_units_total` | KDP → Reports → units ordered, **all** sources, that week |
| `notes` | anything that breaks comparability: a deploy, a Reddit post, a category change, a traffic burst |

**The smallest honest version is three columns**: `week_start`,
`site_clicks_n5_sheets + site_clicks_kanji_detail`, and `kdp_units_total`. The
Attribution columns are an upgrade, not a requirement — leave them empty and the
table still answers the only question it can.

## Two things never to do with this table

1. **Never divide `kdp_units_total` by site clicks.** That ratio looks like a
   conversion rate and is not one, in both directions: Amazon sells this book to
   people who have never seen the site, and a visitor who clicks through can buy
   four days later, on another device, with nothing linking the two events. A
   published ratio would imply attribution that does not exist.

2. **Never read a single week.** At the traffic this site has, a week holds
   single-digit clicks and often zero units. The table becomes readable at
   roughly 12 rows and is designed to be read as a shape: do weeks with
   unusually many clicks tend to be weeks with unusually many units? If a number
   is wanted after ~26 rows, a rank correlation over 26 points is the honest
   one — and honest about being weak.

## The upgrade that would make this real: Amazon Attribution

Amazon Attribution has been open to KDP authors since 2022 (US, CA, UK, DE, ES,
FR, IT) and reports clicks, detail-page views, purchases and sales **per tag**
on a 14-day last-touch window. A tag lives on an individual link, so each
surface can carry its own and Amazon's purchase counts line up one-to-one with
`BOOK_CLICK_GOALS`.

Check eligibility in the ad console at listing time. If it is available, create
one tag per surface and paste them into `BOOK_ATTRIBUTION_TAGS` in
`lib/commerce/links.ts` — nothing else changes, because `bookUrlFor()` already
appends them and returns the bare URL while they are empty.

Two things it buys that the date join cannot:

- **A split of the kill criterion into its two real questions.**
  `amzn_attr_purchases` is what the site sent; `kdp_units_total − amzn_attr_purchases`
  is what Amazon's own browse traffic sent. The N5 plan's criterion ("under 10
  copies in six months with the site linking to it throughout") currently
  bundles those, so a failure cannot be read.
- **An integrity check on our own instrument.** `amzn_attr_clicks` and our goal
  counts are two independent counts of the same event. If they diverge by more
  than a little, one of them is wrong — most likely our goals are catching bot
  or duplicate clicks, or the tag is being stripped — and that is worth knowing
  before either number is used in a decision.

What it still does not buy: attribution for anyone who reaches the listing by
searching Amazon after seeing the site. That share is unknowable and it is the
main reason the criterion below is about clicks as well as copies.
