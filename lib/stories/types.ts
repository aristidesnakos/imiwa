/**
 * The Travels of Tan — the episode contract.
 *
 * An episode is one weekly six-panel comic. The same `script.json` produces
 * three things: the page these types describe, the social exports `build.py`
 * renders, and (eventually) the email. Keeping one contract is what stops the
 * three from disagreeing about what Tan said.
 *
 * Everything here is compiled into the bundle, exactly like `lib/constants/
 * n{1..5}-kanji.ts` and `data/sentences/`. No database, no MDX. The content is
 * *structured* — paired JP/EN lines, positioned bubbles, typed quiz options —
 * and MDX would turn all of it into prose nothing can validate.
 */

/**
 * Where one line of dialogue sits on its panel, in percentages of the panel
 * box — the same geometry `build.py` uses to composite the social export.
 *
 * Percentages rather than pixels because the page renders the panel at whatever
 * width the viewport gives it. The strip renders at a fixed 1080px and could
 * have used pixels; the page cannot, and one shared unit is what lets both read
 * from the same field.
 */
export interface Bubble {
  /** Left edge, % of panel width. */
  x: number;
  /** Top edge, % of panel height. */
  y: number;
  /** Bubble width, % of panel width. */
  w: number;
  /**
   * Which corner the tail hangs from, aimed at the speaker's head. `null` marks
   * narration, which gets a square sage box and no tail — narration is not
   * speech, and a tail pointing at nobody is what makes that read as a bug.
   */
  tail: 'bl' | 'br' | null;
}

/** Who is speaking. Free-form because the cast grows; `narration` is reserved. */
export type Speaker = 'narration' | (string & {});

export interface PanelLine {
  speaker: Speaker;
  /** One sentence, word-spaced (分かち書き) as a beginner reads it. */
  ja: string;
  /** Its translation. Same object, so the pair cannot drift. */
  en: string;
  bubble: Bubble;
}

export interface Panel {
  /** `P1`…`P6`. Stable across a regenerate; used as the React key. */
  id: string;
  /**
   * What this panel is for, in one line. Written for the artist, not the
   * reader — but it is also the honest basis for the image's alt text, which
   * is why it ships rather than staying in the strips repo.
   */
  beat: string;
  /** Absolute public path to the art. No text baked in — see the importer. */
  art: string;
  lines: PanelLine[];
}

export interface TargetWord {
  /** 大きい */
  word: string;
  /** おおきい */
  reading: string;
  /** big */
  en: string;
  /**
   * The single character whose detail page this word links to. One code point,
   * and it must be a real entry in the level lists — `validate:stories` asserts
   * both. The href itself is never stored: it is built with
   * `encodeURIComponent` at render time, because a hand-typed encoded URL is
   * how you eventually ship `%25E5%25B1%25B1` and a 404.
   */
  kanji: string;
}

export interface QuizQuestion {
  /** The thing being asked about — a kanji, a word, or a question sentence. */
  prompt: string;
  /** The question in Japanese. Empty when `prompt` is already the question. */
  ask: string;
  /** The question in English. Always present. */
  askEn: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
}

export interface Episode {
  number: number;
  /** URL segment. ASCII, so no encoding anywhere in the story routes. */
  slug: string;
  titleEn: string;
  titleJa: string;
  /** JLPT level the whole episode is written inside. `N5` today, always. */
  level: string;
  /** ISO date. Feeds `lastmod` and the JSON-LD, nothing else. */
  publishedAt: string;
  /** Absolute public path to the OpenGraph image (JPEG, see the importer). */
  ogImage: string;
  /**
   * The characters this episode teaches. Distinct from `targets`, which are the
   * *words* built from them — one kanji can appear in several words, and the
   * no-repeat rule across the season is about characters.
   */
  focusKanji: string[];
  targets: TargetWord[];
  panels: Panel[];
  quiz: QuizQuestion[];
}

/**
 * An episode that is written but not yet drawn.
 *
 * Season one is six scripts; two have art. The other four are real, scheduled
 * work rather than a vague intention, and a hub that says "a new episode every
 * week" while listing two is asking to be taken on faith. So they are listed,
 * with what they will teach.
 *
 * Deliberately NOT an `Episode` with optional fields. An `Episode` renders a
 * page, enters the sitemap and carries a `datePublished`; every one of those is
 * wrong for something that does not exist yet, and modelling the difference as
 * "some fields are missing" is how a half-built episode eventually gets
 * prerendered. This type cannot be passed anywhere an `Episode` is expected.
 *
 * No `slug`, and that is the point: a slug is a URL, and there is no URL. When
 * the art lands, the importer generates the real `Episode` and the entry here
 * is deleted — `validate:stories` fails if both claim the same number.
 */
export interface UpcomingEpisode {
  number: number;
  titleEn: string;
  titleJa: string;
  /**
   * The words it teaches, for display only. Strings rather than `TargetWord`s
   * because these link nowhere: a card in this list is the one card on the page
   * that is not a link, and a reader who clicks a word inside it and lands
   * somewhere unrelated learns that the cards here are unreliable.
   */
  teaches: string[];
}
