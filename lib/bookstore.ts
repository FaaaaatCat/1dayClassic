import type { ImageSourcePropType } from 'react-native';

import { getCatalogBookByBookId } from '@/lib/catalog';
import type { BookId } from '@/types';

export interface BookstoreBook {
  id: BookId;
  title: string;
  author: string;
  /**
   * 표지 그림 주소. 열 권 모두 카탈로그(data/uupress-catalog.json)의 것을 그대로 쓴다 —
   * 예전에는 아홉 권이 로컬 에셋이고 한 권만 URL이라 화면마다 둘을 갈라 처리해야 했다.
   */
  coverImage: string;
  /**
   * 카드 표지 맨 위에 놓이는 책의 표식. 없는 책은 그 자리가 비어 있다.
   *
   * 항목이 아니라 책의 성질이라 데이터가 아니라 여기 둔다 — 같은 책의 어느 날을 펴도
   * 같은 표식이 나온다. 지금은 글자 하나로 그리지만, 그림 파일이 들어오면 주소로 바꾼다.
   */
  symbol?: string;
  /**
   * 잠금화면 알람 위쪽 절반을 덮는 사진. 아직 사진이 없는 책은 비워 둔다 —
   * 그 경우 알람 배경은 바탕색만 나오고 나머지 배치는 그대로다.
   */
  alarmBackground?: ImageSourcePropType;
  /**
   * 알람 전용으로 합성한 표지(그림자·원근이 들어간 목업). 비워 두면 coverImage를 대신 쓰는데,
   * 그건 납작한 사각형이라 알람 화면에서 조금 작게 놓인다 — lib/alarmBook.ts 참고.
   */
  alarmCover?: ImageSourcePropType;
}

/**
 * 유유 출판사 "하루 시리즈" 카탈로그 — 하루 서점 화면 전용 정적 데이터.
 * 어느 책이 "현재 선택중"인지는 여기 담긴 정적 값이 아니라 BookSelectionContext의
 * 런타임 상태다 — 사용자가 서점에서 고를 때마다 바뀌기 때문이다.
 */
/**
 * MVP가 지금 제공하는 학습 가능한 책 — liberal(하루 교양 공부)만 아직 없다.
 * 제외 목록이 아니라 포함 목록이다 — 새 책을 추가해도 여기 명시하기 전에는
 * 자동으로 MVP가 되지 않는다(기본값이 Non-MVP).
 */
const MVP_BOOK_IDS: readonly BookId[] = [
  'classic',
  'latin',
  'quote',
  'hanja',
  'psychology',
  'writing',
  'hanmun',
  'english',
  'listening',
];

/** 이 책이 지금 MVP에서 제공되는 학습 콘텐츠인지. 카드 리본·서점 필터·책 변경 제한이 함께 쓴다. */
export function isMvpBook(bookId: BookId): boolean {
  return MVP_BOOK_IDS.includes(bookId);
}

/**
 * 그 책의 표지 주소 — 카탈로그에서 bookId로 찾는다.
 *
 * 카탈로그에 없으면 빈 문자열이다. 그러면 화면은 표지 자리를 비워 두고 넘어간다 —
 * 목록 한 칸이 비는 것이 앱이 멈추는 것보다 낫다.
 */
function coverOf(bookId: BookId): string {
  const book = getCatalogBookByBookId(bookId);
  if (!book) {
    console.warn(`[bookstore] 카탈로그에서 표지를 찾지 못했습니다: ${bookId}`);
    return '';
  }
  return book.coverImage;
}

export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  {
    id: 'classic',
    title: '하루 클래식 공부',
    author: '글릿 [유유]',
    coverImage: coverOf('classic'),
    // 클래식은 높은음자리표를 표식으로 쓴다. 글자(U+1D11E)로 그렸더니 글꼴이 정한 상자보다
    // 먹이 커서 위아래가 계속 잘려, 그림으로 바꿨다. 검은 그림이지만 화면에서 brown50으로
    // 물들여 그린다(CardDeckDetail의 coverSymbolImage).
    symbol: 'https://freesvg.org/img/rickvanderzwet_Treble_clef_1.png',
    alarmBackground: require('@/assets/images/alarm/bg-classic.webp'),
    alarmCover: require('@/assets/images/alarm/cover-classic.webp'),
  },
  {
    id: 'latin',
    title: '하루 라틴어 공부',
    author: '김태권 [유유]',
    coverImage: coverOf('latin'),
    alarmBackground: require('@/assets/images/alarm/bg-latin.webp'),
  },
  {
    id: 'quote',
    title: '하루 명언 공부',
    author: '김영수 [유유]',
    coverImage: coverOf('quote'),
    alarmBackground: require('@/assets/images/alarm/bg-quote.webp'),
  },
  {
    id: 'hanja',
    title: '하루 한자 공부',
    author: '이인호 [유유]',
    coverImage: coverOf('hanja'),
    alarmBackground: require('@/assets/images/alarm/bg-hanja.webp'),
  },
  {
    id: 'liberal',
    title: '하루 교양 공부',
    author: '전성원 [유유]',
    coverImage: coverOf('liberal'),
    alarmBackground: require('@/assets/images/alarm/bg-liberal.webp'),
    alarmCover: require('@/assets/images/alarm/cover-liberal.webp'),
  },
  {
    id: 'psychology',
    title: '하루 심리 공부',
    author: '신고은 [유유]',
    coverImage: coverOf('psychology'),
    alarmBackground: require('@/assets/images/alarm/bg-psychology.webp'),
  },
  {
    id: 'writing',
    title: '하루 쓰기 공부',
    author: '브라이언 로빈슨 [유유]',
    coverImage: coverOf('writing'),
    alarmBackground: require('@/assets/images/alarm/bg-writing.webp'),
  },
  {
    id: 'hanmun',
    title: '하루 한문 공부',
    author: '임자헌 [유유]',
    coverImage: coverOf('hanmun'),
    alarmBackground: require('@/assets/images/alarm/bg-hanmun.webp'),
    alarmCover: require('@/assets/images/alarm/cover-hanmun.webp'),
  },
  {
    id: 'english',
    title: '하루 영어 교양',
    author: '서미석 [유유]',
    coverImage: coverOf('english'),
    alarmBackground: require('@/assets/images/alarm/bg-english.webp'),
    alarmCover: require('@/assets/images/alarm/cover-english.webp'),
  },
  {
    id: 'listening',
    title: '듣기의 말들',
    author: '박총 [유유]',
    coverImage: coverOf('listening'),
    // 듣기의 말들은 괄호 셋을 표식으로 쓴다 — 귀 기울이는 소리결이다.
    symbol: ') ) )',
  },
];
