import type { ImageSourcePropType } from 'react-native';

import type { BookId } from '@/types';

export interface BookstoreBook {
  id: BookId;
  title: string;
  author: string;
  coverImage: ImageSourcePropType;
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

/** 듣기의 말들 표지 — data/uupress-catalog.json의 같은 책에서 가져온 주소다. */
const LISTENING_COVER_URL =
  'https://uupress.notion.site/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F93b3646f-241b-4270-8cff-052e2a3adb60%2F%25E1%2584%2583%25E1%2585%25B3%25E1%2586%25AE%25E1%2584%2580%25E1%2585%25B5%25E1%2584%258B%25E1%2585%25B4%25E1%2584%2586%25E1%2585%25A1%25E1%2586%25AF%25E1%2584%2583%25E1%2585%25B3%25E1%2586%25AF%25E1%2584%2591%25E1%2585%25AD%25E1%2584%258C%25E1%2585%25B5(%25E1%2584%258B%25E1%2585%25B5%25E1%2586%25B8%25E1%2584%258E%25E1%2585%25A6).png?table=block&id=65a4e573-2fda-49d8-a531-a12a6c8014b0&spaceId=a116a827-9756-4259-82ad-bdc6b3f1eb99&width=800&cache=v2';

export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  {
    id: 'classic',
    title: '하루 클래식 공부',
    author: '글릿 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-classic.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-classic.webp'),
    alarmCover: require('@/assets/images/alarm/cover-classic.webp'),
  },
  {
    id: 'latin',
    title: '하루 라틴어 공부',
    author: '김태권 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-latin.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-latin.webp'),
  },
  {
    id: 'quote',
    title: '하루 명언 공부',
    author: '김영수 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-quote.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-quote.webp'),
  },
  {
    id: 'hanja',
    title: '하루 한자 공부',
    author: '이인호 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanja.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-hanja.webp'),
  },
  {
    id: 'liberal',
    title: '하루 교양 공부',
    author: '전성원 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-liberal.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-liberal.webp'),
    alarmCover: require('@/assets/images/alarm/cover-liberal.webp'),
  },
  {
    id: 'psychology',
    title: '하루 심리 공부',
    author: '신고은 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-psychology.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-psychology.webp'),
  },
  {
    id: 'writing',
    title: '하루 쓰기 공부',
    author: '브라이언 로빈슨 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-writing.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-writing.webp'),
  },
  {
    id: 'hanmun',
    title: '하루 한문 공부',
    author: '임자헌 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanmun.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-hanmun.webp'),
    alarmCover: require('@/assets/images/alarm/cover-hanmun.webp'),
  },
  {
    id: 'english',
    title: '하루 영어 교양',
    author: '서미석 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-english.jpg'),
    alarmBackground: require('@/assets/images/alarm/bg-english.webp'),
    alarmCover: require('@/assets/images/alarm/cover-english.webp'),
  },
  {
    id: 'listening',
    title: '듣기의 말들',
    author: '박총 [유유]',
    /**
     * 다른 여덟 권과 달리 표지가 로컬 에셋이 아니라 카탈로그의 URL이다 — 이 책은
     * 표지 파일을 아직 받지 않았다. 상세 화면도 같은 URL을 쓰므로 보이는 그림은 같다.
     * 에셋이 들어오면 require로 바꾼다.
     */
    coverImage: { uri: LISTENING_COVER_URL },
  },
];
