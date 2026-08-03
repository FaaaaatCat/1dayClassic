import { buildCalendarYear, getTomorrowDate, type CalendarDay } from '@/lib/calendar';
import {
  getTodayTrack,
  getTrackById,
  getTrackHeading,
  getTracks,
  TRACK_PLACEHOLDER_HEADINGS,
} from '@/lib/classic';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import {
  getEnglishHeading,
  getEnglishLessonById,
  getEnglishLessons,
  getTodayEnglishLesson,
} from '@/lib/english';
import { getHanjaHeading, getHanjaLessonById, getHanjaLessons, getTodayHanjaLesson } from '@/lib/hanja';
import {
  getHanmunHeading,
  getHanmunLessonById,
  getHanmunLessons,
  getTodayHanmunLesson,
} from '@/lib/hanmun';
import { getLatinHeading, getLatinLessonById, getLatinLessons, getTodayLatinLesson } from '@/lib/latin';
import {
  getLiberalHeading,
  getLiberalLessonById,
  getLiberalLessons,
  getTodayLiberalLesson,
} from '@/lib/liberal';
import {
  getPsychologyHeading,
  getPsychologyLessonById,
  getPsychologyLessons,
  getTodayPsychologyLesson,
} from '@/lib/psychology';
import { getQuoteHeading, getQuoteLessonById, getQuoteLessons, getTodayQuoteLesson } from '@/lib/quote';
import {
  getTodayWritingLesson,
  getWritingHeading,
  getWritingLessonById,
  getWritingLessons,
} from '@/lib/writing';
import type {
  BookId,
  EnglishLesson,
  HanjaLesson,
  HanmunLesson,
  LatinLesson,
  LessonHeading,
  LiberalLesson,
  PsychologyLesson,
  QuoteLesson,
  Track,
  WritingLesson,
} from '@/types';

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

/**
 * 항목 하나와 그 항목이 실린 책을 함께 담는 판별 유니온.
 *
 * 항목 상세 화면은 책마다 표제부가 다르고(곡명/작곡가 vs 라틴어/발음/뜻 vs 한자/훈음)
 * 그 구성은 이미 정리해 둔 책별 타입에 그대로 적혀 있다. book을 판별자로 두면 화면이
 * switch 한 번으로 갈라지고, 각 분기에서 lesson 타입이 좁혀져 캐스팅이 필요 없다.
 */
export type BookLesson =
  | { book: 'classic'; lesson: Track }
  | { book: 'latin'; lesson: LatinLesson }
  | { book: 'quote'; lesson: QuoteLesson }
  | { book: 'hanja'; lesson: HanjaLesson }
  | { book: 'liberal'; lesson: LiberalLesson }
  | { book: 'psychology'; lesson: PsychologyLesson }
  | { book: 'writing'; lesson: WritingLesson }
  | { book: 'hanmun'; lesson: HanmunLesson }
  | { book: 'english'; lesson: EnglishLesson };

/** BookId 전체 — BUILD_CALENDAR의 키를 쓰므로 책을 더하면 여기도 자동으로 따라온다. */
export const BOOK_IDS = Object.keys(BUILD_CALENDAR) as BookId[];

/**
 * 항목 id로 그 책에서 하나 찾는다 — 없으면 undefined. 오늘 항목으로 되돌리지 않는다.
 *
 * 책별 조회 함수는 각 책 모듈이 갖고 있고, 여기서 하는 일은 book 판별자를 붙이는 것뿐이다.
 * 표 대신 switch를 쓰는 이유는 분기마다 lesson 타입이 좁혀져 캐스팅이 필요 없기 때문이다.
 */
function lessonById(bookId: BookId, lessonId: string): BookLesson | undefined {
  switch (bookId) {
    case 'classic': {
      const lesson = getTrackById(lessonId);
      return lesson && { book: 'classic', lesson };
    }
    case 'latin': {
      const lesson = getLatinLessonById(lessonId);
      return lesson && { book: 'latin', lesson };
    }
    case 'quote': {
      const lesson = getQuoteLessonById(lessonId);
      return lesson && { book: 'quote', lesson };
    }
    case 'hanja': {
      const lesson = getHanjaLessonById(lessonId);
      return lesson && { book: 'hanja', lesson };
    }
    case 'liberal': {
      const lesson = getLiberalLessonById(lessonId);
      return lesson && { book: 'liberal', lesson };
    }
    case 'psychology': {
      const lesson = getPsychologyLessonById(lessonId);
      return lesson && { book: 'psychology', lesson };
    }
    case 'writing': {
      const lesson = getWritingLessonById(lessonId);
      return lesson && { book: 'writing', lesson };
    }
    case 'hanmun': {
      const lesson = getHanmunLessonById(lessonId);
      return lesson && { book: 'hanmun', lesson };
    }
    case 'english': {
      const lesson = getEnglishLessonById(lessonId);
      return lesson && { book: 'english', lesson };
    }
  }
}

