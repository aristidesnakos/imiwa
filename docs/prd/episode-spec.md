# Weekly Story — Episode Spec & Calendar

**Version 1.0** · Created 2026-08-23 · Owner: Ari Nakos
**Related:** [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) (the pilot this feeds)

Two jobs. **Part A** is the format — locked, so "write episode 1" has a spec instead of a vibe.
**Part B** is the calendar — filled, so send day is never a scramble.

The binding constraint on every decision below: **the episode is a static email sent as a Resend
broadcast.**
No toggle, no collapsible, no script. Everything here is chosen to survive Outlook for Windows,
which is the client that breaks things.

---

## Part A — The format

### A0. The one rule that governs the rest

**The body is generated, not typed. Never paste formatted text into the Resend draft.**

Both parts of the broadcast come from `lib/email/quiz-email.ts`, rendered from the episode data by
`lib/email/broadcast.ts`. Since 2026-09-27 the weekly job posts them to Resend and schedules the
broadcast, and a person reviews it in the window before the send. So the way this breaks now is
someone "fixing" a line by pasting into the dashboard editor.

Pasting from Google Docs, Word, or Notion injects hundreds of `<span style="…">` wrappers around
Japanese text. Three consequences, all bad: Gmail clips any message whose HTML exceeds ~102 KB and
hides the rest behind a "View entire message" link — and span soup gets there faster than you'd
think; Outlook's renderer chokes on nested inline styles around CJK and drops your line spacing; and
it desynchronises the plain-text part, which is rendered from the same typed data and will not follow
an edit made in the dashboard.

If you genuinely have to edit a broadcast by hand, paste as plain text (`⌘⇧V`) and use Resend's own
formatting controls — then fix the source, because the next episode is rendered from the code, not
from your edit. An edit to a broadcast that is already scheduled goes out as edited: the job never
touches a scheduled broadcast. A draft that differs from what the builder makes is never scheduled
by the job; schedule it yourself, or delete it and the job builds a fresh one.

### A1. Banned constructs

| Don't | Why | Do instead |
|---|---|---|
| `<ruby>` furigana | Outlook for Windows renders email through the **Word** engine, which has no ruby support — readings drop inline and corrupt the sentence into unreadable mush. Neither the renderer nor Resend's editor offers it anyway. | Parenthetical reading after first occurrence: 山（やま） |
| Story text as an image | Outlook blocks images by default, so the episode arrives blank. Also kills the plain-text part, accessibility, and any text selection. | Real text, always |
| Collapsibles / `<details>` / "click to reveal" | No JS in email. `<details>` is unsupported in Outlook and inconsistent elsewhere. | Answers physically last, under a rule |
| White-on-white or `display:none` hidden answers | Dark mode reveals them, and hidden text is a **spam-filter signal** — a real deliverability risk on a young list | Same as above |
| Background-colour boxes carrying meaning | Gmail app and Outlook.com force-invert in dark mode; a pale-yellow "answers" panel can invert to near-black on black | Horizontal rules + bold labels |
| A decorative or serif Latin font | Word substitutes per-glyph for CJK; you get mismatched baselines and cramped kana | The system sans-serif stack `lib/email/quiz-email.ts` already sets, untouched |
| Raw CJK in URLs | See A5 — this is the likeliest failure in your specific design | Pre-encoded URLs, listed in Part B |
| Emoji as structural markers | Outlook renders many monochrome; some Android clients drop them | Text labels and rules |

### A2. Block order

Questions come **before** the English translation. This deviates slightly from "English below, quiz,
answers at bottom" — because if the translation sits above the questions, the questions test nothing.
The translation is itself part of the answer key, so it belongs low. One-line change if you disagree.

```
1  Subject line                    ≤ 30 chars — mobile truncates
2  Preview text                    Resend draft field. Set it by hand — the script doesn't.
3  Title                           Japanese title + English gloss
4  The story                       Japanese, one sentence per line
   ───────────────────────────
5  Three questions                 In English, about the Japanese
   ───────────────────────────
6  Words to keep                   3–5 entries, each with a link
   ───────────────────────────
7  Sign-off + the reply question   The pilot's only real signal
   ───────────────────────────
8  English translation             Line-for-line with block 4
9  Answers
```

### A3. Sizing

