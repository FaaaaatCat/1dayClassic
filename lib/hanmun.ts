import hanmunData from '@/data/hanmun.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { HanmunData, HanmunLesson } from '@/types';

export function getHanmunLessons(): HanmunLesson[] {
  return (hanmunData as HanmunData).lessons;
}

export function getHanmunLessonById(id: string): HanmunLesson | undefined {
  return getHanmunLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 구절 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayHanmunLesson(): HanmunLesson | undefined {
  return pickTodayLesson(getHanmunLessons());
}
