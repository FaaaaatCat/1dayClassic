/**
 * 어떤 검색어로 사진을 찾을지 — 규칙은 여기 한 곳에만 있다.
 *
 * 미리 보는 스크립트(check-image-queries)와 실제로 가져오는 스크립트(fetch-unsplash)가
 * 이 파일을 함께 읽는다. 둘이 각자 규칙을 갖고 있으면 '무엇으로 검색할지'와 '무엇으로
 * 검색했는지'가 어긋난다.
 *
 * 앱에는 들어가지 않는다. 앱은 이미 골라 둔 결과(lesson.unsplash)를 보여 줄 뿐이라
 * 검색 규칙을 알 필요가 없다.
 */
import { readFileSync } from 'node:fs';

/** 책마다 쓸 검색어 묶음. 낱말을 손보는 일이 코드를 고치는 일이 되지 않도록 데이터에 둔다. */
export const BOOK_KEYWORDS = JSON.parse(
  readFileSync(new URL('../data/image-keywords.json', import.meta.url), 'utf8'),
);

/**
 * 검색 결과에서 몇 번째까지 후보로 볼지(Unsplash가 한 번에 주는 최대치).
 *
 * 낱말 12개에 후보 10개면 한 책이 가질 수 있는 조합이 120가지뿐이라, 365일을 채우면
 * 대부분이 같은 사진이 된다. 후보를 30으로 넓히고, 그래도 겹치면 가져오는 쪽에서 이미 쓴
 * 사진을 건너뛴다(fetch-unsplash).
 */
export const CANDIDATES = 30;

/**
 * 항목 id를 숫자로 바꾼다(FNV-1a).
 *
 * 항목의 순서가 아니라 id를 쓰는 건, 날짜를 옮기거나 사이에 항목을 끼워 넣어도 그 항목이
 * 고르던 낱말이 그대로 남게 하려는 것이다. 순서로 고르면 하루를 끼우는 순간 뒤엣것이 전부
 * 다른 사진으로 바뀐다.
 */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * 이 항목으로 무엇을 검색할지.
 *
 * 항목이 제 검색어(imageKeyword)를 갖고 있으면 그것을 쓴다 — 사람이 정한 것이 언제나
 * 앞선다. 없으면 책의 낱말 묶음에서 id로 하나 고른다. 같은 항목은 언제 돌려도 같은
 * 낱말과 같은 결과 자리를 고른다.
 */
export function buildQuery(bookId, lesson) {
  const own = lesson.imageKeyword?.trim();
  const pool = BOOK_KEYWORDS[bookId];
  if (!own && (!pool || pool.length === 0)) return undefined;

  const seed = hash(lesson.id);
  return {
    query: own ?? pool[seed % pool.length],
    orientation: 'landscape',
    contentFilter: 'high',
    // 낱말을 고른 것과 다른 자리를 보게 해서, 같은 낱말이 걸린 항목들이 같은 사진을 갖지 않게 한다.
    pick: Math.floor(seed / 7) % CANDIDATES,
  };
}

/** 항목이 실린 데이터 파일 — 사진이 필요한 책만(표식이 있는 책은 사진을 쓰지 않는다). */
export const BOOK_FILES = {
  latin: 'latin.json',
  quote: 'quote.json',
  hanja: 'hanja.json',
  hanmun: 'hanmun.json',
  psychology: 'psychology.json',
  writing: 'writing.json',
  english: 'english.json',
  liberal: 'liberal.json',
};

/** 그 책의 항목들 — 원고가 있는 것만. */
export function readLessons(file) {
  const json = JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
  const list = Array.isArray(json) ? json : Object.values(json).flat();
  return list.filter((item) => item && item.story);
}
