const fs = require('fs');
const path = require('path');

const n2Path = path.join(__dirname, '../lib/constants/n2-kanji.ts');

function parseKanjiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/\{ kanji: "([^"]+)", onyomi: "([^"]*)", kunyomi: "([^"]*)", meaning: "([^"]*)" \}/g)];
  return matches.map(match => ({
    kanji: match[1],
    onyomi: match[2],
    kunyomi: match[3],
    meaning: match[4]
  }));
}

function writeKanjiFile(filePath, kanjiArray, level) {
  const interfaceSection = `export interface KanjiData {
  kanji: string;
  onyomi: string;
  kunyomi: string;
  meaning: string;
}

export const ${level}_KANJI: KanjiData[] = [`;

  const kanjiEntries = kanjiArray.map(k => 
    `  { kanji: "${k.kanji}", onyomi: "${k.onyomi}", kunyomi: "${k.kunyomi}", meaning: "${k.meaning}" }`
  ).join(',\n');

  const content = interfaceSection + '\n' + kanjiEntries + '\n];\n';
  fs.writeFileSync(filePath, content, 'utf8');
}

const n2Kanji = parseKanjiFile(n2Path);

console.log('Original N2 count:', n2Kanji.length);

// Remove duplicates within N2
const seen = new Set();
const uniqueN2 = n2Kanji.filter(k => {
  if (seen.has(k.kanji)) {
    console.log('Removing duplicate:', k.kanji);
    return false;
  }
  seen.add(k.kanji);
  return true;
});

console.log('After removing internal duplicates:', uniqueN2.length);
console.log('Removed:', n2Kanji.length - uniqueN2.length, 'internal duplicates');

writeKanjiFile(n2Path, uniqueN2, 'N2');
console.log('N2 file updated!');