import { useRouter } from 'expo-router';

import ShelfList from '@/components/mypage/ShelfList';
import MyPageShell from '@/components/mypage/MyPageShell';
import { useShelfBooks } from '@/components/mypage/useShelfBooks';

/**
 * 읽을 예정인 책 — 서재에 담아 뒀고 아직 다 읽지 않은 책들.
 *
 * 완독한 책은 여기 없다. 100%가 되는 순간 '완독한 책'으로 옮겨 간다(useShelfBooks).
 */
export default function PlannedBooksScreen() {
  const router = useRouter();
  const { planned } = useShelfBooks();

  return (
    <MyPageShell title="읽을 예정인 책">
      <ShelfList
        books={planned}
        empty="아직 담은 책이 없습니다. 하루 서점에서 책을 담아보세요."
        onPress={(book) =>
          router.push({
            pathname: '/library/book/[id]',
            params: { id: book.bookId ?? book.id, from: 'planned' },
          })
        }
      />
    </MyPageShell>
  );
}
