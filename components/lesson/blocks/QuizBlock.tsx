import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useLessonDetail } from '@/components/lesson/LessonDetailContext';
import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useQuiz } from '@/context/QuizContext';
import type { Quiz } from '@/types';

interface Props {
  quiz: Quiz;
}

type ChoiceState = 'neutral' | 'correct' | 'incorrect';

/**
 * 4지선다 퀴즈. 콘텐츠(quiz)는 props로, 채점·기록은 QuizContext로 받는다 — 블록이
 * 콘텐츠와 동작을 동시에 갖는 첫 사례다.
 *
 * 보기 번호는 1부터 센다(콘텐츠를 비개발자가 적기 때문). 배열 색인과 비교할 때
 * `index + 1 === quiz.answer`로 맞춘다 — 여기서 어긋나면 정답 판정이 통째로 틀린다.
 *
 * 제출 버튼은 없다. 보기를 고르면 즉시 기록되고 잠긴다. 이미 푼 항목은 기록에서
 * 상태(고른 보기·해설)를 그대로 복원한다.
 *
 * 잠긴 뒤에는 정답 보기를 항상 표시하고, 틀렸다면 내가 고른 오답도 함께 표시한다.
 * 해설은 '잘했어요/아쉬워요 → 정답은 n번 입니다 → 해설' 순서로 읽힌다.
 */
export default function QuizBlock({ quiz }: Props) {
  const { bookLesson } = useLessonDetail();
  const lessonId = bookLesson.lesson.id;
  const bookId = bookLesson.book; // QuizAttempt.bookId에 그대로 넣는다
  const { attemptOf, record } = useQuiz();

  const attempt = attemptOf(lessonId);
  const locked = attempt !== undefined;

  const choose = (choice: 1 | 2 | 3 | 4) => {
    if (locked) return;
    record(lessonId, {
      bookId,
      choice,
      correct: choice === quiz.answer,
      at: new Date().toISOString(),
    });
  };

  return (
    <View style={blockStyles.block}>
      {/* 블록 안의 모든 내용을 파란 카드 하나로 감싼다 — 배경이 어두워서 안쪽 글자는 흰색이다. */}
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <SymbolView
            name={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
            tintColor={Colors.white}
            size={14}
          />
          <Text style={styles.title}>{quiz.title}</Text>
        </View>

        <Text style={styles.question}>{quiz.question}</Text>

        <View style={styles.choices}>
        {quiz.choices.map((choiceText, index) => {
          const choiceNumber = (index + 1) as 1 | 2 | 3 | 4;
          const isSelected = attempt?.choice === choiceNumber;
          const isAnswer = choiceNumber === quiz.answer;
          // 잠긴 뒤에는 정답을 '항상' 표시한다 — 내가 고른 것만 표시하면 틀렸을 때
          // 무엇이 정답이었는지 알 수 없다. 내가 고른 오답은 그 위에 따로 표시한다.
          const state: ChoiceState = !locked
            ? 'neutral'
            : isAnswer
              ? 'correct'
              : isSelected
                ? 'incorrect'
                : 'neutral';

          return (
            <ScaleButton
              key={index}
              accessibilityLabel={`${choiceNumber}번, ${choiceText}`}
              style={[
                styles.choiceButton,
                state === 'correct' && styles.choiceCorrect,
                state === 'incorrect' && styles.choiceIncorrect,
              ]}
              onPress={locked ? undefined : () => choose(choiceNumber)}
            >
              <Text
                style={[
                  styles.choiceText,
                  state === 'correct' && styles.choiceTextCorrect,
                  state === 'incorrect' && styles.choiceTextIncorrect,
                ]}
              >
                {choiceNumber}. {choiceText}
              </Text>
            </ScaleButton>
          );
          })}
        </View>

        {attempt && (
          <View style={styles.explanation}>
            <Text
              style={[
                styles.explanationLabel,
                attempt.correct ? styles.resultCorrect : styles.resultIncorrect,
              ]}
            >
              {attempt.correct ? '잘했어요' : '아쉬워요'}
            </Text>
            <Text
              style={[
                styles.explanationAnswer,
                attempt.correct ? styles.resultCorrect : styles.resultIncorrect,
              ]}
            >
              정답은 {quiz.answer}번 입니다
            </Text>
            <Text style={styles.explanationText}>{quiz.explanation}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** 파란 카드 위에 얹는 반투명 흰색 — 보기 상자와 해설 상자의 기본 배경. */
const WHITE_20 = 'rgba(255, 255, 255, 0.2)';

const styles = StyleSheet.create({
  /** 블록 내용을 통째로 감싸는 파란 카드 */
  card: {
    backgroundColor: Colors.blue100,
    borderRadius: 10,
    padding: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // 감상 노트의 제목 줄과 같은 위아래 여백
    paddingVertical: 16,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.white,
  },
  question: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: tracking(20),
    color: Colors.white,
  },
  choices: {
    gap: 10,
  },
  choiceButton: {
    // 'flex-start'가 아니라 'stretch'다. flex-start면 안쪽 Text가 '글자 길이만큼'의 폭을
    // 갖는데(= 내용 폭), 그러면 Android에서 글자가 쓸 수 있는 폭을 넘길 때 줄바꿈되지 않고
    // 잘려 버린다. stretch면 Text가 버튼 폭을 그대로 받아 제 경계에서 줄바꿈한다.
    // 웹에서는 글자가 짧아 우연히 안 넘쳐서 이 차이가 드러나지 않는다.
    alignItems: 'stretch',
    width: '100%',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: WHITE_20,
  },
  // 정답은 흰 상자로 또렷하게, 오답은 팔레트의 옅은 빨강으로 — 파란 카드 위에서
  // 둘 다 배경(반투명 흰색)과 확실히 갈린다.
  choiceCorrect: {
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  choiceIncorrect: {
    borderColor: Colors.red10,
    backgroundColor: Colors.red10,
  },
  choiceText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  choiceTextCorrect: {
    fontFamily: Fonts.semiBold,
    color: Colors.blue100,
  },
  choiceTextIncorrect: {
    fontFamily: Fonts.semiBold,
    color: Colors.red100,
  },
  // 파란 카드 위에 얹히는 흰 상자 — 여기 안쪽만 글자가 어둡다.
  explanation: {
    borderRadius: 8,
    padding: 16,
    gap: 8,
    backgroundColor: Colors.white,
  },
  explanationLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
  },
  explanationAnswer: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
  },
  /** '잘했어요'와 '정답은 n번 입니다'의 색 — 맞았는지 틀렸는지를 이 두 줄이 전한다. */
  resultCorrect: {
    color: Colors.blue100,
  },
  resultIncorrect: {
    color: Colors.red100,
  },
  explanationText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
});
