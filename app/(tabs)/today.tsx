import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import ReadingFlow from '@/components/reading/ReadingFlow';
import { Ink } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { getBookLesson } from '@/lib/books';
import type { BookId } from '@/types';

/**
 * 하루 시리즈가 공유하는 항목 상세 화면 — 오늘의 공부.
 *
 * 이 파일은 항목을 해석해서 흐름에 넘기는 일만 한다. 그리는 일은 ReadingFlow가 맡는다 —
 * 첫표지 → 본문(스크롤 보기) → 오늘의 퀴즈 → 오늘의 독서 완료. 예전의 카드 넘김 형식은
 * 설정의 '카드 슬라이드 미리보기'에, 한 페이지 형식은 '원페이지 미리보기'에 남아 있다.
 *
 * bookId를 안 주면 하루 서점에서 선택해 둔 책의 오늘 항목을 보여 준다 — 네이티브 알람이
 * 항목을 지정하지 않고 `1dayclassic://today?autoplay=…`로 열기 때문에 이 기본값이 필요하고,
 * 그래서 알람이 여는 책도 선택된 책을 그대로 따라간다.
 *
 * entry=veil은 홈의 읽기 버튼이 책을 펼치고 빛으로 화면을 덮은 채 넘어왔다는 표시다. 그때만
 * 흰 화면에서 첫표지가 드러나고, 다른 길(책 오픈 효과 끔·다음 화 읽기·알람)은 검은 바탕에서
 * 첫표지가 떠오른다.
 */
export default function TodayScreen() {
  const params = useLocalSearchParams<{
    bookId?: string;
    lessonId?: string;
    entry?: string;
    t?: string;
    autoplay?: string;
  }>();
  const router = useRouter();
  const { selectedBookId } = useBookSelection();
  const bookId = (params.bookId as BookId | undefined) ?? selectedBookId;
  const bookLesson = getBookLesson(bookId, params.lessonId);

  /**
   * 들어올 때마다 흐름을 처음부터 다시 세운다 — key가 바뀌면 새로 마운트된다.
   *
   * 이 화면은 Tabs의 형제라 홈으로 나가도 사라지지 않는다 — 그대로 두면 다시 들어왔을 때 지난번에
   * 멈춘 자리(본문·완료)가 그대로 펼쳐진다. 그래서 여는 쪽이 매번 새 값(t: 연 시각)을 붙여 보내고,
   * 그 값을 key에 넣는다. 알람은 autoplay가 같은 몫을 한다(탭마다 새 시각). 포커스로 다시 세우면
   * 새 화면이 그려지는 첫 프레임에 지난 화면이 한 번 비쳐서, 파라미터가 바뀌는 그 렌더에서 바꾼다.
   */
  const visitKey = `${params.t ?? ''}:${params.autoplay ?? ''}`;

  /*
   * 여기서 읽기 커서를 적지 않는다 — 여는 것은 끝내는 것이 아니다. 끝냈다고 적는 자리는 본문
   * (CardDeckDetail, 끝까지 내렸을 때)과 흐름(ReadingFlow, 퀴즈를 마쳤을 때)이다.
   */

  if (!bookLesson) return null;

  const home = () => router.replace('/');

  return (
    <View style={styles.screen}>
      <ReadingFlow
        key={`${bookLesson.lesson.id}:${visitKey}`}
        bookLesson={bookLesson}
        entry={params.entry === 'veil' ? 'veil' : 'fade'}
        track
        onExit={home}
        onHome={home}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** 첫표지가 떠오르는 바탕 — 검다. */
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
