export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const NON_JLPT_KANJI: KanjiData[] = [
  // Textile/Thread Radical Kanji (糸偏)

  // Fabric Patterns/Dyeing
  { kanji: "縞", onyomi: "こう", kunyomi: "しま", meaning: "stripe" },
  { kanji: "絣", onyomi: "へい", kunyomi: "かすり", meaning: "splashed pattern (on cloth)" },
  { kanji: "綛", onyomi: "かせ", kunyomi: "", meaning: "splashed dye pattern" },
  { kanji: "繧", onyomi: "うん", kunyomi: "", meaning: "a method of dyeing" },
  { kanji: "繝", onyomi: "かん", kunyomi: "", meaning: "a method of dyeing" },
  { kanji: "纈", onyomi: "けつ", kunyomi: "", meaning: "tie-dyeing" },
  { kanji: "纐", onyomi: "こう", kunyomi: "", meaning: "tie-dyeing" },
  { kanji: "纃", onyomi: "せい", kunyomi: "", meaning: "splashed pattern dyeing or weaving" },
  { kanji: "緕", onyomi: "せい", kunyomi: "", meaning: "splashed pattern dyeing or weaving" },

  // Fabric Types/Materials
  { kanji: "絲", onyomi: "し", kunyomi: "いと", meaning: "thread" },
  { kanji: "絨", onyomi: "じゅう", kunyomi: "", meaning: "wool cloth, velvet" },
  { kanji: "絽", onyomi: "ろ", kunyomi: "", meaning: "silk gauze" },
  { kanji: "緞", onyomi: "どん", kunyomi: "", meaning: "damask" },
  { kanji: "繻", onyomi: "しゅ", kunyomi: "", meaning: "satin" },
  { kanji: "縵", onyomi: "まん", kunyomi: "", meaning: "unpatterned silk" },
  { kanji: "絅", onyomi: "けい", kunyomi: "", meaning: "thin silk" },
  { kanji: "絋", onyomi: "こう", kunyomi: "", meaning: "cotton wadding" },
  { kanji: "絮", onyomi: "じょ", kunyomi: "わた", meaning: "cotton, wadding" },
  { kanji: "紵", onyomi: "ちょ", kunyomi: "", meaning: "flax, ramie" },
  { kanji: "緜", onyomi: "めん", kunyomi: "わた", meaning: "cotton" },

  // Sewing/Stitching/Weaving
  { kanji: "繍", onyomi: "しゅう", kunyomi: "ぬいとり", meaning: "sew, embroidery" },
  { kanji: "綴", onyomi: "てい、てつ", kunyomi: "つづ（る）、と（じる）", meaning: "compose, bind, patch" },
  { kanji: "絎", onyomi: "こう", kunyomi: "くけ（る）", meaning: "blindstitch" },
  { kanji: "綉", onyomi: "しゅう", kunyomi: "", meaning: "embroidery" },
  { kanji: "縢", onyomi: "とう", kunyomi: "かが（る）", meaning: "cross-stitch" },

  // Ribbons/Strings/Cords
  { kanji: "綬", onyomi: "じゅ", kunyomi: "", meaning: "ribbon" },
  { kanji: "紐", onyomi: "ちゅう", kunyomi: "ひも", meaning: "string, cord" },
  { kanji: "絛", onyomi: "とう、じょう", kunyomi: "くみひも", meaning: "braid, cord" },
  { kanji: "纓", onyomi: "えい", kunyomi: "", meaning: "crown string, tassel" },
  { kanji: "緡", onyomi: "びん、みん", kunyomi: "さし、ぜに", meaning: "paper string, string of coins" },

  // Binding/Tying
  { kanji: "繋", onyomi: "けい", kunyomi: "つな（ぐ）、かか（る）", meaning: "tie, connect, bind" },
  { kanji: "絆", onyomi: "はん、ばん", kunyomi: "きずな、ほだ（す）", meaning: "bonds, fetters" },
  { kanji: "紲", onyomi: "せつ", kunyomi: "きずな、つな（ぐ）", meaning: "fetters, bonds" },
  { kanji: "絏", onyomi: "せつ", kunyomi: "", meaning: "tie, bind" },
  { kanji: "緤", onyomi: "せつ", kunyomi: "", meaning: "leash" },
  { kanji: "縲", onyomi: "るい", kunyomi: "", meaning: "tie, rope" },
  { kanji: "紮", onyomi: "さつ", kunyomi: "", meaning: "tie up, bind" },
  { kanji: "縻", onyomi: "び", kunyomi: "", meaning: "rope, halter" },

  // Twisting/Tangling
  { kanji: "綯", onyomi: "どう", kunyomi: "な（う）", meaning: "twist (rope)" },
  { kanji: "縒", onyomi: "さ", kunyomi: "よ（る）", meaning: "twist" },
  { kanji: "縺", onyomi: "れん", kunyomi: "もつ（れる）", meaning: "tangle, get tangled" },
  { kanji: "紕", onyomi: "ひ", kunyomi: "", meaning: "braiding, error in weaving" },

  // Wrapping/Wearing
  { kanji: "纏", onyomi: "てん", kunyomi: "まと（う）、まつ（わる）", meaning: "wear, wrap around" },
  { kanji: "纒", onyomi: "てん", kunyomi: "まと（う）", meaning: "wear, wrap around" },
  { kanji: "繚", onyomi: "りょう", kunyomi: "まつ（わる）", meaning: "put on, twine around" },
  { kanji: "綢", onyomi: "ちゅう", kunyomi: "まと（う）", meaning: "be clothed in" },
  { kanji: "繃", onyomi: "ほう", kunyomi: "", meaning: "wrap, swaddle" },

  // Thread/Fiber Qualities
  { kanji: "緬", onyomi: "めん、べん", kunyomi: "", meaning: "fine thread, distant" },
  { kanji: "緻", onyomi: "ち", kunyomi: "", meaning: "fine, dense, delicate" },
  { kanji: "縷", onyomi: "る", kunyomi: "", meaning: "thread, detailed" },
  { kanji: "纖", onyomi: "せん", kunyomi: "", meaning: "fine, slender" },
  { kanji: "纎", onyomi: "せん", kunyomi: "", meaning: "fine, slender" },
  { kanji: "纔", onyomi: "さん", kunyomi: "わず（か）", meaning: "a little, barely" },

  // Colors (Textile)
  { kanji: "絳", onyomi: "こう", kunyomi: "", meaning: "red, crimson" },
  { kanji: "縹", onyomi: "ひょう", kunyomi: "はなだ", meaning: "light blue" },
  { kanji: "緇", onyomi: "し", kunyomi: "", meaning: "black clothing" },
  { kanji: "綵", onyomi: "さい", kunyomi: "", meaning: "colorful" },
  { kanji: "綟", onyomi: "れい", kunyomi: "もじ", meaning: "yellowish green" },
  { kanji: "縉", onyomi: "しん", kunyomi: "", meaning: "thin red cloth" },

  // States/Conditions
  { kanji: "綻", onyomi: "たん", kunyomi: "ほころ（びる）", meaning: "be rent, come apart" },
  { kanji: "綽", onyomi: "しゃく", kunyomi: "", meaning: "loose, relaxed" },
  { kanji: "緲", onyomi: "びょう", kunyomi: "", meaning: "faint, indistinct" },
  { kanji: "繿", onyomi: "らん", kunyomi: "", meaning: "rags, tattered" },
  { kanji: "縟", onyomi: "じょく", kunyomi: "", meaning: "decoration, ornate" },

  // Actions/Verbs
  { kanji: "糺", onyomi: "きゅう", kunyomi: "ただ（す）", meaning: "ask, inquire, correct" },
  { kanji: "紿", onyomi: "たい", kunyomi: "", meaning: "deceive" },
  { kanji: "縊", onyomi: "い、いつ", kunyomi: "くび（る）", meaning: "strangle, hang" },
  { kanji: "縋", onyomi: "すい", kunyomi: "すが（る）", meaning: "cling to" },
  { kanji: "繙", onyomi: "はん", kunyomi: "ひもと（く）", meaning: "peruse, read" },
  { kanji: "繹", onyomi: "えき", kunyomi: "", meaning: "pull out, unravel" },
  { kanji: "緘", onyomi: "かん", kunyomi: "", meaning: "shut, seal" },
  { kanji: "緝", onyomi: "しゅう", kunyomi: "", meaning: "spin thread" },
  { kanji: "繞", onyomi: "じょう、にょう", kunyomi: "めぐ（る）", meaning: "surround, go around" },

  // Continuation/Succession
  { kanji: "續", onyomi: "ぞく", kunyomi: "つづ（く）", meaning: "continue" },
  { kanji: "繼", onyomi: "けい", kunyomi: "つ（ぐ）", meaning: "succeed, inherit" },
  { kanji: "纉", onyomi: "さん", kunyomi: "つ（ぐ）", meaning: "succeed to" },

  // Disorder/Disturbance
  { kanji: "紜", onyomi: "うん", kunyomi: "", meaning: "disorder, confused" },
  { kanji: "紊", onyomi: "びん、ぶん", kunyomi: "みだ（れる）", meaning: "disturb, disorder" },
  { kanji: "繆", onyomi: "びゅう、みゅう", kunyomi: "", meaning: "error, mistake" },
  { kanji: "繽", onyomi: "ひん", kunyomi: "", meaning: "disorder, confusion" },

  // Collection/Editing
  { kanji: "總", onyomi: "そう", kunyomi: "すべ（て）、ふさ", meaning: "collect, general, all" },
  { kanji: "纂", onyomi: "さん", kunyomi: "", meaning: "editing, compile" },

  // Attachment/Connection
  { kanji: "綣", onyomi: "けん", kunyomi: "", meaning: "attachment, affection" },
  { kanji: "綏", onyomi: "すい", kunyomi: "やす（んじる）", meaning: "peaceful, soothe" },
  { kanji: "綰", onyomi: "わん", kunyomi: "", meaning: "bend around" },

  // Miscellaneous Thread-Related
  { kanji: "紆", onyomi: "う", kunyomi: "", meaning: "crouch, winding" },
  { kanji: "紂", onyomi: "ちゅう", kunyomi: "", meaning: "harness strap" },
  { kanji: "絖", onyomi: "こう", kunyomi: "", meaning: "white silk, floss" },
  { kanji: "經", onyomi: "けい、きょう", kunyomi: "へ（る）", meaning: "classic works, sutra" },
  { kanji: "綫", onyomi: "せん", kunyomi: "", meaning: "thread, line" },
  { kanji: "縣", onyomi: "けん", kunyomi: "か（ける）", meaning: "county, prefecture" },
  { kanji: "縡", onyomi: "さい", kunyomi: "", meaning: "breath, matter" },
  { kanji: "縱", onyomi: "じゅう", kunyomi: "たて、ほしいまま", meaning: "indulge in, vertical" },
  { kanji: "繦", onyomi: "きょう", kunyomi: "", meaning: "string of coins, swaddling" },
  { kanji: "繪", onyomi: "え、かい", kunyomi: "", meaning: "picture, drawing" },
  { kanji: "繩", onyomi: "じょう", kunyomi: "なわ", meaning: "rope, cord" },
  { kanji: "辮", onyomi: "べん", kunyomi: "", meaning: "braid, queue" },
  { kanji: "繖", onyomi: "さん", kunyomi: "きぬがさ", meaning: "parasol, umbrella" },
  { kanji: "綮", onyomi: "けい", kunyomi: "", meaning: "emblem on banner" },
  { kanji: "纛", onyomi: "とう、とく", kunyomi: "", meaning: "flag, banner" },
  { kanji: "纜", onyomi: "らん", kunyomi: "ともづな", meaning: "hawser, mooring rope" },
  { kanji: "縅", onyomi: "おどし", kunyomi: "", meaning: "the thread/braid (of armour)" }
];
