"""
build_vocab.py — derive the N5 Countdown's vocabulary layer from JMdict.

Run this in an environment WITH NETWORK. It writes `n5-vocab.json`, which is
what the book generator reads; the generator itself never touches JMdict and
never needs the network.

    python3 build_vocab.py --jmdict JMdict_e --kanji ../lib/constants/n5-kanji.ts \
                           --schedule schedule.json --out n5-vocab.json

WHY THIS IS A BUILD STEP AND NOT A RUNTIME PARSE
────────────────────────────────────────────────
JMdict_e is 63 MB of XML with 218,607 entries. Parsing it to render a PDF would
make the generator depend on a 10 MB download and on edrdg.org being up. The
extract is ~30 kB, is committed, and is reviewable in a diff — which is the
point: a human has to be able to see what changed in the vocabulary when the
dictionary is refreshed.

WHAT IS AND IS NOT AUTHORED HERE
────────────────────────────────
Nothing Japanese is authored here. Every surface form, every reading and every
gloss is copied verbatim from JMdict and carries its JMdict entry sequence, so
any line in the book can be traced back to a dictionary entry. The only things
this file *decides* are selection and ordering. That distinction is also the
licence position: JMdict is CC BY-SA 4.0, and ShareAlike triggers on Adapted
Material — material "translated, altered, arranged, transformed, or otherwise
modified". Selection and presentation are not modification. Rewriting a gloss
would be. So glosses are never touched, never merged, never re-worded.

THE FOUR GATES, AND WHY EACH ONE IS THERE
─────────────────────────────────────────
1. CONTAINMENT — every kanji in the word must be one of the 82 the book teaches.
   This is the gate that makes the vocabulary honest for a *writing* workbook:
   a learner can write every word on the page by hand using only characters the
   book has taught them. It costs real words (日曜日 dies on 曜) and that is the
   correct trade: a word you cannot write is a reading exercise, not a writing
   one, and this is a writing book.

2. FREQUENCY — JMdict's own priority tags (ichi1/news1/spec1 and the nfXX
   frequency bands), never an outside frequency list. The tags ship inside the
   licensed file, so using them adds no source and no new attribution. An
   outside list would add both, and the ones that exist for JLPT are unofficial
   scrapes with no grant — the failure mode the licence investigation calls the
   Tanos pattern.

3. USABILITY — drops entries flagged archaic, obsolete, rare, obscure, slang,
   vulgar, derogatory or proverb, and drops `uk` ("usually written in kana")
   words. `uk` matters more than it looks: 事/こと and 為/ため are frequent by
   any count, but printing 事 as the model word teaches a spelling native
   writers do not use.

4. SCHEDULE AWARENESS — of the words that survive 1–3, prefer the ones whose
   other kanji have ALREADY been taught by the week this sheet falls in. This is
   the one ranking rule that could not exist without the schedule, and it is
   the reason the vocabulary here is not the same vocabulary a dictionary page
   would show. A word is never rejected for it; it is only ranked down, and the
   output records `all_taught_by_week` so the state is visible rather than
   implied.

READINGS ARE CLASSIFIED, NEVER SPLIT
────────────────────────────────────
JMdict gives a reading for the whole word, not per character, and there is no
licensed source that maps a kanji inside a compound to its share of the reading.
So this file does not invent one. It classifies: if one of the kanji's own
on'yomi appears in the word's reading it is tagged `on`, likewise `kun`, and
anything else is `special` — which is not a failure but the jukujikun case
(今日 きょう, 一人 ひとり), worth marking because a learner who tries to build
those from readings will get them wrong.

Rendaku is handled by unvoicing the reading before the match, so 一日 (ついたち)
and 三日 (みっか) classify rather than falling through to `special` by accident.
"""

import argparse
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict

# ─────────────────────────── kana helpers ────────────────────────────────────

KATA_TO_HIRA = {chr(c): chr(c - 0x60) for c in range(0x30A1, 0x30F7)}
# Voiced/semi-voiced -> base, for rendaku matching (が->か, ぱ->は).
DAKUTEN = {}
for a, b in [('がぎぐげご', 'かきくけこ'), ('ざじずぜぞ', 'さしすせそ'),
             ('だぢづでど', 'たちつてと'), ('ばびぶべぼ', 'はひふへほ'),
             ('ぱぴぷぺぽ', 'はひふへほ')]:
    DAKUTEN.update(dict(zip(a, b)))


