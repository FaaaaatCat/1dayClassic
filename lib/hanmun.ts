import hanmunData from '@/data/hanmun.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { HanmunData, HanmunLesson, LessonHeading } from '@/types';

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

/** 원문에 달린 해설 번호 마커(①②③…) — 목차 한 줄에는 군더더기라 떼고 보여 준다. */
const NOTE_MARKERS = /[①-⑳]/g;

/** 목차 표제 — 한문 원문과 우리말 번역. */
export function getHanmunHeading(lesson: HanmunLesson): LessonHeading {
  return { title: lesson.hanmun.replace(NOTE_MARKERS, ''), subtitle: lesson.meaning };
}
