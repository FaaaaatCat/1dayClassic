import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chevron from '@/components/Chevron';
import type { QuizTarget } from '@/components/preview/QuizSolver';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Spark, Type, trackBody } from '@/constants/theme';
import { useQuiz } from '@/context/QuizContext';
import type { Quiz } from '@/types';

/** 해설 시트가 아래에서 올라오는 시간과 거리. */
const SHEET_MS = 320;
const SHEET_RISE = 240;

/**
 * 오늘의 퀴즈 — 검은 화면에 한 문제씩(피그마 '오늘의퀴즈_풀기전'·'푼 후').
 *
 * 보기를 고르면 그 문제는 잠기고, 내가 고른 보기는 파랑(Spark.violet)·정답은 주황(Spark.ember)으로
 * 켜지며, 아래에서 주황 해설 시트가 올라온다. 맞혔으면 고른 보기가 곧 정답이라 주황 하나만 켜진다.
 * 위의 점들은 몇 문제를 풀었는지다 — 푼 문제만큼 주황이 된다.
 *
 * 오늘의 공부(ReadingFlow)가 쓴다. 고른 보기는 그 자리에서 QuizContext에 적힌다 — QuizSolver와
 * 같은 기록이라 홈의 진행 줄·목차의 정답 칩·틀린 문제가 그대로 이어진다. target이 'preview'면
 * (책 펼침 전환 미리보기) 아무 데도 적지 않는다. 풀다 만 것이 있으면 아직 안 푼 첫 문제부터 연다.
 */
