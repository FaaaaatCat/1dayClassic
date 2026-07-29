import hanjaData from '@/data/hanja.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { HanjaData, HanjaLesson } from '@/types';

export function getHanjaLessons(): HanjaLesson[] {
  return (hanjaData as HanjaData).lessons;
}

export function getHanjaLessonById(id: string): HanjaLesson | undefined {
  return getHanjaLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 한자 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayHanjaLesson(): HanjaLesson | undefined {
  return pickTodayLesson(getHanjaLessons());
}
