import { useMemo } from 'react';

import { useQuiz } from '@/context/QuizContext';
import { useShelf } from '@/context/ShelfContext';
import { getCatalogBooks, type CatalogBook } from '@/lib/catalog';
import { getReadingProgress } from '@/lib/progress';
import type { BookId } from '@/types';

export interface ShelfBook {
  book: CatalogBook;
  /** 0~100. 학습 콘텐츠가 없는 책(bookId가 없는 책)은 0이다. */
  percent: number;
  readPages: number;
  totalPages: number;
}

/**
 * 서재에 담아 둔 책들을, 다 읽은 것과 아직 읽을 것으로 가른다.
 *
 * 100%가 되는 순간 '읽을 예정'에서 빠지고 '완독한 책'으로 옮겨 간다 — 두 목록이 같은
 * 기준을 나눠 쓰므로 한 책이 양쪽에 동시에 있을 수 없다.
 *
 * 하루 서점에는 학습 콘텐츠가 없는 책도 있다(bookId가 없는 책). 그런 책은 읽을 것이 없어
 * 완독도 없으므로 늘 0%로 두고 '읽을 예정'에 남긴다.
 */
export function useShelfBooks(): { planned: ShelfBook[]; finished: ShelfBook[] } {
  const { shelfIds } = useShelf();
  const { attemptOf } = useQuiz();

  return useMemo(() => {
    const catalogById = new Map(getCatalogBooks().map((book) => [book.id, book]));
    const isRead = (lessonId: string) => attemptOf(lessonId) !== undefined;

    const entries: ShelfBook[] = [...shelfIds]
      // 최근에 담은 것이 위로 — shelfIds는 오래된 것 먼저다.
      .reverse()
      .map((id) => catalogById.get(id))
      .filter((book): book is CatalogBook => book !== undefined)
      .map((book) => {
        if (book.bookId === null) return { book, percent: 0, readPages: 0, totalPages: 0 };
        const progress = getReadingProgress(book.bookId as BookId, isRead);
        const percent =
          progress.totalPages > 0
            ? Math.round((progress.readPages / progress.totalPages) * 100)
            : 0;
        return {
          book,
          percent,
          readPages: progress.readPages,
          totalPages: progress.totalPages,
        };
      });

    return {
      planned: entries.filter((entry) => entry.percent < 100),
      finished: entries.filter((entry) => entry.percent >= 100),
    };
  }, [shelfIds, attemptOf]);
}
