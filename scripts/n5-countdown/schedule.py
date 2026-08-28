"""
Builds the MichiKanji N5 Countdown schedule.

The whole product is this file. Everything else — grids, stroke diagrams — the
site already generates for free, one character at a time. What it cannot give
anyone is an ORDER and a set of DATES, which is the thing a learner with a test
in fourteen weeks is actually short of.

Two rules shape the allocation:

1. Never split a semantic group across a week boundary if it fits. The repo's
   own comments already group the 82 characters the way a teacher would —
   numbers together, directions together, time together — and splitting
   一二三四五 across a Sunday would be a worse week than an uneven one. Week
   sizes therefore vary (5–9) and that is deliberate.

2. Review is on the calendar, not left to the reader. Every character is seen
   on the day it is learned, again three days later, again at seven days, and
   again at twenty-one. In a weekly structure that lands as: new set this week,
   last week's set again, and the set from three weeks ago. Nobody has to
   remember to schedule anything.
"""

from datetime import date, timedelta
import argparse
import json
import re
import pathlib

# The repo's group comments are engineering labels — "Descriptive/Qualities",
# "Others" — and a week opener that says "Others (part)" reads like a database
# field someone forgot to map. These are what a reader should see instead. The
# keys must stay in step with lib/constants/n5-kanji.ts.
THEME_TITLES = {
    'N5': {
        'Japan - Foundation': 'The two that name the country',
        'Numbers 1-10': 'Counting, one to ten',
        'Larger Numbers': 'Hundreds, thousands, and yen',
        'Time': 'Telling the time',
        'People': 'People, and family',
        'Descriptive/Qualities': 'Big, small, tall, long',
        'Nature/Elements': 'The elements, and the weather',
        'Directions': 'The four directions',
        'Verbs and Actions': 'The verbs you will meet first',
        'Places and Spatial': 'Places, and where things sit',
        'Others': 'The last of the eighty-two',
    },
}

# Hand-written week openers, for levels whose source groups are too fine to
# title one at a time.
#
# The two levels are not shaped alike. N5's 82 characters arrive in 11 broad
# groups, so one title per group reads well and a week names the one or two
# themes it covers. N4's 171 arrive in 62 groups averaging under three
# characters each, so a 14-character week spans five of them and humanise()
# joins them into an unreadable string of engineering labels. Only 14 strings
# are ever printed, so writing those 14 is both cheaper than titling 62 groups
# nobody sees and better copy.
#
# `anchor` is the first character the allocator is expected to place in that
# week, and build() asserts every one of them. A hand-written title RESTATES
# the allocation, and the one rule this generator has is that it must derive
# from its inputs rather than restate them -- so when the kanji list changes
# and the weeks shift, the build fails loudly instead of printing a title that
# describes a different set of characters. That is the 81->82 failure wearing
# a different costume, and it is the only way this shortcut is safe.
WEEK_TITLES = {
    'N4': [
        {'anchor': '会', 'title': 'Work, and the body you bring to it'},
        {'anchor': '者', 'title': 'Brothers, sisters, and the turning year'},
        {'anchor': '多', 'title': 'More and less, new and old, light and dark'},
        {'anchor': '黒', 'title': 'Red, black, blue, and the body that moves'},
        {'anchor': '転', 'title': 'Stop, think, ask, and study'},
        {'anchor': '字', 'title': "Words, money, and the verbs of an ordinary day"},
        {'anchor': '駅', 'title': 'Stations, shops, and the road out of town'},
        {'anchor': '空', 'title': "Sky and sea, and what's for dinner"},
        {'anchor': '犬', 'title': 'Songs and flowers, sickness and strength'},
        {'anchor': '物', 'title': 'Beginnings and endings, having and not'},
        {'anchor': '元', 'title': 'Questions and answers, pictures and sound'},
        {'anchor': '田', 'title': 'Public and private, near and far \u2014 the last of them'},
        # Weeks 13 and 14 teach nothing, so they have no anchor to check.
        {'anchor': None, 'title': 'Everything, once more'},
        {'anchor': None, 'title': 'Test week'},
    ],
}


