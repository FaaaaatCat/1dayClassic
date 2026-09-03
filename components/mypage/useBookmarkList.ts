import { useMemo } from 'react';

import { useBookmarks } from '@/context/BookmarkContext';
import { getBookCalendar, getBookLesson, getLessonHeading, type BookLesson } from '@/lib/books';
import { buildCardPages, getLessonEpigraph, type CardPageKind } from '@/lib/card-pages';
import type { BookId } from '@/types';

/** 꽂아 둔 책갈피 하나 — 그 장에 무엇이 적혀 있었는지까지 붙여 준다. */
export interface BookmarkEntry {
  /** 화면의 key로 쓴다 — 항목과 장 번호를 합치면 책 안에서 유일하다. */
  key: string;
  lessonId: string;
  /** 그 항목의 몇 번째 장인지(0부터). 화면에는 +1로 적는다. */
  page: number;
  /** 그 항목이 모두 몇 장인지 — '3 / 12장'처럼 적기 위해. */
  pageCount: number;
  /** 목차에 적힌 그 항목의 표제. */
  lessonTitle: string;
  month: number;
  day: number;
  at: Date;
  /** 접어 둔 장에 적혀 있던 글. 글이 없는 장(표지·맺음)은 undefined. */
  text?: string;
  /** 글이 없는 장을 무엇이라 부를지 — '표지', '맺음'. */
  label?: string;
}

/**
 * 그 책에 꽂아 둔 책갈피들.
 *
 * 저장된 것은 '어느 항목의 몇 번째 장'뿐이라, 그 장에 무엇이 적혀 있었는지는 여기서 다시
 * 만들어 낸다 — 카드 나누는 규칙(buildCardPages)이 같은 항목에서 늘 같은 장을 내주므로,
 * 접을 때와 펼칠 때의 장 번호가 어긋나지 않는다.
 *
 * 뒤집어 말하면 콘텐츠(story)가 바뀌면 장 나눔도 바뀌어 예전 책갈피가 다른 글을 가리킬 수
 * 있다. 장 번호가 아니라 글을 저장해 두면 막을 수 있지만, 그러면 책갈피가 '자리'가 아니라
 * '복사본'이 된다 — 접어 둔 자리로 되돌아가는 물건이므로 자리를 저장하는 쪽을 택했다.
 *
 * 차례는 최근에 꽂은 순이다(BookmarkContext.listOf). 접어 둔 자리는 방금 접은 것부터
 * 찾게 된다.
 *
 * @param bookId 학습 콘텐츠가 없는 책은 undefined다 — 꽂을 장이 없으므로 빈 목록을 준다.
 */
export function useBookmarkList(bookId?: BookId): BookmarkEntry[] {
  const { listOf } = useBookmarks();

  return useMemo(() => {
    if (!bookId) return [];

    // 목차에서 표제와 날짜를 가져온다 — 책갈피에는 항목 id만 있다.
    const dayOf = new Map(
      getBookCalendar(bookId)
        .filter((day) => day.lessonId !== undefined)
        .map((day) => [day.lessonId!, day]),
    );

    const entries: BookmarkEntry[] = [];

    for (const mark of listOf(bookId)) {
      const day = dayOf.get(mark.lessonId);
      const bookLesson = getBookLesson(bookId, mark.lessonId);
      // 콘텐츠에서 사라진 항목을 가리키는 책갈피는 보여 줄 것이 없다.
      if (!day || !bookLesson) continue;

      const quizCount = bookLesson.lesson.quizzes?.length ?? (bookLesson.lesson.quiz ? 1 : 0);
      const pages = buildCardPages(bookLesson, { hasQuiz: quizCount > 0 });
      const card = pages[mark.page];
      // 글이 짧아져 그 장이 없어졌으면 가리킬 자리가 없다.
      if (!card) continue;

      const { text, label } = describe(card.kind, card.paragraph, bookLesson);

      entries.push({
        key: `${mark.lessonId}-${mark.page}`,
        lessonId: mark.lessonId,
        page: mark.page,
        pageCount: pages.length,
        lessonTitle: day.title,
        month: day.month,
        day: day.day,
        at: new Date(mark.at),
        text,
        label,
      });
    }

    return entries;
  }, [bookId, listOf]);
}

/** 장 한 개를 목록에 어떻게 적을지 — 본문은 글을, 나머지는 이름을 내준다. */
function describe(
  kind: CardPageKind,
  paragraph: string | undefined,
  bookLesson: BookLesson,
): { text?: string; label?: string } {
  switch (kind) {
    case 'desc':
      return { text: paragraph };
    case 'quote':
      return { text: getLessonEpigraph(bookLesson)?.text, label: '인용' };
    case 'cover':
      return { text: getLessonHeading(bookLesson).title, label: '표지' };
    case 'outro':
      // 맺음 장에는 읽을 글이 없다 — 오늘의 공부를 맺는 버튼들만 있는 자리다.
      return { label: '맺음' };
  }
}