Specify in sentences and characters, not "words" — Japanese has no word delimiter and a word count is
unenforceable.

| | Target | Hard limit |
|---|---|---|
| Story sentences | 8–14 | 16 |
| Story characters (JP, incl. kana) | 250–350 | 450 |
| Sentences per line | **1** | 1 |
| Target vocab entries | 3–5 | 5 |
| Links in the whole email | 3–5 | 6 |
| Comprehension questions | 3 | 3 |

One sentence per line is not a stylistic flourish. It does three things at once: it gives the reader
short lines without any CSS (Outlook ignores `line-height` on `<p>` unless you write
`mso-line-height-rule: exactly`, which the renderer does not); it makes the English translation align
line-for-line so readers can self-check; and it prevents CJK — which legally breaks at *any*
character — from producing ragged mid-word wraps on narrow phones.

### A4. Language constraints — strict N5, made checkable

**Kanji.** Only the 82 characters in `lib/constants/n5-kanji.ts`. Anything else goes in kana, even
when the kanji is common. こんにちは stays kana. 好き stays すき (好 is N4). 空 stays そら. This will
occasionally look childish. That is the format working, not failing.

**Furigana.** Parenthetical, full-width parens, **first occurrence only** in the story body:
山（やま）. Repeats go bare. Full-width parens because half-width ones look broken beside CJK.

**Spacing.** Use word spacing (分かち書き) throughout the story block — `たぬきのタンは 山に 行きます。`
This is standard in Japanese graded readers and children's books, it materially reduces parsing load
at N5, and it gives email clients safe break points. Drop it if you ever escalate to N4.

**Grammar whitelist.** If it isn't here, it isn't allowed.

- `です / でした / ではありません`
- `〜ます / ました / ません / ませんでした`
- `あります / います`
- い-adjectives and な-adjectives, incl. past and negative
- て-form for simple sequence; `〜ています`
- `〜たいです`
- `〜ましょう / 〜ませんか`
- `〜ことができます`
- `〜より / 〜のほうが`
- Particles: は が を に で へ と も の から まで や か
- Question words: 何 だれ どこ いつ どう どれ いくら
- Connectors: そして でも それから

**Explicitly banned** (all N4+): relative clauses (`〜する人`), potential form, passive, causative,
`〜たら / 〜ば / 〜と` conditionals, `〜ので`, `〜てしまう / 〜ておく / 〜てみる`, any keigo.

**Vocabulary.** N5 only, with exactly one exception: the 3–5 target words, which may sit above level
*provided* each is glossed in block 6. That exception is the entire point of the format — it's how a
reader ends the episode knowing something they didn't.

**Numbers.** Arabic numerals in the story. `3じ` not `三時`. Kanji numerals are a second decoding task
for no benefit.

### A5. The link rule — and the encoding trap

**Only target-vocab kanji get links.** Three to five, all in block 6, none in the story body. Linking
every kanji turns the story into a field of blue text, destroys reading flow, and pushes the link
count into spam-filter territory on a young sending reputation.

**Always paste the percent-encoded URL.** `https://michikanji.com/kanji/山` is not a valid URL — the
CJK character has to be percent-encoded to `%E5%B1%B1` somewhere in the chain, and *which* link in the
chain does it is inconsistent. An ESP rewrites links when click tracking is on — which is why it is
off in Resend, see A8 — then the client may re-encode, then the receiving MTA may re-encode again.
Double-encoding produces `%25E5%25B1%25B1` and a 404; some clients simply refuse to linkify a
non-ASCII path at all.

Encode it yourself so exactly one representation exists end to end. Every URL you need is
pre-encoded in Part B. Display text stays the kanji — only the href is encoded.

### A6. Worked example (episode 1 opening)

Story block:

```
きょうは 天気が いいです。
たぬきのタンは 山（やま）に 行きます。
山は 大きいです。
木（き）が たくさん あります。
タンは 木の 上（うえ）を 見ました。
小さい とりが います。
タンは 「こんにちは」と いいました。
とりは そらへ 行きました。
タンも 山の 上に 行きたいです。
```

Every kanji is in the N5 set. Every pattern is on the whitelist. 鳥, 空, 言 are all N4+, so they're
kana. Furigana appears once per word.

Words to keep:

