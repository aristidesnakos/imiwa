const fs = require('fs');
const path = require('path');

// Read all kanji files
const n5Path = path.join(__dirname, '../lib/constants/n5-kanji.ts');
const n4Path = path.join(__dirname, '../lib/constants/n4-kanji.ts');
const n3Path = path.join(__dirname, '../lib/constants/n3-kanji.ts');
const n2Path = path.join(__dirname, '../lib/constants/n2-kanji.ts');

function extractKanjiFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/kanji: "([^"]+)"/g);
  return matches ? matches.map(m => m.match(/kanji: "([^"]+)"/)[1]) : [];
}

const n5Kanji = extractKanjiFromFile(n5Path);
const n4Kanji = extractKanjiFromFile(n4Path);
const n3Kanji = extractKanjiFromFile(n3Path);
const n2Kanji = extractKanjiFromFile(n2Path);

console.log('N5 kanji count:', n5Kanji.length);
console.log('N4 kanji count:', n4Kanji.length);
console.log('N3 kanji count:', n3Kanji.length);
console.log('N2 kanji count:', n2Kanji.length);

// Find duplicates
const allKanji = new Map();

function addKanji(kanji, level) {
  if (!allKanji.has(kanji)) {
    allKanji.set(kanji, []);
  }
  allKanji.get(kanji).push(level);
}

n5Kanji.forEach(k => addKanji(k, 'N5'));
n4Kanji.forEach(k => addKanji(k, 'N4'));
n3Kanji.forEach(k => addKanji(k, 'N3'));
n2Kanji.forEach(k => addKanji(k, 'N2'));

const duplicates = Array.from(allKanji.entries())
  .filter(([kanji, levels]) => levels.length > 1)
  .map(([kanji, levels]) => ({ kanji, levels }));

console.log('\n=== DUPLICATES FOUND ===');
console.log('Total duplicates:', duplicates.length);

duplicates.forEach(({ kanji, levels }) => {
  console.log(`${kanji}: ${levels.join(', ')}`);
});

// Group by which levels have duplicates
const levelPairs = {};
duplicates.forEach(({ kanji, levels }) => {
  const key = levels.sort().join('-');
  if (!levelPairs[key]) {
    levelPairs[key] = [];
  }
  levelPairs[key].push(kanji);
});

console.log('\n=== DUPLICATES BY LEVEL COMBINATION ===');
Object.entries(levelPairs).forEach(([levels, kanjiList]) => {
  console.log(`${levels}: ${kanjiList.length} duplicates`);
  console.log(`  ${kanjiList.join(', ')}`);
});