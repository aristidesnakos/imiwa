export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const N3_KANJI: KanjiData[] = [
  // Politics/Government/Administration
  { kanji: "政", onyomi: "せい", kunyomi: "まつりごと", meaning: "politics, government" },
  { kanji: "議", onyomi: "ぎ", kunyomi: "", meaning: "deliberation, consultation, debate" },
  { kanji: "民", onyomi: "みん", kunyomi: "たみ", meaning: "people, nation, subjects" },
  { kanji: "官", onyomi: "かん", kunyomi: "", meaning: "bureaucrat, the government, organ" },
  { kanji: "法", onyomi: "ほう", kunyomi: "のり", meaning: "method, law, rule, principle, model, system" },
  { kanji: "制", onyomi: "せい", kunyomi: "", meaning: "system, law, rule" },
  { kanji: "治", onyomi: "じ、ち", kunyomi: "おさ（める）、なお（る）", meaning: "reign, cure, heal" },
  { kanji: "権", onyomi: "けん", kunyomi: "", meaning: "authority, power, rights" },

  // People/Relationships/Family
  { kanji: "身", onyomi: "しん", kunyomi: "み", meaning: "somebody, person" },
  { kanji: "夫", onyomi: "ふ", kunyomi: "おっと", meaning: "husband, man" },
  { kanji: "妻", onyomi: "さい", kunyomi: "つま", meaning: "wife, spouse" },
  { kanji: "婦", onyomi: "ふ", kunyomi: "よめ", meaning: "lady, woman, wife" },
  { kanji: "娘", onyomi: "じょう", kunyomi: "むすめ、こ", meaning: "daughter, girl" },
  { kanji: "婚", onyomi: "こん", kunyomi: "", meaning: "marriage" },
  { kanji: "彼", onyomi: "ひ", kunyomi: "かれ、かの", meaning: "he, him" },
  { kanji: "君", onyomi: "くん", kunyomi: "きみ", meaning: "you, male name suffix" },
  { kanji: "祖", onyomi: "そ", kunyomi: "", meaning: "ancestor, pioneer, founder" },
  { kanji: "息", onyomi: "むす、そく", kunyomi: "いき", meaning: "breath, son, interest (on money)" },
  { kanji: "王", onyomi: "おう", kunyomi: "", meaning: "king, rule" },

  // Time/Periods/Age
  { kanji: "期", onyomi: "き、ご", kunyomi: "", meaning: "period, time, date, term" },
  { kanji: "際", onyomi: "さい", kunyomi: "きわ", meaning: "occasion, time" },
  { kanji: "昨", onyomi: "さく", kunyomi: "", meaning: "yesterday, previous" },
  { kanji: "歳", onyomi: "さい、せい", kunyomi: "とし", meaning: "age, year-end" },
  { kanji: "末", onyomi: "まつ", kunyomi: "すえ", meaning: "end, close, tip" },
  { kanji: "昔", onyomi: "せき、しゃく", kunyomi: "むかし", meaning: "once upon a time, old times" },

  // Geographic/Location/Spatial
  { kanji: "都", onyomi: "と、つ", kunyomi: "みやこ", meaning: "metropolis, capital" },
  { kanji: "市", onyomi: "し", kunyomi: "いち", meaning: "market, city, town" },
  { kanji: "港", onyomi: "こう", kunyomi: "みなと", meaning: "harbor, port" },
  { kanji: "阪", onyomi: "はん", kunyomi: "さか", meaning: "heights, slope" },
  { kanji: "内", onyomi: "ない", kunyomi: "うち", meaning: "inside, within, between, among, house, home" },
  { kanji: "所", onyomi: "しょ", kunyomi: "ところ", meaning: "place, extent" },
  { kanji: "側", onyomi: "そく", kunyomi: "がわ、そば", meaning: "side, lean, oppose" },
  { kanji: "面", onyomi: "めん", kunyomi: "おも、おもて、つら", meaning: "mask, face, features, surface" },
  { kanji: "向", onyomi: "こう", kunyomi: "む（く）、むか（い）", meaning: "facing, beyond" },
  { kanji: "横", onyomi: "おう", kunyomi: "よこ", meaning: "sideways, side" },
  { kanji: "路", onyomi: "ろ、る", kunyomi: "みち", meaning: "path, route, road" },
  { kanji: "途", onyomi: "と", kunyomi: "みち", meaning: "route, way, road" },
  { kanji: "片", onyomi: "ヘン", kunyomi: "かた", meaning: "one-sided, fragment, piece" },

  // Buildings/Places/Housing
  { kanji: "宅", onyomi: "たく", kunyomi: "", meaning: "home, house, residence" },
  { kanji: "席", onyomi: "せき", kunyomi: "むしろ", meaning: "seat" },
  { kanji: "座", onyomi: "ざ", kunyomi: "すわ（る）", meaning: "squat, seat, sit" },
  { kanji: "庭", onyomi: "てい", kunyomi: "にわ", meaning: "courtyard, garden, yard" },
  { kanji: "園", onyomi: "えん", kunyomi: "その", meaning: "park, garden, yard" },
  { kanji: "宿", onyomi: "しゅく", kunyomi: "やど", meaning: "inn, lodging" },

  // Organization/Structure
  { kanji: "部", onyomi: "ぶ", kunyomi: "", meaning: "section, bureau, dept, class, copy, part, portion" },
  { kanji: "局", onyomi: "きょく", kunyomi: "", meaning: "bureau, board, office" },
  { kanji: "科", onyomi: "か", kunyomi: "", meaning: "department, course, section" },

  // Actions/Motion Verbs
  { kanji: "連", onyomi: "れん", kunyomi: "つら（なる）、つ（れる）", meaning: "take along, lead, join, connect" },
  { kanji: "回", onyomi: "かい", kunyomi: "まわ（す）", meaning: "-times, round, revolve, counter" },
  { kanji: "進", onyomi: "しん", kunyomi: "すす（む）", meaning: "advance, proceed" },
  { kanji: "引", onyomi: "いん", kunyomi: "ひ（く）", meaning: "pull, tug, jerk" },
  { kanji: "押", onyomi: "おう", kunyomi: "お（す）", meaning: "push" },
  { kanji: "投", onyomi: "とう", kunyomi: "な（げる）", meaning: "throw, discard" },
  { kanji: "打", onyomi: "だ", kunyomi: "う（つ）、ぶ（つ）", meaning: "strike, hit, knock" },
  { kanji: "追", onyomi: "つい", kunyomi: "お（う）", meaning: "chase, drive away" },
  { kanji: "逃", onyomi: "とう", kunyomi: "に（げる）、のが（す）", meaning: "escape, flee" },
  { kanji: "遊", onyomi: "ゆう", kunyomi: "あそ（ぶ）", meaning: "play" },
  { kanji: "登", onyomi: "とう、と", kunyomi: "のぼ（る）、あ（がる）", meaning: "ascend, climb up" },
  { kanji: "降", onyomi: "こう、ご", kunyomi: "お（りる）、ふ（る）", meaning: "descend, precipitate, fall, surrender" },
  { kanji: "乗", onyomi: "じょう、しょう", kunyomi: "の（る）", meaning: "ride" },
  { kanji: "渡", onyomi: "と", kunyomi: "わた（る）", meaning: "transit, ferry, cross" },
  { kanji: "越", onyomi: "えつ", kunyomi: "こ（す）", meaning: "surpass, cross over, move to, exceed" },
  { kanji: "退", onyomi: "たい", kunyomi: "しりぞ（く）、ひ（く）、の（ける）、ど（く）", meaning: "retreat, withdraw, retire, resign, repel, expel, reject" },
  { kanji: "倒", onyomi: "とう", kunyomi: "たお（れる）", meaning: "overthrow, fall, collapse" },
  { kanji: "落", onyomi: "らく", kunyomi: "お（ちる）", meaning: "fall, drop" },
  { kanji: "浮", onyomi: "ふ", kunyomi: "う（かぶ）", meaning: "float, rise to surface" },
  { kanji: "散", onyomi: "さん", kunyomi: "ち（る）、ばら（ける）", meaning: "scatter, disperse" },
  { kanji: "飛", onyomi: "ひ", kunyomi: "と（ぶ）", meaning: "fly" },
  { kanji: "舞", onyomi: "ぶ", kunyomi: "ま（う）、まい", meaning: "dance, circle" },
  { kanji: "泳", onyomi: "えい", kunyomi: "およ（ぐ）", meaning: "swim" },
  { kanji: "探", onyomi: "たん", kunyomi: "さぐ（る）、さが（す）", meaning: "search, look for" },
  { kanji: "迷", onyomi: "めい", kunyomi: "まよ（う）", meaning: "astray, be perplexed, in doubt, lost" },
  { kanji: "居", onyomi: "きょ、こ", kunyomi: "い（る）、お（る）", meaning: "reside, to be, exist" },
  { kanji: "働", onyomi: "どう", kunyomi: "はたら（く）", meaning: "work" },
  { kanji: "勤", onyomi: "きん、ごん", kunyomi: "つと（める）", meaning: "diligence, employed, serve" },

  // Intellectual/Mental Verbs
  { kanji: "想", onyomi: "そう、そ", kunyomi: "おも（う）", meaning: "concept, think, idea" },
  { kanji: "識", onyomi: "しき", kunyomi: "し（る）", meaning: "know" },
  { kanji: "覚", onyomi: "かく", kunyomi: "おぼ（える）、さ（ます）", meaning: "memorize, learn, remember, awake" },
  { kanji: "忘", onyomi: "ぼう", kunyomi: "わす（れる）", meaning: "forget" },
  { kanji: "迎", onyomi: "げい", kunyomi: "むか（える）", meaning: "welcome, meet, greet" },

  // Communication/Expression Verbs
  { kanji: "談", onyomi: "だん", kunyomi: "", meaning: "discuss, talk" },
  { kanji: "論", onyomi: "ろん", kunyomi: "あげつら（う）", meaning: "argument, discourse" },
  { kanji: "説", onyomi: "せつ、ぜい", kunyomi: "と（く）", meaning: "opinion, theory, explanation" },
  { kanji: "告", onyomi: "こく", kunyomi: "つ（げる）", meaning: "revelation, inform" },
  { kanji: "示", onyomi: "じ、し", kunyomi: "しめ（す）", meaning: "show, indicate, display" },
  { kanji: "報", onyomi: "ほう", kunyomi: "むく（いる）", meaning: "report, news, reward" },
  { kanji: "記", onyomi: "き", kunyomi: "しる（す）", meaning: "scribe, account, narrative" },
  { kanji: "呼", onyomi: "こ", kunyomi: "よ（ぶ）", meaning: "call, invite" },
  { kanji: "招", onyomi: "しょう", kunyomi: "まね（く）", meaning: "invite, summon, engage" },
  { kanji: "声", onyomi: "せい、しょう", kunyomi: "こえ", meaning: "voice" },
  { kanji: "笑", onyomi: "しょう", kunyomi: "わら（う）、え（む）", meaning: "laugh" },

  // Decision/Selection/Judgment Verbs
  { kanji: "選", onyomi: "せん", kunyomi: "えら（ぶ）", meaning: "elect, select, choose, prefer" },
  { kanji: "決", onyomi: "けつ", kunyomi: "き（める）", meaning: "decide, fix, agree upon, appoint" },
  { kanji: "定", onyomi: "てい、じょう", kunyomi: "さだ（める）", meaning: "determine, fix, establish, decide" },
  { kanji: "判", onyomi: "はん", kunyomi: "", meaning: "judgement, signature" },
  { kanji: "認", onyomi: "にん", kunyomi: "みと（める）、したた（める）", meaning: "acknowledge, witness, recognize" },
  { kanji: "察", onyomi: "さつ", kunyomi: "", meaning: "guess, presume, judge" },
  { kanji: "確", onyomi: "かく", kunyomi: "たし（か）", meaning: "assurance, firm, confirm" },

  // Change/Transformation Verbs
  { kanji: "化", onyomi: "か、け", kunyomi: "ば（ける）、ふ（ける）", meaning: "change, take the form of, influence, -ization" },
  { kanji: "変", onyomi: "へん", kunyomi: "か（わる）", meaning: "unusual, change, strange" },
  { kanji: "成", onyomi: "せい、じょう", kunyomi: "な（る）", meaning: "turn into, become, get, grow, elapse" },
  { kanji: "更", onyomi: "こう", kunyomi: "さら（に）、ふ（ける）", meaning: "renew, renovate, again" },
  { kanji: "曲", onyomi: "きょく", kunyomi: "ま（がる）", meaning: "bend, music, melody" },
  { kanji: "折", onyomi: "せつ、しゃく", kunyomi: "お（る）、おり", meaning: "fold, break, fracture" },

  // Transaction/Interaction Verbs
  { kanji: "取", onyomi: "しゅ", kunyomi: "と（る）", meaning: "take, fetch" },
  { kanji: "与", onyomi: "よ", kunyomi: "あた（える）、あずか（る）", meaning: "give, award" },
  { kanji: "受", onyomi: "じゅ", kunyomi: "う（ける）", meaning: "accept, undergo, answer (phone), take" },
  { kanji: "付", onyomi: "ふ", kunyomi: "つ（ける）", meaning: "adhere, attach, refer to" },
  { kanji: "返", onyomi: "へん", kunyomi: "かえ（す）", meaning: "return, answer" },
  { kanji: "払", onyomi: "", kunyomi: "はら（う）", meaning: "pay" },
  { kanji: "貸", onyomi: "たい", kunyomi: "か（す）、かし", meaning: "lend" },
  { kanji: "借", onyomi: "しゃく", kunyomi: "か（りる）", meaning: "borrow, rent" },
  { kanji: "交", onyomi: "こう", kunyomi: "まじ（わる）、ま（ぜる）、か（わす）", meaning: "mingle, mixing, association" },

  // Production/Creation Verbs
  { kanji: "産", onyomi: "さん", kunyomi: "う（む）、む（す）", meaning: "products, bear, give birth" },
  { kanji: "企", onyomi: "き", kunyomi: "くわだ（てる）", meaning: "undertake, scheme, design, attempt, plan" },

  // Destruction/Negative Actions
  { kanji: "戦", onyomi: "せん", kunyomi: "いくさ、たたか（う）", meaning: "war, battle, match" },
  { kanji: "争", onyomi: "そう", kunyomi: "あらそ（う）", meaning: "contend, dispute, argue" },
  { kanji: "殺", onyomi: "さつ、さい", kunyomi: "ころ（す）", meaning: "kill, murder" },
  { kanji: "破", onyomi: "は", kunyomi: "やぶ（る）", meaning: "rip, tear, break" },
  { kanji: "犯", onyomi: "はん", kunyomi: "おか（す）", meaning: "crime, sin, offense" },
  { kanji: "罪", onyomi: "ざい", kunyomi: "つみ", meaning: "guilt, sin, crime" },
  { kanji: "害", onyomi: "がい", kunyomi: "", meaning: "harm, injury" },

  // Existence/Continuation/Completion Verbs
  { kanji: "在", onyomi: "ざい", kunyomi: "あ（る）", meaning: "exist, outskirts" },
  { kanji: "存", onyomi: "そん、ぞん", kunyomi: "", meaning: "exist, be aware of" },
  { kanji: "残", onyomi: "ざん", kunyomi: "のこ（る）", meaning: "remainder, balance" },
  { kanji: "続", onyomi: "ぞく", kunyomi: "つづく", meaning: "continue, series, sequel" },
  { kanji: "済", onyomi: "さい、せい", kunyomi: "す（む）", meaning: "settle, relieve, finish" },
  { kanji: "完", onyomi: "かん", kunyomi: "", meaning: "perfect, completion" },
  { kanji: "果", onyomi: "か", kunyomi: "は（たす）", meaning: "fruit, reward, carry out, achieve, complete" },
  { kanji: "達", onyomi: "たつ、だ", kunyomi: "-たち", meaning: "accomplished, reach, arrive, attain" },
  { kanji: "到", onyomi: "とう", kunyomi: "いた（る）", meaning: "arrival, proceed, reach" },

  // Separation/Division/Removal Verbs
  { kanji: "断", onyomi: "だん", kunyomi: "た（つ）、ことわ（る）", meaning: "severance, decline, refuse, apologize" },
  { kanji: "割", onyomi: "かつ", kunyomi: "わ（る）、わり", meaning: "proportion, divide, cut, separate" },
  { kanji: "除", onyomi: "じょ、じ", kunyomi: "のぞ（く）", meaning: "exclude, remove" },
  { kanji: "刻", onyomi: "こく", kunyomi: "きざ（む）", meaning: "engrave, cut fine, chop" },
  { kanji: "抜", onyomi: "ばつ", kunyomi: "ぬ（く）", meaning: "slip out, extract, pull out, remove" },

  // Assistance/Support Verbs
  { kanji: "助", onyomi: "じょ", kunyomi: "たす（ける）", meaning: "help, rescue, assist" },
  { kanji: "支", onyomi: "し", kunyomi: "ささ（える）", meaning: "branch, support, sustain" },
  { kanji: "努", onyomi: "ど", kunyomi: "つと（める）", meaning: "toil, diligent, as much as possible" },
  { kanji: "頼", onyomi: "らい", kunyomi: "たの（む）、たよ（る）", meaning: "trust, request" },

  // Opposition/Resistance
  { kanji: "対", onyomi: "たい、つい", kunyomi: "", meaning: "opposite, even, equal, versus, anti-, compare" },
  { kanji: "反", onyomi: "はん、ほん、たん、ほ", kunyomi: "そ（る）、かえ（す）", meaning: "anti-" },
  { kanji: "勝", onyomi: "しょう", kunyomi: "か（つ）、まさ（る）", meaning: "victory, win" },
  { kanji: "負", onyomi: "ふ", kunyomi: "ま（ける）、お（う）", meaning: "defeat, negative, minus, assume a responsibility" },
  { kanji: "敗", onyomi: "はい", kunyomi: "やぶ（れる）", meaning: "failure, defeat" },

  // Joining/Combining
  { kanji: "合", onyomi: "ごう、が、か", kunyomi: "あ（う）、あい", meaning: "fit, suit, join, 0.1" },
  { kanji: "組", onyomi: "そ", kunyomi: "く（む）、くみ", meaning: "association, assemble, unite" },
  { kanji: "参", onyomi: "さん", kunyomi: "まい（る）", meaning: "going, coming, participate" },
  { kanji: "加", onyomi: "か", kunyomi: "くわ（える）", meaning: "add, addition, increase, join" },
  { kanji: "寄", onyomi: "き", kunyomi: "よ（る）", meaning: "draw near, gather" },
  { kanji: "込", onyomi: "", kunyomi: "こ（む）", meaning: "crowded, mixture" },

  // Work/Tasks/Duties
  { kanji: "務", onyomi: "む", kunyomi: "つと（める）", meaning: "task, duties" },
  { kanji: "職", onyomi: "しょく", kunyomi: "", meaning: "post, employment, work" },
  { kanji: "役", onyomi: "やく、えき", kunyomi: "", meaning: "duty, service, role" },
  { kanji: "任", onyomi: "にん", kunyomi: "まか（せる）", meaning: "responsibility, duty" },
  { kanji: "労", onyomi: "ろう", kunyomi: "いたわ（る）、ねぎら（う）", meaning: "labor, thank for" },
  { kanji: "係", onyomi: "けい", kunyomi: "かか（る）、かかり", meaning: "person in charge, connection" },

  // Business/Commerce/Trade
  { kanji: "商", onyomi: "しょう", kunyomi: "あきな（う）", meaning: "deal; selling; merchant" },
  { kanji: "利", onyomi: "り", kunyomi: "き（く）", meaning: "profit, advantage, benefit" },
  { kanji: "財", onyomi: "ざい、さい、ぞく", kunyomi: "", meaning: "property, money, wealth, assets" },
  { kanji: "資", onyomi: "し", kunyomi: "", meaning: "assets, resources, capital, funds, data" },
  { kanji: "費", onyomi: "ひ", kunyomi: "つい（やす）", meaning: "expense, consume" },
  { kanji: "収", onyomi: "しゅう", kunyomi: "おさ（める）", meaning: "income, obtain, reap, pay, supply, store" },
  { kanji: "富", onyomi: "ふ、ふう", kunyomi: "と（む）、とみ", meaning: "wealth, enrich, abundant" },
  { kanji: "値", onyomi: "ち", kunyomi: "ね、あたい", meaning: "price, cost, value" },
  { kanji: "給", onyomi: "きゅう", kunyomi: "たま（う）、たも（う）", meaning: "salary, wage, gift" },
  { kanji: "債", onyomi: "さい", kunyomi: "", meaning: "bond, loan, debt" },

  // Quantity/Number/Measurement
  { kanji: "数", onyomi: "すう", kunyomi: "かず、かぞ（える）", meaning: "number, strength, fate, law, figures" },
  { kanji: "増", onyomi: "ぞう", kunyomi: "ま（す）、ふ（える）", meaning: "increase, add" },
  { kanji: "積", onyomi: "せき", kunyomi: "つ（む）", meaning: "volume, contents, pile up, stack" },
  { kanji: "程", onyomi: "てい", kunyomi: "ほど", meaning: "extent, degree" },
  { kanji: "幾", onyomi: "き", kunyomi: "いく（つ）", meaning: "how many, how much, some" },

  // Quality/State/Condition
  { kanji: "全", onyomi: "ぜん", kunyomi: "まった（く）、すべ（て）", meaning: "whole, entire, all, complete, fulfill" },
  { kanji: "実", onyomi: "じつ", kunyomi: "み、みの（る）、まこと", meaning: "reality, truth" },
  { kanji: "現", onyomi: "げん", kunyomi: "あらわ（れる）、うつ（つ）", meaning: "present, existing, actual" },
  { kanji: "原", onyomi: "げん", kunyomi: "はら", meaning: "original, primitive, field" },
  { kanji: "初", onyomi: "しょ", kunyomi: "はじ（め）、はつ", meaning: "first time, beginning" },
  { kanji: "最", onyomi: "さい", kunyomi: "もっと（も）", meaning: "utmost, most, extreme" },
  { kanji: "当", onyomi: "とう", kunyomi: "あ（たる）", meaning: "hit, right, appropriate" },
  { kanji: "直", onyomi: "ちょく、じき", kunyomi: "ただ（ちに）、す（ぐ）", meaning: "straightaway, honesty, frankness, fix, repair" },
  { kanji: "正", onyomi: "せい、しょう", kunyomi: "ただ（しい）、まさ（に）", meaning: "correct, justice, righteous" },
  { kanji: "良", onyomi: "りょう", kunyomi: "よ（い）、い（い）", meaning: "good" },
  { kanji: "優", onyomi: "ゆう、う", kunyomi: "やさ（しい）、すぐ（れる）", meaning: "tenderness, kind, actor" },
  { kanji: "偉", onyomi: "い", kunyomi: "えら（い）", meaning: "admirable, greatness" },
  { kanji: "美", onyomi: "び、み", kunyomi: "うつくしい", meaning: "beauty, beautiful" },
  { kanji: "難", onyomi: "なん", kunyomi: "かた（い）、むずか（しい）、にく（い）", meaning: "difficult, trouble, accident" },
  { kanji: "易", onyomi: "えき、い", kunyomi: "やさ（しい）、やす（い）", meaning: "easy, ready to, simple" },
  { kanji: "単", onyomi: "たん", kunyomi: "ひとえ", meaning: "simple, single" },
  { kanji: "常", onyomi: "じょう", kunyomi: "つね", meaning: "usual, ordinary, normal" },
  { kanji: "特", onyomi: "とく", kunyomi: "", meaning: "special" },
  { kanji: "適", onyomi: "てき", kunyomi: "かな（う）", meaning: "suitable, occasional, rare" },
  { kanji: "雑", onyomi: "ざつ、ぞう", kunyomi: "まじ（る）", meaning: "miscellaneous" },

  // Abstraction/Characteristics
  { kanji: "性", onyomi: "せい、しょう", kunyomi: "", meaning: "sex, gender, nature" },
  { kanji: "的", onyomi: "てき", kunyomi: "", meaning: "mark, target, object, adjective ending" },
  { kanji: "形", onyomi: "けい、ぎょう", kunyomi: "かた、かたち、なり", meaning: "shape, form, style" },
  { kanji: "状", onyomi: "じょう", kunyomi: "", meaning: "conditions, form, appearance" },
  { kanji: "様", onyomi: "よう", kunyomi: "さま、さん", meaning: "manner, situation, polite suffix" },

  // Necessity/Importance
  { kanji: "要", onyomi: "よう", kunyomi: "い（る）、かなめ", meaning: "need, main point, essence, pivot" },
  { kanji: "必", onyomi: "ひつ", kunyomi: "かなら（ず）", meaning: "invariably, certain, inevitable" },

  // Relation/Connection
  { kanji: "関", onyomi: "かん", kunyomi: "せき、かか（わる）", meaning: "connection, gateway, involve, concerning" },
  { kanji: "相", onyomi: "そう、しょう", kunyomi: "あい", meaning: "inter-, mutual, together, minister of state" },
  { kanji: "共", onyomi: "きょう", kunyomi: "とも", meaning: "together, both, neither" },
  { kanji: "互", onyomi: "ご", kunyomi: "たが（い）、かたみ（に）", meaning: "mutually, reciprocally, together" },
  { kanji: "兼", onyomi: "けん", kunyomi: "か（ねる）", meaning: "concurrently, and, beforehand, in advance" },

  // Degree/Extent/Limit
  { kanji: "過", onyomi: "か", kunyomi: "す（ぎる）、よぎ（る）", meaning: "overdo, exceed, go beyond" },
  { kanji: "限", onyomi: "げん", kunyomi: "かぎ（る）", meaning: "limit, restrict" },
  { kanji: "深", onyomi: "しん", kunyomi: "ふか（い）", meaning: "deep, heighten" },
  { kanji: "太", onyomi: "たい、た", kunyomi: "ふと（い）", meaning: "plump, thick, big around" },
  { kanji: "満", onyomi: "まん", kunyomi: "み（ちる）", meaning: "full, fullness, enough, satisfy" },
  { kanji: "余", onyomi: "よ", kunyomi: "あま（る）", meaning: "too much, surplus" },

  // Investigation/Research/Study
  { kanji: "調", onyomi: "ちょう", kunyomi: "しら（べる）、との（う）", meaning: "tune, tone, meter, prepare, investigate" },
  { kanji: "観", onyomi: "かん", kunyomi: "み（る）", meaning: "outlook, appearance, condition" },

  // Representation/Display
  { kanji: "表", onyomi: "ひょう", kunyomi: "おもて、あらわ（す）", meaning: "surface, table, chart, diagram" },
  { kanji: "演", onyomi: "えん", kunyomi: "", meaning: "performance, act, play, render, stage" },
  { kanji: "供", onyomi: "きょう、く、くう", kunyomi: "そな（える）、とも", meaning: "submit, offer, present, accompany" },
  { kanji: "符", onyomi: "ふ", kunyomi: "", meaning: "sign, symbol, code, mark, tally" },

  // Physical Objects/Materials
  { kanji: "石", onyomi: "せき、しゃく、こく", kunyomi: "いし", meaning: "stone" },
  { kanji: "米", onyomi: "べい、まい", kunyomi: "こめ", meaning: "rice, USA, meter" },
  { kanji: "馬", onyomi: "ば", kunyomi: "うま", meaning: "horse" },
  { kanji: "船", onyomi: "せん", kunyomi: "ふね、ふな", meaning: "ship, boat" },
  { kanji: "箱", onyomi: "そう", kunyomi: "はこ", meaning: "box, chest" },
  { kanji: "機", onyomi: "き", kunyomi: "", meaning: "machine, airplane, opportunity" },

  // Nature/Natural Phenomena
  { kanji: "景", onyomi: "けい", kunyomi: "", meaning: "scenery, view" },
  { kanji: "光", onyomi: "こう", kunyomi: "ひか（る）、ひかり", meaning: "ray, light" },
  { kanji: "陽", onyomi: "よう", kunyomi: "ひ", meaning: "sunshine, positive" },
  { kanji: "雪", onyomi: "せつ", kunyomi: "ゆき", meaning: "snow" },
  { kanji: "候", onyomi: "こう", kunyomi: "", meaning: "climate, season, weather" },
  { kanji: "煙", onyomi: "えん", kunyomi: "けむ（る）、けむり", meaning: "smoke" },
  { kanji: "流", onyomi: "りゅう、る", kunyomi: "なが（れる）", meaning: "current, flow" },
  { kanji: "球", onyomi: "きゅう", kunyomi: "たま", meaning: "ball, sphere" },

  // Plants
  { kanji: "葉", onyomi: "こう", kunyomi: "は", meaning: "leaf, plane, needle, blade, counter for flat things" },
  { kanji: "草", onyomi: "そう", kunyomi: "くさ", meaning: "grass, weeds, herbs" },

  // Body Parts
  { kanji: "首", onyomi: "しゅ", kunyomi: "くび", meaning: "neck" },
  { kanji: "頭", onyomi: "とう、ず、と", kunyomi: "あたま、かしら", meaning: "head" },
  { kanji: "顔", onyomi: "がん", kunyomi: "かお", meaning: "face, expression" },
  { kanji: "背", onyomi: "はい", kunyomi: "せ、せい", meaning: "stature, height, back" },
  { kanji: "腹", onyomi: "ふく", kunyomi: "はら", meaning: "abdomen, belly, stomach" },
  { kanji: "歯", onyomi: "し", kunyomi: "は", meaning: "tooth, cog" },
  { kanji: "髪", onyomi: "はつ", kunyomi: "かみ", meaning: "hair (on the head)" },
  { kanji: "耳", onyomi: "じ", kunyomi: "みみ", meaning: "ear" },

  // Position/Rank/Status
  { kanji: "将", onyomi: "しょう", kunyomi: "まさ（に）", meaning: "leader, commander, general, about to" },
  { kanji: "位", onyomi: "い", kunyomi: "くらい、ぐらい", meaning: "rank, grade, about" },
  { kanji: "格", onyomi: "かく、こう、きゃく", kunyomi: "", meaning: "status, rank, capacity" },
  { kanji: "段", onyomi: "だん", kunyomi: "", meaning: "grade, steps, stairs" },

  // Tools/Equipment/Facilities
  { kanji: "具", onyomi: "ぐ", kunyomi: "そな（える）、つばさ（に）", meaning: "tool, utensil" },
  { kanji: "術", onyomi: "じゅつ", kunyomi: "すべ", meaning: "art, technique, skill, means, trick" },
  { kanji: "備", onyomi: "び", kunyomi: "そな（える）", meaning: "equip, provision, preparation" },
  { kanji: "規", onyomi: "き", kunyomi: "", meaning: "standard, measure" },
  { kanji: "便", onyomi: "べん、びん", kunyomi: "たよ（り）", meaning: "convenience, facility" },

  // Emotions/Feelings
  { kanji: "感", onyomi: "かん", kunyomi: "", meaning: "emotion, feeling, sensation" },
  { kanji: "情", onyomi: "じょう、せい", kunyomi: "なさ（け）", meaning: "feelings, emotion, passion" },
  { kanji: "愛", onyomi: "あい", kunyomi: "いと（しい）、まな", meaning: "love, affection" },
  { kanji: "喜", onyomi: "き", kunyomi: "よろこ（ぶ）", meaning: "rejoice, take pleasure in" },
  { kanji: "幸", onyomi: "こう", kunyomi: "さいわ（い）、さら、しあわ（せ）", meaning: "happiness, blessing, fortune" },
  { kanji: "望", onyomi: "ぼう", kunyomi: "のぞ（む）、もち", meaning: "ambition, full moon, hope, desire, aspire to, expect" },
  { kanji: "欲", onyomi: "よく", kunyomi: "ほ（しい）", meaning: "longing, greed, passion" },
  { kanji: "願", onyomi: "がん", kunyomi: "ねが（う）", meaning: "petition, request, wish" },
  { kanji: "好", onyomi: "こう", kunyomi: "この（む）、す（く）", meaning: "fond, pleasing, like something" },
  { kanji: "悲", onyomi: "ひ", kunyomi: "かな（しい）", meaning: "grieve, sad" },
  { kanji: "怒", onyomi: "ど", kunyomi: "いか（る）、おこ（る）", meaning: "angry, be offended" },
  { kanji: "恐", onyomi: "きょう", kunyomi: "おそ（れる）、こわ（い）", meaning: "fear, dread" },
  { kanji: "怖", onyomi: "ふ", kunyomi: "こわ（い）、お（じる）", meaning: "dreadful, fearful" },
  { kanji: "恥", onyomi: "ち", kunyomi: "はじ、は（ずかしい）", meaning: "shame, dishonor" },
  { kanji: "苦", onyomi: "く", kunyomi: "くる（しい）、にが（い）", meaning: "suffering, bitter" },
  { kanji: "困", onyomi: "こん", kunyomi: "こま（る）", meaning: "quandary, become distressed" },
  { kanji: "痛", onyomi: "つう", kunyomi: "いた（い）", meaning: "pain, hurt, damage, bruise" },

  // Mental States/Attitudes
  { kanji: "疑", onyomi: "ぎ", kunyomi: "うたが（う）", meaning: "doubt, distrust" },
  { kanji: "信", onyomi: "しん", kunyomi: "", meaning: "faith, truth, trust" },
  { kanji: "賛", onyomi: "さん", kunyomi: "", meaning: "approve, praise" },
  { kanji: "夢", onyomi: "む", kunyomi: "ゆめ", meaning: "dream, vision" },

  // Ability/Capacity/Skill
  { kanji: "能", onyomi: "のう", kunyomi: "", meaning: "ability, talent, skill, capacity" },
  { kanji: "才", onyomi: "さい", kunyomi: "", meaning: "genius, years old" },
  { kanji: "芸", onyomi: "げい", kunyomi: "", meaning: "art, performance, skill" },
  { kanji: "練", onyomi: "れん", kunyomi: "ね（る）", meaning: "practice, drill, exercise, train" },

  // Acquisition/Loss
  { kanji: "得", onyomi: "とく", kunyomi: "え（る）", meaning: "gain, get, find, earn, acquire, able to, profit" },
  { kanji: "失", onyomi: "しつ", kunyomi: "うしな（う）、う（せる）", meaning: "lose, error, fault, disadvantage, loss" },
  { kanji: "求", onyomi: "きゅう", kunyomi: "もと（める）", meaning: "request, want, demand" },

  // Understanding/Solving
  { kanji: "解", onyomi: "かい、げ", kunyomi: "と（く）、ほど（く）", meaning: "unravel, explanation" },

  // Specification/Indication
  { kanji: "指", onyomi: "し", kunyomi: "ゆび、さ（す）", meaning: "finger, point to, indicate" },
  { kanji: "点", onyomi: "てん", kunyomi: "つ（ける）", meaning: "spot, point, mark" },

  // Arrangement/Organization
  { kanji: "置", onyomi: "ち", kunyomi: "お（く）", meaning: "placement, put, set, deposit, leave behind" },
  { kanji: "構", onyomi: "こう", kunyomi: "かま（う）", meaning: "posture, build, pretend" },
  { kanji: "列", onyomi: "れつ、れ", kunyomi: "", meaning: "file, row, column" },
  { kanji: "束", onyomi: "そく", kunyomi: "たば、つか", meaning: "bundle, manage" },

  // Categories/Types/Classification
  { kanji: "種", onyomi: "しゅ", kunyomi: "たね、-ぐさ", meaning: "species, kind, class, seed" },
  { kanji: "類", onyomi: "るい", kunyomi: "たぐ（い）", meaning: "sort, kind, variety, class, genus" },
  { kanji: "他", onyomi: "た", kunyomi: "ほか", meaning: "other, another" },
  { kanji: "等", onyomi: "とう", kunyomi: "ひと（しい）、など", meaning: "etc., and so forth" },
  { kanji: "彙", onyomi: "イ", kunyomi: "はりねずみ", meaning: "same kind, collect, classify, category, hedgehog" },

  // Similarity/Difference
  { kanji: "似", onyomi: "じ、ね", kunyomi: "に（る）", meaning: "becoming, resemble, imitate" },
  { kanji: "違", onyomi: "い", kunyomi: "ちが（う）、たが（う）", meaning: "difference, differ" },
  { kanji: "差", onyomi: "さ", kunyomi: "さ（す）", meaning: "distinction, difference, variation" },
  { kanji: "両", onyomi: "りょう", kunyomi: "ふたつ", meaning: "both" },

  // Formality/Ceremony/Style
  { kanji: "式", onyomi: "しき", kunyomi: "", meaning: "style, ceremony" },
  { kanji: "礼", onyomi: "れい、らい", kunyomi: "", meaning: "salute, bow, ceremony, thanks" },

  // Speed/Timing
  { kanji: "速", onyomi: "そく", kunyomi: "はや（い）", meaning: "quick, fast" },
  { kanji: "遅", onyomi: "ち", kunyomi: "おく（れる）、おそ（い）", meaning: "slow, late, back, later" },
  { kanji: "急", onyomi: "きゅう", kunyomi: "いそ（ぐ）", meaning: "hurry, emergency, sudden, steep" },

  // Life/Living/Death
  { kanji: "活", onyomi: "かつ", kunyomi: "い（きる）", meaning: "living" },
  { kanji: "命", onyomi: "めい、みょう", kunyomi: "いのち", meaning: "fate, command" },
  { kanji: "暮", onyomi: "ぼ", kunyomi: "く（らす）", meaning: "evening, livelihood" },
  { kanji: "亡", onyomi: "ぼう、もう", kunyomi: "な（くなる）", meaning: "deceased, dying" },

  // Physical States/Actions
  { kanji: "寝", onyomi: "しん", kunyomi: "ね（る）", meaning: "lie down, sleep, rest" },
  { kanji: "眠", onyomi: "みん", kunyomi: "ねむ（る）", meaning: "sleep" },
  { kanji: "抱", onyomi: "ほう", kunyomi: "だ（く）、いだ（く）、かか（える）", meaning: "embrace, hug" },
  { kanji: "掛", onyomi: "けい", kunyomi: "か（かる）", meaning: "hang, suspend" },
  { kanji: "閉", onyomi: "へい", kunyomi: "と（じる）、し（める）", meaning: "closed, shut" },

  // Care/Maintenance/Protection
  { kanji: "育", onyomi: "いく", kunyomi: "そだ（つ）、はぐく（む）", meaning: "bring up, grow up, raise" },
  { kanji: "守", onyomi: "しゅ、す", kunyomi: "まも（る）、もり", meaning: "guard, protect, obey" },
  { kanji: "配", onyomi: "はい", kunyomi: "くば（る）", meaning: "distribute, spouse" },
  { kanji: "警", onyomi: "けい", kunyomi: "", meaning: "admonish, commandment" },
  { kanji: "捕", onyomi: "ほ", kunyomi: "と（らえる）、つか（まえる）", meaning: "catch, capture" },

  // Consumption/Use
  { kanji: "消", onyomi: "しょう", kunyomi: "き（える）、け（す）", meaning: "extinguish, turn off" },
  { kanji: "吸", onyomi: "きゅう", kunyomi: "す（う）", meaning: "suck, inhale" },
  { kanji: "吹", onyomi: "すい", kunyomi: "ふ（く）", meaning: "blow, breathe, puff" },

  // Temperature/Physical Sensations
  { kanji: "熱", onyomi: "ねつ", kunyomi: "あつ（い）", meaning: "heat, fever, passion" },
  { kanji: "冷", onyomi: "れい", kunyomi: "つめ（たい）、ひ（える）、さ（める）", meaning: "cool, cold, chill" },
  { kanji: "寒", onyomi: "かん", kunyomi: "さむ（い）", meaning: "cold" },
  { kanji: "暗", onyomi: "あん", kunyomi: "くら（い）", meaning: "darkness, disappear, shade, informal" },
  { kanji: "晴", onyomi: "せい", kunyomi: "は（れる）", meaning: "clear up" },

  // Peace/Harmony/Blessing
  { kanji: "和", onyomi: "わ、お", kunyomi: "やわ（らぐ）、なご（む）", meaning: "harmony, Japanese style, peace" },
  { kanji: "平", onyomi: "へい、びょう", kunyomi: "たい（ら）、ひら", meaning: "even, flat, peace" },
  { kanji: "福", onyomi: "ふく", kunyomi: "", meaning: "blessing, fortune, luck, wealth" },
  { kanji: "静", onyomi: "せい、じょう", kunyomi: "しず（か）", meaning: "quiet" },

  // Danger/Risk/Safety
  { kanji: "危", onyomi: "き", kunyomi: "あぶ（ない）、あや（うい）", meaning: "dangerous, fear, uneasy" },
  { kanji: "険", onyomi: "けん", kunyomi: "けわ（しい）", meaning: "precipitous, inaccessible place" },
  { kanji: "冒", onyomi: "ぼう", kunyomi: "おか（す）", meaning: "risk, face, defy, dare, damage, assume (a name)" },

  // Truth/Reality/Accuracy
  { kanji: "真", onyomi: "しん", kunyomi: "ま、まこと", meaning: "true, reality, Buddhist sect" },

  // Medicine/Health/Body Care
  { kanji: "薬", onyomi: "やく", kunyomi: "くすり", meaning: "medicine, chemical" },
  { kanji: "疲", onyomi: "ひ", kunyomi: "つか（れる）", meaning: "exhausted, tire" },
  { kanji: "洗", onyomi: "せん", kunyomi: "あら（う）", meaning: "wash" },

  // Teaching/Guidance/Expertise
  { kanji: "師", onyomi: "し", kunyomi: "いくさ", meaning: "expert, teacher, master" },

  // Action/Conduct/Behavior
  { kanji: "伝", onyomi: "でん", kunyomi: "つた（わる）", meaning: "transmit, follow, report, legend, tradition" },
  { kanji: "訪", onyomi: "ほう", kunyomi: "とおず（れる）、たず（ねる）", meaning: "call, visit" },
  { kanji: "留", onyomi: "りゅう、る", kunyomi: "と（まる）、とど（める）", meaning: "detain, fasten, halt, stop" },
  { kanji: "戻", onyomi: "れい", kunyomi: "もど（る）", meaning: "re-, return, revert" },
  { kanji: "徒", onyomi: "と", kunyomi: "", meaning: "on foot, junior" },

  // Permission/Approval/Refusal
  { kanji: "許", onyomi: "きょ", kunyomi: "ゆる（す）", meaning: "permit, approve" },
  { kanji: "否", onyomi: "ひ", kunyomi: "いな、いや", meaning: "negate, no, decline" },
  { kanji: "辞", onyomi: "じ", kunyomi: "や（める）", meaning: "resign, word, term" },
  { kanji: "責", onyomi: "せき", kunyomi: "せ（める）", meaning: "blame, condemn" },

  // Advancement/Progress/Achievement
  { kanji: "精", onyomi: "せい、しょう", kunyomi: "しら（げる）", meaning: "refined, ghost, fairy, energy" },
  { kanji: "促", onyomi: "そく", kunyomi: "うなが（す）", meaning: "stimulate, urge, press, demand, incite" },

  // Negation/Absence/Emptiness
  { kanji: "非", onyomi: "ひ", kunyomi: "あら（ず）", meaning: "un-, mistake, negative" },
  { kanji: "未", onyomi: "み、び", kunyomi: "いま（だ）、ま（だ）", meaning: "un-, not yet" },
  { kanji: "欠", onyomi: "けつ、けん", kunyomi: "か（ける）", meaning: "lack, gap" },

  // Extreme/Absolute
  { kanji: "絶", onyomi: "ぜつ", kunyomi: "た（える）", meaning: "discontinue, unparalleled" },
  { kanji: "突", onyomi: "とつ、か", kunyomi: "つ（く）", meaning: "stab, protruding, thrust" },

  // People/Personnel/Customers
  { kanji: "客", onyomi: "きゃく、かく", kunyomi: "", meaning: "guest, visitor, customer" },
  { kanji: "誰", onyomi: "すい", kunyomi: "だれ", meaning: "who, someone, somebody" },
  { kanji: "皆", onyomi: "", kunyomi: "みな、みんな", meaning: "all, everyone, everybody" },

  // Cause/Reason/Origin
  { kanji: "因", onyomi: "いん", kunyomi: "よ（る）、ちな（む）", meaning: "cause, factor, depend on" },
  { kanji: "由", onyomi: "ゆ、ゆう", kunyomi: "よし、よ（る）", meaning: "wherefore, a reason" },

  // Processing/Handling/Management
  { kanji: "処", onyomi: "しょ", kunyomi: "", meaning: "dispose, manage, deal with" },

  // Time/Sequence
  { kanji: "次", onyomi: "じ、し", kunyomi: "つ（ぐ）、つぎ", meaning: "next, order" },
  { kanji: "予", onyomi: "よ、しゃ", kunyomi: "あらかじ（め）", meaning: "beforehand, previous, myself, I" },

  // Age/Youth/Elderly
  { kanji: "若", onyomi: "じゃく", kunyomi: "わか（い）、も（し）", meaning: "young" },
  { kanji: "老", onyomi: "ろう", kunyomi: "お（いる）、ふ（ける）", meaning: "old" },
  { kanji: "齢", onyomi: "れい", kunyomi: "よわい", meaning: "age, years" },

  // Economic/Financial
  { kanji: "貧", onyomi: "ひん、びん", kunyomi: "まず（しい）", meaning: "poverty, poor" },

  // Daily Items/Objects
  { kanji: "靴", onyomi: "か", kunyomi: "くつ", meaning: "shoes" },
  { kanji: "杯", onyomi: "はい", kunyomi: "さかずき", meaning: "glass, cup" },
  { kanji: "窓", onyomi: "そう", kunyomi: "まど", meaning: "window, pane" },
  { kanji: "酒", onyomi: "しゅ", kunyomi: "さけ", meaning: "sake, alcohol" },

  // Miscellaneous/Example/Pattern
  { kanji: "例", onyomi: "れい", kunyomi: "たと（えば）", meaning: "example" },
  { kanji: "然", onyomi: "ぜん、ねん", kunyomi: "しか、さ", meaning: "sort of thing, if so" },
  { kanji: "容", onyomi: "よう", kunyomi: "い（れる）", meaning: "contain, form" },

  // Number/Counting
  { kanji: "番", onyomi: "ばん", kunyomi: "つがい", meaning: "turn, number in a series" },
  { kanji: "号", onyomi: "ごう", kunyomi: "", meaning: "number, item" },

  // Matters/Affairs/Cases
  { kanji: "件", onyomi: "けん", kunyomi: "くだん", meaning: "affair, case, matter" },

  // Receiving/Obtaining
  { kanji: "頂", onyomi: "ちょう", kunyomi: "いただ（く）", meaning: "receive, top, summit, peak" },

  // Animals
  { kanji: "猫", onyomi: "びょう", kunyomi: "ねこ", meaning: "cat" },

  // Artifacts/Ceramics
  { kanji: "陶", onyomi: "とう", kunyomi: "す（え）", meaning: "pottery, ceramics" },

  // Sounds/Noises
  { kanji: "鳴", onyomi: "めい", kunyomi: "な（る）", meaning: "chirp, cry, bark" },

  // Stealing/Theft
  { kanji: "盗", onyomi: "とう", kunyomi: "ぬす（む）", meaning: "steal, rob" },

  // Honorifics/Respect
  { kanji: "御", onyomi: "ぎょ、ご", kunyomi: "おん、お", meaning: "honorable" },
  { kanji: "申", onyomi: "しん", kunyomi: "もう（す）、さる", meaning: "have the honor to" },

  // Arts/Drawing/Pictures
  { kanji: "絵", onyomi: "かい、え", kunyomi: "", meaning: "picture, drawing" },

  // Coincidence/Chance
  { kanji: "偶", onyomi: "ぐう", kunyomi: "たま", meaning: "accidentally, even number" },

  // Spirits/Deities
  { kanji: "神", onyomi: "しん、じん", kunyomi: "かみ", meaning: "gods, mind, soul" },

  // Experience/Habit
  { kanji: "慣", onyomi: "かん", kunyomi: "な（れる）", meaning: "accustomed, get used to" },

  // Mistakes/Errors
  { kanji: "誤", onyomi: "ご", kunyomi: "あやま（る）", meaning: "mistake" },

  // Night/Evening
  { kanji: "晩", onyomi: "ばん", kunyomi: "", meaning: "nightfall, night" },

  // Busy/Occupied
  { kanji: "忙", onyomi: "ぼう、もう", kunyomi: "いそが（しい）", meaning: "busy, occupied" },

  // Beginning/String/Connection
  { kanji: "緒", onyomi: "しょ", kunyomi: "お", meaning: "beginning, end, cord, strap" }
];
