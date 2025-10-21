const fs = require('fs');
const path = require('path');

// Read all kanji files
const n5Path = path.join(__dirname, '../lib/constants/n5-kanji.ts');
const n4Path = path.join(__dirname, '../lib/constants/n4-kanji.ts');
const n3Path = path.join(__dirname, '../lib/constants/n3-kanji.ts');
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

// Parse all files
const n5Kanji = parseKanjiFile(n5Path);
const n4Kanji = parseKanjiFile(n4Path);
const n3Kanji = parseKanjiFile(n3Path);
const n2Kanji = parseKanjiFile(n2Path);

console.log('Original counts:');
console.log('N5:', n5Kanji.length);
console.log('N4:', n4Kanji.length);
console.log('N3:', n3Kanji.length);
console.log('N2:', n2Kanji.length);

// Create a set of kanji that exist in higher priority levels
const n5KanjiSet = new Set(n5Kanji.map(k => k.kanji));
const n4KanjiSet = new Set(n4Kanji.map(k => k.kanji));
const n3KanjiSet = new Set(n3Kanji.map(k => k.kanji));

// Remove duplicates from lower priority levels
const cleanN4 = n4Kanji.filter(k => !n5KanjiSet.has(k.kanji));
const cleanN3 = n3Kanji.filter(k => !n5KanjiSet.has(k.kanji) && !n4KanjiSet.has(k.kanji));
const cleanN2 = n2Kanji.filter(k => !n5KanjiSet.has(k.kanji) && !n4KanjiSet.has(k.kanji) && !n3KanjiSet.has(k.kanji));

console.log('\nAfter deduplication:');
console.log('N5:', n5Kanji.length, '(unchanged)');
console.log('N4:', cleanN4.length, `(removed ${n4Kanji.length - cleanN4.length})`);
console.log('N3:', cleanN3.length, `(removed ${n3Kanji.length - cleanN3.length})`);
console.log('N2:', cleanN2.length, `(removed ${n2Kanji.length - cleanN2.length})`);

// Write back the cleaned files
writeKanjiFile(n4Path, cleanN4, 'N4');
writeKanjiFile(n3Path, cleanN3, 'N3');
writeKanjiFile(n2Path, cleanN2, 'N2');

console.log('\nFiles updated successfully!');
console.log('Total kanji now:', n5Kanji.length + cleanN4.length + cleanN3.length + cleanN2.length);