def to_hira(s):
    return ''.join(KATA_TO_HIRA.get(c, c) for c in s)


def unvoice(s):
    return ''.join(DAKUTEN.get(c, c) for c in s)


def is_kanji(c):
    return '一' <= c <= '鿿'


# ────────────────────── the site's own kanji data ────────────────────────────

ENTRY_RE = re.compile(
    r'\{\s*kanji:\s*"(.)"\s*,\s*onyomi:\s*"([^"]*)"\s*,'
    r'\s*kunyomi:\s*"([^"]*)"\s*,\s*meaning:\s*"([^"]*)"\s*\}')


def load_n5(path):
    """Parse lib/constants/n5-kanji.ts the same way schedule.py does.

    Deliberately the same brittle-looking regex rather than a shared helper:
    both readers must fail loudly and identically if the shape of that file
    changes, and a shared parser that silently coped would hide the change.
    """
    src = open(path, encoding='utf-8').read()
    out = {}
    for m in ENTRY_RE.finditer(src):
        k, on, kun, meaning = m.groups()
        out[k] = {'kanji': k, 'onyomi': on, 'kunyomi': kun, 'meaning': meaning}
    if len(out) != 82:
        print(f'warning: parsed {len(out)} kanji, expected 82', file=sys.stderr)
    return out


def reading_forms(field):
    """The bare kana forms in an onyomi/kunyomi field.

    The data carries okurigana in full-width parens (ひと（つ）) and prefix or
    suffix hyphens (-び). Both are annotation, not reading: `ひと（つ）` means the
    kanji is read ひと and つ is the tail. Matching on the raw field would miss
    ひと entirely.
    """
    out = []
    for part in re.split(r'[、,]', field or ''):
        part = part.strip()
        if not part:
            continue
        stem = re.sub(r'（.*?）', '', part).replace('-', '').strip()
        if stem:
            out.append(to_hira(stem))
        # The okurigana-inclusive form is also a legitimate match target:
        # 一つ reads ひとつ, and the stem alone would classify it as `kun`
        # correctly, but 見る/みる needs the full form for the same result.
        full = part.replace('（', '').replace('）', '').replace('-', '').strip()
        if full and full != stem:
            out.append(to_hira(full))
    return out


# ─────────────────────────── JMdict parsing ──────────────────────────────────

# Frequency: JMdict's own tags. nfXX are 500-word bands, so nf12 is roughly the
# top 6,000 words. `ichi1` is the Ichimango top set. Either qualifies.
NF_RE = re.compile(r'^nf(\d\d)$')
GOOD_PRI = {'ichi1', 'news1', 'spec1'}
NF_LIMIT = 12

# Misc tags that disqualify a word for a beginner's workbook.
#
# These are matched against JMdict_e's EXPANDED text, not against the entity
# codes. JMdict_e resolves its entities on the way out, so a `misc` element
# reads "archaic", never "arch", and a filter written against the code list —
# which is what the first four runs of this file used — matches nothing at all
# and reports no error. Gate 3 was inert and looked fine.
BAD_MISC_TEXT = (
    'archaic', 'obsolete', 'obscure', 'rare term', 'slang', 'vulgar',
    'derogatory', 'proverb', 'rude or x-rated', "children's language",
    'jocular', 'manga slang', 'internet slang', 'dated term',
)
# `uk` is not "bad", it is "do not print in kanji": 事/こと and 為/ため are
# frequent by any count, but printing 事 as the model word teaches a spelling
# native writers do not use. Handled separately so the reason stays legible.
KANA_PREFERRED_TEXT = 'usually written using kana alone'


def misc_is_bad(misc):
    low = [m.lower() for m in misc]
    return any(any(bad in m for bad in BAD_MISC_TEXT) for m in low)


def misc_is_kana_preferred(misc):
    return any(KANA_PREFERRED_TEXT in m.lower() for m in misc)


