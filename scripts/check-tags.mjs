/**
 * `npm run check:tags` — 태그 분류표(data/tag-taxonomy.json)가 카탈로그를 다 덮는지 본다.
 *
 * 출판사가 신간에 새 태그를 달면 조용히 어느 필터에도 안 걸린다. 그걸 잡아 주는 게 목적이다.
 */
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const { books } = read('../data/uupress-catalog.json');
const { series, titleRules, fieldGroups, ignored } = read('../data/tag-taxonomy.json');

const seriesTags = new Set(Object.keys(series));
const ignoredTags = new Set(ignored);
const fieldTags = new Set(fieldGroups.flatMap((g) => g.tags));

const count = {};
for (const book of books) for (const tag of book.tags) count[tag] = (count[tag] ?? 0) + 1;

const unclassified = Object.keys(count)
  .filter((t) => !seriesTags.has(t) && !fieldTags.has(t) && !ignoredTags.has(t))
  .sort((a, b) => count[b] - count[a]);

const fieldOf = new Map();
for (const group of fieldGroups) {
  for (const tag of group.tags) fieldOf.set(tag, [...(fieldOf.get(tag) ?? []), group.name]);
}
const fieldsOf = (tags) => [...new Set(tags.flatMap((t) => fieldOf.get(t) ?? []))];
const seriesOf = (book) => {
  const found = new Set(book.tags.filter((t) => seriesTags.has(t)).map((t) => series[t]));
  const title = book.title.trim();
  for (const rule of titleRules) if (title.endsWith(rule.suffix)) found.add(rule.series);
  return [...found];
};

const noField = books.filter((b) => fieldsOf(b.tags).length === 0);
const noSeries = books.filter((b) => seriesOf(b).length === 0);

console.log(`카탈로그 ${books.length}권 / 고유 태그 ${Object.keys(count).length}종\n`);

console.log('--- 시리즈별 권수');
const seriesCount = {};
for (const b of books) for (const s of seriesOf(b)) seriesCount[s] = (seriesCount[s] ?? 0) + 1;
for (const [name, n] of Object.entries(seriesCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(16)} ${n}권`);
}
console.log(`  ${'(시리즈 없음)'.padEnd(16)} ${noSeries.length}권`);

console.log('\n--- 분야별 권수 (한 책이 여러 분야에 걸릴 수 있음)');
const fieldCount = {};
for (const b of books) for (const f of fieldsOf(b.tags)) fieldCount[f] = (fieldCount[f] ?? 0) + 1;
for (const [name, n] of Object.entries(fieldCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(16)} ${n}권`);
}

console.log(`\n--- 분야가 하나도 없는 책: ${noField.length}권`);
for (const b of noField.slice(0, 15)) console.log(`  · ${b.title}  [${b.tags.join(', ')}]`);
if (noField.length > 15) console.log(`  … 외 ${noField.length - 15}권`);

console.log(`\n--- 분류표에 없는 태그: ${unclassified.length}종`);
for (const tag of unclassified) console.log(`  · ${tag} (${count[tag]}권)`);

if (unclassified.length > 0) process.exitCode = 1;
