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

  if (!bookLesson) return null;

  return <CardDeckDetail bookLesson={bookLesson} onClose={() => router.replace('/')} />;
}
