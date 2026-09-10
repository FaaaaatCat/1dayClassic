import type { ImageSourcePropType } from 'react-native';

import type { BookId } from '@/types';

export interface BookstoreBook {
  id: BookId;
  title: string;
  author: string;
  /**
   * 출판사가 준 진짜 표지 그림. 없으면 비워 둔다 — 그러면 표지를 코드로 그린다
   * (lib/coverDesign의 값을 components/book/BookCover가 그린다).
   *
   * 예전에는 열 권 모두 카탈로그의 표지 주소를 빌려 썼다. 표지를 그리기 시작하면서
   * 그 의존이 사라졌고, 이 필드는 출판사에서 표지가 들어왔을 때만 채운다.
   *
   * 책의 표식(높은음자리표, ')))')도 여기 있었는데, 지금은 표지 값의 마크로 흡수됐다 —
   * 표식만 따로 두면 종이색·잉크색과 따로 놀아, 같은 책인데 표지와 속표지의 결이 달랐다.
   */
  coverImage?: string;
  /**
   * 잠금화면 알람 위쪽 절반을 덮는 사진. 아직 사진이 없는 책은 비워 둔다 —
   * 그 경우 알람 배경은 바탕색만 나오고 나머지 배치는 그대로다.
   */
  alarmBackground?: ImageSourcePropType;
  /**
   * 알람 전용으로 합성한 표지(그림자·원근이 들어간 목업). 지금은 열 권 모두 비어 있어
   * 알람 화면의 표지 자리가 빈다 — lib/alarmBook.ts 참고.
   *
   * 예전에는 네 권이 목업 이미지를 갖고 있었는데 그것이 출판사 실물 표지를 합성한
   * 그림이라 걷어냈다. 알람은 JS가 안 도는 자리라 BookCover를 렌더할 수 없으므로,
   * 알람 화면의 표지는 코틀린이 표지 값을 받아 직접 그리게 된다. 그때 이 필드는 사라진다.
   */
  alarmCover?: ImageSourcePropType;
}

/**
 * 학습 가능한 "하루 시리즈" 열 권 — 하루 서점 화면과 알람이 함께 쓰는 정적 데이터.
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

export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  {
    id: 'classic',
    title: '하루 클래식',
    author: '한밤서가 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-classic.webp'),
  },
  {
    id: 'latin',
    title: '하루 라틴어',
    author: '첫자리 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-latin.webp'),
  },
  {
    id: 'quote',
    title: '하루 명심보감',
    author: '밑줄사이 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-quote.webp'),
  },
  {
    id: 'hanja',
    title: '하루 천자문',
    author: '밑줄사이 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-hanja.webp'),
  },
  {
    id: 'liberal',
    title: '하루 교양',
    author: '밑줄사이 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-liberal.webp'),
  },
  {
    id: 'psychology',
    title: '하루 명상록',
    author: '첫자리 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-psychology.webp'),
  },
  {
    id: 'writing',
    title: '하루 글쓰기',
    author: '한밤서가 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-writing.webp'),
  },
  {
    id: 'hanmun',
    title: '하루 논어',
    author: '낮은문장 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-hanmun.webp'),
  },
  {
    id: 'english',
    title: '하루 영어 속담',
    author: '한밤서가 편집부',
    alarmBackground: require('@/assets/images/alarm/bg-english.webp'),
  },
  {
    id: 'listening',
    title: '하루 채근담',
    author: '낮은문장 편집부',
  },
];
