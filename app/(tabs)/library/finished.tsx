import { useRouter } from 'expo-router';

import MyPageShell from '@/components/mypage/MyPageShell';
import ShelfList from '@/components/mypage/ShelfList';
import { useShelfBooks } from '@/components/mypage/useShelfBooks';

/**
 * 완독한 책 — 담아 둔 책 중 100%에 이른 것들.
 *
 * 여기 올라오는 순간 '읽을 예정인 책'에서는 사라진다. 한 책이 두 목록에 동시에 있으면
 * 권수를 더했을 때 서재에 담은 수보다 많아진다.
 */
export default function FinishedBooksScreen() {
  const router = useRouter();
  const { finished } = useShelfBooks();

  return (
    <MyPageShell title="완독한 책">
      <ShelfList
        books={finished}
        empty="아직 완독한 책이 없습니다."
        onPress={(book) =>
          router.push({
            pathname: '/library/book/[id]',
            params: { id: book.bookId ?? book.id },
          })
        }
      />
    </MyPageShell>
  );
}
