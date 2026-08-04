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
    <View style={[blockStyles.block, styles.wrap]}>
      <View style={styles.titleRow}>
        <SymbolView
          name={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
          tintColor={Colors.brown100}
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
        <View
          style={[
            styles.explanation,
            attempt.correct ? styles.explanationCorrect : styles.explanationIncorrect,
          ]}
        >
          <Text style={styles.explanationLabel}>{attempt.correct ? '잘했어요' : '아쉬워요'}</Text>
          <Text style={styles.explanationAnswer}>정답은 {quiz.answer}번 입니다</Text>
          <Text style={styles.explanationText}>{quiz.explanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  question: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  choices: {
    gap: 10,
  },
  choiceButton: {
    alignItems: 'flex-start',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.brown10,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  choiceCorrect: {
    borderColor: Colors.blue100,
    backgroundColor: Colors.blue10,
  },
  choiceIncorrect: {
    borderColor: Colors.red100,
    backgroundColor: Colors.red10,
  },
  choiceText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  choiceTextCorrect: {
    fontFamily: Fonts.semiBold,
    color: Colors.blue100,
  },
  choiceTextIncorrect: {
    fontFamily: Fonts.semiBold,
    color: Colors.red100,
  },
  explanation: {
    borderRadius: 8,
    padding: 16,
    gap: 4,
  },
  explanationCorrect: {
    backgroundColor: Colors.blue10,
  },
  explanationIncorrect: {
    backgroundColor: Colors.red10,
  },
  explanationLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown100,
  },
  explanationAnswer: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  explanationText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
});
