# Weekly Story — Episode Spec & Calendar

**Version 1.1** · Created 2026-08-23 · Revised 2026-08-24 (Kit → Resend; compliance items added to §A7) · Owner: Ari Nakos
**Related:** [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) (the pilot this feeds)

Two jobs. **Part A** is the format — locked, so "write episode 1" has a spec instead of a vibe.
**Part B** is the calendar — filled, so send day is never a scramble.

The binding constraint on every decision below: **the episode is a static email composed in Resend's
broadcast editor.**
No toggle, no collapsible, no script. Everything here is chosen to survive Outlook for Windows,
which is the client that breaks things.

---

## Part A — The format

### A0. The one rule that governs the rest

**Compose inside Resend's broadcast editor. Never paste formatted text into it.**

Pasting from Google Docs, Word, or Notion injects hundreds of `<span style="…">` wrappers around
Japanese text. Three consequences, all bad: Gmail clips any message whose HTML exceeds ~102 KB and
hides the rest behind a "View entire message" link — and span soup gets there faster than you'd
think; Outlook's renderer chokes on nested inline styles around CJK and drops your line spacing;
and the auto-generated plain-text part comes out as garbage.

Paste as plain text (`⌘⇧V`), then apply formatting with the editor's own buttons. Its output is
already tested across clients. Yours isn't.

### A1. Banned constructs

| Don't | Why | Do instead |
|---|---|---|
| `<ruby>` furigana | Outlook for Windows renders email through the **Word** engine, which has no ruby support — readings drop inline and corrupt the sentence into unreadable mush. Not available in the composer anyway. | Parenthetical reading after first occurrence: 山（やま） |
| Story text as an image | Outlook blocks images by default, so the episode arrives blank. Also kills the plain-text part, accessibility, and any text selection. | Real text, always |
| Collapsibles / `<details>` / "click to reveal" | No JS in email. `<details>` is unsupported in Outlook and inconsistent elsewhere. | Answers physically last, under a rule |
| White-on-white or `display:none` hidden answers | Dark mode reveals them, and hidden text is a **spam-filter signal** — a real deliverability risk on a young list | Same as above |
| Background-colour boxes carrying meaning | Gmail app and Outlook.com force-invert in dark mode; a pale-yellow "answers" panel can invert to near-black on black | Horizontal rules + bold labels |
| A decorative or serif Latin font | Word substitutes per-glyph for CJK; you get mismatched baselines and cramped kana | The editor's default sans-serif, untouched |
| Raw CJK in URLs | See A5 — this is the likeliest failure in your specific design | Pre-encoded URLs, listed in Part B |
| Emoji as structural markers | Outlook renders many monochrome; some Android clients drop them | Text labels and rules |

### A2. Block order

Questions come **before** the English translation. This deviates slightly from "English below, quiz,
answers at bottom" — because if the translation sits above the questions, the questions test nothing.
The translation is itself part of the answer key, so it belongs low. One-line change if you disagree.