> **山（やま）** — mountain · [Stroke order →](https://michikanji.com/kanji/%E5%B1%B1)
> Tan climbs one every time he's bored. The character *is* three peaks.

### A7. Pre-send checklist

Run this in the review window: from the moment the weekly job schedules the broadcast (Wednesday or
Friday at 12:00 UTC; its review issue says which) to the send on Saturday at 13:00 UTC. It takes
four minutes and catches everything that has ever gone wrong with Japanese email. Items 1–3 and 10
are machine-checked by `validate:stories` before the episode ships. Items 4–9 are Ari's, on the
scheduled broadcast and a test send. If any fails, cancel the broadcast in Resend
([`docs/runbooks/newsletter.md`](../runbooks/newsletter.md), "Cancelling or rescheduling").

1. Every kanji in the body appears in `lib/constants/n5-kanji.ts`.
2. Every grammar pattern is on the A4 whitelist.
3. Every link href is percent-encoded; zero links in the story body.
4. Click each link in the scheduled broadcast's preview in Resend and again in the test send —
   confirm each lands on the kanji page, not a 404.
5. Preview text field is set and is not the first line of the greeting.
6. Send a test to **Gmail (web), Gmail (mobile app), and Outlook.com** at minimum. Outlook.com is
   where CJK and dark mode both fail. If you have access to Outlook desktop on Windows, add it. If
   Resend will not test-send a scheduled broadcast, the runbook says how to get the same email.
7. In the Gmail test, check no "View entire message" clip link appeared at the bottom.
8. Toggle your phone to dark mode and re-read the test. Confirm nothing vanished.
9. Confirm the reply-to lands in an inbox you actually read.
10. Read block 8 against block 4 — the line count must match exactly.

### A8. Resend settings that matter

> Rewritten from Kit to Resend on 2026-09-16. Until then this section described a Kit account: a From
> name set in Kit, a sending domain authenticated in Kit, an audience filtered on
> `referrer = homepage-weekly-story`, and Kit's plainest template. None of that exists any more —
> there is no Kit form, no Kit audience, and no `referrer` field anywhere in the send path. Recorded
> so nobody reintroduces the filter looking for a list that was never stored that way. The procedure
> is [`docs/runbooks/newsletter.md`](../runbooks/newsletter.md); this section is only the settings a
> person has to get right.

- **From: `Ari at MichiKanji <ari@michikanji.com>`.** A person, not a brand — settled 2026-08-23,
  because the pilot's only signal is replies. It is `config.resend.fromAdmin`, and the shared
  builder, `lib/email/broadcast.ts`, puts it on every broadcast; nobody types it into the dashboard.
- **Reply-to: a real inbox you read.** `config.resend.supportEmail` — `ari@llanai.com`, deliberately a
  different domain from the sender. It is a monitored Google Workspace inbox, and a cross-domain
  reply-to needs no DKIM or SPF alignment. Not `noreply@`: the decision gate reads replies, and a
  broken reply path silently zeroes the only signal the pilot can produce at this list size.
- **Audience: there is no audience.** Resend contacts are global and sit in Segments, so every
  broadcast is addressed to `RESEND_WEEKLY_STORIES_SEGMENT_ID` — now set in Vercel production, preview
  still pending, and needed as a GitHub repository secret by the weekly job — and nothing filters on
  anything else. Where a subscriber came from is recorded in
  DataFast as `source` at capture time, never as a property on the contact
  (`app/api/subscribe/confirm/route.ts`).
- **The sending domain is already authenticated,** and needed no new DNS: `michikanji.com` carries the
  `resend._domainkey` DKIM record and `send.michikanji.com` carries Resend's SPF and `feedback-smtp`
  MX (see the comment block in `config.ts`). We are far below the 5,000/day threshold that makes
  alignment mandatory at Gmail and Yahoo, but it still moves inbox placement, and a list this small
  can't absorb a spam-folder start.
- **Click tracking off; open tracking on.** Not a preference. Resend rewrites every link when click
  tracking is on, and A5's percent-encoded CJK URLs survive exactly one encoding pass — a second one
  produces a 404. Open tracking is weak but free, and it is the only number inside the email.
  (`story-delivery-resend.md` §3.)
- **Template: none.** The body is HTML generated by `lib/email/quiz-email.ts` — one 520px table and a
  system sans-serif stack. Dashboard templates wrap content in nested tables that interact badly with
  CJK line breaking and buy nothing here, so review the broadcast the builder made and send that.
- **Keep `{{{RESEND_UNSUBSCRIBE_URL}}}` in the body.** Only the Broadcast product resolves that
  placeholder. Edit it away in the dashboard and the send goes out with no unsubscribe link.
- **Scheduled by the weekly job, for Saturday at 13:00 UTC.** Since 2026-09-27 the job books it
  from `config.newsletter` and opens a review issue; cancel it in Resend to stop it. Resend owns
  queueing, throttling, unsubscribe filtering and the send.

---

## Part B — The calendar

**Spine: Tan the tanuki.** You already own this character — `/assets/tan-thumbsup.png`, on the
homepage. Reusing it costs nothing, gives the newsletter instant visual continuity with the site, and
means a reader who lands on michikanji.com later recognises who they've been reading about.

The episodic shape is deliberate. Strict N5 has no conditionals, no reason clauses, and no relative
clauses — you cannot express cause and effect, so you cannot build a plot. What you *can* build is
one character, one place per week, one small thing that happens. Slice-of-life is not a compromise
here; it's the only structure the grammar supports.

All 30 focus kanji below are verified present in `lib/constants/n5-kanji.ts`. No kanji repeats as a
focus character across episodes.

| Ep | Theme | Focus kanji | Target vocab (3–5) | Write by | Scheduled | Sent |
|---|---|---|---|---|---|---|
| 1 | Tan climbs the mountain | 山 木 上 見 大 | 山, 木, 上, 見る, 大きい | written 2026-09-14 | never: before the first broadcast | — |
| 2 | Tan finds the river | 川 水 下 小 白 | 川, 水, 下, 小さい, 白い | written 2026-09-14 | never: before the first broadcast | — |
| 3 | Tan goes to school | 学 校 先 生 語 | 学校, 先生, 学生, 日本語 | written 2026-09-16 | never: before the first broadcast | — |
| 4 | A rainy day off | 雨 天 気 休 日 | 雨, 天気, 休む, きょう | written 2026-09-23 | never: before the first broadcast | — |
| 5 | The train east | 電 車 東 行 来 | 電車, 東, 行く, 来る | written 2026-09-24 | never: before the first broadcast | — |
| 6 | Tan's family and friends | 父 母 友 男 女 | 父, 母, 友だち, 男の子, 女の子 | written 2026-09-27 | never: reached every subscriber through the welcome card | — |

**Corrected 2026-09-30.** Episode 5 was written here as "The train to Tokyo / 東京", but 京 is not one of
the 82 N5 kanji, so 東京 cannot appear in a strict-N5 episode: the episode is "The train east", teaches 東
as "east", and keeps the destination in kana (`strips/season-01.json` records the change). Episode 6 was
written with 男の人 / 女の人; the all-animal world made it 男の子 / 女の子 (a boy and a girl tanuki), the same two
kanji. The focus kanji columns were never affected, and every episode is built and read from
`strips/ep-NN/script.json`, not from this table.

**Episodes 7-14 have no row here.** Their theme, focus kanji and vocab are in `strips/season-01.json`,
and their release Saturdays (episode 8 is 2026-10-10, each later one a week on) are in
[`docs/runbooks/weekly-episode.md`](../runbooks/weekly-episode.md). Add one row per episode to this table
and to "The reply question" below in the commit that ships it.

The send is **Saturday at 13:00 UTC** (the day decided 2026-09-16, the time 2026-09-27); write-by
is the Wednesday before, which is the room the A7 checklist and one round of fixes need, and the day
the weekly job first runs. The cadence is defined once in `config.newsletter` and derived by
`lib/email/send-schedule.ts`, so read the next date off those rather than counting it off a
calendar.

**Scheduled** is the Saturday the queue gives an episode. The weekly job books episodes in Resend in
`number` order, one per Saturday, from `config.newsletter.firstBroadcastEpisode` (7). Episodes 1 to
6 have already reached every subscriber, so they are never broadcast: 1 to 5 went up on the site
before the list's first broadcast, and 6 went out through the welcome card (a new subscriber's
confirmation email carries the latest episode). **Sent** is filled only from Resend's
record of an actual send (the job's closing comment on the review issue, `pnpm newsletter:stats`, or
the dashboard) and reads "—" until then. **Sent is a record, never a plan.** A single Send column
conflated the two twice: episodes 3 and 4 carried Saturdays, 2026-09-19 and 2026-09-26, that passed
with nothing sent and still read as sends. The operational procedure is in
`docs/runbooks/newsletter.md`.

