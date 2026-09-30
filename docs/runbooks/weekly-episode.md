# Weekly episode runbook — build one week ahead, release on all three surfaces

The single current procedure for producing and releasing one episode of *The Travels of Tan*.
It replaces the Cowork skills `michikanji-episode`, `-strip`, `-short` and `-short-publish`, which
predate most of what is below (the strips `CLAUDE.md` records that they still open `?d=ud` directly, default
to variant B and build in the foreground with `timeout` and `pgrep`; Kit is gone, the Resend broadcast is
scheduled by a job, and the readings and the video link are new); where one disagrees with this page, this
page wins. Read alongside:
[`newsletter.md`](./newsletter.md) (the Resend broadcast and its cancel/reschedule procedure),
[`episode-spec.md`](../prd/episode-spec.md) (the email format A1-A8, the calendar Part B), and the
strips folder's own `CLAUDE.md` (Short build and YouTube upload details), `README.md`, `MAC-SETUP.md`
and `SHORTS-PIPELINE.md`.

Decided 2026-09-30 by the owner. **One episode is released per week on three surfaces: the site, the
Saturday 13:00 UTC email and a YouTube Short.** Every episode is built **one week ahead** and held
unreleased in the strips folder until its release Wednesday. Scheduled Claude Code tasks on the
owner's Mac do the work; the owner approves three things, from his phone.

## The week

Take a release Saturday **D** (episode **N**). Episode **N+1** is built during the same week, so each
week has three things in flight:

| Day | What | Who / tool | Gate |
|---|---|---|---|
| Mon D-5 | **Script** for N+1: write, validate, draft readings, open the gate | Claude, strips folder | |
| Mon-Tue | **Japanese read** of N+1's script and readings (due Tue 12:00 UTC) | Owner, phone | **HARD 1** |
| Tue-Wed | **Art** for N+1 in ChatGPT, then `build.py` (due Wed 12:00 UTC) | Claude in Chrome | |
| Tue-Wed | **Kill-check** of N+1's art | Owner, phone | **HARD 2** |
| **Wed D-3** | **Ship N**: import, register, push by 11:30 UTC. The weekly job books the send at 12:07 UTC | Claude, site repo | |
| Wed-Fri | Owner's pre-send checklist on N's scheduled email (spec A7 items 4-9) | Owner | |
| Thu-Fri | **Short for N+1** built (two variants), gate posted; default variant after 24 h | Claude, strips + ElevenLabs | SOFT 3 |
| **Fri D-1** | **Upload Short N**, scheduled for Sat 13:00 UTC | Claude in Chrome, YouTube Studio | |
| **Sat D** | 13:00 UTC: the email sends (Resend) and the Short goes public (YouTube) | Resend, YouTube | |
| Sun D+1 | The video links itself to the episode page (05:17 UTC); verify; close the issue | sync job, Claude | |

So at any time: N is live on the site since Wednesday, N's email and Short go out Saturday, N+1 is
being built and is not in any public repo file until its own Wednesday. **The site page is live three
days before the email and Short.** That is unavoidable (the weekly job books an episode only once its
page answers 200 in production). The hub, the sitemap and the welcome email (which carries the latest
episode) show it from Wednesday; its video section stays empty until Sunday.

Release Saturdays, and when each episode is built and shipped (computed from
`scripts/stories/episode-issue.ts`: episode 8 is 2026-10-10, each later one a week on):

| Ep | Theme (strips/season-01.json) | Focus kanji | Built in week of | Ship by (Wed 12:07 UTC) | Release (Sat 13:00 UTC) |
|---|---|---|---|---|---|
| 7 | Counting at the market | 一 二 三 四 五 六 七 八 九 十 | Mon 2026-09-21 | Wed 2026-09-30 | Sat 2026-10-03 |
| 8 | How much is it? | 百 千 万 円 金 高 何 | Mon 2026-09-28 | Wed 2026-10-07 | Sat 2026-10-10 |
| 9 | What time is it? | 時 分 半 午 今 毎 | Mon 2026-10-05 | Wed 2026-10-14 | Sat 2026-10-17 |
| 10 | A hot summer day | 年 月 火 土 暑 | Mon 2026-10-12 | Wed 2026-10-21 | Sat 2026-10-24 |
| 11 | Which way? | 西 南 北 右 左 外 中 | Mon 2026-10-19 | Wed 2026-10-28 | Sat 2026-10-31 |
| 12 | At the library | 読 書 話 聞 本 名 | Mon 2026-10-26 | Wed 2026-11-04 | Sat 2026-11-07 |
| 13 | The festival | 人 子 食 出 入 | Mon 2026-11-02 | Wed 2026-11-11 | Sat 2026-11-14 |
| 14 | The old castle | 刀 長 国 前 後 間 | Mon 2026-11-09 | Wed 2026-11-18 | Sat 2026-11-21 |

