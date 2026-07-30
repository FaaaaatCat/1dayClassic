import hanjaData from '@/data/hanja.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { HanjaData, HanjaLesson, LessonHeading } from '@/types';

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

/** 목차 표제 — 낱글자와 훈음. 두 자를 함께 다루는 날은 가운뎃점으로 잇는다. */
export function getHanjaHeading(lesson: HanjaLesson): LessonHeading {
  return {
    title: lesson.characters.map((character) => character.hanja).join(' · '),
    subtitle: lesson.characters
      .map((character) => `${character.meaning}-${character.sound}`)
      .join(' · '),
  };
}
