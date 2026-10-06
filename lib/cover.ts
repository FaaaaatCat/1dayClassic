import { findLesson } from '@/lib/books';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import { getCoverDesign } from '@/lib/coverDesign';
import type { BookId, CoverDesign, DailyLesson, UnsplashPhoto } from '@/types';

export type { UnsplashPhoto };

/**
 * 항목 표지를 무엇으로 채울지.
 *
 * 우선순위는 여기 한 곳에서만 정한다 — 화면마다 따로 판단하면 홈과 상세가 다른 표지를
 * 그리게 된다.
 *
 * 1. 항목에 coverImage가 있으면 그것. 사람이 고른 그림이라 자동으로 가져온 것보다 앞선다.
 * 2. 없으면 그 항목에 골라 둔 Unsplash 사진과 크레딧.
 * 3. 사진이 없으면 그 책의 표지 값(coverDesign) — 종이색 바탕에 잉크색 마크. 예전의 '표식'
 *    층이 여기로 흡수됐다. 표식이 책마다 따로 놀던 값이었던 데 비해, 표지 값은 종이색·
 *    잉크색과 한 벌이라 그 책의 표지와 항목 표지가 같은 결로 그려진다.
 * 4. 그마저 없으면 검은 바탕만.
 *
 * 한때 표지 값이 사진보다 앞섰다(사진을 붙이면 책이 아니라 콘텐츠 카드로 읽힌다는 이유로).
 * 그러자 사진을 골라 둔 항목에서도 사진이 영영 나오지 않아, 사진을 다시 앞에 세웠다.
 * 사진을 쓰지 않는 책(클래식·듣기)은 데이터에 사진이 없으니 그대로 표지 값으로 그려진다.
 *
 * 책 표지(홈·서점·서재의 표지 그림)는 이 함수가 아니라 getBookCoverPlan이 정한다.
 * 항목 표지는 '그날의 속표지'라 표제가 항목의 것이고, 책 표지는 책 제목이 인쇄된 물건이다.
 */
export type CoverPlan =
  | { kind: 'image'; source: string }
  | { kind: 'design'; design: CoverDesign }
  | { kind: 'unsplash'; photo: UnsplashPhoto }
  | { kind: 'blank' };

/**
 * @param bookId 아는 쪽에서 넘겨 주면 항목 id로 책을 되찾는 조회를 건너뛴다.
 */
export function getCoverPlan(lesson: DailyLesson, bookId?: BookId): CoverPlan {
  const source = lesson.coverImage?.trim();
  if (source) return { kind: 'image', source };

  const photo = lesson.unsplash;
  if (photo?.url && photo.photographer) return { kind: 'unsplash', photo };

  const id = bookId ?? findLesson(lesson.id)?.book;
  if (id) return { kind: 'design', design: getCoverDesign(id) };

  return { kind: 'blank' };
}

/**
 * 책 표지를 무엇으로 채울지 — 홈·서점·서재·상세가 함께 쓴다.
 *
 * `coverImage`가 앞서는 것은 출판사가 준 진짜 표지가 있으면 그것이 맞기 때문이다.
 * 없으면 코드로 그린다. 그리는 쪽이 폴백인 것이 아니라, 표지가 없는 상품(코스)이나
 * 해상도가 낮은 표지에서는 그리는 쪽이 유일한 답이다.
 */
export type BookCoverPlan =
  | { kind: 'image'; source: string }
  | { kind: 'design'; design: CoverDesign }
  | { kind: 'blank' };

/**
 * @param coverImage 카탈로그에만 있는 책의 표지 주소.
 * @param design 카탈로그에만 있는 책이 들고 있는 표지 값.
 *
 * 학습 가능한 열 권은 표지 주소도 표지 값도 이 인자가 아니라 제 자리에서 가져온다
 * (lib/bookstore와 lib/coverDesign). 두 곳을 가르는 이유는 성격이 다르기 때문이다 —
 * 그 열 권은 목차와 알람까지 딸린 책이라 표지 값이 코드 쪽에 있어야 하고, 카탈로그의
 * 나머지는 전시용이라 데이터에 함께 실려 있는 편이 낫다.
 */
export function getBookCoverPlan(
  bookId?: BookId | null,
  coverImage?: string,
  design?: CoverDesign,
): BookCoverPlan {
  const source = (
    bookId ? BOOKSTORE_BOOKS.find((book) => book.id === bookId)?.coverImage : coverImage
  )?.trim();
  if (source) return { kind: 'image', source };

  if (bookId) return { kind: 'design', design: getCoverDesign(bookId) };
  if (design) return { kind: 'design', design };
  return { kind: 'blank' };
}
