import listeningData from '@/data/listening.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LessonHeading, ListeningData, ListeningLesson } from '@/types';

export function getListeningLessons(): ListeningLesson[] {
  return (listeningData as ListeningData).lessons;
}

export function getListeningLessonById(id: string): ListeningLesson | undefined {
  return getListeningLessons().find((lesson) => lesson.id === id);
}

/** 오늘의 글 — 데모 범위에서는 시스템 날짜 대신 featured 항목으로 고정한다. */
export function getTodayListeningLesson(): ListeningLesson | undefined {
  return pickTodayLesson(getListeningLessons());
}

/** 목차 표제 — 글 제목과 인용문의 출처. 쓰기의 말들과 같은 짜임이다. */
export function getListeningHeading(lesson: ListeningLesson): LessonHeading {
  return { title: lesson.title, subtitle: lesson.epigraphBy };
}