### Pre-encoded links

Paste these as the href. Display text stays the kanji.

| Ep | Kanji | href |
|---|---|---|
| 1 | 山 | `https://michikanji.com/kanji/%E5%B1%B1` |
| 1 | 木 | `https://michikanji.com/kanji/%E6%9C%A8` |
| 1 | 上 | `https://michikanji.com/kanji/%E4%B8%8A` |
| 1 | 見 | `https://michikanji.com/kanji/%E8%A6%8B` |
| 1 | 大 | `https://michikanji.com/kanji/%E5%A4%A7` |
| 2 | 川 | `https://michikanji.com/kanji/%E5%B7%9D` |
| 2 | 水 | `https://michikanji.com/kanji/%E6%B0%B4` |
| 2 | 下 | `https://michikanji.com/kanji/%E4%B8%8B` |
| 2 | 小 | `https://michikanji.com/kanji/%E5%B0%8F` |
| 2 | 白 | `https://michikanji.com/kanji/%E7%99%BD` |
| 3 | 学 | `https://michikanji.com/kanji/%E5%AD%A6` |
| 3 | 校 | `https://michikanji.com/kanji/%E6%A0%A1` |
| 3 | 先 | `https://michikanji.com/kanji/%E5%85%88` |
| 3 | 生 | `https://michikanji.com/kanji/%E7%94%9F` |
| 3 | 語 | `https://michikanji.com/kanji/%E8%AA%9E` |
| 4 | 雨 | `https://michikanji.com/kanji/%E9%9B%A8` |
| 4 | 天 | `https://michikanji.com/kanji/%E5%A4%A9` |
| 4 | 気 | `https://michikanji.com/kanji/%E6%B0%97` |
| 4 | 休 | `https://michikanji.com/kanji/%E4%BC%91` |
| 4 | 日 | `https://michikanji.com/kanji/%E6%97%A5` |
| 5 | 電 | `https://michikanji.com/kanji/%E9%9B%BB` |
| 5 | 車 | `https://michikanji.com/kanji/%E8%BB%8A` |
| 5 | 東 | `https://michikanji.com/kanji/%E6%9D%B1` |
| 5 | 行 | `https://michikanji.com/kanji/%E8%A1%8C` |
| 5 | 来 | `https://michikanji.com/kanji/%E6%9D%A5` |
| 6 | 父 | `https://michikanji.com/kanji/%E7%88%B6` |
| 6 | 母 | `https://michikanji.com/kanji/%E6%AF%8D` |
| 6 | 友 | `https://michikanji.com/kanji/%E5%8F%8B` |
| 6 | 男 | `https://michikanji.com/kanji/%E7%94%B7` |
| 6 | 女 | `https://michikanji.com/kanji/%E5%A5%B3` |

