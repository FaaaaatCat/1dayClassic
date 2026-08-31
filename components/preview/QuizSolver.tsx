import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import type { Quiz } from '@/types';

/**
 * 오늘의 퀴즈 — 미리보기 화면들이 전체 화면 팝업으로 띄워 함께 쓴다.
 *
 * 카드 위가 아니라 팝업인 건 보기를 손가락으로 골라야 하기 때문이다. 카드 덱에서는 탭이
 * 장 넘김에 쓰여서 같은 자리에서 '넘기기'와 '고르기'를 함께 둘 수 없었다.
 *
 * 한 화면에 한 문제씩 보여 주고 아래 '다음'으로 넘어간다. 보기는 문제마다 한 번만 고를 수
 * 있고, 고르는 순간 맞든 틀리든 해설이 열린다 — 다시 고르게 하면 정답을 맞힐 때까지 찍게
 * 되어 해설을 읽을 이유가 없어진다. 틀렸으면 짚은 보기를 붉게, 정답을 초록으로 함께 보여
 * 준다(다시 고를 수 없으니 정답이 무엇인지는 알려 줘야 한다).
 */
export default function QuizSolver({
  quizzes,
  onClose,
  onFinish,
}: {
  /** 이 항목의 문제들. 책마다 개수가 다르다. */
  quizzes: Quiz[];
  onClose: () => void;
  /** 마지막 문제까지 풀고 '오늘의 공부 마치기'를 누른 뒤. */
  onFinish: () => void;
}) {
  // 문제마다 고른 보기 하나 — 아직 안 골랐으면 null이다.
  const [picked, setPicked] = useState<(number | null)[]>(() => quizzes.map(() => null));
  const [page, setPage] = useState(0);
  // 해설까지 읽느라 내려온 스크롤을 그대로 두면 다음 문제가 중간부터 보인다.
  const bodyRef = useRef<ScrollView>(null);
  const goNext = () => {
    setPage((p) => p + 1);
    bodyRef.current?.scrollTo({ y: 0, animated: false });
  };

  if (quizzes.length === 0) {
    return <Text style={styles.quizText}>퀴즈를 찾지 못했습니다.</Text>;
  }

  const quiz = quizzes[page];
  const pick = picked[page];
  const answered = pick !== null;
  const correct = pick === quiz.answer;
  const last = page === quizzes.length - 1;

  return (
    <>
      {/* 제목과 닫기 버튼을 한 줄에 세운다. */}
      <View style={styles.quizHeader}>
        <View style={styles.heading}>
          <Ionicons name="pencil" color={Colors.brown100} size={14} />
          <Text style={styles.headingText}>{quiz.title}</Text>
        </View>
        <ScaleButton accessibilityLabel="퀴즈 닫기" style={styles.closeHit} onPress={onClose}>
          <Ionicons name="close" color={Colors.brown50} size={24} />
        </ScaleButton>
      </View>

      <ScrollView
        ref={bodyRef}
        style={styles.quizBody}
        contentContainerStyle={styles.quizPage}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.quizItemNo}>{`${page + 1} / ${quizzes.length}`}</Text>
        <Text style={styles.quizQuestion}>{quiz.question}</Text>

        <View style={styles.quizChoices}>
          {quiz.choices.map((choice, i) => {
            const no = i + 1;
            const right = answered && no === quiz.answer;
            const wrong = answered && no === pick && !correct;
            return (
              <Pressable
                key={choice}
                // 한 문제에 한 번만 고른다. 고르고 나면 더 누르지 않는다.
                disabled={answered}
                onPress={() => setPicked((prev) => prev.map((v, i2) => (i2 === page ? no : v)))}
                style={[
                  styles.quizChoice,
                  styles.quizChoiceBox,
                  right && styles.quizChoiceRight,
                  wrong && styles.quizChoiceWrong,
                ]}>
                <Text
                  style={[
                    styles.quizChoiceNo,
                    right && styles.quizChoiceNoRight,
                    wrong && styles.quizChoiceNoWrong,
                  ]}>
                  {no}
                </Text>
                <Text style={styles.quizChoiceText}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <View style={styles.quizExplanationBox}>
            {/* 맞았는지 틀렸는지 한 줄로 먼저 알려 주고 해설로 넘어간다. */}
            <Text
              style={[
                styles.quizVerdict,
                correct ? styles.quizVerdictRight : styles.quizVerdictWrong,
              ]}>
              {correct ? '정답입니다!' : `아쉬워요 정답은 ${quiz.answer}번 입니다.`}
            </Text>
            <Text style={styles.quizExplanation}>{quiz.explanation}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 하단 버튼 — 보기를 고르기 전에는 눌리지 않고, 마지막 문제에서는 마치기가 된다. */}
      <ScaleButton
        accessibilityLabel={last ? '오늘의 공부 마치기' : '다음'}
        disabled={!answered}
        style={[styles.finishButton, !answered && styles.quizNextOff]}
        onPress={last ? onFinish : goNext}>
        <Text style={[styles.finishText, !answered && styles.quizNextOffText]}>
          {last ? '오늘의 공부 마치기' : '다음'}
        </Text>
      </ScaleButton>
    </>
  );
}

/** 퀴즈 팝업이 채우는 전체 화면 — 화면마다 세이프에어리어가 달라 여백은 밖에서 준다. */
export const quizModalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.bg,
  },
});

const styles = StyleSheet.create({
  quizText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  /** 제목과 닫기 버튼이 나란히 서는 줄 — 높이는 닫기 버튼에 맞춘다. */
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 41,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headingText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  closeHit: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  /** 문제 한 장이 들어갈 자리 — 남는 높이를 다 차지하고 아래에 버튼이 붙는다. */
  quizBody: {
    flex: 1,
  },
  quizPage: {
    gap: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  quizItemNo: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  quizQuestion: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  quizChoices: {
    gap: 10,
  },
  /** 고를 수 있는 보기는 눌리는 자리가 보이도록 테두리와 여백을 준다. */
  quizChoiceBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.white,
  },
  quizChoiceRight: {
    borderColor: Colors.green100,
    backgroundColor: Colors.green10,
  },
  quizChoiceWrong: {
    borderColor: Colors.red100,
    backgroundColor: Colors.red10,
  },
  quizChoiceNoRight: {
    color: Colors.green100,
  },
  quizChoiceNoWrong: {
    color: Colors.red100,
  },
  /** 번호와 보기를 한 줄에 — 보기가 두 줄로 넘어가도 번호는 첫 줄에 붙어 있게 한다. */
  quizChoice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  quizChoiceNo: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 21,
    color: Colors.beige100,
  },
  quizChoiceText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: tracking(13),
    color: Colors.brown100,
  },
  /** 해설도 보기처럼 박스로 감싼다 — 흰 보기와 구분되게 바탕은 종이색 그대로 둔다. */
  quizExplanationBox: {
    gap: 8,
    padding: 16,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.beige10,
  },
  /** 맞고 틀림을 알리는 한 줄 — 보기에 켠 초록·붉은색과 같은 색을 쓴다. */
  quizVerdict: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: tracking(14),
  },
  quizVerdictRight: {
    color: Colors.green100,
  },
  quizVerdictWrong: {
    color: Colors.red100,
  },
  quizExplanation: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  finishButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.yellow,
  },
  finishText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  /** 보기를 고르기 전의 '다음' — 눌리지 않는다는 게 색으로 보여야 한다. */
  quizNextOff: {
    backgroundColor: Colors.brown10,
  },
  quizNextOffText: {
    color: Colors.brown50,
  },
});
