import liberalData from '@/data/liberal.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LessonHeading, LiberalData, LiberalLesson } from '@/types';

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

/**
 * 목차 표제 — 글 제목만. source는 참고 도서 서지("『재즈 잇 업!』, 남무성 지음, …")라
 * 한 줄에 담기지 않아 부제로 쓰지 않는다.
 */
export function getLiberalHeading(lesson: LiberalLesson): LessonHeading {
  return { title: lesson.title };
}