def humanise(labels, spans, seen, titles):
    """
    Week title from the group labels the allocator produced.

    A group that runs over more than one week is numbered — "Counting, one to
    ten (2 of 2)" — rather than marked "(part)". Two consecutive weeks both
    titled "Counting, one to ten" reads like a printing error; a reader needs to
    know a second half is coming and, next week, that this is it. `seen` is
    mutated across the weeks, so the caller must pass the same dict through.
    """
    parts = []
    for lab in labels:
        base = lab.replace(' (part)', '')
        title = titles.get(base, base)
        if spans.get(base, 1) > 1:
            seen[base] = seen.get(base, 0) + 1
            title = f'{title} ({seen[base]} of {spans[base]})'
        parts.append(title)
    return ' · '.join(parts)

# Paths are derived from this file so the generator runs from a checkout,
# not from whatever sandbox it was first written in.
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
LEVELS = ('N5', 'N4', 'N3', 'N2', 'N1')
TEST_DATE = date(2026, 12, 6)
TEACHING_WEEKS = 12  # W13 = full review + mock, W14 = test week


def source_for(level):
    return REPO / 'lib' / 'constants' / f'{level.lower()}-kanji.ts'


def output_for(level):
    """N5 keeps `schedule.json`.

    book.py, freepack.py and kdpbook.py all read that exact name, and the N5
    book is built, verified and waiting on a printed proof. Renaming its input
    for symmetry would be a change with no upside and one obvious downside.
    """
    name = 'schedule.json' if level == 'N5' else f'schedule-{level.lower()}.json'
    return HERE / name


def load_kanji(level):
    src = source_for(level)
    marker = f'{level}_KANJI: KanjiData[] = ['
    text = src.read_text()
    if marker not in text:
        raise SystemExit(f'{src.name} does not export {marker.rstrip(" = [")}')
    body = text.split(marker, 1)[1]
    group, out = None, []
    for line in body.splitlines():
        s = line.strip()
        m = re.match(r'^//\s*(.+)$', s)
        if m and 'canonical' not in m.group(1):
            group = m.group(1).strip()
            continue
        m = re.match(
            r'^\{\s*kanji:\s*"(.+?)",\s*onyomi:\s*"(.*?)",'
            r'\s*kunyomi:\s*"(.*?)",\s*meaning:\s*"(.*?)"\s*\},?$', s)
        if m:
            out.append({
                'kanji': m.group(1), 'on': m.group(2),
                'kun': m.group(3), 'meaning': m.group(4), 'group': group,
            })
    return out


def week_starts():
    """14 Monday-start weeks, the last of which ends on test day."""
    first_monday = TEST_DATE - timedelta(days=TEST_DATE.weekday()) - timedelta(days=7 * 13)
    return [first_monday + timedelta(days=7 * i) for i in range(14)]


def allocate(kanji, n_weeks):
    """
    Cut the ordered list into `n_weeks` runs of near-equal size, snapping each
    cut to a semantic-group boundary whenever one sits within SNAP of the even
    split.

    The naive version of this — walk the groups, start a new week when the
    current one is full — produced a 2-kanji opening week and a 13-kanji week
    twelve, which is exactly backwards. The heaviest load landed in mid-November
    on a reader who by then has a test in three weeks and no slack left, while
    week one, the week motivation is highest and habit is being formed, asked
    for almost nothing.

    So the even split leads and the groups bend to it, rather than the reverse.
    Weeks still vary (5-8) because a snap is usually available, but nothing is
    twice its neighbour.
    """
    SNAP = 2

    groups, order = {}, []
    for k in kanji:
        if k['group'] not in groups:
            groups[k['group']] = []
            order.append(k['group'])
        groups[k['group']].append(k)

    flat, owner = [], []
    for name in order:
        for k in groups[name]:
            flat.append(k)
            owner.append(name)

    # Indices where a new group starts — the cuts we would prefer to use.
    boundaries = {i for i in range(1, len(flat)) if owner[i] != owner[i - 1]}

    total = len(flat)
    cuts = [0]
    for w in range(1, n_weeks):
        ideal = round(total * w / n_weeks)
        candidates = [b for b in boundaries if abs(b - ideal) <= SNAP and b > cuts[-1]]
        cut = min(candidates, key=lambda b: (abs(b - ideal), b)) if candidates else ideal
        cuts.append(max(cut, cuts[-1] + 1))
    cuts.append(total)

    weeks, themes = [], []
    for i in range(n_weeks):
        chunk = flat[cuts[i]:cuts[i + 1]]
        weeks.append(chunk)
        names = []
        for name in owner[cuts[i]:cuts[i + 1]]:
            if name not in names:
                names.append(name)
        # Mark a theme the week only partly covers, so the week opener never
        # claims to have finished something it has not.
        labelled = []
        for name in names:
            whole = groups[name]
            covered = [k for k in chunk if k['group'] == name]
            labelled.append(name if len(covered) == len(whole) else f'{name} (part)')
        themes.append(labelled)
    return weeks, themes