Slugs and vocab are in `strips/season-01.json` (read-only here; episode 7 and earlier are built). The
season ends with 14. **A slip moves every later date**: edit `ANCHOR_EPISODE` / `ANCHOR_RELEASE` at
the top of `scripts/stories/episode-issue.ts` and this table in the same commit. The send queue needs
no change: the weekly job books whatever is registered, one per Saturday, in `number` order.

**Part B of `episode-spec.md` has rows for episodes 1-6 only, and its "reply question" table likewise.**
Episodes 7-14 need a row in each, added in the ship commit (step 3): the theme and focus kanji from the
table above, and one reply question written on the Monday with the script and shown to the owner in the
Japanese-read comment. As of 2026-09-30 `lib/email/quiz-email.ts` renders one fixed reply line ("Reply to
this email if you get stuck...") and **no per-episode question**, although spec A2 block 7 calls for one;
so the question is editorial until the owner decides to wire it (a field in the episode data). Do not spend
more than a line on it until then.

## Who and what holds state

| Thing | Where | Notes |
|---|---|---|
| Unreleased episode source: script, prompts, panels, exports, readings draft, Short files | `~/Documents/Claude/Projects/Michikanji/strips/ep-NN/`, a local git repo with **no remote** | Commit after every step (see below). Nothing is backed up off this Mac. |
| Approvals, deadlines, the week's checklist | the GitHub issue `Episode N production: <title>`, label `episode-production` | [The approval issue](#the-approval-issue). Tasks read it; the owner ticks it. |
| What is released | `lib/stories/index.ts` (`EPISODES`) on `main` | `pnpm stories:ship` edits it |
| The scheduled send | Resend, broadcast `Episode N: <title>`; review issue label `newsletter` | [`newsletter.md`](./newsletter.md) |
| The Short | YouTube Studio; id recorded in `strips/ep-NN/short/UPLOAD.md` and on the issue | The site learns the id by itself (Sunday) |
| Why a thing happened | `strips/ep-NN/RUN-LOG.md` | Predictions registered before generation, results scored after |

Machine notes (the Mac): the site repo's `main` checkout is not edited; tasks that change it use a
throwaway worktree (`git -C ~/Documents/michikanji fetch -q origin && git -C ~/Documents/michikanji
worktree add .claude/worktrees/<name> -b <name> origin/main`, then `ln -s
~/Documents/michikanji/node_modules node_modules` because disk is tight, no `pnpm install`) and push with
`git fetch -q origin && git rebase origin/main && git push origin HEAD:main`. Commit trailer
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; **never a CI-skip marker**, since the
deploy is the point. The strips repo: `git -c user.name="Ari Nakos" -c user.email="aristides.nakos@gmail.com" commit`, never push. Python
is `.venv/bin/python` (`strips/MAC-SETUP.md`); below `P=.venv/bin/python` inside `strips/`.
**Fonts:** `build.py` and `make_short.py` ask for Noto CJK JP, which is not installed, so Chrome falls
back to Hiragino and Helvetica. The site panels are text-free so the ship is unaffected, but a
Mac-built **Short** (captions) looks different from Shorts 1-6. Install the fonts (a few hundred MB:
`MAC-SETUP.md`) before the first Mac-built Short is published, or accept the difference. Open.

## Step 1. Monday: the script (Claude, strips folder)

- **Target.** N+1 = 1 + the highest `strips/ep-NN/` that has a `script.json`; never past 14.
- **Inputs.** `season-01.json` entry (slug, theme, focus, vocab, cast), `episode-spec.md` A3/A4 (strict
  N5: only `lib/constants/n5-kanji.ts`, the grammar whitelist, sizing), `ep-template/`, the previous
  episode's `PROMPT-NOTES.md` and `RUN-LOG.md` ("One procedure change for the next episode" is binding).
- **Do:**
  ```bash
  cd ~/Documents/Claude/Projects/Michikanji/strips && P=.venv/bin/python
  pnpm --dir ~/Documents/michikanji stories:episode-issue N     # idempotent: the issue may already exist
  cp -r ep-template ep-NN                                      # then write ep-NN/script.json
  $P validate.py ep-NN/script.json                             # N5 list via env.py; must PASS
  $P prompts.py ep-NN                                          # ep-NN/PROMPTS.md
  ```
  Script rules that earlier episodes paid for: every panel carries `SHOT|SCENE|PROP|MARK|ESTABLISHING`
  and a `tan_facing`; `kana` on every line (hiragana, no kanji); about 11 lines; narration lines carry
  no bubble tail; a PROP states its identity cue, then its size against a named character, then its
  absences; digits and text live in dialogue only, never in the art; no unnamed marks. Write
  `ep-NN/PROMPT-NOTES.md` (numbered predictions and a kill condition) **before any generation**.
- **Readings draft.** `ep-NN/readings.ts`, laid out like `data/stories/readings/ep-07.ts`, conventions in
  the header of `lib/stories/readings.ts` (pronunciation kana, は as わ, numerals as said). It is held in
  strips until the ship, because `validate:stories` and the registry only accept it for a registered
  episode. The reply question goes in the gate comment.
- **Output.** `git ... commit -m "ep-NN: script, prompts, readings draft"` in strips, then the
  Japanese-read comment on the issue (step 2).
- **Fails.** `validate.py` FAIL: fix the line, never the list (a kanji outside N5 becomes kana). The
  season file and the script disagree: the script wins for that episode, note it in `RUN-LOG.md`.

## Step 2. Gate 1, the Japanese read (owner, HARD)

Claude posts one issue comment containing `<!-- gate: japanese -->` with, **inline so it reads on a
phone**, every line as `ja | kana | English`, the reading line under it, the lines Claude is least sure
of (numerals, particles, anything near the grammar whitelist edge), and the reply question. It asks: tick
**Japanese reviewed (script + readings)**, or reply with edits.

- **Approved only by the box.** A comment is never an approval. On edits Claude changes `script.json`,
  re-runs `validate.py` and `prompts.py`, updates `readings.ts`, commits, and posts the changed lines.
- **Nothing in step 3 starts, and no generation is spent, until the box is ticked.** No fallback, no
  default. The task re-checks daily and posts one reminder comment after 24 h of silence; it never
  proceeds on silence. If Wednesday noon of the build week passes unticked, the week's slack is gone:
  tell the owner in a comment that the ship of the *previous* episode is unaffected but the next one is at risk.
- Why hard: the validator checks kanji and grammar, not whether a line sounds natural, and the page,
  the email and the Short all repeat the Japanese.

## Step 3. Tuesday: the art (Claude in Chrome, ChatGPT)

- **Precondition.** `pnpm stories:episode-status N+1` shows `approvals.japanese: true`.
- **Do.** One ChatGPT thread for all six panels. References attach to P1 only: the three Tan stickers,
  Chun, any family line-up, the three `style-plates/` (never the previous episode's output: drift
  compounds). Paste each panel prompt from `ep-NN/PROMPTS.md`; a retry names the defect it fixes. Save
  each image to `ep-NN/panels/P<N>.png` and keep rejected ones in `attempts/`. Then:
  ```bash
  $P build.py ep-NN            # out/<slug>-{strip,square,quiz}.png
  ```
- **Gates before the owner sees it** (record each in `RUN-LOG.md`): invented objects 0; badge 探 reads
  correctly where the face shows and is absent from behind; bow side; anatomy; no invented lettering;
  speech tails aimed at the speaker's head (`tail_x`, measured off a 10% grid); the bubble overflow guard;
  the quiz card rotated 180 degrees reads the same answers as `script.json`. Score the predictions.
- **Output.** Commit strips. Note the thread URL in `RUN-LOG.md` (the Short's motion edit happens in it).
- **Fails.** A generation that breaks the style: retry that panel once naming the defect, then replace
  it with the closest of `attempts/` and say so in the gate. ChatGPT or Chrome unavailable: the task
  stops, comments on the issue, and retries the next day; there are several days of slack.

## Step 4. Gate 2, the art kill-check (owner, HARD)

Claude posts a comment with `<!-- gate: art -->`: the registered kill condition from `PROMPT-NOTES.md`
("reads as unfinished, or the train reads as a bus"), what drifted without a retry, and a link to a
**private Artifact page** of the six panels, the strip and the quiz card (downscaled JPEGs, well under
the 16 MB limit), so it opens on a phone. Fallback when the Artifact tool is unavailable: the files
are in `strips/ep-NN/out/`. (Decision: the repo has no other way to show the owner an image from a
scheduled task.) The owner ticks **Art approved**, or replies with what is wrong; Claude fixes by
retry and re-posts. **Hard: no Short is built, nothing is shipped, on unapproved art.**

## Step 5. Wednesday: ship N (Claude, site repo) — deadline 12:07 UTC

N was approved, built and rehearsed a week ago. Precondition: the issue shows both boxes ticked
(`approvals.japanese` and `approvals.art`). **Push by 11:30 UTC**: the job also needs the deploy to be
live, and Vercel takes a few minutes.

```bash
# in a fresh worktree of the site repo (see Machine notes), then:
cp ~/Documents/Claude/Projects/Michikanji/strips/ep-NN/readings.ts data/stories/readings/ep-NN.ts
# add `import { READINGS as RNN } ...` and RNN to the array in lib/stories/readings.ts
pnpm stories:ship NN --dry-run        # then without --dry-run (add --published <today> only if needed)
pnpm email:preview <slug> --local     # look at the email
```

`stories:ship` runs the importer, registers the episode, renders `e1.jpg`..`e6.jpg` and runs
`validate:stories`, `validate:subscribe` and `validate:broadcast` (full description in the header of
`scripts/stories/ship-episode.ts`). Then add the episode's row to both Part B tables of
`episode-spec.md` (theme and focus from the table above; its reply question), commit what the script
lists plus those files, and push. Confirm `https://www.michikanji.com/stories/<slug>` answers 200.
Comment on the issue with the commit sha.

- **State after.** `lib/stories/index.ts` has the episode; the weekly job (12:07 UTC Wed, backstop Fri)
  books the Resend broadcast for Sat 13:00 UTC and opens the review issue "Weekly story scheduled:
  Episode N for ...". The Wednesday after the send it closes that issue with Resend's record.
- **Rehearse a week early** (Fri of the build week, after gate 2): run the commands above in a
  **throwaway worktree, never pushed**. It finds readings that do not match the dialogue, a missing
  panel or a validator failure six days before the deadline instead of on it.
- **Fails.** `stories:ship` stops at readings: the draft is missing or unregistered, copy it and
  re-run. `validate:stories` fails: fix `script.json` in strips and re-run (the generated
  `data/stories/ep-NN.ts` is never edited). Render fails: Chrome. Page not 200 by 12:07: Friday's run is
  the backstop. After Friday's run: run **Weekly Broadcast** by hand before Saturday 12:30 UTC, or the
  episode waits a week; if it does, **reschedule the Short to the new date in Studio** and tell the owner.
  A red job run opens a `newsletter-alarm` issue: [`newsletter.md`](./newsletter.md).
- **Verify (13:00 UTC, same task).** The job run is green, the review issue exists, and Resend shows the
  broadcast scheduled. The owner's checklist (spec A7 items 4-9: Gmail web and app, Outlook.com, clip,
  dark mode, reply path) happens Wed-Fri on the scheduled email.

## Step 6. Thursday-Friday: the Short for N+1 (Claude, strips + ElevenLabs + Chrome)

The full procedure, with the traps, is the strips folder's `CLAUDE.md` (§0, §0c) and `ep-06/SHORT-06-BRIEF.md`
(the most recent template), plus `SHORTS-PIPELINE.md` for why. This is the order and the gates.

- **Precondition.** `approvals.art` is ticked for N+1. Preflight: Studio access
  (`studio.youtube.com/channel/UCWfjH9us3-qxv_O8kf7QE-Q/videos/short`), ElevenLabs connector, `ffmpeg`, the
  venv; read the previous Shorts' numbers for the gate comment.
- **Do.**
  ```bash
  $P make_short.py ep-NN --tts-plan            # after adding the `short` block to script.json (backup first)
  # generate the rows in ElevenLabs (eleven_v4, the `tts` field, max 3 concurrent), trim each clip:
  $P trim_edges.py in.mp3 out.mp3              # then write ep-NN/audio/tts-log.json  {"rows": [...]}
  # motion: one front-facing panel, edited in the episode's own ChatGPT thread, then mask_composite
  # the two builds share ep-NN/short/ and must run one after the other, detached (about 10 min each):
  nohup caffeinate -i sh -c '.venv/bin/python -u make_short.py ep-NN --variant-c && .venv/bin/python -u make_short.py ep-NN --variant-d' > /tmp/build.log 2>&1 < /dev/null &
  ps aux | grep -v grep | grep "python -u make_short"        # poll; never `timeout`, never `pgrep -f`
  $P check_safe_zones.py ep-NN/short/<slug>-short-c.mp4 ep-NN/short/short-manifest-c.json
  ffmpeg -i <mp4> -af ebur128=framelog=quiet -f null -       # read loudness off the mp4: -14 +-1 LUFS
  ```
  Also: duration at most 59 s, bubble overflow 0, open every `_previews/` PNG (each tail points at its
  speaker), and TTS is fed `tts` (particles respelled), never `kana`. Write `short/UPLOAD.md`: title
  (**the focus kanji before the `|`**, at least three and all from this episode, because
  `pnpm stories:sync-videos` links by them; `N5 Kanji Quiz: Can You Read 百 千 万 円 金? | Japanese Story
  for Beginners #8`), description with the `?from=short` UTM link, answers with romaji, tags (YouTube
  autocomplete seeds, contaminated ones dropped), the KanjiVG credit line, and the pinned comment text.
  Commit strips.
- **Variants.** C (cosy acoustic bed) and D (calm pentatonic bed, which replaced B at episode 6). A (no music) is never published.
- **Gate 3 comment** (`<!-- gate: short -->`, **starts the 24 h clock**): the same private Artifact page
  carrying both mp4s (about 6 MB each), the pronunciation cue sheet (every は/へ with its speaker and
  timestamp, marked わ or "ha"), any new-voice F0 notes, the stop-rule countdown in one line, and the
  question "tick C or D; to move the date edit `short-release`". The owner ticks one variant box.
- **Resolution.** `pnpm stories:episode-status N+1` returns `shortVariant.effective`: the owner's pick
  (`source: owner`), else C once 24 h have passed since the latest gate comment (`source: default`),
  else `null` (still waiting). Comments on the audio or bubbles are fixed and the gate re-posted
  (clock restarts).
- **Fails.** A voice or pronunciation note: regenerate only that speaker's lines and rebuild only the
  picked variant. A build dies mid-render: relaunch, do not wait. Loudness out of band: fix the trim
  pass, never report an unmeasured gate.
- **Stop rule (2026-09-14):** 8 Shorts, zero signups, no Short over 5,000 views means stop YouTube.
  After #6 two are left (#7, #8). If it fires, the owner decides; the Short legs of this calendar stop
  and the site and email legs do not.

## Step 7. Friday: upload Short N, scheduled (Claude in Chrome, YouTube Studio)

- **Precondition.** `pnpm stories:episode-status N` shows `shortVariant.effective` not null, and
  `shortRelease.at` (default the release Saturday 13:00 UTC). Preflight Studio access and that
  `document.visibilityState` is `visible` before typing (a hidden tab drops keystrokes: see the
  hidden-tab recipe in the strips `CLAUDE.md`).
- **Do** (strips `CLAUDE.md` §3-§5 is the click-by-click): DataFast baseline for `/stories` + Direct;
  Studio Shorts tab, **Create, Upload videos**, never `/videos/upload?d=ud`; tag the file input by DOM
  walk and `file_upload`; title, description (`execCommand('insertText')` with real newlines, re-check
  after saving), not made for kids, paid promotion No, **AI use Yes**, Japanese, Education, `.ja.srt`
  "With timing", playlist "The Travels of Tan - N5 Japanese Stories", tags on `/edit`. **Visibility:
  Schedule**, at `shortRelease.at`, entered in the zone Studio shows, which is the owner's local time:
  13:00 UTC is **16:00 Athens through Sat 2026-10-24 and 15:00 from Sat 2026-10-31** (clocks change
  Sun 2026-10-25). Trust Studio's "will be set to public on ..." line over this arithmetic.
- **Verify** after a reload on `/edit`: title, description line breaks, 20+ tags, playlist, captions,
  Scheduled and the time. Read the id from the dialog's link, never from a screenshot. Delete the unpicked
  variant and its manifest. Record the URL, baseline and settings at the top of `UPLOAD.md` and
  `RUN-LOG.md`, and comment the id and the scheduled instant on the issue. The pinned comment is a
  public post: the owner posts and pins it; Claude hands him the text in that comment.
- **Fails.** No Studio access ("you don't have permission"): only the owner can restore it, so
  find this out in the Step 6 preflight, not here. Description lost its line breaks: re-enter it. The
  file input vanished: use **Create** from a normal Studio page. Missed the Friday: upload on Saturday
  and publish by hand at the release time, or schedule a later slot and say so on the issue.

## Step 8. Saturday and Sunday

- **Sat 13:00 UTC.** Resend sends the email; YouTube publishes the Short. A Saturday task (14:00 UTC)
  checks both (the Studio Shorts tab shows **Public**; the review issue or `pnpm newsletter:stats` shows
  the send) and comments on the production issue. Not sent: [`newsletter.md`](./newsletter.md),
  "Cancelling or rescheduling" and "Known gaps".
- **Sun 05:17 UTC.** `sync-story-videos.yml` reads the channel feed and adds
  `'<slug>': { youtubeId }` to `data/stories/videos.ts` if the title's kanji before the `|` match
  exactly one episode. A Sunday task checks `origin/main`. Not linked: the title had fewer than three
  focus kanji or a kanji from another episode. Fix the title on YouTube and run the workflow, or add
  the line by hand (`pnpm validate:stories`; replace, never delete, a wrong id).
- **Then** close the production issue with a comment (release time, Short URL, send record), and
  note the Short's 7-day read date. The Part B "Sent" column is filled from Resend's record, never
  from the plan, in the next ship commit.

## The approval issue

One per episode in production. Title `Episode N production: <title>`, label `episode-production`
(the title's prefix `Episode N production` is what is matched, so the suffix can be renamed). Created by
`pnpm stories:episode-issue N` (idempotent, `--dry-run` prints without creating) or by the Monday
workflow [`episode-production-issue.yml`](../../.github/workflows/episode-production-issue.yml)
(06:13 UTC; a dispatch takes an optional episode and title), which opens the next episode to be built:
the highest of the registered episodes and every production issue (open or closed), plus one, never
past 14, and not at all while two issues already wait on unregistered episodes. It needs no strips
folder: without one the title is `Episode N` until someone renames the issue.

**Format, version 1.** The script `scripts/stories/episode-issue.ts` is the only writer and parser.

````markdown
<!-- episode-production/v1 -->
Production ledger for **Episode 8: How much is it?**, released **2026-10-10** (...)
Runbook: `docs/runbooks/weekly-episode.md`. ...

### Approvals

- [ ] Japanese reviewed (script + readings) <!-- key: japanese -->
- [ ] Art approved <!-- key: art -->

**Short variant: pick one** (no pick within 24 h of the ask means C). ...

- [ ] Short variant C (cosy acoustic bed) <!-- key: short-variant-c -->
- [ ] Short variant D (calm pentatonic bed) <!-- key: short-variant-d -->

### Fields

```episode-fields
episode: 8
slug: how-much-is-it
title: How much is it?
theme: いくらですか
focus: 百 千 万 円 金 高 何
release: 2026-10-10
release-at: 2026-10-10T13:00:00Z
build-week: 2026-09-28
japanese-due: 2026-09-29T12:00:00Z
art-due: 2026-09-30T12:00:00Z
ship-by: 2026-10-07T12:07:00Z
short-upload-by: 2026-10-09T18:00:00Z
short-default: C
short-gate-hours: 24
short-release: default
```
````

Grammar (what a parser may rely on):

- **Checkbox line:** `- [ ]` or `- [x]`/`- [X]`, free text, then `<!-- key: <key> -->` at the end of the
  line. **The key is the contract; the text before it may be edited.** GitHub's mobile app toggles the
  box and leaves the comment. Keys: `japanese`, `art`, `short-variant-c`, `short-variant-d`. Each must
  appear exactly once; a missing or duplicated key is reported in `problems`.
- **Short variant:** exactly one of the `short-variant-*` boxes ticked is the owner's pick. Two ticked
  is a conflict (`problems`, treated as no pick). None ticked falls back to `short-default` (C) once
  `short-gate-hours` (24) have passed since the **latest** issue comment containing
  `<!-- gate: short -->`. The date is `short-release`: `default` (the release Saturday 13:00 UTC) or an
  ISO time the owner types, such as `2026-10-09T13:00Z`.
- **Fields:** the fenced block with info string `episode-fields`, lines `key: value`. Times are UTC ISO.
  `focus` and `slug` read `pending` when the season file was not available at creation.
- **Gate comments** carry a marker: `<!-- gate: japanese -->`, `<!-- gate: art -->`,
  `<!-- gate: short -->`. Only the last one is read by code (it starts the 24 h clock); the others
  are for people and for the tasks to find their own posts.
- **Only the boxes approve.** A comment never does. Anyone with write access can tick a box; this repo
  has one owner.

Reading it:

```bash
pnpm stories:episode-status N            # prints JSON; issue is null (and the exit non-zero) if none exists
gh issue view <issue-number> --json body,comments      # the raw data, if a task prefers
```

`episode-status` returns `approvals.{japanese,art}` (booleans), `shortVariant.{picked, effective,
source: owner|default|pending, conflict, gateOpenedAt, defaultsAt}`, `shortRelease.{at, source}`,
`deadlines.{japanese, art, ship, shortUpload, release}` (each `{at, overdue}`), the raw `checkboxes` and
`fields`, and `problems`. **A task acts only if `problems` is empty or it can say why it is not relevant.**
`--now <ISO>` and `--body-file` / `--comments-file` run it against a fixture.

## The scheduled tasks

State-driven and idempotent: each runs at a fixed time on the days shown, reads the issue, does its step
**only if the precondition holds and the output does not already exist**, and otherwise does nothing or
posts one reminder. A task's whole prompt can be "follow `docs/runbooks/weekly-episode.md`, Step K".

| Task | When (UTC) | Precondition | Does |
|---|---|---|---|
| Script | Mon 07:00 | no `ep-NN/script.json` for N+1 | Step 1, posts gate 1 |
| Art | Tue-Thu 08:00 | `japanese` ticked; no `out/*-strip.png` | Step 3, posts gate 2 |
| Ship | Wed 08:30 | `japanese` and `art` ticked for N; N not registered | Step 5 |
| Ship check | Wed 13:00 | N registered | Step 5 verify |
| Short | Thu-Fri 07:00 | `art` ticked for N+1; no gate-3 comment yet | Step 6, posts gate 3 |
| Upload | Fri 09:00 | `shortVariant.effective` set for N; not uploaded | Step 7 |
| Release check | Sat 14:00 and Sun 08:00 | release time has passed | Step 8 |

## First cycle (state on 2026-09-30, a snapshot)

- **Episode 7** is registered and ships now; the job books it for Sat 2026-10-03. Its strip is done
  (Short not built: there is no `ep-07/short/`). **Short 7** has to be built and uploaded by Fri
  2026-10-02 (a compressed Thu-Fri), or released later with the owner's say-so.
- **Episode 8** has a script and prompts drafted (30 Sep, in `strips/ep-08/`, for the Japanese read) and
  no issue. The automatic Monday run will not open it in time (next Monday is 2026-10-05), so run the workflow by hand or
  `pnpm stories:episode-issue 8`. Its computed Tuesday/Wednesday gate dates are already past; that is
  the catch-up, not an error, and the ship deadline (Wed 2026-10-07) is what cannot move.
- **Episode 9** opens automatically on Mon 2026-10-05. From then each Monday opens the next.

## When a step goes wrong

| Symptom | First move |
|---|---|
| Owner has not ticked a hard gate by the ship | Nothing ships; no episode is queued; the job opens "No episode queued". Slip (above) or release late; tell the owner once. |
| The issue does not exist | `pnpm stories:episode-issue N`. |
| `episode-status` says `problems` | Read them: a removed key comment, two variants ticked, an edited field. Fix the issue body. |
| Weekly job red / `newsletter-alarm` | [`newsletter.md`](./newsletter.md), "What the job does". |
| Episode page 404 in production | The registry edit was not pushed, or the deploy failed. |
| The job booked the wrong thing | Cancel or delete the broadcast in Resend; [`newsletter.md`](./newsletter.md), "Cancelling or rescheduling". |
| Short not public on Saturday | Studio: the schedule was not saved, or access was lost. Publish by hand, then fix the record. |
| A Monday issue is missing | `episode-production-issue.yml` failed (an alarm issue with label `production-alarm`), or run it by hand. |
