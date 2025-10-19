// Common kanji database with meanings and readings
const kanjiDatabase = [
    { kanji: '日', meanings: ['sun', 'day'], reading: 'にち/ひ' },
    { kanji: '月', meanings: ['moon', 'month'], reading: 'げつ/つき' },
    { kanji: '火', meanings: ['fire'], reading: 'か/ひ' },
    { kanji: '水', meanings: ['water'], reading: 'すい/みず' },
    { kanji: '木', meanings: ['tree', 'wood'], reading: 'もく/き' },
    { kanji: '金', meanings: ['gold', 'money', 'metal'], reading: 'きん/かね' },
    { kanji: '土', meanings: ['earth', 'soil'], reading: 'ど/つち' },
    { kanji: '人', meanings: ['person', 'people'], reading: 'じん/ひと' },
    { kanji: '山', meanings: ['mountain'], reading: 'さん/やま' },
    { kanji: '川', meanings: ['river'], reading: 'せん/かわ' },
    { kanji: '田', meanings: ['rice field'], reading: 'でん/た' },
    { kanji: '目', meanings: ['eye'], reading: 'もく/め' },
    { kanji: '手', meanings: ['hand'], reading: 'しゅ/て' },
    { kanji: '足', meanings: ['foot', 'leg'], reading: 'そく/あし' },
    { kanji: '口', meanings: ['mouth'], reading: 'こう/くち' },
    { kanji: '耳', meanings: ['ear'], reading: 'じ/みみ' },
    { kanji: '心', meanings: ['heart', 'mind'], reading: 'しん/こころ' },
    { kanji: '力', meanings: ['power', 'strength'], reading: 'りょく/ちから' },
    { kanji: '門', meanings: ['gate'], reading: 'もん/かど' },
    { kanji: '車', meanings: ['car', 'vehicle'], reading: 'しゃ/くるま' },
    { kanji: '空', meanings: ['sky', 'empty'], reading: 'くう/そら' },
    { kanji: '雨', meanings: ['rain'], reading: 'う/あめ' },
    { kanji: '花', meanings: ['flower'], reading: 'か/はな' },
    { kanji: '石', meanings: ['stone'], reading: 'せき/いし' },
    { kanji: '竹', meanings: ['bamboo'], reading: 'ちく/たけ' },
    { kanji: '糸', meanings: ['thread'], reading: 'し/いと' },
    { kanji: '虫', meanings: ['insect'], reading: 'ちゅう/むし' },
    { kanji: '犬', meanings: ['dog'], reading: 'けん/いぬ' },
    { kanji: '猫', meanings: ['cat'], reading: 'びょう/ねこ' },
    { kanji: '鳥', meanings: ['bird'], reading: 'ちょう/とり' },
    { kanji: '魚', meanings: ['fish'], reading: 'ぎょ/さかな' },
    { kanji: '草', meanings: ['grass'], reading: 'そう/くさ' },
    { kanji: '赤', meanings: ['red'], reading: 'せき/あか' },
    { kanji: '青', meanings: ['blue'], reading: 'せい/あお' },
    { kanji: '白', meanings: ['white'], reading: 'はく/しろ' },
    { kanji: '黒', meanings: ['black'], reading: 'こく/くろ' },
    { kanji: '大', meanings: ['big', 'large'], reading: 'だい/おおきい' },
    { kanji: '小', meanings: ['small', 'little'], reading: 'しょう/ちいさい' },
    { kanji: '高', meanings: ['high', 'tall', 'expensive'], reading: 'こう/たかい' },
    { kanji: '長', meanings: ['long'], reading: 'ちょう/ながい' },
    { kanji: '新', meanings: ['new'], reading: 'しん/あたらしい' },
    { kanji: '古', meanings: ['old'], reading: 'こ/ふるい' },
    { kanji: '多', meanings: ['many', 'much'], reading: 'た/おおい' },
    { kanji: '少', meanings: ['few', 'little'], reading: 'しょう/すくない' },
    { kanji: '早', meanings: ['early', 'fast'], reading: 'そう/はやい' },
    { kanji: '遅', meanings: ['late', 'slow'], reading: 'ち/おそい' },
    { kanji: '一', meanings: ['one'], reading: 'いち/ひとつ' },
    { kanji: '二', meanings: ['two'], reading: 'に/ふたつ' },
    { kanji: '三', meanings: ['three'], reading: 'さん/みっつ' },
    { kanji: '四', meanings: ['four'], reading: 'し/よん' },
    { kanji: '五', meanings: ['five'], reading: 'ご/いつつ' },
    { kanji: '六', meanings: ['six'], reading: 'ろく/むっつ' },
    { kanji: '七', meanings: ['seven'], reading: 'しち/ななつ' },
    { kanji: '八', meanings: ['eight'], reading: 'はち/やっつ' },
    { kanji: '九', meanings: ['nine'], reading: 'きゅう/ここのつ' },
    { kanji: '十', meanings: ['ten'], reading: 'じゅう/とお' },
    { kanji: '百', meanings: ['hundred'], reading: 'ひゃく' },
    { kanji: '千', meanings: ['thousand'], reading: 'せん' },
    { kanji: '万', meanings: ['ten thousand'], reading: 'まん' },
    { kanji: '円', meanings: ['yen', 'circle'], reading: 'えん' },
    { kanji: '学', meanings: ['study', 'learning'], reading: 'がく' },
    { kanji: '生', meanings: ['life', 'birth', 'student'], reading: 'せい/いきる' },
    { kanji: '先', meanings: ['before', 'ahead', 'teacher'], reading: 'せん/さき' },
    { kanji: '年', meanings: ['year'], reading: 'ねん/とし' },
    { kanji: '時', meanings: ['time', 'hour'], reading: 'じ/とき' },
    { kanji: '分', meanings: ['minute', 'part'], reading: 'ぶん/ふん' },
    { kanji: '半', meanings: ['half'], reading: 'はん' },
    { kanji: '間', meanings: ['interval', 'between'], reading: 'かん/あいだ' },
    { kanji: '今', meanings: ['now'], reading: 'こん/いま' },
    { kanji: '前', meanings: ['before', 'front'], reading: 'ぜん/まえ' },
    { kanji: '後', meanings: ['after', 'back'], reading: 'ご/あと' },
    { kanji: '上', meanings: ['up', 'above'], reading: 'じょう/うえ' },
    { kanji: '下', meanings: ['down', 'below'], reading: 'か/した' },
    { kanji: '中', meanings: ['middle', 'inside'], reading: 'ちゅう/なか' },
    { kanji: '外', meanings: ['outside'], reading: 'がい/そと' },
    { kanji: '内', meanings: ['inside'], reading: 'ない/うち' },
    { kanji: '左', meanings: ['left'], reading: 'さ/ひだり' },
    { kanji: '右', meanings: ['right'], reading: 'う/みぎ' },
    { kanji: '東', meanings: ['east'], reading: 'とう/ひがし' },
    { kanji: '西', meanings: ['west'], reading: 'せい/にし' },
    { kanji: '南', meanings: ['south'], reading: 'なん/みなみ' },
    { kanji: '北', meanings: ['north'], reading: 'ほく/きた' },
    { kanji: '国', meanings: ['country'], reading: 'こく/くに' },
    { kanji: '町', meanings: ['town'], reading: 'ちょう/まち' },
    { kanji: '村', meanings: ['village'], reading: 'そん/むら' },
    { kanji: '市', meanings: ['city'], reading: 'し' },
    { kanji: '駅', meanings: ['station'], reading: 'えき' },
    { kanji: '店', meanings: ['store', 'shop'], reading: 'てん/みせ' },
    { kanji: '家', meanings: ['house', 'home'], reading: 'か/いえ' },
    { kanji: '学校', meanings: ['school'], reading: 'がっこう' },
    { kanji: '会社', meanings: ['company'], reading: 'かいしゃ' },
    { kanji: '友', meanings: ['friend'], reading: 'ゆう/とも' },
    { kanji: '父', meanings: ['father'], reading: 'ふ/ちち' },
    { kanji: '母', meanings: ['mother'], reading: 'ぼ/はは' },
    { kanji: '兄', meanings: ['older brother'], reading: 'きょう/あに' },
    { kanji: '姉', meanings: ['older sister'], reading: 'し/あね' },
    { kanji: '弟', meanings: ['younger brother'], reading: 'てい/おとうと' },
    { kanji: '妹', meanings: ['younger sister'], reading: 'まい/いもうと' },
    { kanji: '子', meanings: ['child'], reading: 'し/こ' },
];

// Function to get kanji information
function getKanjiInfo(kanjiChar) {
    return kanjiDatabase.find(k => k.kanji === kanjiChar);
}

// Function to get random kanji from database
function getRandomKanji(count) {
    const shuffled = [...kanjiDatabase].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Function to extract unique kanji from text
function extractKanji(text) {
    const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
    const matches = text.match(kanjiRegex);
    if (!matches) return [];
    
    const uniqueKanji = [...new Set(matches)];
    return uniqueKanji
        .map(k => getKanjiInfo(k))
        .filter(info => info !== undefined);
}
