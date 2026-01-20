export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const N4_KANJI: KanjiData[] = [
  // Company/Business/Organization
  { kanji: "会", onyomi: "かい", kunyomi: "あ（う）", meaning: "meeting; meet" },
  { kanji: "社", onyomi: "しゃ", kunyomi: "やしろ", meaning: "company, firm, office, association, shrine" },
  { kanji: "業", onyomi: "ぎょう", kunyomi: "わざ", meaning: "business, vocation, arts, performance" },
  { kanji: "場", onyomi: "じょう", kunyomi: "ば", meaning: "location, place" },
  { kanji: "員", onyomi: "いん", kunyomi: "", meaning: "employee, member, number, the one in charge" },
  { kanji: "事", onyomi: "じ", kunyomi: "こと", meaning: "matter, thing, fact, business, reason, possibly" },
  { kanji: "仕", onyomi: "し", kunyomi: "", meaning: "attend, doing, official, serve" },
  { kanji: "用", onyomi: "よう", kunyomi: "もち（いる）", meaning: "utilize, business, service, use, employ" },

  // Self/Identity/Essence
  { kanji: "自", onyomi: "じ、し", kunyomi: "みずか（ら）", meaning: "oneself" },
  { kanji: "身", onyomi: "しん", kunyomi: "", meaning: "body" },
  { kanji: "体", onyomi: "たい", kunyomi: "からだ", meaning: "body, substance, object, reality" },
  { kanji: "心", onyomi: "しん", kunyomi: "こころ", meaning: "heart, mind, spirit" },

  // People/Relationships/Family
  { kanji: "者", onyomi: "しゃ", kunyomi: "もの", meaning: "someone, person" },
  { kanji: "兄", onyomi: "きょう、けい", kunyomi: "あに", meaning: "elder brother" },
  { kanji: "弟", onyomi: "てい、だい、で", kunyomi: "おとうと", meaning: "younger brother" },
  { kanji: "姉", onyomi: "し", kunyomi: "あね", meaning: "elder sister" },
  { kanji: "妹", onyomi: "まい", kunyomi: "いもうと", meaning: "younger sister" },
  { kanji: "親", onyomi: "しん", kunyomi: "おや、した（しい）", meaning: "parent, intimacy, relative, familiarity" },
  { kanji: "族", onyomi: "ぞく", kunyomi: "", meaning: "tribe, family" },

  // Time-Related
  { kanji: "朝", onyomi: "ちょう", kunyomi: "あさ", meaning: "morning" },
  { kanji: "夜", onyomi: "や", kunyomi: "よ、よる", meaning: "night, evening" },
  { kanji: "昼", onyomi: "ちゅう", kunyomi: "ひる", meaning: "daytime, noon" },
  { kanji: "夕", onyomi: "せき", kunyomi: "ゆう", meaning: "evening" },
  { kanji: "春", onyomi: "しゅん", kunyomi: "はる", meaning: "spring" },
  { kanji: "夏", onyomi: "か、げ", kunyomi: "なつ", meaning: "summer" },
  { kanji: "秋", onyomi: "しゅう", kunyomi: "あき", meaning: "autumn, fall" },
  { kanji: "冬", onyomi: "とう", kunyomi: "ふゆ", meaning: "winter" },
  { kanji: "曜", onyomi: "よう", kunyomi: "", meaning: "weekday" },
  { kanji: "週", onyomi: "しゅう", kunyomi: "", meaning: "week" },

  // Quantity/Numbers
  { kanji: "多", onyomi: "た", kunyomi: "おお（い）", meaning: "many, frequent, much" },
  { kanji: "少", onyomi: "しょう", kunyomi: "すく（ない）、すこ（し）", meaning: "few, little" },
  { kanji: "度", onyomi: "ど、たく", kunyomi: "たび、た（い）", meaning: "degrees, occurrence, time, counter for occurrences" },

  // Descriptive/Qualities
  { kanji: "新", onyomi: "しん", kunyomi: "あたら（しい）、あら（た）", meaning: "new" },
  { kanji: "古", onyomi: "こ", kunyomi: "ふる（い）", meaning: "old" },
  { kanji: "明", onyomi: "めい、みょう", kunyomi: "あか（るい）", meaning: "bright, light" },
  { kanji: "暗", onyomi: "あん", kunyomi: "くら（い）", meaning: "dark, gloomy" },
  { kanji: "強", onyomi: "きょう、ごう", kunyomi: "つよ（い）", meaning: "strong" },
  { kanji: "弱", onyomi: "じゃく", kunyomi: "よわ（い）", meaning: "weak" },
  { kanji: "広", onyomi: "こう", kunyomi: "ひろ（い）", meaning: "wide, broad, spacious" },
  { kanji: "正", onyomi: "せい、しょう", kunyomi: "ただ（しい）、まさ（に）", meaning: "correct, justice, righteous" },
  { kanji: "悪", onyomi: "あく", kunyomi: "わる（い）", meaning: "bad, evil, wrong" },
  { kanji: "安", onyomi: "あん", kunyomi: "やす（い）", meaning: "safe, peaceful, cheap" },
  { kanji: "重", onyomi: "じゅう、ちょう", kunyomi: "おも（い）、かさ（ねる）", meaning: "heavy, important, esteem, respect" },
  { kanji: "特", onyomi: "とく", kunyomi: "", meaning: "special" },

  // Colors
  { kanji: "白", onyomi: "はく、びゃく", kunyomi: "しろ（い）", meaning: "white" },
  { kanji: "黒", onyomi: "こく", kunyomi: "くろ", meaning: "black" },
  { kanji: "赤", onyomi: "せき、しゃく", kunyomi: "あか（い）", meaning: "red" },
  { kanji: "青", onyomi: "せい、しょう", kunyomi: "あお（い）", meaning: "blue" },
  { kanji: "色", onyomi: "しょく、しき", kunyomi: "いろ", meaning: "color" },

  // Body Parts
  { kanji: "手", onyomi: "しゅ", kunyomi: "て", meaning: "hand" },
  { kanji: "足", onyomi: "そく", kunyomi: "あし、た（りる）", meaning: "leg, foot, be sufficient" },
  { kanji: "目", onyomi: "もく、ぼく", kunyomi: "め", meaning: "eye, class, look, insight, experience" },
  { kanji: "口", onyomi: "こう", kunyomi: "くち", meaning: "mouth" },

  // Motion/Action Verbs
  { kanji: "動", onyomi: "どう", kunyomi: "うご（く）", meaning: "move, motion, change" },
  { kanji: "行", onyomi: "こう、ぎょう", kunyomi: "い（く）、ゆ（く）、おこな（う）", meaning: "going, journey, carry out, line, row" },
  { kanji: "走", onyomi: "そう", kunyomi: "はし（る）", meaning: "Run" },
  { kanji: "歩", onyomi: "ほ、ぶ", kunyomi: "ある（く）、あゆ（む）", meaning: "walk, counter for steps" },
  { kanji: "立", onyomi: "りつ", kunyomi: "た（つ）", meaning: "stand up, rise" },
  { kanji: "起", onyomi: "き", kunyomi: "お（きる）、おこ（す）", meaning: "wake up, get up; rouse" },
  { kanji: "転", onyomi: "てん", kunyomi: "ころ（がる）", meaning: "revolve, turn around, change" },
  { kanji: "止", onyomi: "し", kunyomi: "と（まる）、とど（まる）、や（める）、よ（す）", meaning: "stop, halt" },
  { kanji: "送", onyomi: "そう", kunyomi: "おく（る）", meaning: "escort, send" },

  // Intellectual/Mental Verbs
  { kanji: "思", onyomi: "し", kunyomi: "おも（う）", meaning: "think" },
  { kanji: "考", onyomi: "こう", kunyomi: "かんが（える）", meaning: "consider, think over" },
  { kanji: "知", onyomi: "ち", kunyomi: "し（る）", meaning: "know, wisdom" },
  { kanji: "見", onyomi: "けん", kunyomi: "み（る）、み（せる）", meaning: "see, hopes, chances, idea, opinion, visible" },
  { kanji: "聞", onyomi: "ぶん、もん", kunyomi: "き（く）", meaning: "to hear; to listen; to ask" },
  { kanji: "言", onyomi: "げん、ごん", kunyomi: "い（う）、こと", meaning: "say, word" },
  { kanji: "話", onyomi: "わ", kunyomi: "はな（す）、はなし", meaning: "tale, talk" },
  { kanji: "問", onyomi: "もん", kunyomi: "と（う）", meaning: "question, ask, problem" },

  // Learning/Study/Academic Verbs
  { kanji: "学", onyomi: "がく", kunyomi: "まな（ぶ）", meaning: "study, learning, science" },
  { kanji: "習", onyomi: "しゅう", kunyomi: "なら（う）", meaning: "learn" },
  { kanji: "教", onyomi: "きょう", kunyomi: "おし（える）、おそ（わる）", meaning: "teach, faith, doctrine" },
  { kanji: "研", onyomi: "けん", kunyomi: "と（ぐ）", meaning: "polish, study of, sharpen" },
  { kanji: "究", onyomi: "きゅう", kunyomi: "", meaning: "research, study" },
  { kanji: "勉", onyomi: "べん", kunyomi: "つと（める）", meaning: "exertion, endeavor, effort" },

  // Writing/Reading/Literary Verbs
  { kanji: "読", onyomi: "どく、とく、とう", kunyomi: "よ（む）", meaning: "to read" },
  { kanji: "書", onyomi: "しょ", kunyomi: "かく", meaning: "write" },
  { kanji: "字", onyomi: "じ", kunyomi: "", meaning: "character, letter, word" },
  { kanji: "文", onyomi: "ぶん、もん", kunyomi: "ふみ", meaning: "sentence, literature, style, art" },

  // Creation/Making Verbs
  { kanji: "作", onyomi: "さく、さ", kunyomi: "つく（る）", meaning: "make, production, prepare, build" },
  { kanji: "開", onyomi: "かい", kunyomi: "ひら（く）、あ（ける）", meaning: "open, unfold, unseal" },
  { kanji: "建", onyomi: "けん、こん", kunyomi: "た（てる）", meaning: "build" },

  // Eating/Drinking Verbs
  { kanji: "食", onyomi: "しょく、じき", kunyomi: "く（う）、た（べる）", meaning: "eat, food" },
  { kanji: "飲", onyomi: "いん", kunyomi: "の（む）", meaning: "drink" },

  // Wearing/Clothing Verbs
  { kanji: "着", onyomi: "ちゃく", kunyomi: "き（る）、つ（く）", meaning: "arrive, wear, counter for suits of clothing" },

  // Commerce/Buying/Selling Verbs
  { kanji: "売", onyomi: "ばい", kunyomi: "う（る）", meaning: "Sell" },
  { kanji: "買", onyomi: "ばい", kunyomi: "か（う）", meaning: "buy" },
  { kanji: "貸", onyomi: "たい", kunyomi: "か（す）、かし", meaning: "lend" },
  { kanji: "借", onyomi: "しゃく", kunyomi: "か（りる）", meaning: "borrow, rent" },

  // Other Verbs
  { kanji: "注", onyomi: "ちゅう", kunyomi: "そそ（ぐ）、さ（す）、つ（ぐ）", meaning: "pour, irrigate, shed (tears), flow into, concentrate on" },
  { kanji: "帰", onyomi: "き", kunyomi: "かえ（る）、かえ（す）", meaning: "homecoming, arrive at, lead to, result in" },
  { kanji: "待", onyomi: "たい", kunyomi: "ま（つ）", meaning: "wait, depend on" },
  { kanji: "試", onyomi: "し", kunyomi: "こころ（みる）、ため（す）", meaning: "test, try, attempt, experiment" },

  // Transportation/Travel
  { kanji: "駅", onyomi: "えき", kunyomi: "", meaning: "station" },
  { kanji: "旅", onyomi: "りょ", kunyomi: "たび", meaning: "trip, travel" },
  { kanji: "運", onyomi: "うん", kunyomi: "はこ（ぶ）", meaning: "carry, luck, destiny, fate, transport" },

  // Buildings/Places/Locations
  { kanji: "家", onyomi: "か", kunyomi: "いえ、や、うち", meaning: "house, home, family, professional, expert" },
  { kanji: "店", onyomi: "てん", kunyomi: "みせ", meaning: "store, shop" },
  { kanji: "館", onyomi: "かん", kunyomi: "やかた", meaning: "building, mansion, large building, palace" },
  { kanji: "屋", onyomi: "おく", kunyomi: "や", meaning: "roof, house, shop, dealer, seller" },
  { kanji: "室", onyomi: "しつ", kunyomi: "むろ", meaning: "room, apartment, chamber, cellar" },
  { kanji: "堂", onyomi: "どう", kunyomi: "", meaning: "public chamber, hall" },
  { kanji: "院", onyomi: "いん", kunyomi: "", meaning: "institution, temple, mansion, school" },

  // Geographic/Location/Spatial
  { kanji: "地", onyomi: "ち、じ", kunyomi: "", meaning: "ground, earth" },
  { kanji: "方", onyomi: "ほう", kunyomi: "かた", meaning: "direction, person, alternative" },
  { kanji: "町", onyomi: "ちょう", kunyomi: "まち", meaning: "town, village, block, street" },
  { kanji: "京", onyomi: "きょう、けい、きん", kunyomi: "みやこ", meaning: "capital" },
  { kanji: "野", onyomi: "や", kunyomi: "の", meaning: "plains, field, rustic, civilian life" },
  { kanji: "道", onyomi: "どう", kunyomi: "みち", meaning: "road-way, street, district, journey, course" },
  { kanji: "世", onyomi: "せい、せ", kunyomi: "よ", meaning: "generation, world, society, public" },

  // Physical/Nature
  { kanji: "空", onyomi: "くう", kunyomi: "そら、から、あ（く）、す（く）、むな（しい）", meaning: "empty, sky, void, vacant, vacuum" },
  { kanji: "風", onyomi: "ふう、ふ", kunyomi: "かぜ、かざ-", meaning: "wind, air, style, manner" },
  { kanji: "海", onyomi: "かい", kunyomi: "うみ", meaning: "sea, ocean" },
  { kanji: "洋", onyomi: "よう", kunyomi: "", meaning: "ocean, sea, foreign, Western style" },

  // Food/Dining
  { kanji: "飯", onyomi: "はん", kunyomi: "めし", meaning: "meal, rice" },
  { kanji: "肉", onyomi: "にく", kunyomi: "", meaning: "meat" },
  { kanji: "菜", onyomi: "さい", kunyomi: "な", meaning: "vegetable, greens" },
  { kanji: "茶", onyomi: "ちゃ、さ", kunyomi: "", meaning: "tea" },
  { kanji: "魚", onyomi: "ぎょ", kunyomi: "うお、さかな", meaning: "fish" },
  { kanji: "牛", onyomi: "ぎゅう", kunyomi: "うし", meaning: "cow" },
  { kanji: "鳥", onyomi: "ちょう", kunyomi: "とり", meaning: "bird, chicken" },

  // Animals
  { kanji: "犬", onyomi: "けん", kunyomi: "いぬ", meaning: "dog" },

  // Clothing
  { kanji: "服", onyomi: "ふく", kunyomi: "", meaning: "clothing, admit, obey" },
  { kanji: "紙", onyomi: "し", kunyomi: "かみ", meaning: "paper" },

  // Nature/Natural Things
  { kanji: "花", onyomi: "か、け", kunyomi: "はな", meaning: "flower" },

  // Entertainment/Arts
  { kanji: "楽", onyomi: "がく、らく", kunyomi: "たの（しい）", meaning: "music, comfort, ease" },
  { kanji: "歌", onyomi: "か", kunyomi: "うた、うた（う）", meaning: "song, sing" },
  { kanji: "映", onyomi: "えい", kunyomi: "うつ（る）、は（える）", meaning: "reflect, reflection, projection" },

  // Abstracts/Concepts
  { kanji: "意", onyomi: "い", kunyomi: "", meaning: "idea, mind, heart, taste, thought" },
  { kanji: "理", onyomi: "り", kunyomi: "", meaning: "logic, arrangement, reason, justice, truth" },
  { kanji: "力", onyomi: "りょく、りき", kunyomi: "ちから", meaning: "power, strength, strong, strain, bear up, exert" },
  { kanji: "気", onyomi: "き、け", kunyomi: "いき", meaning: "spirit, mind, air, atmosphere, mood" },

  // Condition/State Verbs
  { kanji: "病", onyomi: "びょう", kunyomi: "や（む）", meaning: "ill, sick" },
  { kanji: "死", onyomi: "し", kunyomi: "し（ぬ）", meaning: "death, die" },
  { kanji: "休", onyomi: "きゅう", kunyomi: "やす（む）", meaning: "rest, day off, retire, sleep" },

  // Communication/Connection
  { kanji: "通", onyomi: "つう", kunyomi: "とお（る）、かよ（う）", meaning: "traffic, pass through, avenue, commute" },
  { kanji: "語", onyomi: "ご", kunyomi: "かた（る）", meaning: "word, speech, language" },

  // Material/Items
  { kanji: "物", onyomi: "ぶつ、もつ", kunyomi: "もの", meaning: "thing, object, matter" },
  { kanji: "品", onyomi: "ひん", kunyomi: "しな", meaning: "goods, refinement, dignity, article" },
  { kanji: "料", onyomi: "りょう", kunyomi: "", meaning: "fee, materials" },

  // Work/Profession
  { kanji: "医", onyomi: "い", kunyomi: "", meaning: "doctor, medicine" },
  { kanji: "工", onyomi: "こう、く、ぐ", kunyomi: "", meaning: "craft, construction" },

  // Abstract Movement/Time
  { kanji: "始", onyomi: "し", kunyomi: "はじ（める）", meaning: "commence, begin" },
  { kanji: "終", onyomi: "しゅう", kunyomi: "お（わる）", meaning: "end, finish" },
  { kanji: "切", onyomi: "せつ、さい", kunyomi: "き（る）", meaning: "cut, cutoff, be sharp" },

  // Existence/Possession
  { kanji: "有", onyomi: "ゆう、う", kunyomi: "あ（る）", meaning: "possess, have, exist, happen" },
  { kanji: "無", onyomi: "む、ぶ", kunyomi: "な（い）", meaning: "nothingness, none, ain't, nothing, nil, not" },
  { kanji: "持", onyomi: "じ", kunyomi: "も（つ）", meaning: "hold, have" },
  { kanji: "使", onyomi: "し", kunyomi: "つか（う）", meaning: "use, order, messenger, ambassador" },

  // Negation/Opposition
  { kanji: "不", onyomi: "ふ、ぶ", kunyomi: "", meaning: "negative, non-, bad" },

  // Basics/Fundamentals
  { kanji: "元", onyomi: "げん、がん", kunyomi: "もと", meaning: "beginning, former time, origin" },
  { kanji: "代", onyomi: "だい", kunyomi: "か（わり）", meaning: "substitute, change, convert, replace, period" },
  { kanji: "同", onyomi: "どう", kunyomi: "おなじ", meaning: "same, agree, equal" },
  { kanji: "以", onyomi: "い", kunyomi: "も（って）", meaning: "by means of, because, in view of, compared with" },

  // Names/Naming
  { kanji: "名", onyomi: "めい、みょう", kunyomi: "な", meaning: "name, noted, distinguished, reputation" },

  // Education/School
  { kanji: "題", onyomi: "だい", kunyomi: "", meaning: "topic, subject" },

  // Numbers/Quantities/Measuring
  { kanji: "計", onyomi: "けい", kunyomi: "はか（る）", meaning: "plot, plan, scheme, measure" },

  // Response/Answer
  { kanji: "答", onyomi: "とう", kunyomi: "こた（える）", meaning: "solution, answer" },

  // Structure/Shape
  { kanji: "図", onyomi: "ず、と", kunyomi: "はか（る）", meaning: "map, drawing, plan, extraordinary" },
  { kanji: "画", onyomi: "が、かく", kunyomi: "かく（する）", meaning: "brush-stroke, picture" },

  // Collection/Gathering
  { kanji: "集", onyomi: "しゅう", kunyomi: "あつ（める）", meaning: "gather, meet" },

  // Separation/Division
  { kanji: "別", onyomi: "べつ", kunyomi: "わか（れる）、わ（ける）", meaning: "separate, branch off, diverge" },
  { kanji: "分", onyomi: "ぶん、ふん、ぶ", kunyomi: "わ（ける）", meaning: "part, minute of time, understand" },

  // Sound/Noise
  { kanji: "音", onyomi: "おん", kunyomi: "おと、ね", meaning: "sound, noise" },

  // Verification/Testing
  { kanji: "験", onyomi: "けん", kunyomi: "", meaning: "verification, effect, testing" },

  // Image/Photography
  { kanji: "写", onyomi: "しゃ", kunyomi: "うつる", meaning: "copy, be photographed, describe" },

  // Technology/Electricity
  { kanji: "電", onyomi: "でん", kunyomi: "", meaning: "electricity; electric powered" },

  // Wealth/Gems
  { kanji: "銀", onyomi: "ぎん", kunyomi: "", meaning: "silver" },

  // Concepts/Relations
  { kanji: "界", onyomi: "かい", kunyomi: "", meaning: "world, boundary" },
  { kanji: "質", onyomi: "しつ、しち", kunyomi: "たち、ただ（す）", meaning: "substance, quality, matter, temperament" },

  // Origin/Beginning
  { kanji: "田", onyomi: "でん", kunyomi: "た", meaning: "rice field, rice paddy" },

  // Chief/Master
  { kanji: "主", onyomi: "しゅ", kunyomi: "ぬし、おも", meaning: "lord, chief, master, main thing, principal" },

  // Nearness
  { kanji: "近", onyomi: "きん", kunyomi: "ちか（い）", meaning: "near, early, akin, tantamount" },
  { kanji: "早", onyomi: "そう、さ", kunyomi: "はや（い）", meaning: "early, fast" },

  // Speed
  { kanji: "急", onyomi: "きゅう", kunyomi: "いそ（ぐ）", meaning: "hurry, emergency, sudden, steep" },

  // Truth/Genuine
  { kanji: "真", onyomi: "しん", kunyomi: "ま、まこと", meaning: "true, reality, Buddhist sect" },

  // Intelligence/Wit
  { kanji: "英", onyomi: "えい", kunyomi: "", meaning: "England, English, hero, outstanding" },

  // Distance/Removal
  { kanji: "去", onyomi: "きょ、こ", kunyomi: "さ（る）", meaning: "gone, past, quit, leave, elapse, eliminate" },

  // Private/Personal
  { kanji: "私", onyomi: "し", kunyomi: "わたくし、わたし", meaning: "private, I, me" },

  // Public/Official
  { kanji: "公", onyomi: "こう", kunyomi: "", meaning: "public, prince, official, governmental" },

  // Flavor
  { kanji: "味", onyomi: "み", kunyomi: "あじ", meaning: "flavor, taste" },

  // Remaining/Last
  { kanji: "台", onyomi: "だい、たい", kunyomi: "うてな", meaning: "pedestal, a stand, counter for machines and vehicles" },

  // China
  { kanji: "漢", onyomi: "かん", kunyomi: "", meaning: "China" },

  // Blade
  { kanji: "刃", onyomi: "じん、にん", kunyomi: "は、やいば", meaning: "blade, sword, edge" },

  // Frequency/Recurrence
  { kanji: "毎", onyomi: "まい", kunyomi: "ごと（に）", meaning: "every" }
];
