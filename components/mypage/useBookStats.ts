import { useMemo } from 'react';

import { useBookmarks } from '@/context/BookmarkContext';
import { useNotes } from '@/context/NotesContext';
import { useQuiz } from '@/context/QuizContext';
import { getBookCalendar } from '@/lib/books';
import { getReadingProgress } from '@/lib/progress';
import type { BookId } from '@/types';

export interface BookStats {
  /** 이 책을 읽은 날의 수 — 같은 날 여러 장을 읽어도 하루로 센다. */
  daysRead: number;
  readPages: number;
  totalPages: number;
  /** 푼 문제 수와 맞힌 수. 아직 푼 것이 없으면 둘 다 0이다. */
  quizTotal: number;
  quizCorrect: number;
  /** 0~100. 푼 것이 없으면 0. */
  correctRate: number;
  bookmarks: number;
  notes: number;
  /** 마지막으로 읽은 날. 한 번도 안 읽었으면 undefined. */
  lastReadAt?: Date;
}

/** "2026.08.14(금)" */
export function formatReadDate(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}(${days[date.getDay()]})`;
}

/**
 * 한 책의 독서 기록.
 *
 * '읽었다'의 기준은 퀴즈를 푼 것이다 — 이 앱에서 한 장을 끝냈다는 유일한 기록이라, 넘겨만
 * 보고 나간 것과 끝까지 읽은 것을 그것으로 가른다. 한 항목의 문제를 '전부' 풀어야 읽은
 * 것으로 치고(QuizContext.isDone), 읽은 시각도 그 기록(QuizAnswer.at)에
 * 남아 있어서, 며칠에 걸쳐 읽었는지와 마지막으로 읽은 날을 여기서 셀 수 있다.
 *
 * 화면이 요구하지만 우리가 아직 갖고 있지 않은 것이 둘 있다 — 총 독서 '시간'과 '상위 몇
 * 퍼센트'. 앞엣것은 머문 시간을 재는 장치가 없고, 뒤엣것은 다른 사람의 기록을 알아야 해서
 * 서버가 필요하다. 지어내지 않고 화면에서 뺐다.
 *
 * @param bookId 학습 콘텐츠가 없는 책(하루 서점에만 있는 책)은 undefined다 — 셀 것이
 * 없으므로 전부 0으로 돌려준다.
 */
export function useBookStats(bookId?: BookId): BookStats {
  const { quizOf, isDone } = useQuiz();
  const { countOf } = useBookmarks();
  const { notesOf } = useNotes();

  return useMemo(() => {
    if (!bookId) {
      return {
        daysRead: 0,
        readPages: 0,
        totalPages: 0,
        quizTotal: 0,
        quizCorrect: 0,
        correctRate: 0,
        bookmarks: 0,
        notes: 0,
      };
    }

    const lessons = getBookCalendar(bookId).filter((day) => day.lessonId !== undefined);

    const days = new Set<string>();
    let quizTotal = 0;
    let quizCorrect = 0;
    let notes = 0;
    let last: Date | undefined;

    for (const day of lessons) {
      const lessonId = day.lessonId!;
      notes += notesOf(lessonId).length;

      const record = quizOf(lessonId);
      if (!record) continue;

      // 정답률은 '문제' 단위다 — 항목을 다 풀었는지와 무관하게, 푼 문제만 세고 그중
      // 맞힌 것을 센다. 읽은 날은 항목이 아니라 답 하나하나가 찍힌 시각으로 센다.
      for (const answer of Object.values(record.answers)) {
        quizTotal += 1;
        if (answer.correct) quizCorrect += 1;

        const at = new Date(answer.at);
        if (Number.isNaN(at.getTime())) continue;
        // 같은 날 여러 장을 읽어도 하루로 센다.
        days.add(at.toDateString());
        if (!last || at > last) last = at;
      }
    }

    const progress = getReadingProgress(bookId, isDone);

    return {
      daysRead: days.size,
      readPages: progress.readPages,
      totalPages: progress.totalPages,
      quizTotal,
      quizCorrect,
      correctRate: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0,
      bookmarks: countOf(bookId),
      notes,
      lastReadAt: last,
    };
  }, [bookId, quizOf, isDone, countOf, notesOf]);
}