export default function TodayQuiz({
  quizzes,
  target,
  onBack,
  onFinish,
}: {
  quizzes: Quiz[];
  /** 답을 어디에 적을지 — 'preview'면 적지 않는다(QuizSolver의 QuizTarget과 같다). */
  target: QuizTarget;
  onBack: () => void;
  /** 마지막 문제의 '다음'을 누른 뒤 — 맞힌 수를 넘긴다. */
  onFinish: (correct: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { quizOf, answer } = useQuiz();
  const saving = target !== 'preview';
  const [picked, setPicked] = useState<(number | null)[]>(() => {
    const saved = saving ? quizOf(target.lessonId) : undefined;
    return quizzes.map((_, index) => saved?.answers[index]?.choice ?? null);
  });
  // 풀다 만 것이 있으면 아직 안 푼 첫 문제부터. 다 풀었으면 처음부터 다시 훑는다.
  const [page, setPage] = useState(() => {
    const first = picked.findIndex((choice) => choice === null);
    return first === -1 ? 0 : first;
  });
  const bodyRef = useRef<ScrollView>(null);

  const quiz = quizzes[page];
  const pick = picked[page];
  const answered = pick !== null;
  const correct = pick === quiz?.answer;
  const last = page === quizzes.length - 1;

  /** 해설 시트 — 고르면 올라오고, 다음 문제로 가면 내려가 있다. */
  const sheet = useSharedValue(0);
  useEffect(() => {
    sheet.set(
      answered ? withTiming(1, { duration: SHEET_MS, easing: Easing.out(Easing.cubic) }) : 0,
    );
  }, [answered, sheet]);
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheet.value,
    transform: [{ translateY: (1 - sheet.value) * SHEET_RISE }],
  }));

  if (!quiz) return null;

  const choose = (choice: 1 | 2 | 3 | 4) => {
    setPicked((prev) => prev.map((v, index) => (index === page ? choice : v)));
    if (!saving) return;
    answer(target.lessonId, {
      bookId: target.bookId,
      total: quizzes.length,
      index: page,
      choice,
      correct: choice === quiz.answer,
    });
  };

  const next = () => {
    if (last) {
      const score = picked.filter((choice, index) => choice === quizzes[index].answer).length;
      onFinish(score);
      return;
    }
    setPage((p) => p + 1);
    bodyRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={[styles.screen, { paddingBottom: answered ? 0 : insets.bottom }]}>
      {/* 위 줄 — 왼쪽 꺾쇠가 본문으로 돌아가고, 가운데에 화면 이름. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <ScaleButton accessibilityLabel="뒤로" style={styles.back} onPress={onBack}>
          <Chevron size={24} color={Ink.onDark} />
        </ScaleButton>
        <Text style={[styles.headerTitle, { top: insets.top + 17.5 }]} pointerEvents="none">
          오늘의 퀴즈
        </Text>
      </View>

      <ScrollView
        ref={bodyRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.questionBox}>
          <Text style={styles.question}>{`Q. ${quiz.question}`}</Text>
        </View>

        {/* 몇 문제를 풀었는지 — 푼 만큼 주황. */}
        <View style={styles.dots}>
          {quizzes.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, picked[index] !== null && styles.dotDone]}
            />
          ))}
        </View>

        <View style={styles.choices}>
          {quiz.choices.map((choice, i) => {
            // 보기는 늘 4개다(lib/quiz.ts가 개발 중에 검사한다).
            const no = (i + 1) as 1 | 2 | 3 | 4;
            const isAnswer = answered && no === quiz.answer;
            const isMine = answered && no === pick && !correct;
            return (
              <Pressable
                key={choice}
                accessibilityLabel={`${no}번 ${choice}`}
                // 한 문제에 한 번만 고른다 — 다시 고르게 하면 해설을 읽을 이유가 사라진다.
                disabled={answered}
                onPress={() => choose(no)}
                style={[
                  styles.choice,
                  isMine && styles.choiceMine,
                  isAnswer && styles.choiceAnswer,
                ]}>
                <Text style={styles.choiceNo}>{no}</Text>
                <Text style={styles.choiceText}>{choice}</Text>
                {isAnswer ? <Text style={styles.choiceTag}>정답</Text> : null}
                {isMine ? <Text style={styles.choiceTag}>내 답</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {answered ? (
        // 해설 시트와 그 아래 버튼이 한 장의 주황으로 이어진다.
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, sheetStyle]}>
          <View style={styles.sheetTexts}>
            <Text style={styles.verdict}>{correct ? '정답이에요!' : '아쉬워요...!'}</Text>
            <Text style={styles.explanation}>{quiz.explanation}</Text>
          </View>
          <ScaleButton
            accessibilityLabel={last ? '퀴즈 마치기' : '다음 문제'}
            style={styles.nextOnSheet}
            onPress={next}>
            <Text style={styles.nextOnSheetText}>{last ? '완료' : '다음'}</Text>
          </ScaleButton>
        </Animated.View>
      ) : (
        // 고르기 전의 '다음' — 눌리지 않는다는 게 색으로 보인다.
        <View style={styles.footer}>
          <View style={styles.nextOff}>
            <Text style={styles.nextOffText}>{last ? '완료' : '다음'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  back: {
    width: 40,
    height: 40,
    marginVertical: 10,
  },
  /** 제목은 가운데에 겹쳐 둔다 — 왼쪽 꺾쇠가 있어도 화면 한가운데에 앉아야 한다. */
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 25,
    color: Ink.onDark,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  questionBox: {
    paddingVertical: 20,
  },
  question: {
    fontFamily: Type.uiMedium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.15,
    textAlign: 'center',
    color: Ink.onDark,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Ink.body,
  },
  dotDone: {
    backgroundColor: Spark.ember,
  },
  choices: {
    gap: 8,
  },
  /** 보기 — 검은 바탕 위에 흰빛을 옅게(15%) 깐 칸. */
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  /** 내가 고른 오답 — 파랑. */
  choiceMine: {
    backgroundColor: Spark.violet,
  },
  /** 정답 — 주황. 맞혔으면 내 답도 여기 켜진다. */
  choiceAnswer: {
    backgroundColor: Spark.ember,
  },
  choiceNo: {
    fontFamily: Type.uiMedium,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: trackBody(13),
    color: Ink.onDark,
  },
  choiceText: {
    flex: 1,
    fontFamily: Type.uiMedium,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: trackBody(13),
    color: Ink.onDark,
  },
  choiceTag: {
    fontFamily: Type.uiMedium,
    fontSize: 12,
    lineHeight: 21,
    color: Ink.onDark,
  },
  footer: {
    padding: 20,
  },
  nextOff: {
    height: 52,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.strong,
  },
  nextOffText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.body,
  },
  /** 해설 시트 — 위 모서리만 둥근 주황 판. 아래 버튼까지 한 판에 담는다. */
  sheet: {
    gap: 20,
    paddingTop: 32,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Spark.ember,
  },
  sheetTexts: {
    gap: 8,
  },
  /** 시안은 SemiBold지만 앱에 실린 굵기가 Medium까지라 Medium으로 둔다. */
  verdict: {
    fontFamily: Type.uiMedium,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 0.14,
    color: Ink.onDark,
  },
  explanation: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: trackBody(14),
    color: Ink.onDark,
  },
  nextOnSheet: {
    height: 52,
    borderRadius: Corner.pill,
    backgroundColor: Ink.onDark,
  },
  nextOnSheetText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.primary,
  },
});