/** 그 책의 오늘 항목(featured). 데모 범위에서는 시스템 날짜를 읽지 않는다. */
function todayLesson(bookId: BookId): BookLesson | undefined {
  switch (bookId) {
    case 'classic': {
      const lesson = getTodayTrack();
      return lesson && { book: 'classic', lesson };
    }
    case 'latin': {
      const lesson = getTodayLatinLesson();
      return lesson && { book: 'latin', lesson };
    }
    case 'quote': {
      const lesson = getTodayQuoteLesson();
      return lesson && { book: 'quote', lesson };
    }
    case 'hanja': {
      const lesson = getTodayHanjaLesson();
      return lesson && { book: 'hanja', lesson };
    }
    case 'liberal': {
      const lesson = getTodayLiberalLesson();
      return lesson && { book: 'liberal', lesson };
    }
    case 'psychology': {
      const lesson = getTodayPsychologyLesson();
      return lesson && { book: 'psychology', lesson };
    }
    case 'writing': {
      const lesson = getTodayWritingLesson();
      return lesson && { book: 'writing', lesson };
    }
    case 'hanmun': {
      const lesson = getTodayHanmunLesson();
      return lesson && { book: 'hanmun', lesson };
    }
    case 'english': {
      const lesson = getTodayEnglishLesson();
      return lesson && { book: 'english', lesson };
    }
  }
}

/**
 * 그 책의 항목 하나. lessonId를 주지 않거나 그런 id가 없으면 그 책의 오늘 항목으로 되돌린다 —
 * 알람 딥링크처럼 항목을 지정하지 않고 들어오는 경로가 있다.
 */
export function getBookLesson(bookId: BookId, lessonId?: string): BookLesson | undefined {
  return (lessonId ? lessonById(bookId, lessonId) : undefined) ?? todayLesson(bookId);
}

/**
 * 그 책의 '내일'(TODAY_MONTH/TODAY_DAY + 1일) 항목 — 그 날짜에 실제 항목이 없으면(잠긴
 * 자리표시뿐이면) undefined. 홈 화면의 '내일은?' 프리뷰가 undefined일 때 행 자체를 숨긴다.
 *
 * 365일 목차(getBookCalendar)가 이미 날짜별로 실제 항목/자리표시를 갈라 뒀으므로,
 * 그 결과에서 내일 날짜 한 칸만 찾아 되돌린다 — 날짜 파싱을 여기서 다시 하지 않는다.
 */
export function getTomorrowLesson(bookId: BookId): BookLesson | undefined {
  const { month, day } = getTomorrowDate();
  const tomorrow = getBookCalendar(bookId).find((d) => d.month === month && d.day === day);
  if (!tomorrow || tomorrow.locked || !tomorrow.lessonId) return undefined;
  return lessonById(bookId, tomorrow.lessonId);
}

/**
 * 어느 책인지 모르는 항목 id를 9권에서 찾는다. 보관함은 담은 항목의 id만 들고 있어
 * 되살릴 때 이 함수를 쓴다. 항목 id에는 책 접두사가 붙어 있어(latin_1_…) 책끼리 겹치지 않는다.
 */
export function findLesson(lessonId: string): BookLesson | undefined {
  for (const bookId of BOOK_IDS) {
    const found = lessonById(bookId, lessonId);
    if (found) return found;
  }
  return undefined;
}

/** 그 책의 이름('하루 라틴어 공부') — 태그·공유 문구·낭독 멘트가 함께 쓴다. */
export function getBookName(bookId: BookId): string {
  return BOOKSTORE_BOOKS.find((book) => book.id === bookId)?.title ?? '하루 시리즈';
}

/** 책별 표제 함수를 판별자로 골라 준다 — 목차와 같은 표제를 화면 밖에서도 쓸 때. */
export function getLessonHeading(bookLesson: BookLesson): LessonHeading {
  switch (bookLesson.book) {
    case 'classic':
      return getTrackHeading(bookLesson.lesson);
    case 'latin':
      return getLatinHeading(bookLesson.lesson);
    case 'quote':
      return getQuoteHeading(bookLesson.lesson);
    case 'hanja':
      return getHanjaHeading(bookLesson.lesson);
    case 'liberal':
      return getLiberalHeading(bookLesson.lesson);
    case 'psychology':
      return getPsychologyHeading(bookLesson.lesson);
    case 'writing':
      return getWritingHeading(bookLesson.lesson);
    case 'hanmun':
      return getHanmunHeading(bookLesson.lesson);
    case 'english':
      return getEnglishHeading(bookLesson.lesson);
  }
}

