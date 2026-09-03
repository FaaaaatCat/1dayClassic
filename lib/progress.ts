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
 * 홈의 읽기 버튼이 무엇을 할지.
 *
 * - first   아직 아무것도 안 푼 책 — '무료로 첫화보기'
 * - resume  읽던 중 — '이어 읽기 : 제n화'
 * - restart 무료로 열린 것을 다 풀었고 다시 볼 자리도 끝났다 — '1화부터 다시 읽기'
 */
export type ReadPlan = {
  kind: 'first' | 'resume' | 'restart';
  lessonId: string;
  /** 그 항목이 제 몇 화인지(1부터). 말풍선이 이 숫자를 적는다. */
  no: number;
};

/**
 * 읽기 버튼이 열 항목과, 그것을 뭐라고 부를지.
 *
 * 네 가지를 가른다:
 * 1. 한 편도 안 풀었으면 첫 화 — '무료로 첫화보기'.
 * 2. 안 푼 것이 남았으면 그중 첫 화 — 앞을 건너뛰고 뒤엣것을 먼저 푼 경우에도 앞으로
 *    돌아온다. 차례로 읽는 책이라 빈 자리를 남겨 둔 채 나아가지 않는다.
 * 3. 무료로 열린 것을 다 풀었고 그 뒤로 아직 다시 열어 본 자리가 없으면 — '1화부터 다시
 *    읽기'. 마지막 화까지 다시 봤을 때도 여기로 돌아온다.
 * 4. 다 푼 뒤에 다시 읽는 중이면 마지막으로 연 것의 다음 화 — 그때는 isDone이 전부 true라
 *    진도로는 앞뒤를 가릴 수 없어, '마지막으로 연 항목'(ReadingCursorContext)이 그 자리를
 *    말해 준다.
 *
 * 잠긴 항목은 어느 갈래에서도 고르지 않는다. 그러지 않으면 무료 다섯을 다 푼 순간 이
 * 버튼이 잠긴 여섯 번째를 열어 목차의 자물쇠를 우회한다.
 *
 * @param isDone 그 항목의 퀴즈를 전부 풀었는지(QuizContext.isDone).
 * @param cursorLessonId 그 책에서 마지막으로 연 항목(ReadingCursorContext).
 */
export function getReadPlan(
  bookId: BookId,
  isDone: (lessonId: string) => boolean,
  cursorLessonId?: string,
): ReadPlan | undefined {
  const free = lessonsOf(bookId).slice(0, FREE_LESSON_COUNT);
  if (free.length === 0) return undefined;

  const nextIndex = free.findIndex((day) => !isDone(day.lessonId!));

  if (nextIndex >= 0) {
    // 한 편도 안 풀었으면 '처음 편 책'이다. 뒤엣것만 풀어 둔 채 앞으로 돌아온 경우는
    // 처음이 아니므로 '이어 읽기'로 부른다.
    const untouched = nextIndex === 0 && !free.some((day) => isDone(day.lessonId!));
    return {
      kind: untouched ? 'first' : 'resume',
      lessonId: free[nextIndex].lessonId!,
      no: nextIndex + 1,
    };
  }

  // 여기부터는 무료로 열린 것을 전부 푼 상태다.
  const cursorIndex = cursorLessonId
    ? free.findIndex((day) => day.lessonId === cursorLessonId)
    : -1;
  const afterCursor = cursorIndex >= 0 ? cursorIndex + 1 : -1;

  if (afterCursor > 0 && afterCursor < free.length) {
    return { kind: 'resume', lessonId: free[afterCursor].lessonId!, no: afterCursor + 1 };
  }
  return { kind: 'restart', lessonId: free[0].lessonId!, no: 1 };
}

/**
 * 그 항목의 '다음 화' — 목차 차례로 바로 뒤엣것.
 *
 * locked는 무료 범위를 벗어났다는 뜻이다(잠긴 화를 열어 주는 대신 구매를 권하는 자리가
 * 쓴다). 마지막 항목이면 undefined — 더 읽을 것이 없다.
 *
 * 홈의 읽기 버튼(getReadPlan)과 다르다. 저쪽은 '아직 안 푼 첫 자리'로 되돌아가고,
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
