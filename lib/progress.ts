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
 * - first   한 번도 연 적 없는 책 — '무료로 첫화보기'
 * - resume  마지막으로 연 것의 다음 화 — '이어 읽기 : 제n화'
 * - restart 무료로 열린 마지막 화까지 봤다 — '1화부터 다시 읽기'
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
 * 기준은 '마지막으로 연 화' 하나다 — 그 바로 다음을 연다.
 *
 * 1. 한 번도 연 적이 없으면 첫 화 — '무료로 첫화보기'.
 * 2. 연 적이 있으면 그 다음 화 — '이어 읽기 : 제n화'.
 * 3. 마지막으로 연 것이 무료로 열린 마지막 화면 더 갈 곳이 없다 — '1화부터 다시 읽기'.
 *    거기서 1화를 열면 커서가 1화로 옮겨 가고, 다시 2번 규칙에 따라 '제2화'가 된다.
 *
 * 퀴즈를 풀었는지는 보지 않는다. 다 푼 뒤 다시 읽을 때는 진도가 전부 '풀었음'이라 앞뒤를
 * 가릴 수 없고, 무엇보다 여기가 답해야 하는 물음은 '어디를 안 풀었나'가 아니라 '어디까지
 * 봤나'이기 때문이다. 퀴즈 기록은 진도·정답률이 계속 맡는다.
 *
 * 잠긴 항목은 고르지 않는다. 그러지 않으면 무료로 열린 마지막 화를 연 순간 이 버튼이
 * 잠긴 다음 화를 열어 목차의 자물쇠를 우회한다.
 *
 * @param cursorLessonId 그 책에서 마지막으로 연 항목(ReadingCursorContext).
 */
export function getReadPlan(bookId: BookId, cursorLessonId?: string): ReadPlan | undefined {
  const free = lessonsOf(bookId).slice(0, FREE_LESSON_COUNT);
  if (free.length === 0) return undefined;

  // 콘텐츠가 바뀌어 커서가 가리키던 항목이 사라졌으면 못 연 것으로 친다.
  const cursorIndex = cursorLessonId
    ? free.findIndex((day) => day.lessonId === cursorLessonId)
    : -1;

  if (cursorIndex < 0) {
    return { kind: 'first', lessonId: free[0].lessonId!, no: 1 };
  }

  const nextIndex = cursorIndex + 1;
  if (nextIndex < free.length) {
    return { kind: 'resume', lessonId: free[nextIndex].lessonId!, no: nextIndex + 1 };
  }
  return { kind: 'restart', lessonId: free[0].lessonId!, no: 1 };
}

/**
 * 그 항목의 '다음 화' — 목차 차례로 바로 뒤엣것.
 *
 * locked는 무료 범위를 벗어났다는 뜻이다(잠긴 화를 열어 주는 대신 구매를 권하는 자리가
 * 쓴다). 마지막 항목이면 undefined — 더 읽을 것이 없다.
 *
 * 홈의 읽기 버튼(getReadPlan)과 가리키는 곳은 대개 같다 — 방금 연 항목이 곧 커서라서다.
 * 다른 것은 끝에 닿았을 때다. 저쪽은 무료 범위 안에서만 보고 1화로 돌아가지만, 이쪽은
 * 잠긴 다음 화까지 보고 그것이 잠겼다는 사실을 알려 준다 — 구매를 권할지 여기서 갈린다.
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
