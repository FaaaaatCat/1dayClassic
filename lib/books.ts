import { buildCalendarYear, type CalendarDay } from '@/lib/calendar';
import { getTracks, getTrackHeading, TRACK_PLACEHOLDER_HEADINGS } from '@/lib/data';
import { getEnglishHeading, getEnglishLessons } from '@/lib/english';
import { getHanjaHeading, getHanjaLessons } from '@/lib/hanja';
import { getHanmunHeading, getHanmunLessons } from '@/lib/hanmun';
import { getLatinHeading, getLatinLessons } from '@/lib/latin';
import { getLiberalHeading, getLiberalLessons } from '@/lib/liberal';
import { getPsychologyHeading, getPsychologyLessons } from '@/lib/psychology';
import { getQuoteHeading, getQuoteLessons } from '@/lib/quote';
import { getWritingHeading, getWritingLessons } from '@/lib/writing';
import type { BookId } from '@/types';

/**
 * 책 → 365일 목차를 만드는 함수. 책마다 항목 타입과 표제 필드가 달라서 여기서 한 번씩 짝지어 둔다.
 *
 * 제네릭 하나로 묶어 Record에 담으면 항목 타입이 서로 달라 타입이 성립하지 않으므로,
 * buildCalendarYear 호출을 책별로 나열한다. 이 파일이 '책과 데이터를 잇는' 단 한 곳이다.
 */
const BUILD_CALENDAR: Record<BookId, () => CalendarDay[]> = {
  classic: () => buildCalendarYear(getTracks(), getTrackHeading, TRACK_PLACEHOLDER_HEADINGS),
  latin: () => buildCalendarYear(getLatinLessons(), getLatinHeading),
  quote: () => buildCalendarYear(getQuoteLessons(), getQuoteHeading),
  hanja: () => buildCalendarYear(getHanjaLessons(), getHanjaHeading),
  liberal: () => buildCalendarYear(getLiberalLessons(), getLiberalHeading),
  psychology: () => buildCalendarYear(getPsychologyLessons(), getPsychologyHeading),
  writing: () => buildCalendarYear(getWritingLessons(), getWritingHeading),
  hanmun: () => buildCalendarYear(getHanmunLessons(), getHanmunHeading),
  english: () => buildCalendarYear(getEnglishLessons(), getEnglishHeading),
};

/** 한 번 만든 목차는 365행 그대로 재사용한다 — 화면을 다시 열 때마다 만들 이유가 없다. */
const calendarCache = new Map<BookId, CalendarDay[]>();

/** 그 책의 365일 목차. 실제 항목이 없는 날은 잠긴 자리표시로 채워져 있다. */
export function getBookCalendar(bookId: BookId): CalendarDay[] {
  const cached = calendarCache.get(bookId);
  if (cached) return cached;
  const days = BUILD_CALENDAR[bookId]();
  calendarCache.set(bookId, days);
  return days;
}