def priority_rank(pri_tags):
    """Lower is more common. None means it did not clear the frequency gate.

    Feed this `ke_pri` ONLY — never `re_pri`.

    JMdict tags priority per *spelling* and per *reading* separately, and the
    difference is the whole gate. じゅういち is one of the commonest readings in
    the language, so the entry for 11 carries news1/nf01 on its reading element.
    Its headwords are 十一, １１ and 一一. Pooling the reading's tags onto each
    headword marks 一一 as a top-500 word, and the first run of this file duly
    printed 「一一 (じゅういち) eleven」 on the sheet for 一. Same mechanism put
    ３千 and 一九 on their sheets.

    A common reading does not make a rare spelling common, and a workbook is
    about spelling.
    """
    tags = set(pri_tags)
    band = None
    for t in tags:
        m = NF_RE.match(t)
        if m:
            b = int(m.group(1))
            band = b if band is None else min(band, b)

    # `ichi1` and the nfXX bands measure different languages, and treating them
    # as one scale is what the first two runs of this file got wrong.
    #
    # nfXX comes from the Mainichi Shimbun corpus. It is newspaper frequency, so
    # it ranks 円高 (yen appreciation), 白書 (government white paper), 出土
    # (archaeological excavation), 大半 (the majority) and 二百十日 (the 210th
    # day of the lunar calendar) above 高い, 書く, 出る, 大きい and 百. Those
    # first five were literally the leading words on their sheets. They are
    # correct frequencies for a newsroom and useless for a beginner.
    #
    # `ichi1` comes from the Ichimango goi bunruishuu — a general-vocabulary
    # list, which is much closer to what a learner meets. So ichi1 leads
    # absolutely, and the newspaper band only orders what is left.
    if 'ichi1' in tags:
        return 0 + (band or 25) / 100.0   # nf only breaks ties inside ichi1
    if band is not None and band <= NF_LIMIT:
        return 10 + band
    if tags & GOOD_PRI:
        return 30
    return None


def parse_jmdict(path, n5_set):
    """Every JMdict entry whose headword is writable in the 82 N5 kanji.

    Streamed with iterparse and cleared as it goes: the tree for 218,607
    entries does not need to exist all at once, and holding it costs about a
    gigabyte for no reason.
    """
    words = []
    ctx = ET.iterparse(path, events=('end',))
    for _, el in ctx:
        if el.tag != 'entry':
            continue
        seq = el.findtext('ent_seq')

        # -- headwords -------------------------------------------------------
        kebs = []
        for ke in el.findall('k_ele'):
            keb = ke.findtext('keb')
            if not keb:
                continue
            infs = {x.text for x in ke.findall('ke_inf')}
            # iK/oK/ateji headwords are irregular or obsolete spellings.
            if infs & {'iK', 'oK', 'ik', 'io'}:
                continue
            pri = [x.text for x in ke.findall('ke_pri')]
            kebs.append((keb, pri))
        if not kebs:
            el.clear()
            continue

        rebs = []
        for re_ in el.findall('r_ele'):
            reb = re_.findtext('reb')
            if not reb:
                continue
            if re_.find('re_nokanji') is not None:
                continue
            pri = [x.text for x in re_.findall('re_pri')]
            restr = [x.text for x in re_.findall('re_restr')]
            rebs.append((reb, pri, restr))
        if not rebs:
            el.clear()
            continue

        # `misc` is taken from the FIRST sense alone, never pooled across the
        # entry, because the first sense is the only one the book prints.
        #
        # Pooling was silently expensive. JMdict's 先生 has "teacher" as sense 1
        # and later senses tagged archaic, jocular and familiar. A union over
        # senses marked the whole entry archaic, so the single most important
        # word containing 先 was dropped from its own sheet — with no warning,
        # because a dropped word looks exactly like a word that was never a
        # candidate. Filter on what you display.
        senses = []
        misc = set()
        pos = set()
        first = True
        for s in el.findall('sense'):
            if first:
                misc = {x.text for x in s.findall('misc')}
            pos |= {x.text for x in s.findall('pos')}
            gl = [g.text for g in s.findall('gloss')
                  if g.text and g.get('{http://www.w3.org/XML/1998/namespace}lang',
                                      'eng') == 'eng'
                  and g.get('g_type') is None]
            if gl:
                senses.append(gl)
                first = False
        if not senses:
            el.clear()
            continue

        # -- the containment gate -------------------------------------------
        for keb, kpri in kebs:
            chars = [c for c in keb if is_kanji(c)]
            if not chars:
                continue
            if not set(chars) <= n5_set:
                continue
            # Reading for this headword: the first reading not restricted away.
            reading = None
            rpri = []
            for reb, p, restr in rebs:
                if not restr or keb in restr:
                    reading = reb
                    rpri = p
                    break
            if not reading:
                continue
            rank = priority_rank(kpri)
            words.append({
                'seq': seq,
                'word': keb,
                'reading': reading,
                'glosses': senses[0][:3],
                'sense_count': len(senses),
                'pos': sorted(pos),
                'misc': sorted(misc),
                'freq_rank': rank,
                'kanji': chars,
                'numeric': 'numeric' in ' '.join(pos),
            })
        el.clear()
    return words


