import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import { findLesson } from '@/lib/books';
import type { BookId, DailyLesson, UnsplashPhoto } from '@/types';

export type { UnsplashPhoto };

/**
 * 표지를 무엇으로 채울지.
 *
 * 우선순위는 여기 한 곳에서만 정한다 — 화면마다 따로 판단하면 홈과 상세가 다른 표지를
 * 그리게 된다.
 *
 * 1. 항목에 coverImage가 있으면 그것. 사람이 고른 그림이라 자동으로 가져온 것보다 앞선다.
 * 2. 없고 책에 표식(symbol)이 있으면 검은 바탕에 표식.
 * 3. 둘 다 없으면 Unsplash 사진과 크레딧.
 * 4. 그마저 없거나 실패하면 검은 바탕만.
 */
export type CoverPlan =
  | { kind: 'image'; source: string }
  | { kind: 'symbol'; symbol: string }
  | { kind: 'unsplash'; photo: UnsplashPhoto }
  | { kind: 'blank' };

/** 그 책의 표식 — 없는 책은 undefined. */
export function symbolOf(bookId: BookId): string | undefined {
  return BOOKSTORE_BOOKS.find((book) => book.id === bookId)?.symbol;
}

/**
 * @param bookId 아는 쪽에서 넘겨 주면 항목 id로 책을 되찾는 조회를 건너뛴다.
 */
export function getCoverPlan(lesson: DailyLesson, bookId?: BookId): CoverPlan {
  const source = lesson.coverImage?.trim();
  if (source) return { kind: 'image', source };

  const id = bookId ?? findLesson(lesson.id)?.book;
  const symbol = id ? symbolOf(id) : undefined;
  if (symbol) return { kind: 'symbol', symbol };

  const photo = lesson.unsplash;
  if (photo?.url && photo.photographer) return { kind: 'unsplash', photo };

  return { kind: 'blank' };
}
