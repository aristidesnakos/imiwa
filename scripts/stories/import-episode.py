#!/usr/bin/env python3
"""
Import one Travels-of-Tan episode from the strip pipeline into the site.

    python3 scripts/stories/import-episode.py ../Michikanji/strips/ep-01 [--published 2026-09-14]

WHY THIS EXISTS, AND WHY IT IS THE ONLY WAY IN
----------------------------------------------
`strips/ep-NN/script.json` is the single source of truth for an episode. It is
what `validate.py` gates, what ChatGPT is prompted from, and what `build.py`
renders the social exports from. If the site carried a second hand-maintained
copy of the same dialogue, the two would drift, and the drift would be silent —
the strip on Pinterest would say one thing and the page another.

So the site's copy is *derived*. `data/stories/ep-NN.ts` is generated, never
edited. Edit `script.json` in the strips repo and re-run this.

WHY PYTHON, IN A TYPESCRIPT REPO
--------------------------------
Two reasons, both practical rather than aesthetic:

  - It has to run next to the strip pipeline, which is Python and lives outside
    this repo. Nothing else in this script needs the site's module graph.
  - It resizes and re-encodes art. Pillow is already a dependency of the strip
    pipeline; `sharp` is not a dependency of this repo, and adding one to a
    build-time authoring tool that CI never runs is a bad trade.

The *validator* stays TypeScript (`pnpm validate:stories`), because that one
does need `N5_KANJI` from `lib/constants`, and because it is the CI gate. This
script is an authoring convenience; the validator is the contract.

WHAT IT EMITS
-------------
  data/stories/ep-NN.ts          the typed episode, generated
  public/stories/<slug>/pN.webp  the raw panel art (no text — see below)
  public/stories/<slug>/og.jpg   the composited square, for OpenGraph only

The panel PNGs from ChatGPT carry NO text: the model draws scenes only and
every glyph is set by code. `build.py` composites the Japanese into the social
exports. The *site* does the same job in React instead — it positions real HTML
speech bubbles over the art using the same percentage geometry in `bubbles[]`.
That is why the dialogue ships as data here and not as pixels: text in an image
is not crawlable, not selectable, not translatable and not screen-readable, and
the whole SEO case for these pages is the text.

The quiz card is deliberately NOT copied into public/. It is the email offer;
an asset sitting at a guessable public URL is not an offer.
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[2]

# Panel art is re-encoded at its native 1092px. next/image downscales from here
# per breakpoint, so this is a source master, not a delivery size. q82 is where
# flat vector art with thick outlines stops improving visibly.
PANEL_MAX_PX = 1092
PANEL_QUALITY = 82
OG_PX = 1200
OG_QUALITY = 86

# The first CJK ideograph in a target word is the character whose page it links.
KANJI_RE = re.compile(r'[\u4e00-\u9fff]')


def first_kanji(word: str) -> str:
    m = KANJI_RE.search(word)
    if not m:
        raise SystemExit(f"target vocab {word!r} contains no kanji to link")
    return m.group(0)


def ts_str(value: str) -> str:
    """A TypeScript string literal.

    JS shares JSON's escape grammar, so `json.dumps` covers what the previous
    hand-rolled version missed — most importantly a bare CR, which is an
    ECMAScript LineTerminator and terminates the literal exactly as \n does. A
    CRLF script.json therefore used to emit a data file that failed `next
    build`, and `scripts/` is excluded from tsconfig so nothing caught it here.
    `ensure_ascii=False` keeps the Japanese readable in the generated diff.
    """
    return json.dumps(value, ensure_ascii=False)


def encode_panels(ep_dir: Path, script: dict) -> None:
    slug = script['slug']
    out_dir = REPO / 'public' / 'stories' / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    for panel in script['panels']:
        src = ep_dir / panel['output']
        if not src.exists():
            raise SystemExit(
                f"{panel['id']}: {src} is missing. Generate the art before importing — "
                f"a story page with holes in it is worse than no story page."
            )
        im = Image.open(src).convert('RGB')
        # thumbnail() returns early rather than upscaling, so this needs no guard.
        im.thumbnail((PANEL_MAX_PX, PANEL_MAX_PX), Image.LANCZOS)
        dest = out_dir / f"{panel['id'].lower()}.webp"
        im.save(dest, 'WEBP', quality=PANEL_QUALITY, method=6)
        print(f'  art  {dest.relative_to(REPO)}  {dest.stat().st_size // 1024} kB')

    # OpenGraph wants a single flat image, and it wants it in a format every
    # scraper has handled for a decade. JPEG, not WebP: X/Twitter's card
    # renderer has been unreliable with WebP and an OG image that fails to
    # render is the whole point of the file lost.
    square = ep_dir / 'out' / f'{slug}-square.png'
    if square.exists():
        im = Image.open(square).convert('RGB')
        im.thumbnail((OG_PX, OG_PX), Image.LANCZOS)
        dest = out_dir / 'og.jpg'
        im.save(dest, 'JPEG', quality=OG_QUALITY, optimize=True, progressive=True)
        print(f'  og   {dest.relative_to(REPO)}  {dest.stat().st_size // 1024} kB')
    else:
        print(f'  og   SKIPPED — {square.name} not built yet', file=sys.stderr)


def emit_episode(script: dict, published: str, ep_dir: Path) -> str:
    slug = script['slug']
    num = script['episode']

    targets = []
    for t in script['target_vocab']:
        # `href` in script.json is a pre-encoded absolute URL, because Kit's
        # composer has no code. On the site, hand-encoding is how you eventually
        # ship %25E5%25B1%25B1 and a 404 — so the href is dropped here and the
        # page builds it with encodeURIComponent from `kanji`.
        targets.append({
            'word': t['word'],
            'reading': t['reading'],
            'en': t['en'],
            'kanji': first_kanji(t['word']),
        })

    lines = []
    for panel in script['panels']:
        bubbles = panel.get('bubbles') or []
        if len(bubbles) != len(panel['lines']):
            raise SystemExit(
                f"{panel['id']}: {len(panel['lines'])} lines but {len(bubbles)} bubbles. "
                f"The site positions real HTML bubbles from this geometry, so they must pair up."
            )
        rendered = []
        for line, bub in zip(panel['lines'], bubbles):
            # Narration is not speech: a square sage box, no tail. `build.py`
            # enforces that by branching on the speaker and never emitting the
            # tail element, which means a stray `"tail": "bl"` on a narration
            # line in script.json is silently ignored there — and both shipped
            # episodes have one. Normalise it here rather than carry a field
            # the renderer contradicts: on the site the tail IS the signal, and
            # `validate:stories` asserts the two agree.
            tail = None if line['speaker'] == 'narration' else bub.get('tail')
            rendered.append(
                '      {{ speaker: {sp}, ja: {ja}, en: {en}, '
                'bubble: {{ x: {x}, y: {y}, w: {w}, tail: {tail} }} }},'.format(
                    sp=ts_str(line['speaker']),
                    ja=ts_str(line['ja']),
                    en=ts_str(line['en']),
                    x=bub['x'], y=bub['y'], w=bub['w'],
                    tail=ts_str(tail) if tail is not None else 'null',
                )
            )
        lines.append(
            '  {{\n'
            '    id: {id},\n'
            '    beat: {beat},\n'
            '    art: {art},\n'
            '    lines: [\n{body}\n    ],\n'
            '  }},'.format(
                id=ts_str(panel['id']),
                beat=ts_str(panel['beat']),
                art=ts_str(f"/stories/{slug}/{panel['id'].lower()}.webp"),
                body='\n'.join(rendered),
            )
        )

    quiz = []
    for q in script['quiz']['questions']:
        quiz.append(
            '  {{ prompt: {p}, ask: {a}, askEn: {ae}, options: [{o}], answer: {n} }},'.format(
                p=ts_str(q['prompt']),
                a=ts_str(q.get('ask', '')),
                ae=ts_str(q['ask_en']),
                o=', '.join(ts_str(o) for o in q['options']),
                n=q['answer'],
            )
        )

    target_lines = '\n'.join(
        '  {{ word: {w}, reading: {r}, en: {e}, kanji: {k} }},'.format(
            w=ts_str(t['word']), r=ts_str(t['reading']),
            e=ts_str(t['en']), k=ts_str(t['kanji']),
        )
        for t in targets
    )

    return f"""/**
 * GENERATED FILE — do not edit.
 *
 * Source: strips/{ep_dir.name}/script.json
 * Regenerate: python3 scripts/stories/import-episode.py <path-to-ep-dir>
 *
 * Editing this by hand puts the site out of step with the strip that gets
 * posted to Pinterest and Instagram, and nothing would report the mismatch.
 */
