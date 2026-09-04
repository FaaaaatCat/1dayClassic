import { useLocalSearchParams, useRouter } from 'expo-router';

import CardDeckDetail from '@/components/lesson/CardDeckDetail';
import { useBookSelection } from '@/context/BookSelectionContext';
import { getBookLesson } from '@/lib/books';
import type { BookId } from '@/types';

/**
 * 하루 시리즈가 공유하는 항목 상세 화면.
 *
 * 이 파일은 항목을 해석해서 화면에 넘기는 일만 한다. 그리는 일은 CardDeckDetail이 맡는다 —
 * 좌우로 넘기는 카드 형식이다. 예전의 한 페이지 형식(LessonDetailShell + renderBookDetail)은
 * 설정의 '원페이지 미리보기'(app/onepage-preview.tsx)에 그대로 남아 있어 언제든 견줄 수 있다.
 *
 * bookId를 안 주면 하루 서점에서 선택해 둔 책의 오늘 항목을 보여 준다 — 네이티브 알람이
 * 항목을 지정하지 않고 `1dayclassic://today?autoplay=…`로 열기 때문에 이 기본값이 필요하고,
 * 그래서 알람이 여는 책도 선택된 책을 그대로 따라간다.
 */
export default function TodayScreen() {
  const params = useLocalSearchParams<{ bookId?: string; lessonId?: string }>();
  const router = useRouter();
  const { selectedBookId } = useBookSelection();
  const bookId = (params.bookId as BookId | undefined) ?? selectedBookId;
  const bookLesson = getBookLesson(bookId, params.lessonId);

  /*
   * 여기서 읽기 커서를 적지 않는다 — 여는 것은 끝내는 것이 아니다.
   *
   * 끝냈다고 적는 자리는 CardDeckDetail 안이다. 화면을 열자마자 적으면, 읽다 나온 화가
   * 다음 번에 건너뛰어진다(ReadingCursorContext 주석 참고).
   */

  if (!bookLesson) return null;

  /*
   * key로 항목 id를 준다.
   *
   * 퀴즈 엔딩 화면의 '다음 화 읽기'는 이 화면을 떠나지 않고 lessonId 파라미터만 바꾼다.
   * key가 없으면 컴포넌트가 그대로 살아 있어 새 항목의 글이 이전 장 번호 위에 얹힌다 —
   * 카드 덱의 초기화는 화면에 '들어올 때'만 돌기 때문이다(CardDeckDetail의 useFocusEffect).
   */
  return (
    <CardDeckDetail
      key={bookLesson.lesson.id}
      bookLesson={bookLesson}
      onClose={() => router.replace('/')}
    />
  );
}
