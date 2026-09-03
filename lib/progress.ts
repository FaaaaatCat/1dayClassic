import { getBookCalendar } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import type { CalendarDay } from '@/lib/calendar';
import type { BookId } from '@/types';

/**
 * 실제 원고가 있는 날들 — 목차 차례대로.
 *
 * 잠긴 자리표시(아직 원고가 없는 날)는 어디서도 세지 않는다. 읽을 수 없는 것을 총량에
 * 넣으면 완독이 영영 오지 않고, 이어읽기가 빈 날을 가리킨다.
 */
function lessonsOf(bookId: BookId): CalendarDay[] {
  return getBookCalendar(bookId).filter((day) => day.lessonId !== undefined);
}

/**
 * 무료로 열어 두는 항목 수 — 책 앞에서부터 다섯 개다.
 *
 * 시간과 무관하게 앞 다섯 개를 열어 둔다 — 처음 들어온 사람이 한 쪽만 보고 판단하지
 * 않아도 되게 하려는 것이다. 목차의 자물쇠와 홈의 이어읽기가 같은 값을 봐야 하므로
 * 여기 한 곳에만 둔다.
 */
export const FREE_LESSON_COUNT = 5;

/** 무료로 열려 있는 항목의 id들. */
export function getFreeLessonIds(bookId: BookId): Set<string> {
  return new Set(lessonsOf(bookId).slice(0, FREE_LESSON_COUNT).map((day) => day.lessonId!));
}

/**
 * 이어서 읽을 항목 — 홈의 읽기 버튼이 여는 곳.
 *
 * 무료로 열린 것 중 아직 다 풀지 않은 '첫' 항목이다. 앞을 건너뛰고 뒤엣것을 먼저 푼
 * 경우에도 앞의 안 푼 것으로 돌아온다 — 이 책은 차례로 읽는 물건이라 빈 자리를 남겨 둔
 * 채 나아가지 않는다.
 *
 * 잠긴 항목은 고르지 않는다. 무료 다섯을 다 풀었으면 그중 마지막을 다시 준다 — 버튼이
 * 아무 데도 가지 않는 것보다는 방금 읽은 자리를 다시 펴는 편이 낫다.
 *
 * @param isDone 그 항목의 퀴즈를 전부 풀었는지(QuizContext.isDone).
 */
export function getResumeLessonId(
  bookId: BookId,
  isDone: (lessonId: string) => boolean,
): string | undefined {
  const free = lessonsOf(bookId).slice(0, FREE_LESSON_COUNT);
  const next = free.find((day) => !isDone(day.lessonId!));
  return (next ?? free[free.length - 1])?.lessonId;
}

/**
 * 그 항목의 '다음 화' — 목차 차례로 바로 뒤엣것.
 *
 * locked는 무료 범위를 벗어났다는 뜻이다(잠긴 화를 열어 주는 대신 구매를 권하는 자리가
 * 쓴다). 마지막 항목이면 undefined — 더 읽을 것이 없다.
 *
 * 이어읽기(getResumeLessonId)와 다르다. 저쪽은 '아직 안 푼 첫 자리'로 되돌아가고,
 * 이쪽은 방금 읽은 것의 바로 다음이다 — 퀴즈를 막 끝낸 사람에게 앞으로 되돌아가라고
 * 하면 방금 한 일이 무위가 된다.
 */
export function getNextLesson(
  bookId: BookId,
  lessonId: string,
): { lessonId: string; locked: boolean } | undefined {
  const lessons = lessonsOf(bookId);
  const index = lessons.findIndex((day) => day.lessonId === lessonId);
  if (index < 0) return undefined;

  const next = lessons[index + 1];
  if (!next?.lessonId) return undefined;

  return { lessonId: next.lessonId, locked: index + 1 >= FREE_LESSON_COUNT };
}

/**
 * 그 책을 얼마나 읽었는지.
 *
 * 쪽수는 카탈로그에 적힌 실제 책의 쪽수를 쓴다. 그런데 우리가 가진 것은 '항목'이지
 * '쪽'이 아니라서, 항목 하나가 몇 쪽에 해당하는지는 나눠서 짐작한다 — 398쪽짜리 책에
 * 365개 항목이면 한 항목이 한 쪽 남짓이다. 항목마다 실제 쪽 범위를 데이터에 적어 두면
 * 그때 이 짐작을 걷어내면 된다.
 */
export interface ReadingProgress {
  /** 책 전체 쪽수 — 카탈로그의 값. 못 읽으면 항목 수로 대신한다. */
  totalPages: number;
  /** 지금까지 읽은 쪽수. */
  readPages: number;
  /** 완독까지 남은 쪽수. */
  remainingPages: number;
  /** 오늘 항목이 시작하는 쪽. 히어로 카드의 'p.14'가 이 값이다. */
  todayPage: number;
  /** 그 책의 실제 항목 수(잠긴 자리표시는 빼고 센다). */
  totalLessons: number;
  /** 퀴즈까지 끝낸 항목 수. */
  readLessons: number;
}

/**
 * "398쪽" · "398" 처럼 섞여 있는 카탈로그 값에서 숫자만 꺼낸다.
 * 숫자가 없으면 null — 부르는 쪽에서 항목 수로 대신하게 한다.
 */
function parsePages(raw: string | undefined): number | null {
  const digits = raw?.match(/\d+/)?.[0];
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param isRead 항목을 다 읽었는지 판별한다 — 지금은 퀴즈를 풀었는지로 본다.
 */
export function getReadingProgress(
  bookId: BookId,
  isRead: (lessonId: string) => boolean,
): ReadingProgress {
  const lessons = lessonsOf(bookId);
  const totalLessons = lessons.length;

  const totalPages = parsePages(getCatalogBookByBookId(bookId)?.pages) ?? totalLessons;
  /** 항목 하나가 차지하는 쪽수 — 적어도 한 쪽이다. */
  const perLesson = totalLessons > 0 ? Math.max(1, Math.round(totalPages / totalLessons)) : 1;

  const readLessons = lessons.filter((day) => isRead(day.lessonId!)).length;
  // 마지막 항목까지 읽으면 남은 쪽이 정확히 0이 되도록 총량으로 잘라 둔다.
  const readPages = Math.min(readLessons * perLesson, totalPages);

  const todayIndex = lessons.findIndex((day) => day.isToday);
  const todayPage = todayIndex >= 0 ? todayIndex * perLesson + 1 : 1;

  return {
    totalPages,
    readPages,
    remainingPages: Math.max(0, totalPages - readPages),
    todayPage,
    totalLessons,
    readLessons,
  };
}
