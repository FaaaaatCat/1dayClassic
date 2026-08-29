import catalogData from '@/data/uupress-catalog.json';
import type { BookId } from '@/types';

/** 노션 상세 페이지의 한 절. */
export interface CatalogSection {
  /** 절 제목. 예: "책 소개", "목차", "추천의 말" */
  title: string;
  /** 문단들 — 노션의 text 블록 하나가 한 문단. */
  paragraphs: string[];
}

/**
 * 유유출판사 도서 카탈로그 한 권 — 하루 서점의 '전시용' 데이터.
 *
 * BOOKSTORE_BOOKS(lib/bookstore.ts)의 학습 가능한 책들과는 성격이 다르다. 그쪽은 365일 목차와
 * 알람 에셋을 갖춘 '학습 가능한 책'이고, 이쪽은 표지·서지 정보·책 소개만 있는 목록이다.
 * 두 쪽 모두에 있는 책은 bookId로 이어진다 — 그 책만 목차를 열고 선택할 수 있다.
 */
export interface CatalogBook {
  /** Notion 페이지 id. 라우트 파라미터(/book/[id])로 그대로 쓰인다. */
  id: string;
  /** 학습 콘텐츠가 있는 책이면 그 BookId, 아니면 null. */
  bookId: BookId | null;
  title: string;
  /** "데이미언 설스 지음, 홍한별 옮김" */
  author: string;
  /** 정가(원). 출판사 페이지에 값이 없는 책이 하나 있어 null을 허용한다. */
  price: number | null;
  /** Notion이 서빙하는 표지 이미지 URL — 원격이므로 <Image source={{ uri }}>로 쓴다. */
  coverImage: string;
  /** 상세 페이지의 절들 — 노션에 나오는 순서 그대로 (저자 소개, 책 소개, 목차, 추천의 말 등). */
  sections: CatalogSection[];
  /** 분야/시리즈 태그 — "인문", "땅콩문고시리즈" 등 */
  tags: string[];
  pages: string;
  isbn: string;
  /** "2026-08-04". 값이 없는 책은 빈 문자열. */
  pubDate: string;
}

/** 발행일 최신순으로 미리 정렬해 둔 전체 카탈로그. */
export function getCatalogBooks(): CatalogBook[] {
  return (catalogData as { books: CatalogBook[] }).books;
}

/** Notion 페이지 id로 한 권. */
export function getCatalogBook(id: string): CatalogBook | undefined {
  return getCatalogBooks().find((book) => book.id === id);
}

/**
 * 학습 가능한 책들의 카탈로그 정보(가격·책 소개). 그 책들은 표지와 제목을 로컬 에셋으로
 * 갖고 있지만 가격과 소개글은 여기에만 있으므로, 상세 화면이 이 함수로 채워 넣는다.
 */
export function getCatalogBookByBookId(bookId: BookId): CatalogBook | undefined {
  return getCatalogBooks().find((book) => book.bookId === bookId);
}

/** 학습 콘텐츠가 아직 없는 책들 — 서점의 '유유의 모든 책' 격자에 놓인다. */
export function getCatalogOnlyBooks(): CatalogBook[] {
  return getCatalogBooks().filter((book) => book.bookId === null);
}

/** "22,000원". 정가가 없는 책은 빈 문자열 — 화면에서 자리를 비운다. */
export function formatPrice(price: number | null): string {
  if (price === null) return '';
  return `${price.toLocaleString('ko-KR')}원`;
}
