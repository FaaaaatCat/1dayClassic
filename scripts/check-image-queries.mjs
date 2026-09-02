/**
 * `npm run check:queries` — 사진을 가져오기 전에, 어떤 검색어로 가져올지 미리 본다.
 *
 * Unsplash에 요청하지 않는다. lib/unsplash-query의 규칙만 그대로 돌려서, 항목마다 무슨
 * 낱말이 걸리는지와 낱말이 고르게 흩어지는지를 보여 준다. 검색어가 사진의 질을 정하므로
 * 3,285장을 받기 전에 여기서 먼저 눈으로 확인하는 것이 싸다.
 */
import { readFileSync } from 'node:fs';

/** 규칙과 같은 파일을 읽는다 — 둘이 갈라지면 확인이 확인이 아니게 된다. */
function loadKeywords() {
  return JSON.parse(readFileSync(new URL('../data/image-keywords.json', import.meta.url), 'utf8'));
}

/** lib/unsplash-query의 hash와 같은 것(FNV-1a). 둘이 달라지면 결과가 어긋난다. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const FILES = {
  latin: 'latin.json',
  quote: 'quote.json',
  hanja: 'hanja.json',
  hanmun: 'hanmun.json',
  psychology: 'psychology.json',
  writing: 'writing.json',
  english: 'english.json',
  liberal: 'liberal.json',
};

const pools = loadKeywords();
let total = 0;

for (const [bookId, file] of Object.entries(FILES)) {
  const pool = pools[bookId];
  if (!pool) {
    console.log(`\n[${bookId}] 낱말 묶음 없음 — 검은 바탕으로 간다`);
    continue;
  }

  let json;
  try {
    json = JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
  } catch {
    continue;
  }
  const lessons = (Array.isArray(json) ? json : Object.values(json).flat()).filter(
    (item) => item && item.story,
  );
  if (lessons.length === 0) continue;

  const tally = {};
  console.log(`\n[${bookId}] 항목 ${lessons.length}개 · 낱말 ${pool.length}개`);
  for (const lesson of lessons) {
    const seed = hash(lesson.id);
    const query = lesson.imageKeyword?.trim() ?? pool[seed % pool.length];
    const pick = Math.floor(seed / 7) % 10;
    tally[query] = (tally[query] ?? 0) + 1;
    total += 1;
    console.log(`  ${String(lesson.date ?? '').padEnd(8)} ${query}  (${pick}번째 결과)`);
  }

  const used = Object.keys(tally).length;
  const most = Math.max(...Object.values(tally));
  console.log(`  → 쓰인 낱말 ${used}/${pool.length}, 가장 많이 쓰인 낱말 ${most}번`);
}

console.log(`\n검색할 항목 ${total}개.`);
