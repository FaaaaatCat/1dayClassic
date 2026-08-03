import type { DailyLesson, LessonHeading } from '@/types';

/** 홈 화면에서 '오늘'로 고정 표시할 날짜 — 실제 시스템 날짜는 읽지 않는다. */
export const TODAY_MONTH = 1;
export const TODAY_DAY = 1;

export const CALENDAR_MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 1년 총 일수 (365) */
export const TOTAL_DAYS_IN_YEAR = DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0);

/** 1월 1일부터 '오늘'(TODAY_MONTH/TODAY_DAY)까지의 누적 일수 — 1부터 시작 */
export function getTodayDayOfYear(): number {
  let count = 0;
  for (let month = 1; month < TODAY_MONTH; month++) {
    count += DAYS_IN_MONTH[month - 1];
  }
  return count + TODAY_DAY;
}

/**
 * '내일'(TODAY_MONTH/TODAY_DAY + 1일)의 {month, day}. 책마다 그 날짜에 실제 항목이
 * 있는지는 다르므로, 있는지 확인하는 일은 호출부(lib/books.ts의 getTomorrowLesson)가 한다.
 */
export function getTomorrowDate(): { month: number; day: number } {
  let month = TODAY_MONTH;
  let day = TODAY_DAY + 1;
  if (day > DAYS_IN_MONTH[month - 1]) {
    day = 1;
    month = month === 12 ? 1 : month + 1;
  }
  return { month, day };
}

/** 목차의 하루치 한 행. 표제는 책별 getHeading이 뽑아 준 값을 그대로 담는다. */
export interface CalendarDay {
  month: number;
  day: number;
  title: string;
  subtitle?: string;
  /** 실제 항목이 있는 날만 존재 — 없으면 잠긴 자리표시 날짜다. */
  lessonId?: string;
  locked: boolean;
  isToday: boolean;
}

/** lesson.date("1월 1일" 형태)를 {month, day}로 파싱한다. 형식이 안 맞으면 null. */
function parseLessonDate(dateStr: string | undefined): { month: number; day: number } | null {
  const match = dateStr?.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (!match) return null;
  return { month: Number(match[1]), day: Number(match[2]) };
}

/** 자리표시 표제를 하나도 만들 수 없는 책(항목 0개)을 위한 최후의 표시. */
const EMPTY_PLACEHOLDER: LessonHeading = { title: '준비 중' };

/**
 * 1월 1일부터 12월 31일까지 365일 — 실제 항목이 있으면 그 표제를, 없으면 잠긴 자리표시를 채운다.
 *
 * 표제를 담는 필드는 책마다 다르므로(곡명/작곡가 vs 라틴어/뜻 vs 한자/훈음) 뽑는 일은
 * getHeading에 맡긴다. placeholders를 주지 않으면 그 책의 실제 표제를 순환해 자리를 채운다.
 * 클래식만은 실제 곡 3개와 겹치지 않도록 자리표시 목록을 따로 넘긴다.
 */
export function buildCalendarYear<T extends DailyLesson>(
  lessons: T[],
  getHeading: (lesson: T) => LessonHeading,
  placeholders?: LessonHeading[],
): CalendarDay[] {
  const lessonByDate = new Map<string, T>();
  for (const lesson of lessons) {
    const parsed = parseLessonDate(lesson.date);
    if (parsed) lessonByDate.set(`${parsed.month}-${parsed.day}`, lesson);
  }

  const pool = placeholders?.length ? placeholders : lessons.map(getHeading);

  const days: CalendarDay[] = [];
  let placeholderIndex = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day++) {
      const isToday = month === TODAY_MONTH && day === TODAY_DAY;
      const lesson = lessonByDate.get(`${month}-${day}`);
      if (lesson) {
        days.push({
          month,
          day,
          ...getHeading(lesson),
          lessonId: lesson.id,
          locked: false,
          isToday,
        });
      } else {
        const heading = pool.length > 0 ? pool[placeholderIndex % pool.length] : EMPTY_PLACEHOLDER;
        placeholderIndex++;
        days.push({ month, day, ...heading, locked: true, isToday });
      }
    }
  }
  return days;
}
