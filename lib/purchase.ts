import type { BookId } from '@/types';

/**
 * 그 책을 구매했는지.
 *
 * 아직 결제가 붙지 않아 항상 false다 — 무료 사용자는 본문의 앞부분만 보고,
 * 그 아래에 '계속 읽어보세요' 버튼과 안내 문구가 붙는다.
 *
 * true가 되면 본문이 전부 보이고 그 두 가지가 사라진다. 화면을 미리 확인하려면
 * 아래 return을 true로 바꿔 보면 된다.
 *
 * 나중에 결제를 붙일 때 고칠 곳은 이 함수 하나다 — 구매 여부를 어디에 저장하든
 * (영수증 검증, 서버 조회, AsyncStorage) 화면 쪽은 이 함수만 바라본다.
 */
export function isBookPurchased(_bookId: BookId): boolean {
  return false;
}
