import { getBookCalendar } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import type { BookId } from '@/types';

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
  const days = getBookCalendar(bookId);
  // 잠긴 자리표시(아직 원고가 없는 날)는 세지 않는다 — 읽을 수 없는 것을 총량에 넣으면
  // 완독이 영영 오지 않는다.
  const lessons = days.filter((day) => day.lessonId !== undefined);
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