import type {{ Episode }} from '../../lib/stories/types';

export const EPISODE: Episode = {{
  number: {num},
  slug: {ts_str(slug)},
  titleEn: {ts_str(script['title_en'])},
  titleJa: {ts_str(script['title_ja'])},
  level: {ts_str(script['level'])},
  publishedAt: {ts_str(published)},
  ogImage: {ts_str(f'/stories/{slug}/og.jpg')},
  focusKanji: [{', '.join(ts_str(k) for k in script['focus_kanji'])}],
  targets: [
{target_lines}
  ],
  panels: [
{chr(10).join(lines)}
  ],
  quiz: [
{chr(10).join(quiz)}
  ],
}};
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('ep_dir', help='path to strips/ep-NN')
    ap.add_argument('--published', default=None, help='ISO date; defaults to today')
    ap.add_argument('--data-only', action='store_true', help='skip the art re-encode')
    args = ap.parse_args()

    ep_dir = Path(args.ep_dir).resolve()
    script = json.loads((ep_dir / 'script.json').read_text(encoding='utf-8'))

    published = args.published or date.today().isoformat()

    print(f"episode {script['episode']}: {script['slug']}")
    if not args.data_only:
        encode_panels(ep_dir, script)

    dest = REPO / 'data' / 'stories' / f"ep-{script['episode']:02d}.ts"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(emit_episode(script, published, ep_dir), encoding='utf-8')
    print(f'  data {dest.relative_to(REPO)}')
    print('\nNow add it to lib/stories/index.ts if it is new, then run pnpm validate:stories.')


if __name__ == '__main__':
    main()
