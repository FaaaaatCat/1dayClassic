import keywords from '@/data/image-keywords.json';
import type { BookId, DailyLesson } from '@/types';

/**
 * Unsplash에서 무엇을 검색할지.
 *
 * 검색어가 사진의 질을 정한다. 항목 제목을 그대로 넣는 건 안 된다 — Unsplash 검색은
 * 사실상 영어이고, "피치카토 폴카"나 "대학지도"를 넣으면 결과가 없거나 엉뚱한 것이 온다.
 * 영어가 있는 항목(하루 영어교양의 원문)도 관용구라 낱말로 쪼개면 뜻이 사라진다.
 *
 * 그래서 항목마다 검색어를 만들지 않고, **책마다 사람이 고른 낱말 묶음**에서 항목마다
 * 하나씩 꺼내 쓴다. 무엇을 넣을지 사람이 한 번만 정하면 365일이 그 결로 채워진다.
 */

/**
 * 책마다 쓸 검색어 묶음 — 값은 data/image-keywords.json에 있다.
 *
 * 코드가 아니라 데이터에 둔 건, 낱말을 손보는 일이 코드를 고치는 일이 아니어야 해서다.
 * 확인 스크립트(scripts/check-image-queries)도 같은 파일을 읽는다 — 둘이 갈라지면
 * '무엇으로 검색할지'와 '무엇으로 검색했는지'가 어긋난다.
 *
 * 낱말을 고를 때의 기준 셋:
 * - 그 책을 펼쳤을 때의 공기를 담는 낱말인가. 내용을 설명하는 낱말이 아니다.
 * - 사람 얼굴이 크게 잡히지 않는가. 표지 위에는 제목이 얹히므로 얼굴은 방해가 된다.
 * - 사진마다 결이 달라지는가. 비슷한 낱말만 모으면 365일이 한 장처럼 보인다.
 *
 * 표식이 있는 책(하루 클래식·듣기의 말들)은 여기 없다 — 그 책들은 검은 바탕에 표식으로
 * 가고 사진을 쓰지 않는다(lib/cover의 우선순위).
 */
export const BOOK_KEYWORDS = keywords as Partial<Record<BookId, readonly string[]>>;

/**
 * 항목 id를 숫자로 바꾼다(FNV-1a).
 *
 * 항목의 순서가 아니라 id를 쓰는 건, 날짜를 옮기거나 사이에 항목을 끼워 넣어도 그 항목이
 * 고르던 낱말이 그대로 남게 하려는 것이다. 순서로 고르면 하루를 끼우는 순간 뒤엣것이 전부
 * 다른 사진으로 바뀐다.
 */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** 검색 결과에서 몇 번째까지 후보로 볼지. 뒤로 갈수록 검색어와 멀어진다. */
const CANDIDATES = 10;

export interface UnsplashQuery {
  /** 검색어. */
  query: string;
  /** 표지는 가로가 길다 — 세로 사진이 오면 위아래가 잘린다. */
  orientation: 'landscape';
  /** 자극적인 사진을 걸러 달라고 요청한다. */
  contentFilter: 'high';
  /** 결과 중 몇 번째를 고를지. 같은 낱말이 걸려도 항목마다 다른 사진이 된다. */
  pick: number;
}

/**
 * 이 항목으로 무엇을 검색할지 정한다.
 *
 * 항목이 제 검색어를 갖고 있으면(imageKeyword) 그것을 쓴다 — 사람이 정한 것이 언제나
 * 앞선다. 없으면 책의 낱말 묶음에서 id로 하나 고른다.
 *
 * 같은 항목은 언제 돌려도 같은 결과를 낸다. 사진을 다시 뽑을 일이 생겨도 이미 고른
 * 사진들이 통째로 바뀌지 않아야 한다.
 */
export function buildUnsplashQuery(
  bookId: BookId,
  lesson: DailyLesson,
): UnsplashQuery | undefined {
  const own = lesson.imageKeyword?.trim();
  const pool = BOOK_KEYWORDS[bookId];
  if (!own && (!pool || pool.length === 0)) return undefined;

  const seed = hash(lesson.id);
  const query = own ?? pool![seed % pool!.length];
  return {
    query,
    orientation: 'landscape',
    contentFilter: 'high',
    // 낱말을 고른 것과 다른 자리를 보게 해서, 같은 낱말이 걸린 항목들이 같은 사진을 갖지 않게 한다.
    pick: Math.floor(seed / 7) % CANDIDATES,
  };
}
