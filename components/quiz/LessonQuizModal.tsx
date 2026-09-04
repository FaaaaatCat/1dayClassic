import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import QuizSolver, { quizModalStyles } from '@/components/preview/QuizSolver';
import { getBookLesson } from '@/lib/books';
import type { BookId } from '@/types';

/**
 * 한 항목의 퀴즈를 전체 화면 팝업으로 띄운다.
 *
 * 오늘의 공부(CardDeckDetail)가 제 안에서 하던 일을, 화면을 떠나지 않고 퀴즈만 열어야
 * 하는 다른 자리들이 함께 쓰도록 떼어낸 것이다 — 목차의 정답 칩·'퀴즈 풀기' 버튼과
 * 마이페이지의 틀린 문제 목록이 이것을 쓴다.
 *
 * 팝업 안은 QuizSolver 그대로다. 여기가 맡는 것은 두 가지뿐 — 항목 id로 문제들을 찾아
 * 오는 일과, 화면마다 다른 세이프에어리어 여백을 대는 일(QuizSolver는 여백을 밖에서
 * 받는다).
 */
export default function LessonQuizModal({
  bookId,
  lessonId,
  visible,
  onClose,
  review = true,
  initialIndex = 0,
}: {
  bookId: BookId;
  /** 어느 항목의 퀴즈인지. 닫혀 있을 때는 undefined일 수 있다. */
  lessonId?: string;
  visible: boolean;
  onClose: () => void;
  /**
   * 다 푼 퀴즈를 되읽는 자리인지. 기본이 true인 건 이 팝업을 여는 자리가 대개
   * 그렇기 때문이다 — 새로 푸는 자리(목차의 '퀴즈 풀기')만 false를 준다.
   */
  review?: boolean;
  /** 몇 번째 문제부터 열지(0부터). */
  initialIndex?: number;
}) {
  const insets = useSafeAreaInsets();

  // 한 문제만 드는 책은 quizzes 대신 quiz에 들어 있다(types/index.ts 참고).
  const lesson = lessonId ? getBookLesson(bookId, lessonId)?.lesson : undefined;
  const quizzes = lesson?.quizzes ?? (lesson?.quiz ? [lesson.quiz] : []);

  if (!lessonId || quizzes.length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          quizModalStyles.screen,
          { paddingBottom: insets.bottom + 24 },
        ]}>
        <QuizSolver
          quizzes={quizzes}
          target={{ lessonId, bookId }}
          review={review}
          initialIndex={initialIndex}
          onClose={onClose}
          // 다 풀고 마치면 팝업을 닫는 것 말고 갈 곳이 없다 — 여기는 읽기 흐름 밖이다.
          onFinish={onClose}
        />
      </View>
    </Modal>
  );
}