### The reply question

Block 7 carries the pilot's only readable signal. One question per episode, always inviting a reply,
never a link. Rotate so the answers discriminate between the three monetization theses rather than
just collecting praise:

| Ep | Question | What a reply tells you |
|---|---|---|
| 1 | Was this too easy, too hard, or about right? | Level calibration — the cheapest thing to get wrong |
| 2 | What are you studying Japanese *for*? | Segments hobbyist vs. exam vs. relocation |
| 3 | Are you learning on your own, or with a teacher or class? | Direct read on the teacher-collaboration thesis |
| 4 | What's the hardest part of studying kanji for you right now? | Feature demand, unprompted |
| 5 | Would you want these at N4 as well, or a back catalogue of N5? | Direct read on the paid-reader thesis |
| 6 | What would make you recommend this to someone? | Whatever they name is the product |

**Episodes 7-14 still need a question each.** Write it on the Monday the script is written (one line, always
an invitation to reply, never a link, rotating as above) and show it in the Japanese-read comment on the
episode's production issue; the rows live here. Note that as of 2026-09-30 `lib/email/quiz-email.ts` does not
render a per-episode question: its body carries one fixed reply line, so block 7 of A2 is not yet what the
generated email does. Wiring it is an owner decision; until then these rows are editorial only.
