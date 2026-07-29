import liberalData from '@/data/liberal.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LiberalData, LiberalLesson } from '@/types';

export function getLiberalLessons(): LiberalLesson[] {
  return (liberalData as LiberalData).lessons;
}

export function getLiberalLessonById(id: string): LiberalLesson | undefined {
  return getLiberalLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 글 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayLiberalLesson(): LiberalLesson | undefined {
  return pickTodayLesson(getLiberalLessons());
}
