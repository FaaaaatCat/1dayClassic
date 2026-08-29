import type { useRouter } from 'expo-router';

import type { CatalogBook } from '@/lib/catalog';

type Router = ReturnType<typeof useRouter>;

/**
 * 리포트에서 이어 가기 — 지금 읽던 책의 서재 상세로 보낸다.
 *
 * 상세로 바로 replace하면 미리보기가 스택에서 빠지면서 아래에 아무것도 남지 않아,
 * 상세에서 뒤로가기를 누르면 앱이 통째로 종료된다(폰에서 확인했다). 그래서 서재 목록으로
 * 먼저 옮긴 뒤 그 위에 상세를 얹는다 — 서재에서 책을 열었을 때와 같은 자리에 놓인다.
 *
 * 상세 라우트의 id는 학습 콘텐츠가 있는 책이면 BookId, 아니면 카탈로그 uuid다
 * (서재 목록의 openBook과 같은 식). 서재에 담겼는지와는 무관하다 — 상세 화면이 id를
 * 카탈로그에서 푸므로 담기지 않은 책도 열린다.
 *
 * 부르는 곳이 여럿이라 여기 한 곳에 둔다. 스택을 두 번 거치는 이 순서는 눈으로 봐서는
 * 이유를 알 수 없어, 각자 베껴 두면 한쪽만 고쳐지고 다른 쪽에서 앱이 종료된다.
 */
export function openBookDetail(router: Router, book?: CatalogBook): void {
  if (!book) {
    router.replace('/settings');
    return;
  }
  router.replace('/library');
  router.push({
    pathname: '/library/book/[id]',
    params: { id: book.bookId ?? book.id },
  });
}
