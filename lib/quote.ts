import quoteData from '@/data/quote.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LessonHeading, QuoteData, QuoteLesson } from '@/types';

export function getQuoteLessons(): QuoteLesson[] {
  return (quoteData as QuoteData).lessons;
}

export function getQuoteLessonById(id: string): QuoteLesson | undefined {
  return getQuoteLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 명구 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayQuoteLesson(): QuoteLesson | undefined {
  return pickTodayLesson(getQuoteLessons());
}

/**
 * 목차 표제 — 한자 원문이 첫 줄, 독음과 우리말 뜻이 둘째 줄.
 *
 * 지면에서는 우리말 뜻이 가장 크게 오지만, 목차 행은 한 줄뿐이어서 뜻을 첫 줄에 두면
 * 스무 자를 넘는 날("밭의 경계를 서로 양보하고, 나이 많은 …")이 잘려 식별이 안 된다.
 * 짧고 또렷한 원문을 앞에 세운다 — 한자 공부 책의 목차와 같은 짜임이다.
 */
export function getQuoteHeading(lesson: QuoteLesson): LessonHeading {
  return { title: lesson.quote, subtitle: `${lesson.reading} · ${lesson.meaning}` };
}