# Digits in any width, the zero-glyph 〇 and the repeat mark 々. JMdict carries
# numeric-notation headwords (１１, ３千, 三〇〇〇) as legitimate spellings of the
# same entry. They are not words a learner writes, and 々 is a repeat mark
# rather than a character this book teaches.
BAD_CHAR_RE = re.compile(r'[0-9０-９〇々]')

# Katakana in a headword means either a loanword half (食パン, 西ドイツ) or the
# counter-prefix ヶ/ケ (ヶ月, カ国). Neither is a word this book can teach: the
# katakana half is not one of the 82 characters, so the containment gate that
# justifies every other word on the page does not actually hold for it.
KATAKANA_RE = re.compile(r'[゠-ヿ]')

# A suffix, prefix or counter is a bound morpheme, not a word. JMdict lists 人
# three times — as the suffix じん ("-ian"), as the counter にん, and as the
# noun ひと — and the suffix entry sorts first by entry sequence, which is how
# the sheet for 人 came to lead with 「人 (じん) -ian (e.g. Italian)」.
#
# `numeric` is deliberately NOT in this set. 二 and 七 are tagged numeric and
# nothing else, and excluding the tag removed the bare numeral from the sheet of
# every digit — leaving 七 to lead with 七日 and then reach for 七七日, "the 49th
# day after a death". Numeral COMPOUNDS are filtered separately, by length.
BOUND_POS = {'suffix', 'prefix', 'counter', 'particle',
             'auxiliary', 'auxiliary verb', 'auxiliary adjective'}

# Matched as whole POS descriptions, never as substrings: 'adverb (fukushi)'
# CONTAINS the string 'verb', so a substring test silently promoted every
# adverb to a core part of speech. That is how 大いに ("very") beat 大きい
# ("big") to the first slot on the sheet for 大.
CORE_POS_PREFIXES = ('Godan verb', 'Ichidan verb', 'suru verb', 'Kuru verb',
                     'irregular verb', 'intransitive verb', 'transitive verb',
                     'adjective (keiyoushi)', 'noun (common)',
                     'adjectival nouns')


def is_core_pos(pos_list):
    return any(p.startswith(CORE_POS_PREFIXES) for p in pos_list)


# ──────────────────────────── selection ──────────────────────────────────────

def classify_reading(kanji_entry, word_reading):
    """`on`, `kun` or `special` — see the module docstring."""
    r = unvoice(to_hira(word_reading))
    for form in reading_forms(kanji_entry['kunyomi']):
        if unvoice(form) and unvoice(form) in r:
            return 'kun'
    for form in reading_forms(kanji_entry['onyomi']):
        if unvoice(form) and unvoice(form) in r:
            return 'on'
    return 'special'


