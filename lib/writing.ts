import writingData from '@/data/writing.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { WritingData, WritingLesson } from '@/types';

export function getWritingLessons(): WritingLesson[] {
  return (writingData as WritingData).lessons;
}

export function getWritingLessonById(id: string): WritingLesson | undefined {
  return getWritingLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 글 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayWritingLesson(): WritingLesson | undefined {
  return pickTodayLesson(getWritingLessons());
}
