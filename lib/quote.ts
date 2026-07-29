import quoteData from '@/data/quote.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { QuoteData, QuoteLesson } from '@/types';

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
