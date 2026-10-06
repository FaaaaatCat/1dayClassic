import exhibitionData from '@/data/exhibitions.json';
import { getCatalogBook, type CatalogBook } from '@/lib/catalog';

/**
 * 서점의 기획전 — 주제 하나에 책 몇 권을 골라 묶은 것.
 *
 * 무엇을 묶을지는 data/exhibitions.json에만 있다. 기획전을 더하고 빼는 일이 코드를 고치는
 * 일이 되지 않게 하려는 것이다. 제목과 소개는 편집 문구이고, 책은 카탈로그 id로 가리킨다.
 */
export interface Exhibition {
  id: string;
  title: string;
  subtitle: string;
  /** 첫 화면 배너의 바탕색 — 편집이 고른 값이라 표지 색처럼 데이터에 둔다. */
  color: string;
  books: CatalogBook[];
  /**
   * 책마다 크게 내거는 두 줄 문구(카탈로그 id → 줄들). 이 값이 있는 기획전은 첫 화면에서
   * 표지 줄 대신 책 한 권씩 넘겨 보는 배너 줄로 그린다.
   */
  spotlight?: Record<string, string[]>;
}

/**
 * 한 기획전에 묶는 책의 상한.
 *
 * 기획전은 '이 책들을 함께 읽어 보라'는 권유라, 권수가 곧 값의 부담이다. 열 권 스무 권을
 * 한 묶음으로 내밀지 않는다.
 */
export const MAX_EXHIBITION_BOOKS = 3;

interface RawExhibition {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  books: string[];
  spotlight?: Record<string, string[]>;
}

const EXHIBITIONS: Exhibition[] = (exhibitionData as { exhibitions: RawExhibition[] }).exhibitions.map(
  (raw) => {
    const books = raw.books
      .map((id) => {
        const book = getCatalogBook(id);
        if (!book) console.warn(`[exhibitions] 카탈로그에 없는 책입니다: ${raw.id} → ${id}`);
        return book;
      })
      .filter((book): book is CatalogBook => !!book);
    if (books.length > MAX_EXHIBITION_BOOKS) {
      console.warn(`[exhibitions] ${raw.id}: ${MAX_EXHIBITION_BOOKS}권까지만 묶습니다.`);
    }
    return { ...raw, books: books.slice(0, MAX_EXHIBITION_BOOKS) };
  },
);

export function getExhibitions(): Exhibition[] {
  return EXHIBITIONS;
}
