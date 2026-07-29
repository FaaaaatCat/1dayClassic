import englishData from '@/data/english.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { EnglishData, EnglishLesson } from '@/types';

export function getEnglishLessons(): EnglishLesson[] {
  return (englishData as EnglishData).lessons;
}

export function getEnglishLessonById(id: string): EnglishLesson | undefined {
  return getEnglishLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 표현 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayEnglishLesson(): EnglishLesson | undefined {
  return pickTodayLesson(getEnglishLessons());
}
