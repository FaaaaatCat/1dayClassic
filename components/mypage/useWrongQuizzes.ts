import { useMemo } from 'react';

import { useQuiz } from '@/context/QuizContext';
import { getBookCalendar, getBookLesson } from '@/lib/books';
import type { BookId, Quiz } from '@/types';

/** 틀린 문제 한 개 — 어느 날 몇 번째 문제였고, 무엇을 골랐는지까지. */
export interface WrongQuiz {
  /** 화면의 key로 쓴다 — 항목과 문제 번호를 합치면 책 안에서 유일하다. */
  key: string;
  lessonId: string;
  /** 항목 안 문제 번호(0부터). 화면에는 +1로 적는다. */
  index: number;
  /** 그 항목의 문제 수 — '2번째 / 총 3문제'처럼 적기 위해. */
  total: number;
  /** 목차에 적힌 그 항목의 표제. 어느 날 문제였는지 알려 준다. */
  lessonTitle: string;
  month: number;
  day: number;
  quiz: Quiz;
  /** 내가 고른 오답 번호. */
  picked: 1 | 2 | 3 | 4;
}

export interface WrongQuizzes {
  /** 틀린 문제들 — 목차 차례대로(앞 날짜가 먼저), 한 항목 안에서는 문제 번호 순. */
  wrong: WrongQuiz[];
  /** 지금까지 푼 문제 수 — 하나도 안 풀었을 때와 다 맞았을 때를 화면이 갈라 말하려면 필요하다. */
  solved: number;
}

/**
 * 그 책에서 틀린 문제들.
 *
 * QuizContext에 문제 하나하나의 답이 남아 있어서(어느 항목의 몇 번째 문제를 몇 번으로
 * 골랐는지), 그 기록과 원래 문제를 다시 짝지어 준다. 기록에는 고른 번호만 있고 문제·보기·
 * 해설은 콘텐츠 쪽에 있으므로, 여기서 둘을 합치지 않으면 화면이 보여 줄 것이 없다.
 *
 * 차례는 목차 순서다 — 틀린 순서(시간)가 아니라 책의 차례로 두어야 다시 읽으러 갈 때
 * 목차와 같은 자리에서 찾는다.
 *
 * @param bookId 학습 콘텐츠가 없는 책은 undefined다 — 셀 문제가 없으므로 빈 결과를 준다.
 */
export function useWrongQuizzes(bookId?: BookId): WrongQuizzes {
  const { quizOf } = useQuiz();

  return useMemo(() => {
    if (!bookId) return { wrong: [], solved: 0 };

    const days = getBookCalendar(bookId).filter((day) => day.lessonId !== undefined);
    const wrong: WrongQuiz[] = [];
    let solved = 0;

    for (const day of days) {
      const lessonId = day.lessonId!;
      const record = quizOf(lessonId);
      if (!record) continue;

      const lesson = getBookLesson(bookId, lessonId)?.lesson;
      // 기록은 맵이라 순서가 보장되지 않는다 — 문제 번호로 세워 둔다.
      const indexes = Object.keys(record.answers)
        .map(Number)
        .sort((a, b) => a - b);

      for (const index of indexes) {
        const answer = record.answers[index];
        solved += 1;
        if (answer.correct) continue;

        // 한 문제만 드는 책은 quizzes 대신 quiz에 들어 있다(types/index.ts 참고).
        const quiz = lesson?.quizzes?.[index] ?? (index === 0 ? lesson?.quiz : undefined);
        // 콘텐츠가 바뀌어 그 문제가 사라졌으면 보여 줄 것이 없다 — 기록만 남기고 건너뛴다.
        if (!quiz) continue;

        wrong.push({
          key: `${lessonId}-${index}`,
          lessonId,
          index,
          total: record.total,
          lessonTitle: day.title,
          month: day.month,
          day: day.day,
          quiz,
          picked: answer.choice,
        });
      }
    }

    return { wrong, solved };
  }, [bookId, quizOf]);
}