```
1  Subject line                    ≤ 30 chars — mobile truncates
2  Preview text                    A field on the broadcast. Set it. Never let it default.
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
`mso-line-height-rule: exactly`, which a hosted composer won't let you); it makes the English translation align
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
chain does it is inconsistent. A click-tracking rewriter re-encodes the link, then the client may
re-encode, then the receiving MTA may re-encode again. **This is why Resend click tracking stays off
for `stories.michikanji.com`** (§A8) — but leave the URLs encoded regardless, because the rewriter is
only the first of the three. Double-encoding produces `%25E5%25B1%25B1` and a 404;
some clients simply refuse to linkify a non-ASCII path at all.

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

Run this before scheduling. It takes four minutes and catches everything that has ever gone wrong
with Japanese email.

**Machine-checkable — these belong in `validate:stories` once Phase 3 exists:**

1. Every kanji in the body appears in `lib/constants/n5-kanji.ts`.
2. Every grammar pattern is on the A4 whitelist.
3. Every link href is percent-encoded; zero links in the story body.
4. Read block 8 against block 4 — the line count must match exactly.
5. `pnpm validate:subscribe` passes. It refuses while `config.business.postalAddress` is empty,
   which is the CAN-SPAM blocker, and it asserts the unsubscribe variable is the unescaped
   triple-brace form.
6. Paste the composed body into `auditBroadcastBody()` (`lib/email/broadcast-footer.ts`) and get an
   empty array back.

**Only a human can do these. Nobody else may report them as passed:**

7. Click each link in the Resend preview — confirm it lands on the kanji page, not a 404.
8. Preview text field is set and is not the first line of the greeting.
9. Send a test to **Gmail (web), Gmail (mobile app), and Outlook.com** at minimum. Outlook.com is
   where CJK and dark mode both fail. If you have access to Outlook desktop on Windows, add it.
10. In the Gmail test, check no "View entire message" clip link appeared at the bottom.
11. Toggle your phone to dark mode and re-read the test. Confirm nothing vanished.
12. Confirm the reply-to lands in an inbox you actually read. (`sendEmail` silently dropped every
    Reply-To header until 2524da3 — it passed `reply_to` where the SDK reads `replyTo`. Check the
    header on a real received message, not the code.)
13. **Click the unsubscribe link in the test send and confirm it works.** `{{{RESEND_UNSUBSCRIBE_URL}}}`
    does nothing at all if the variable is absent from the body, and nothing warns you — not the
    SDK, not the types, not the dashboard. Item 6 catches an absent variable; only this catches a
    present-but-broken one.

### A8. Resend settings that matter

Kit is gone — see `docs/prd/story-delivery-resend.md` for why. These are the equivalents.

- **From name:** `Ari at MichiKanji`, from `stories.michikanji.com`. The subdomain is deliberate:
  reputation isolation from the apex, which carries transactional mail.
- **Reply-to: a real inbox you read.** Not `noreply@`. The decision gate reads replies; a broken
  reply path silently zeroes the only signal the pilot can produce at this list size.
- **Audience:** one audience, one offer. Resend contacts carry no custom properties, so there is no
  per-source segment to filter on and none is needed — DataFast holds the attribution.
- **Click tracking OFF, open tracking on.** Resend's link rewriter re-encodes percent-encoded CJK
  URLs (`/kanji/%E5%B1%B1` → `%25E5%25B1%25B1` → 404), which is the exact trap §A5 documents. Open
  tracking is the read signal; the click signal comes from DataFast on our own pages.
- **Authenticate the sending domain** (SPF, DKIM) in Resend before episode 1, and give
  `_dmarc.michikanji.com` a `rua=` so the reports go somewhere. You're far below the 5,000/day
  threshold that makes alignment mandatory at Gmail and Yahoo, but it still moves inbox placement,
  and a list this small can't absorb a spam-folder start.
- **Footer:** paste `broadcastFooterHtml()` from `lib/email/broadcast-footer.ts` rather than
  retyping it. It renders the postal address and the unsubscribe variable from `config.business`,
  and it throws rather than rendering a footer with either missing.
- **Template:** the plainest one available. Heavy templates wrap content in nested tables that
  interact badly with CJK line breaking, and buy nothing here.

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

| Ep | Theme | Focus kanji | Target vocab (3–5) | Write by | Send |
|---|---|---|---|---|---|
| 1 | Tan climbs the mountain | 山 木 上 見 大 | 山, 木, 上, 見る, 大きい | | |
| 2 | Tan finds the river | 川 水 下 小 白 | 川, 水, 下, 小さい, 白い | | |
| 3 | Tan goes to school | 学 校 先 生 語 | 学校, 先生, 学生, 日本語 | | |
| 4 | A rainy day off | 雨 天 気 休 日 | 雨, 天気, 休む, きょう | | |
| 5 | The train to Tokyo | 電 車 東 行 来 | 電車, 東京, 行く, 来る | | |
| 6 | Tan's family and friends | 父 母 友 男 女 | 父, 母, 友だち, 男の人, 女の人 | | |

Dates left blank deliberately — fill them once you've decided the send day, and work backwards:
**write-by is send-day minus 3**, so there's room for the A7 checklist and a fix.

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
