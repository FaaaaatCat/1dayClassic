import { getCatalogBooks } from '@/lib/catalog';
import type { BookId } from '@/types';

/**
 * 데모용 구매 목록 — 결제가 아직 없어서 여기 적힌 책만 구매한 것으로 친다.
 * 제목으로 적는 건 사람이 읽고 고치기 쉬워서다(카탈로그 제목은 서로 겹치지 않는다).
 *
 * 결제를 붙일 때 고칠 곳은 이 파일 하나다 — 구매 여부를 어디에 저장하든
 * (영수증 검증, 서버 조회, AsyncStorage) 화면 쪽은 아래 두 함수만 바라본다.
 */
const PURCHASED_TITLES = ['일상 질문 사전', '하루 클래식 공부', '영어 어감 사전', '듣기의 말들'];

/** 구매한 책의 카탈로그 id 집합. 제목이 바뀌어 못 찾으면 조용히 넘어가지 않고 알린다. */
const PURCHASED_IDS = (() => {
  const byTitle = new Map(getCatalogBooks().map((book) => [book.title, book]));
  const ids = new Set<string>();
  for (const title of PURCHASED_TITLES) {
    const book = byTitle.get(title);
    if (!book) {
      console.warn(`[purchase] 카탈로그에 없는 제목입니다: ${title}`);
      continue;
    }
    ids.add(book.id);
  }
  return ids;
})();

/** 학습 가능한 책의 BookId → 카탈로그 id. 두 화면이 같은 구매 상태를 보게 잇는다. */
const CATALOG_ID_BY_BOOK_ID = new Map(
  getCatalogBooks()
    .filter((book) => book.bookId !== null)
    .map((book) => [book.bookId as BookId, book.id]),
);

/** 카탈로그 id(= /book/[id]의 파라미터)로 구매 여부. 서점 카드가 쓴다. */
export function isCatalogBookPurchased(catalogId: string): boolean {
  return PURCHASED_IDS.has(catalogId);
}

/**
 * 그 책을 구매했는지.
 *
 * 무료 사용자는 본문의 앞부분만 보고, 그 아래에 '계속 읽어보세요' 버튼과 안내 문구가 붙는다.
 * true가 되면 본문이 전부 보이고 그 두 가지가 사라진다.
 */
export function isBookPurchased(bookId: BookId): boolean {
  const catalogId = CATALOG_ID_BY_BOOK_ID.get(bookId);
  return catalogId !== undefined && PURCHASED_IDS.has(catalogId);
}
