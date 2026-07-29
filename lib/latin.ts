import latinData from '@/data/latin.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LatinData, LatinLesson } from '@/types';

export function getLatinLessons(): LatinLesson[] {
  return (latinData as LatinData).lessons;
}

export function getLatinLessonById(id: string): LatinLesson | undefined {
  return getLatinLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 문장 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayLatinLesson(): LatinLesson | undefined {
  return pickTodayLesson(getLatinLessons());
}