def build(level):
    kanji = load_kanji(level)
    starts = week_starts()
    weeks, themes = allocate(kanji, TEACHING_WEEKS)
    titles = THEME_TITLES.get(level, {})
    hand = WEEK_TITLES.get(level)
    if hand is not None and len(hand) != len(starts):
        raise SystemExit(
            f'WEEK_TITLES[{level!r}] has {len(hand)} entries, {len(starts)} weeks')

    # How many weeks each group spans, so a continued theme can be numbered.
    spans = {}
    for labels in themes:
        for lab in labels:
            base = lab.replace(' (part)', '')
            spans[base] = spans.get(base, 0) + 1
    seen = {}

    plan = []
    for i, start in enumerate(starts):
        n = i + 1
        if i < TEACHING_WEEKS:
            new = weeks[i]
            theme = humanise(themes[i], spans, seen, titles) or 'Consolidation'
        else:
            new = []
            theme = 'Everything, once more' if n == 13 else 'Test week'

        # A hand-written title overrides the derived one, but only after the
        # allocation has been checked against the anchor it was written for.
        # Without this the titles would silently drift off their characters the
        # first time the kanji list changes.
        if hand is not None:
            entry = hand[i]
            want = entry.get('anchor')
            got = new[0]['kanji'] if new else None
            if want != got:
                raise SystemExit(
                    f'W{n:02d} anchor moved: WEEK_TITLES[{level!r}] expects '
                    f'{want!r}, allocator produced {got!r}. The kanji list has '
                    f'changed under the hand-written titles -- reread the '
                    f'allocation and rewrite them, do not just update anchors.')
            theme = entry['title']

        # Named week_at, not `seen`: `seen` is the theme-numbering dict a few
        # lines up, and shadowing it here made humanise() try to call .get on a
        # function.
        def week_at(idx):
            return weeks[idx] if 0 <= idx < TEACHING_WEEKS else []

        if n == 14:
            # Test week reviews the whole set. Nothing is three weeks old any
            # more that matters more than everything being one week old.
            r7 = [k['kanji'] for wk in weeks for k in wk]
            r21 = []
        else:
            r7 = [k['kanji'] for k in week_at(i - 1)]
            r21 = [k['kanji'] for k in week_at(i - 3)]

        plan.append({
            'week': n,
            'start': start.isoformat(),
            'end': (start + timedelta(days=6)).isoformat(),
            'theme': theme,
            'new': [k['kanji'] for k in new],
            'new_full': new,
            # Spaced review: +7 days is last week's set, +21 is three weeks back.
            'review_7': r7,
            'review_21': r21,
            'days_to_test': (TEST_DATE - start).days,
        })
    return kanji, plan


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--level', default='N5', choices=LEVELS,
                    help='JLPT level to build a schedule for (default: N5)')
    ap.add_argument('--out', type=pathlib.Path, default=None,
                    help='override the output path')
    args = ap.parse_args()

    kanji, plan = build(args.level)
    out = args.out or output_for(args.level)
    out.write_text(json.dumps(
        {'level': args.level, 'kanji': kanji, 'plan': plan},
        ensure_ascii=False, indent=1))
    total_new = sum(len(w['new']) for w in plan)
    print(f'{args.level}: {len(kanji)} kanji -> {total_new} placed across '
          f'{TEACHING_WEEKS} teaching weeks -> {out.name}\n')
    for w in plan:
        d0 = date.fromisoformat(w['start'])
        print(f"W{w['week']:02d} {d0.strftime('%d %b')}  new={len(w['new']):2d} "
              f"r7={len(w['review_7']):2d} r21={len(w['review_21']):2d}  "
              f"{''.join(w['new'])}   [{w['theme']}]")
