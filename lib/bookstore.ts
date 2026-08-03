import type { ImageSourcePropType } from 'react-native';

import type { BookId } from '@/types';

export interface BookstoreBook {
  id: BookId;
  title: string;
  author: string;
  coverImage: ImageSourcePropType;
}

/**
 * 유유 출판사 "하루 시리즈" 카탈로그 — 하루 서점 화면 전용 정적 데이터.
 * 어느 책이 "현재 선택중"인지는 여기 담긴 정적 값이 아니라 BookSelectionContext의
 * 런타임 상태다 — 사용자가 서점에서 고를 때마다 바뀌기 때문이다.
 */
export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  {
    id: 'classic',
    title: '하루 클래식 공부',
    author: '글릿 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-classic.jpg'),
  },
  {
    id: 'latin',
    title: '하루 라틴어 공부',
    author: '김태권 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-latin.jpg'),
  },
  {
    id: 'quote',
    title: '하루 명언 공부',
    author: '김영수 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-quote.jpg'),
  },
  {
    id: 'hanja',
    title: '하루 한자 공부',
    author: '이인호 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanja.jpg'),
  },
  {
    id: 'liberal',
    title: '하루 교양 공부',
    author: '전성원 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-liberal.jpg'),
  },
  {
    id: 'psychology',
    title: '하루 심리 공부',
    author: '신고은 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-psychology.jpg'),
  },
  {
    id: 'writing',
    title: '하루 쓰기 공부',
    author: '브라이언 로빈슨 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-writing.jpg'),
  },
  {
    id: 'hanmun',
    title: '하루 한문 공부',
    author: '임자헌 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanmun.jpg'),
  },
  {
    id: 'english',
    title: '하루 영어 교양',
    author: '서미석 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-english.jpg'),
  },
];
