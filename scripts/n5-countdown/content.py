"""
content.py — the vocabulary and example-sentence layers, as the book sees them.

Both layers are OPTIONAL and both fail to nothing. A kanji with no word gets no
word block; a kanji with no accepted sentence gets no sentence block. Neither
prints a placeholder, an empty box or an apology, for the same reason
`ExampleSentencesSection` renders nothing on the site when a kanji has no
sentences: an empty state advertises a gap that a reader would otherwise never
notice, and on a page someone paid for it reads as unfinished rather than
sparse.

WHY SENTENCES COME FROM `published/`, NOT FROM `queue/`
──────────────────────────────────────────────────────
`data/sentences/queue/N5.json` holds 8 scored, tokenized candidates for each of
the 82 characters. It is tempting to take rank 1 and ship, and it is exactly the
wrong move. The queue is machine output: the ranker scores naturalness, level
and length, and it cannot see that a sentence is a poor demonstration of the
character it was chosen for. `target-kanji-unused` exists as a reject reason in
`lib/sentences/types.ts` because that failure is common enough to have needed a
name.

`published/N5.json` is what a human accepted. It is `[]` today. So this module
reads it, finds nothing, and the book ships with no sentence block — which is
the correct behaviour and the reason `--sentences=queue` exists ONLY for the
review sample, where every sentence is stamped UNREVIEWED on the page itself.

Do not remove that stamp and do not make queue the default.
"""

import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent


def load_vocab(path=None):
    """{kanji: [word, …]} plus the attribution the licence obliges us to print."""
    p = pathlib.Path(path) if path else HERE / 'n5-vocab.json'
    if not p.exists():
        return {}, None
    doc = json.loads(p.read_text(encoding='utf-8'))
    return doc.get('words', {}), doc.get('attribution')


def load_published_sentences(path):
    """One accepted sentence per kanji, from `data/sentences/published/N5.json`.

    `reviewedFor` — not `kanji` — decides which sheet a sentence may appear on.
    A sentence containing 日 was not thereby reviewed as a demonstration of 日,
    and the difference is the whole point of that field.
    """
    p = pathlib.Path(path)
    if not p.exists():
        return {}
    doc = json.loads(p.read_text(encoding='utf-8'))
    out = {}
    for s in doc:
        for ch in s.get('reviewedFor', []):
            out.setdefault(ch, s)
    return out


def load_queue_sentences(path):
    """Rank-1 candidate per kanji. UNREVIEWED — sample rendering only."""
    p = pathlib.Path(path)
    if not p.exists():
        return {}
    doc = json.loads(p.read_text(encoding='utf-8'))
    out = {}
    for entry in doc.get('entries', []):
        cands = entry.get('candidates') or []
        if cands:
            out[entry['kanji']] = cands[0]
    return out


def sentence_credit(s):
    """The per-sentence attribution line.

    Tatoeba does not own its sentences and cannot waive its contributors'
    attribution, so a project-level credit in the colophon is not enough — the
    credit has to name the contributor of THIS sentence and the licence THAT
    sentence carries. Licence is read per side, never assumed corpus-wide: a
    CC0 Japanese sentence paired with a CC BY English translation is a real
    case in the corpus.

    A null contributor is common and expected — 40.2% of the Japanese sentences
    are unadopted Tanaka Corpus imports — and is not a missing-data error. It
    renders as project credit alone rather than as a blank or an "unknown".
    """
    parts = []
    for side in ('japanese', 'english'):
        src = s['source'][side]
        who = src.get('contributor')
        lic = src['license']
        parts.append(f'{who} ({lic})' if who else f'Tatoeba ({lic})')
    jp, en = parts
    if jp == en:
        return f'Sentence: {jp}, via Tatoeba'
    return f'Sentence: {jp} / translation: {en}, via Tatoeba'
