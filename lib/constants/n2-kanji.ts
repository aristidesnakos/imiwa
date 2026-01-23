export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const N2_KANJI: KanjiData[] = [
  // Government/Politics/Administration
  { kanji: "党", onyomi: "とう", kunyomi: "", meaning: "party, faction, clique" },
  { kanji: "協", onyomi: "きょう", kunyomi: "", meaning: "co-, cooperation" },
  { kanji: "総", onyomi: "そう", kunyomi: "すべ（て）、ふさ", meaning: "general, whole, all, full, total" },
  { kanji: "府", onyomi: "ふ", kunyomi: "", meaning: "urban prefecture, government office, representative body, storehouse" },
  { kanji: "査", onyomi: "さ", kunyomi: "", meaning: "investigate, examine" },
  { kanji: "委", onyomi: "い", kunyomi: "ゆだ（ねる）", meaning: "committee, entrust to, leave to, devote, discard" },
  { kanji: "司", onyomi: "し", kunyomi: "つかさ（どる）", meaning: "director, official, govt office, rule, administer" },
  { kanji: "統", onyomi: "とう", kunyomi: "す（べる）", meaning: "overall, relationship, ruling, governing" },
  { kanji: "律", onyomi: "りつ、りち", kunyomi: "", meaning: "rhythm, law, regulation, gauge, control" },
  { kanji: "裁", onyomi: "さい", kunyomi: "さば（く）", meaning: "tailor, judge, decision, cut out (pattern)" },
  { kanji: "典", onyomi: "てん", kunyomi: "", meaning: "code, ceremony, law, rule" },

  // Geographic/Location/Territory
  { kanji: "区", onyomi: "く", kunyomi: "", meaning: "ward, district" },
  { kanji: "領", onyomi: "りょう", kunyomi: "", meaning: "territory, dominion, province" },
  { kanji: "県", onyomi: "けん", kunyomi: "", meaning: "prefecture" },
  { kanji: "島", onyomi: "とう", kunyomi: "しま", meaning: "island" },
  { kanji: "村", onyomi: "そん", kunyomi: "むら", meaning: "village, town" },
  { kanji: "城", onyomi: "じょう", kunyomi: "しろ", meaning: "castle" },
  { kanji: "郷", onyomi: "きょう、ごう", kunyomi: "さと", meaning: "home town, village, native place, district" },
  { kanji: "江", onyomi: "こう", kunyomi: "え", meaning: "creek, inlet, bay" },
  { kanji: "河", onyomi: "か", kunyomi: "かわ", meaning: "river" },
  { kanji: "湾", onyomi: "わん", kunyomi: "", meaning: "gulf, bay, inlet" },
  { kanji: "丘", onyomi: "きゅう", kunyomi: "おか", meaning: "hill, knoll" },
  { kanji: "峰", onyomi: "ほう", kunyomi: "みね", meaning: "summit, peak" },
  { kanji: "坑", onyomi: "こう", kunyomi: "", meaning: "pit, hole" },
  { kanji: "穴", onyomi: "けつ", kunyomi: "あな", meaning: "hole, aperture, slit, cave, den" },

  // Military/War
  { kanji: "軍", onyomi: "ぐん", kunyomi: "", meaning: "army, force, troops, war, battle" },
  { kanji: "兵", onyomi: "へい、ひょう", kunyomi: "つわもの", meaning: "soldier, private, troops, army" },
  { kanji: "砲", onyomi: "ほう", kunyomi: "", meaning: "cannon, gun" },
  { kanji: "弾", onyomi: "だん", kunyomi: "はず（む）、たま", meaning: "bullet, twang, flip, snap" },
  { kanji: "衛", onyomi: "えい", kunyomi: "", meaning: "defense, protection" },

  // Groups/Organizations
  { kanji: "団", onyomi: "だん", kunyomi: "", meaning: "group, association" },
  { kanji: "群", onyomi: "ぐん", kunyomi: "む（れ）、むら（がる）", meaning: "flock, group, crowd, herd, swarm, cluster" },
  { kanji: "派", onyomi: "は", kunyomi: "", meaning: "faction, group, party, clique, sect, school" },
  { kanji: "輩", onyomi: "はい", kunyomi: "やから", meaning: "comrade, fellow, people, companions" },

  // Change/Reform/Improvement
  { kanji: "設", onyomi: "せつ", kunyomi: "もう（ける）", meaning: "establishment, provision, prepare" },
  { kanji: "改", onyomi: "かい", kunyomi: "あらた（める）、あらた（まる）", meaning: "reformation, change, modify, mend, renew, examine, inspect, search" },
  { kanji: "革", onyomi: "かく", kunyomi: "かわ", meaning: "leather, become serious, hide, pelt" },
  { kanji: "修", onyomi: "しゅう", kunyomi: "おさ（める）", meaning: "discipline, conduct oneself well, study, master" },
  { kanji: "替", onyomi: "たい", kunyomi: "か（える）", meaning: "exchange, spare, substitute, per-" },

  // Quantity/Measurement/Numbers
  { kanji: "各", onyomi: "かく", kunyomi: "おのおの", meaning: "each, every, either" },
  { kanji: "勢", onyomi: "せい、ぜい", kunyomi: "いきお（い）", meaning: "forces, energy, military strength" },
  { kanji: "減", onyomi: "げん", kunyomi: "へ（る）、へ（らす）", meaning: "dwindle, decrease, reduce, decline, curtail, get hungry" },
  { kanji: "率", onyomi: "りつ、そつ", kunyomi: "ひき（いる）", meaning: "ratio, rate, proportion, percentage, coefficient, factor" },
  { kanji: "量", onyomi: "りょう", kunyomi: "はか（る）", meaning: "quantity, measure, weight, amount, consider, estimate, surmise" },
  { kanji: "秒", onyomi: "びょう", kunyomi: "", meaning: "second, moment" },
  { kanji: "度", onyomi: "ど、たく", kunyomi: "たび、た（い）", meaning: "degrees, occurrence, time, counter for occurrences" },
  { kanji: "額", onyomi: "がく", kunyomi: "ひたい", meaning: "forehead, tablet, plaque, framed picture, sum, amount, volume" },
  { kanji: "繁", onyomi: "はん", kunyomi: "しげ（る）", meaning: "luxuriant, thick, overgrown, frequency, complexity, trouble" },
  { kanji: "頻", onyomi: "ひん", kunyomi: "しき（り）", meaning: "repeatedly, recur" },

  // Time/History/Record
  { kanji: "跡", onyomi: "せき", kunyomi: "あと", meaning: "tracks, mark, print, impression" },
  { kanji: "旧", onyomi: "きゅう", kunyomi: "ふる（い）", meaning: "old times, old things, old friend, former, ex-" },
  { kanji: "録", onyomi: "ろく", kunyomi: "", meaning: "record" },
  { kanji: "史", onyomi: "し", kunyomi: "", meaning: "history, chronicle" },
  { kanji: "紀", onyomi: "き", kunyomi: "", meaning: "chronicle, account, narrative, history, annals, geologic period" },
  { kanji: "歴", onyomi: "れき", kunyomi: "", meaning: "curriculum, continuation, passage of time" },
  { kanji: "再", onyomi: "さい、さ", kunyomi: "ふたたび", meaning: "again, twice, second time" },
  { kanji: "既", onyomi: "き", kunyomi: "すで（に）", meaning: "previously, already, long ago" },

  // Nature/Weather/Environment
  { kanji: "雲", onyomi: "うん", kunyomi: "くも", meaning: "cloud" },
  { kanji: "露", onyomi: "ろ、ろう", kunyomi: "つゆ", meaning: "dew, tears, expose, Russia" },
  { kanji: "黄", onyomi: "おう、こう", kunyomi: "き", meaning: "yellow" },
  { kanji: "紅", onyomi: "こう、く", kunyomi: "べに", meaning: "crimson, deep red" },
  { kanji: "湿", onyomi: "しつ", kunyomi: "しめ（る）", meaning: "damp, wet, moist" },
  { kanji: "汗", onyomi: "かん", kunyomi: "あせ", meaning: "sweat, perspire" },
  { kanji: "暖", onyomi: "だん", kunyomi: "あたた（か）", meaning: "warmth" },
  { kanji: "荒", onyomi: "こう", kunyomi: "あら（い）、あ（れる）", meaning: "laid waste, rough, rude, wild" },

  // Ceremony/Culture/Religion
  { kanji: "祭", onyomi: "さい", kunyomi: "まつ（る）", meaning: "ritual, offer prayers, celebrate, deify, enshrine, worship" },
  { kanji: "宗", onyomi: "しゅう、そう", kunyomi: "", meaning: "religion, sect, denomination, main point, origin, essence" },
  { kanji: "宮", onyomi: "きゅう、ぐう", kunyomi: "みや", meaning: "Shinto shrine, constellations, palace, princess" },
  { kanji: "仏", onyomi: "ぶつ、ふつ", kunyomi: "ほとけ", meaning: "Buddha, the dead, France" },

  // Construction/Building
  { kanji: "築", onyomi: "ちく", kunyomi: "きず（く）", meaning: "fabricate, build, construct" },
  { kanji: "壁", onyomi: "へき", kunyomi: "かべ", meaning: "wall, lining (stomach), fence" },
  { kanji: "舎", onyomi: "しゃ", kunyomi: "", meaning: "cottage, inn, hut, house, mansion" },
  { kanji: "房", onyomi: "ぼう", kunyomi: "ふさ", meaning: "tassel, tuft, fringe, bunch, lock (hair), segment (orange), house, room" },
  { kanji: "塚", onyomi: "ちょう", kunyomi: "つか", meaning: "hillock, mound" },
  { kanji: "礎", onyomi: "そ", kunyomi: "いしずえ", meaning: "cornerstone, foundation stone" },

  // Guidance/Leadership/Order
  { kanji: "導", onyomi: "どう", kunyomi: "みちび（く）", meaning: "guidance, leading, conduct, usher" },
  { kanji: "順", onyomi: "じゅん", kunyomi: "", meaning: "obey, order, turn, right, docility, occasion" },
  { kanji: "範", onyomi: "はん", kunyomi: "", meaning: "pattern, example, model" },

  // Protection/Safety/Disaster
  { kanji: "護", onyomi: "ご", kunyomi: "まも（る）", meaning: "safeguard, protect" },
  { kanji: "災", onyomi: "さい", kunyomi: "わざわ（い）", meaning: "disaster, calamity, woe, curse, evil" },
  { kanji: "救", onyomi: "きゅう", kunyomi: "すく（う）", meaning: "salvation, save, help, rescue, reclaim" },
  { kanji: "避", onyomi: "ひ", kunyomi: "さ（ける）", meaning: "evade, avoid, avert, ward off, shirk, shun" },

  // Position/Status/Role
  { kanji: "副", onyomi: "ふく", kunyomi: "", meaning: "vice-, assistant, aide, duplicate, copy" },
  { kanji: "士", onyomi: "し", kunyomi: "さむらい", meaning: "gentleman, scholar, samurai, samurai radical (no. 33)" },
  { kanji: "準", onyomi: "じゅん", kunyomi: "", meaning: "semi-, correspond to, proportionate to, conform, imitate" },
  { kanji: "臣", onyomi: "しん、じん", kunyomi: "", meaning: "retainer, subject" },
  { kanji: "賓", onyomi: "ひん", kunyomi: "", meaning: "VIP, guest" },
  { kanji: "陛", onyomi: "へい", kunyomi: "", meaning: "highness, steps (of throne)" },

  // Communication/Speech
  { kanji: "唱", onyomi: "しょう", kunyomi: "とな（える）", meaning: "chant, recite, call upon, yell" },
  { kanji: "述", onyomi: "じゅつ", kunyomi: "の（べる）", meaning: "mention, state, speak, relate" },
  { kanji: "講", onyomi: "こう", kunyomi: "", meaning: "lecture, club, association" },
  { kanji: "謝", onyomi: "しゃ", kunyomi: "あやま（る）", meaning: "apologize, thank, refuse" },
  { kanji: "承", onyomi: "しょう", kunyomi: "うけたまわ（る）", meaning: "acquiesce, hear, listen to, be informed, receive" },
  { kanji: "召", onyomi: "しょう", kunyomi: "め（す）", meaning: "seduce, call, send for, wear, put on, ride in, buy, eat, drink, catch (cold)" },
  { kanji: "詞", onyomi: "し", kunyomi: "", meaning: "part of speech, word, poetry" },

  // Rewards/Competition/Achievement
  { kanji: "賞", onyomi: "しょう", kunyomi: "", meaning: "prize, reward, praise" },
  { kanji: "競", onyomi: "きょう、けい", kunyomi: "きそ（う）、せ（る）", meaning: "emulate, compete with, bid, sell at auction, bout, contest, race" },

  // Business/Commerce/Trade
  { kanji: "株", onyomi: "しゅ", kunyomi: "かぶ", meaning: "stocks, stump, shares, stock, counter for small plants" },
  { kanji: "販", onyomi: "はん", kunyomi: "", meaning: "marketing, sell, trade" },
  { kanji: "営", onyomi: "えい", kunyomi: "いとな（む）", meaning: "camp, perform, build, conduct (business)" },
  { kanji: "貨", onyomi: "か", kunyomi: "", meaning: "freight, goods, property" },
  { kanji: "賃", onyomi: "ちん", kunyomi: "", meaning: "fare, fee, hire, rent, wages, charge" },
  { kanji: "税", onyomi: "ぜい", kunyomi: "", meaning: "tax, duty" },

  // Thinking/Analysis/Planning
  { kanji: "推", onyomi: "すい", kunyomi: "お（す）", meaning: "conjecture, infer, guess, suppose, support" },
  { kanji: "策", onyomi: "さく", kunyomi: "", meaning: "scheme, plan, policy, step, means" },
  { kanji: "析", onyomi: "せき", kunyomi: "", meaning: "chop, divide, tear, analyze" },

  // Skills/Abilities/Techniques
  { kanji: "技", onyomi: "ぎ", kunyomi: "わざ", meaning: "skill, art, craft, ability, feat, performance, vocation, arts" },
  { kanji: "械", onyomi: "かい", kunyomi: "", meaning: "contraption, fetter, machine, instrument" },
  { kanji: "操", onyomi: "そう", kunyomi: "みさお、あやつ（る）", meaning: "maneuver, manipulate, operate, steer, chastity, virginity, fidelity" },
  { kanji: "腕", onyomi: "わん", kunyomi: "うで", meaning: "arm, ability, talent" },

  // Quality/Value/Judgment
  { kanji: "低", onyomi: "てい", kunyomi: "ひく（い）", meaning: "lower, short, humble" },
  { kanji: "価", onyomi: "か", kunyomi: "あたい", meaning: "value, price" },
  { kanji: "豊", onyomi: "ほう", kunyomi: "ゆた（か）", meaning: "bountiful, excellent, rich" },
  { kanji: "純", onyomi: "じゅん", kunyomi: "", meaning: "genuine, purity, innocence, net (profit)" },
  { kanji: "簡", onyomi: "かん", kunyomi: "", meaning: "simplicity, brevity" },

  // Selection/Choice
  { kanji: "択", onyomi: "たく", kunyomi: "", meaning: "choose, select, elect, prefer" },
  { kanji: "採", onyomi: "さい", kunyomi: "と（る）", meaning: "pick, take, fetch, take up" },

  // Materials/Metals/Objects
  { kanji: "鉄", onyomi: "てつ", kunyomi: "", meaning: "iron" },
  { kanji: "銅", onyomi: "どう", kunyomi: "", meaning: "copper" },
  { kanji: "磁", onyomi: "じ", kunyomi: "", meaning: "magnet, porcelain" },
  { kanji: "針", onyomi: "しん", kunyomi: "はり", meaning: "needle, pin, staple, stinger" },
  { kanji: "鎖", onyomi: "さ", kunyomi: "くさり", meaning: "chain, irons, connection" },
  { kanji: "軸", onyomi: "じく", kunyomi: "", meaning: "axis, pivot, stem, stalk, counter for picture scrolls" },
  { kanji: "玉", onyomi: "ぎょく", kunyomi: "たま", meaning: "jewel, ball" },

  // Shapes/Forms/Geometry
  { kanji: "角", onyomi: "かく", kunyomi: "かど、つの", meaning: "angle, corner, square, horn, antlers" },
  { kanji: "丸", onyomi: "がん", kunyomi: "まる", meaning: "round, full, perfection" },
  { kanji: "環", onyomi: "かん", kunyomi: "わ", meaning: "ring, circle, link, wheel" },
  { kanji: "圏", onyomi: "けん", kunyomi: "", meaning: "sphere, circle, radius, range" },
  { kanji: "径", onyomi: "けい", kunyomi: "", meaning: "diameter, path, method" },

  // Philosophy/Values/Ideals
  { kanji: "故", onyomi: "こ", kunyomi: "ゆえ", meaning: "happenstance, especially, intentionally, reason, cause, circumstances, the late, therefore, consequently" },
  { kanji: "義", onyomi: "ぎ", kunyomi: "", meaning: "righteousness, justice, morality, honor, loyalty, meaning" },
  { kanji: "志", onyomi: "し", kunyomi: "こころざし", meaning: "intention, plan, resolve, aspire, motive, hopes, shilling" },
  { kanji: "徳", onyomi: "とく", kunyomi: "", meaning: "benevolence, virtue, goodness, favor" },
  { kanji: "恩", onyomi: "おん", kunyomi: "", meaning: "grace, kindness, goodness, favor, mercy, blessing, benefit" },
  { kanji: "孝", onyomi: "こう", kunyomi: "", meaning: "filial piety, child's respect" },
  { kanji: "勇", onyomi: "ゆう", kunyomi: "いさ（む）", meaning: "courage, cheer up, be in high spirits, bravery, heroism" },
  { kanji: "慎", onyomi: "しん", kunyomi: "つつし（む）", meaning: "humility, be careful, discrete, prudent" },
  { kanji: "敬", onyomi: "けい", kunyomi: "うやま（う）", meaning: "awe, respect, honor, revere" },

  // Clothing/Appearance/Decoration
  { kanji: "装", onyomi: "そう、しょう", kunyomi: "よそ（う）", meaning: "attire, dress, pretend, disguise, profess" },
  { kanji: "飾", onyomi: "しょく", kunyomi: "かざ（る）", meaning: "decorate, ornament, adorn" },

  // Observation/Inspection/Vision
  { kanji: "視", onyomi: "し", kunyomi: "", meaning: "inspection, regard as, see, look at" },
  { kanji: "狙", onyomi: "そ", kunyomi: "ねら（う）", meaning: "aim at, sight on, shadow, stalk" },

  // Writing/Documentation/Composition
  { kanji: "章", onyomi: "しょう", kunyomi: "", meaning: "badge, chapter, composition, poem, design" },
  { kanji: "編", onyomi: "へん", kunyomi: "あ（む）", meaning: "compilation, knit, plait, braid, twist, editing, completed poem, part of a book" },
  { kanji: "巻", onyomi: "かん", kunyomi: "ま（く）", meaning: "scroll, volume, book, part, roll up, wind up, tie, coil, counter for texts (or book scrolls)" },

  // Mathematics/Calculation
  { kanji: "算", onyomi: "さん", kunyomi: "", meaning: "calculate, divining, number, abacus, probability" },
  { kanji: "票", onyomi: "ひょう", kunyomi: "", meaning: "ballot, label, ticket, sign" },

  // Space/Universe/Architecture
  { kanji: "宙", onyomi: "ちゅう", kunyomi: "", meaning: "mid-air, air, space, sky, memorization, interval of time" },
  { kanji: "宇", onyomi: "う", kunyomi: "", meaning: "eaves, roof, house, heaven" },

  // Secrecy/Privacy/Density
  { kanji: "密", onyomi: "みつ", kunyomi: "", meaning: "secrecy, density (pop), minuteness, carefulness" },
  { kanji: "秘", onyomi: "ひ", kunyomi: "", meaning: "secret, conceal" },

  // Health/Well-being/Peace
  { kanji: "康", onyomi: "こう", kunyomi: "", meaning: "ease, peace" },
  { kanji: "養", onyomi: "よう", kunyomi: "やしな（う）", meaning: "foster, bring up, rear, develop, nurture" },

  // Delivery/Communication/Connection
  { kanji: "届", onyomi: "かい", kunyomi: "とど（く）", meaning: "deliver, reach, arrive, report, notify, forward" },
  { kanji: "郵", onyomi: "ゆう", kunyomi: "", meaning: "mail, stagecoach stop" },
  { kanji: "縁", onyomi: "えん", kunyomi: "ふち", meaning: "affinity, relation, connection, edge, border, veranda, chance" },
  { kanji: "紹", onyomi: "しょう", kunyomi: "", meaning: "introduce, inherit, help" },

  // Layers/Levels/Belonging
  { kanji: "層", onyomi: "そう", kunyomi: "", meaning: "stratum, social class, layer, story, floor" },
  { kanji: "属", onyomi: "ぞく", kunyomi: "", meaning: "belong, genus, subordinate official, affiliated" },

  // Fabric/Textile/Materials
  { kanji: "布", onyomi: "ふ", kunyomi: "ぬの", meaning: "linen, cloth, spread, distribute" },
  { kanji: "織", onyomi: "しょく、しき", kunyomi: "お（る）", meaning: "weave, fabric" },
  { kanji: "縄", onyomi: "じょう", kunyomi: "なわ", meaning: "straw rope, cord" },
  { kanji: "索", onyomi: "さく", kunyomi: "", meaning: "cord, rope, searching, inquiring" },
  { kanji: "維", onyomi: "い", kunyomi: "", meaning: "fiber, tie, rope" },

  // Signs/Symbols/Marks
  { kanji: "標", onyomi: "ひょう", kunyomi: "", meaning: "signpost, seal, mark, stamp, imprint, symbol, emblem, trademark, evidence, souvenir, target" },
  { kanji: "像", onyomi: "ぞう", kunyomi: "", meaning: "statue, picture, image, figure, portrait" },

  // Hope/Rarity/Desire
  { kanji: "希", onyomi: "き", kunyomi: "まれ", meaning: "hope, beg, request, pray, beseech, Greece, dilute (acid), rare, few, phenomenal" },
  { kanji: "珍", onyomi: "ちん", kunyomi: "めずら（しい）", meaning: "rare, curious, strange" },

  // Size/Dimension/Detail
  { kanji: "細", onyomi: "さい", kunyomi: "ほそ（い）", meaning: "dainty, get thin, taper, slender, narrow, detailed, precise" },
  { kanji: "狭", onyomi: "きょう", kunyomi: "せま（い）", meaning: "cramped, narrow, contract, tight" },
  { kanji: "薄", onyomi: "はく", kunyomi: "うす（い）", meaning: "dilute, thin, weak (tea), pampas grass" },
  { kanji: "浅", onyomi: "せん", kunyomi: "あさ（い）", meaning: "shallow, superficial, frivolous, wretched, shameful" },

  // Models/Types/Forms
  { kanji: "型", onyomi: "けい", kunyomi: "かた", meaning: "mould, type, model" },
  { kanji: "姿", onyomi: "し", kunyomi: "すがた", meaning: "figure, form, shape" },

  // Response/Reaction
  { kanji: "応", onyomi: "おう", kunyomi: "", meaning: "apply, answer, yes, OK, reply, accept" },
  { kanji: "誘", onyomi: "ゆう", kunyomi: "さそ（う）", meaning: "entice, lead, tempt, invite, ask, call for, seduce, allure" },

  // Emotions/Feelings
  { kanji: "快", onyomi: "かい", kunyomi: "こころよ（い）", meaning: "cheerful, pleasant, agreeable, comfortable" },
  { kanji: "恋", onyomi: "れん", kunyomi: "こい、こ（う）", meaning: "romance, in love, yearn for, miss, darling" },
  { kanji: "愉", onyomi: "ゆ", kunyomi: "たのし（い）", meaning: "pleasure, happy, rejoice" },
  { kanji: "慰", onyomi: "い", kunyomi: "なぐさ（める）", meaning: "consolation, amusement, seduce, cheer, make sport of, comfort, console" },
  { kanji: "惜", onyomi: "せき", kunyomi: "お（しい）", meaning: "pity, be sparing of, frugal, stingy, regret" },
  { kanji: "騒", onyomi: "そう", kunyomi: "さわ（ぐ）", meaning: "boisterous, make noise, clamor, disturb, excite" },

  // Expansion/Growth/Movement
  { kanji: "伸", onyomi: "しん", kunyomi: "の（びる）、の（ばす）", meaning: "expand, stretch, extend, lengthen, increase" },
  { kanji: "拡", onyomi: "かく", kunyomi: "", meaning: "broaden, extend, expand, enlarge" },
  { kanji: "展", onyomi: "てん", kunyomi: "", meaning: "unfold, expand" },
  { kanji: "縮", onyomi: "しゅく", kunyomi: "ちぢ（む）、ちぢ（まる）", meaning: "shrink, contract, shrivel, wrinkle, reduce" },

  // Raising/Lifting/Behavior
  { kanji: "挙", onyomi: "きょ", kunyomi: "あ（げる）", meaning: "raise, plan, project, behavior, actions" },
  { kanji: "揮", onyomi: "き", kunyomi: "", meaning: "brandish, wave, wag, swing, shake" },

  // Interior/Depth
  { kanji: "奥", onyomi: "おう", kunyomi: "おく", meaning: "heart, interior" },

  // Packing/Filling/Closing
  { kanji: "詰", onyomi: "きつ", kunyomi: "つ（める）", meaning: "packed, close, pressed, reprove, rebuke, blame" },
  { kanji: "締", onyomi: "てい", kunyomi: "し（める）", meaning: "tighten, tie, shut, lock, fasten" },

  // Bathing/Immersion
  { kanji: "浴", onyomi: "よく", kunyomi: "あ（びる）", meaning: "bathe, be favored with, bask in" },
  { kanji: "漬", onyomi: "し", kunyomi: "つけ", meaning: "pickling, soak, moisten" },

  // Confinement/Restriction
  { kanji: "獄", onyomi: "ごく", kunyomi: "", meaning: "prison, jail" },

  // Food/Nutrition
  { kanji: "豆", onyomi: "とう、ず", kunyomi: "まめ", meaning: "beans, pea, midget" },
  { kanji: "塩", onyomi: "えん", kunyomi: "しお", meaning: "salt" },
  { kanji: "糖", onyomi: "とう", kunyomi: "", meaning: "sugar" },
  { kanji: "菓", onyomi: "か", kunyomi: "", meaning: "candy, cakes, fruit" },

  // Pressure/Force
  { kanji: "圧", onyomi: "あつ", kunyomi: "", meaning: "pressure, push, overwhelm, oppress, dominate" },
  { kanji: "揺", onyomi: "よう", kunyomi: "ゆ（れる）", meaning: "swing, shake, sway, rock, tremble, vibrate" },
  { kanji: "震", onyomi: "しん", kunyomi: "ふる（う）、ふる（える）", meaning: "quake, shake, tremble, quiver" },

  // Promises/Agreements/Contracts
  { kanji: "契", onyomi: "けい", kunyomi: "", meaning: "pledge, promise, vow" },

  // Discarding/Abandoning
  { kanji: "捨", onyomi: "しゃ", kunyomi: "す（てる）", meaning: "discard, throw away, abandon, resign, reject, sacrifice" },
  { kanji: "奪", onyomi: "だつ", kunyomi: "うば（う）", meaning: "rob, take by force, snatch away, dispossess, plunder, usurp" },

  // Drawing/Depicting
  { kanji: "描", onyomi: "びょう", kunyomi: "えが（く）", meaning: "sketch, compose, write, draw, paint" },

  // Edges/Borders/Endpoints
  { kanji: "端", onyomi: "たん", kunyomi: "はた、はし", meaning: "edge, origin, end, point, border, verge, cape" },

  // Dancing/Movement
  { kanji: "踊", onyomi: "よう", kunyomi: "おど（る）", meaning: "jump, dance, leap, skip" },

  // Continuation/Succession
  { kanji: "継", onyomi: "けい", kunyomi: "つ（ぐ）", meaning: "inherit, succeed, continue, patch, graft (tree)" },

  // Body Parts
  { kanji: "腰", onyomi: "よう", kunyomi: "こし", meaning: "loins, hips, waist, low wainscoting" },
  { kanji: "肺", onyomi: "はい", kunyomi: "", meaning: "lungs" },
  { kanji: "脳", onyomi: "のう", kunyomi: "", meaning: "brain, memory" },
  { kanji: "筋", onyomi: "きん", kunyomi: "すじ", meaning: "muscle, sinew, tendon, fiber, plot, plan, descent" },
  { kanji: "脈", onyomi: "みゃく", kunyomi: "", meaning: "vein, pulse, hope" },
  { kanji: "咽", onyomi: "いん、えつ", kunyomi: "のど", meaning: "throat, choked, smothered, stuffy" },
  { kanji: "胆", onyomi: "たん", kunyomi: "きも", meaning: "gallbladder, courage, nerve, daring, spirit" },
  { kanji: "臓", onyomi: "ぞう", kunyomi: "", meaning: "entrails, viscera, bowels" },

  // Bodily Fluids/Substances
  { kanji: "血", onyomi: "けつ", kunyomi: "ち", meaning: "blood" },
  { kanji: "液", onyomi: "えき", kunyomi: "", meaning: "fluid, liquid, juice, sap, secretion" },

  // Vitality/Gender
  { kanji: "盛", onyomi: "せい、じょう", kunyomi: "も（る）、さか（る）", meaning: "boom, prosper, copulate" },
  { kanji: "雄", onyomi: "ゆう", kunyomi: "お-、おす", meaning: "masculine, male, hero, leader, superiority, excellence" },
  { kanji: "雌", onyomi: "し", kunyomi: "めす、め-", meaning: "feminine, female" },

  // Animals/Creatures
  { kanji: "獣", onyomi: "じゅう", kunyomi: "けもの", meaning: "animal, beast" },
  { kanji: "亀", onyomi: "き", kunyomi: "かめ", meaning: "tortoise, turtle" },

  // Plants/Nature
  { kanji: "咲", onyomi: "しょう", kunyomi: "さ（く）", meaning: "blossom, bloom" },
  { kanji: "巣", onyomi: "そう", kunyomi: "す", meaning: "nest, rookery, hive, cobweb, den" },
  { kanji: "幹", onyomi: "かん", kunyomi: "みき", meaning: "tree trunk" },

  // Containers/Vessels
  { kanji: "瓶", onyomi: "びん", kunyomi: "", meaning: "bottle, vial, jar, jug, vat, urn" },
  { kanji: "缶", onyomi: "かん", kunyomi: "", meaning: "can, container, jar radical (no. 121)" },
  { kanji: "皿", onyomi: "さら", kunyomi: "", meaning: "dish, a helping, plate" },

  // Counting/Numbers
  { kanji: "隻", onyomi: "せき", kunyomi: "", meaning: "vessels, counter for ships, fish, birds, arrows, one of a pair" },

  // Slippery/Smooth
  { kanji: "滑", onyomi: "かつ、こつ", kunyomi: "すべ（る）、なめ（らか）", meaning: "slippery, slide, slip, flunk" },

  // Furniture/Objects
  { kanji: "机", onyomi: "き", kunyomi: "つくえ", meaning: "desk, table" },
  { kanji: "床", onyomi: "しょう", kunyomi: "とこ、ゆか", meaning: "bed, counter for beds, floor, padding, tatami" },

  // Cleaning/Sweeping
  { kanji: "掃", onyomi: "そう", kunyomi: "は（く）", meaning: "sweep, brush" },

  // Harmful/Dangerous
  { kanji: "毒", onyomi: "どく", kunyomi: "", meaning: "poison, virus, venom, germ, harm, injury, spite" },
  { kanji: "刺", onyomi: "し", kunyomi: "さ（す）、とげ", meaning: "thorn, pierce, stab, prick, sting, calling card" },

  // Stopping/Halting/Staying
  { kanji: "停", onyomi: "てい", kunyomi: "と（める）", meaning: "halt, stopping" },
  { kanji: "駐", onyomi: "ちゅう", kunyomi: "", meaning: "stop-over, reside in, resident" },

  // Following/Along
  { kanji: "沿", onyomi: "えん", kunyomi: "そ（う）", meaning: "run alongside, follow along, run along, lie along" },

  // Handling/Treatment
  { kanji: "扱", onyomi: "あつ", kunyomi: "あつ（かう）", meaning: "handle, deal with, dispose of, treat, entertain, receive guests" },

  // Weakness/Frailty
  { kanji: "弱", onyomi: "じゃく", kunyomi: "よわ（い）", meaning: "weak, frail" },

  // Employment/Work
  { kanji: "雇", onyomi: "こ", kunyomi: "やと（う）", meaning: "employ, hire" },
  { kanji: "預", onyomi: "よ", kunyomi: "あず（ける）", meaning: "deposit, custody, leave with, entrust to" },

  // Fire/Burning
  { kanji: "焼", onyomi: "しょう", kunyomi: "や（く）", meaning: "bake, burning" },

  // Giving/Presenting
  { kanji: "贈", onyomi: "ぞう、そう", kunyomi: "おく（る）", meaning: "presents, send, give to, award to, confer on, presenting something" },

  // Light/Illumination
  { kanji: "照", onyomi: "しょう", kunyomi: "て（る）", meaning: "illuminate, shine, compare, bashful" },

  // Elegance/Interest
  { kanji: "趣", onyomi: "しゅ", kunyomi: "おもむき", meaning: "purport, gist, elegance, interest, proceed to, tend, become" },

  // Searching/Seeking
  { kanji: "捜", onyomi: "そう", kunyomi: "さが（す）", meaning: "search, look for, locate" },

  // Earth/Sand
  { kanji: "砂", onyomi: "さ、しゃ", kunyomi: "すな", meaning: "sand" },

  // Leaking/Escaping
  { kanji: "漏", onyomi: "ろう", kunyomi: "も（る）", meaning: "leak, escape, time" },

  // Boats/Ships
  { kanji: "舟", onyomi: "しゅう", kunyomi: "ふね", meaning: "boat, ship" },

  // Digging/Excavating
  { kanji: "掘", onyomi: "くつ", kunyomi: "ほ（る）", meaning: "dig, delve, excavate" },

  // Spreading/Laying
  { kanji: "敷", onyomi: "ふ", kunyomi: "し（く）", meaning: "spread, pave, sit, promulgate" },

  // Duplicates/Multiple
  { kanji: "複", onyomi: "ふく", kunyomi: "", meaning: "duplicate, double, compound, multiple" },

  // Wells/Water Sources
  { kanji: "井", onyomi: "せい、しょう", kunyomi: "い", meaning: "well, well crib, town, community" },

  // Mixing/Confusion
  { kanji: "混", onyomi: "こん", kunyomi: "ま（ざる）、こ（む）", meaning: "mix, blend, confuse" },

  // Drying/Withering
  { kanji: "干", onyomi: "かん", kunyomi: "ほ（す）、ほし-", meaning: "dry, parch, ebb, recede, interfere, intercede" },

  // Red/Crimson
  { kanji: "丹", onyomi: "たん", kunyomi: "", meaning: "cinnabar, red, tan" }
];
