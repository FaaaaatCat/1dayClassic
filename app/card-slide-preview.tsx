import { useRouter } from 'expo-router';

import CardDeckDetail from '@/components/lesson/CardDeckDetail';
import { getBookLesson } from '@/lib/books';
import { PREVIEW_LESSON_ID } from '@/lib/preview-content';

/**
 * 카드 슬라이드 미리보기 — 설정에서 여는 데모.
 *
 * 오늘의 공부 상세가 쓰는 것과 같은 화면(CardDeckDetail)을 『듣기의 말들』의 정해진 항목
 * 하나로 띄운다. 인스타 스토리·원페이지 미리보기와 같은 글을 보여 주므로 세 형식을
 * 나란히 견줄 수 있다.
 *
 * 상세와 다른 것은 둘이다 — 닫으면 설정으로 돌아가고, 끝까지 넘겨도 읽기 진도를 건드리지
 * 않는다(trackProgress). 데모를 본 것이 『듣기의 말들』을 읽은 것은 아니다.
 */
export default function CardSlidePreviewScreen() {
  const router = useRouter();
  const bookLesson = getBookLesson('listening', PREVIEW_LESSON_ID);

  if (!bookLesson) return null;

  return (
    <CardDeckDetail
      bookLesson={bookLesson}
      onClose={() => router.replace('/settings')}
      trackProgress={false}
    />
  );
}
