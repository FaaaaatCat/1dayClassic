/**
 * `npm run check:queries` — 사진을 가져오기 전에, 어떤 검색어로 가져올지 미리 본다.
 *
 * Unsplash에 요청하지 않는다. scripts/query-rule의 규칙만 그대로 돌려서, 항목마다 무슨
 * 낱말이 걸리는지와 낱말이 고르게 흩어지는지를 보여 준다. 검색어가 사진의 질을 정하므로
 * 3,285장을 받기 전에 여기서 먼저 눈으로 확인하는 것이 싸다.
 */
import { BOOK_FILES, BOOK_KEYWORDS, buildQuery, readLessons } from './query-rule.mjs';

let total = 0;

for (const [bookId, file] of Object.entries(BOOK_FILES)) {
  const pool = BOOK_KEYWORDS[bookId];
  if (!pool) {
    console.log(`\n[${bookId}] 낱말 묶음 없음 — 검은 바탕으로 간다`);
    continue;
  }

  let lessons;
  try {
    lessons = readLessons(file);
  } catch {
    continue;
  }
  if (lessons.length === 0) continue;

  const tally = {};
  console.log(`\n[${bookId}] 항목 ${lessons.length}개 · 낱말 ${pool.length}개`);
  for (const lesson of lessons) {
    const plan = buildQuery(bookId, lesson);
    tally[plan.query] = (tally[plan.query] ?? 0) + 1;
    total += 1;
    const mark = lesson.unsplash?.url ? '  ✓이미 있음' : '';
    console.log(
      `  ${String(lesson.date ?? '').padEnd(8)} ${plan.query}  (${plan.pick}번째 결과)${mark}`,
    );
  }

  const used = Object.keys(tally).length;
  const most = Math.max(...Object.values(tally));
  console.log(`  → 쓰인 낱말 ${used}/${pool.length}, 가장 많이 쓰인 낱말 ${most}번`);
}

console.log(`\n검색할 항목 ${total}개.`);
