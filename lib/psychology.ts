import psychologyData from '@/data/psychology.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LessonHeading, PsychologyData, PsychologyLesson } from '@/types';

export function getPsychologyLessons(): PsychologyLesson[] {
  return (psychologyData as PsychologyData).lessons;
}

export function getPsychologyLessonById(id: string): PsychologyLesson | undefined {
  return getPsychologyLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 글 — 데모 범위에서는 시스템 날짜 대신 featured 항목(1월 1일)으로 고정한다. */
export function getTodayPsychologyLesson(): PsychologyLesson | undefined {
  return pickTodayLesson(getPsychologyLessons());
}

/** 목차 표제 — 글 제목만. 이 책에는 부제로 쓸 필드가 없다. */
export function getPsychologyHeading(lesson: PsychologyLesson): LessonHeading {
  return { title: lesson.title };
}