def select(words, n5, schedule, per_kanji=3, rejected=frozenset(),
           preferred=None):
    """Up to `per_kanji` words for each of the 82 characters.

    Ordering, in priority order:
      · words whose other kanji are all taught by this sheet's week  (schedule)
      · reading variety — an on'yomi word and a kun'yomi word beat two of either
      · JMdict frequency band
      · shorter words before longer ones
    """
    preferred = preferred or {}
    week_of = {}
    for w in schedule['plan']:
        for c in w['new']:
            week_of[c] = w['week']

    by_kanji = defaultdict(list)
    for w in words:
        for c in w['kanji']:
            by_kanji[c].append(w)

    out = {}
    for ch, entry in n5.items():
        wk = week_of.get(ch, 99)
        cands = []
        best_for_word = {}
        for w in by_kanji.get(ch, []):
            if w['freq_rank'] is None:
                continue
            if misc_is_bad(w['misc']):
                continue
            if misc_is_kana_preferred(w['misc']):
                continue
            if len(w['word']) > 4:
                continue
            if BAD_CHAR_RE.search(w['word']):
                continue
            # A numeral compound is arithmetic, not vocabulary: 十九 demonstrates
            # nothing about 九 that 九 alone does not, and the same slot can
            # carry 九つ. Single numerals stay — 九 itself is the word.
            if w['numeric'] and len(w['word']) > 1:
                continue
            if w['word'] in rejected:
                continue
            if KATAKANA_RE.search(w['word']):
                continue
            if set(w['pos']) <= BOUND_POS:
                continue
            others = [c for c in w['kanji'] if c != ch]
            taught = all(week_of.get(c, 99) <= wk for c in others)
            cand = {
                **w,
                'reading_type': classify_reading(entry, w['reading']),
                'all_taught_by_week': taught,
                'is_single': len(w['kanji']) == 1,
                'core': is_core_pos(w['pos']),
            }
            # One spelling can be several JMdict entries — 人 is three. Keeping
            # whichever the stream reached first meant keeping whichever has the
            # lowest entry sequence, which is an artefact of when the entry was
            # added and carries no information at all. Keep the best instead.
            prev = best_for_word.get(w['word'])
            if prev is None or (not prev['core'], prev['freq_rank']) > \
                               (not cand['core'], cand['freq_rank']):
                best_for_word[w['word']] = cand
        cands = list(best_for_word.values())

        def sort_key(w):
            # TIER is the strongest signal and it is structural, not statistical.
            #
            # A word written with the target kanji and nothing but kana — 高い,
            # 書く, 食べる, 見る, 山 — is the form a learner meets first, and it
            # is the only form they can write the moment they finish this sheet.
            # A compound needs a second character, which is a second sheet.
            #
            # Frequency alone will not find these. 円高 (yen appreciation),
            # 白書 (government white paper) and 日食 (solar eclipse) all outrank
            # 高い, 書く and 食べる in a newspaper corpus, and all three led
            # their sheets before this key existed.
            tier = 0 if w['is_single'] else 1
            # Within a tier, a real verb/adjective/noun beats an adverb or a
            # derived form: 見る before 見出し, 大きい before 大いに.
            core = 0 if w['core'] else 1
            # A gloss that needs a long parenthetical is explaining a
            # specialist sense, not defining a beginner's word. Compare
            # "left" with "wearing a kimono with the right side over the left
            # (normally used only for the dead)".
            gloss_cost = 1 if len(w['glosses'][0]) > 34 else 0
            return (
                0 if w['all_taught_by_week'] else 1,
                tier,
                gloss_cost,
                core,
                w['freq_rank'],
                len(w['word']),
            )

        cands.sort(key=sort_key)

        picked = []
        # A hand-picked word jumps the queue. The mirror of the reject list and
        # the same kind of artefact: the rules are good at excluding what is
        # wrong and weaker at insisting on what is essential. 先生 and 先月 tie
        # exactly on every signal JMdict carries — same ichi1, same nf02, same
        # length, same part of speech — and only a person knows which one a
        # learner needs first.
        for word in preferred.get(ch, []):
            for w in cands:
                if w['word'] == word:
                    picked.append(w)
                    break
        # At most two of the three slots may go to the simple form. Without the
        # cap, 先 fills all three with 先に / 先ず / 先だって and never shows
        # 先生 — the word a beginner actually needs — because every compound
        # sits in a lower tier than every simple form. The sheet's job is to
        # show the character standing alone AND inside a word.
        max_tier0 = max(1, per_kanji - 1)

        def take(w):
            if w in picked or len(picked) >= per_kanji:
                return False
            if w['is_single']:
                n = sum(1 for x in picked if x['is_single'])
                if n >= max_tier0:
                    return False
                # A SECOND simple-form word has to earn its slot on frequency,
                # not just on being simple. Otherwise 先 spends two of three
                # slots on 先 ("point") and 先ほど ("a short while ago") and
                # never reaches 先生 — which is the word anyone learning 先
                # needs first. `< 10` is the ichi1 band; see priority_rank.
                if n >= 1 and w['freq_rank'] >= 10:
                    return False
            picked.append(w)
            return True

        # Reading variety, drawn only from the strongest candidates: a learner
        # who meets 生 only as せい never recognises 生きる. Restricted to the
        # top slice because a `special` reading exists for almost every kanji if
        # you look far enough down, and reaching for one pulled 二七日
        # ("second week's memorial services") onto the sheet for 七.
        head = cands[:8]
        for want in ('kun', 'on', 'special'):
            for w in head:
                if w['reading_type'] == want and take(w):
                    break
        for w in cands:
            take(w)

        picked.sort(key=sort_key)
        out[ch] = [{
            'word': w['word'],
            'reading': w['reading'],
            'gloss': w['glosses'],
            'reading_type': w['reading_type'],
            'all_taught_by_week': w['all_taught_by_week'],
            'freq_rank': w['freq_rank'],
            'jmdict_seq': w['seq'],
        } for w in picked[:per_kanji]]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jmdict', required=True)
    ap.add_argument('--kanji', required=True)
    ap.add_argument('--schedule', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--per-kanji', type=int, default=3)
    ap.add_argument('--rejects', default=None,
                    help='JSON list of headwords a human has struck out')
    a = ap.parse_args()

    # The reject list is a decision log, not a filter constant, and it lives in
    # its own file for the reason the sentence pipeline keeps decisions separate
    # from its queue: refreshing JMdict must never destroy a human judgement.
    # A word struck out because its only gloss was "second week's memorial
    # services" stays struck out through the next dictionary release.
    rejected = frozenset()
    preferred = {}
    if a.rejects:
        try:
            doc = json.load(open(a.rejects, encoding='utf-8'))
            rejected = frozenset(doc['rejected'])
            preferred = doc.get('preferred', {})
        except FileNotFoundError:
            print(f'no reject list at {a.rejects}; continuing', file=sys.stderr)

    n5 = load_n5(a.kanji)
    schedule = json.load(open(a.schedule, encoding='utf-8'))
    words = parse_jmdict(a.jmdict, set(n5))
    print(f'{len(words)} JMdict headwords writable in the N5 set', file=sys.stderr)
    sel = select(words, n5, schedule, a.per_kanji, rejected, preferred)

    empty = [k for k, v in sel.items() if not v]
    thin = [k for k, v in sel.items() if 0 < len(v) < a.per_kanji]
    print(f'{len(empty)} kanji with no word; {len(thin)} with fewer than {a.per_kanji}',
          file=sys.stderr)
    if empty:
        print('  empty: ' + ''.join(empty), file=sys.stderr)
    if thin:
        print('  thin:  ' + ''.join(thin), file=sys.stderr)

    json.dump({
        'source': 'JMdict',
        'sourceUrl': 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz',
        'license': 'CC BY-SA 4.0',
        'rightsHolder': 'Electronic Dictionary Research and Development Group',
        'attribution': ('This publication includes material from the JMdict '
                        '(EDICT etc.) dictionary files in accordance with the '
                        'licence provisions of the Electronic Dictionary '
                        'Research and Development Group. See www.edrdg.org/'),
        'perKanji': a.per_kanji,
        'gates': {
            'containment': 'every kanji in the word is one of the 82 N5 characters',
            'frequency': f'JMdict ichi1/news1/spec1 or nf01-nf{NF_LIMIT:02d}',
            'excludedMisc': sorted(BAD_MISC_TEXT + (KANA_PREFERRED_TEXT,)),
            'maxWordLength': 4,
        },
        'words': sel,
    }, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'wrote {a.out}', file=sys.stderr)


if __name__ == '__main__':
    main()
