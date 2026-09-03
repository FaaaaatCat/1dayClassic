import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useWrongQuizzes, type WrongQuiz } from '@/components/mypage/useWrongQuizzes';
import { Corner, Feedback, Ink, Space, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/**
 * 틀린 문제.
 *
 * 마이페이지 → 책 정보의 '퀴즈 정답률' 칸에서 들어온다. 틀린 문제만 모아 다시 보여 주는
 * 자리다 — 다시 풀게 하지는 않는다. 퀴즈는 한 번 고르면 잠기는 것이 이 앱의 규칙이라
 * (QuizSolver 주석 참고), 여기서 다시 풀 수 있게 하면 정답률이 사후에 바뀌어 기록이
 * 기록이 아니게 된다.
 *
 * 그래서 이 화면이 하는 일은 하나다 — 내가 무엇을 골랐고 정답이 무엇이었는지를 해설과
 * 함께 다시 읽히는 것. 보기의 색은 퀴즈를 풀 때와 같게 둔다(고른 오답은 붉게, 정답은
 * 초록으로). 같은 것을 다른 색으로 말하면 두 번 배워야 한다.
 */
export default function WrongQuizzesScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();

  // 라우트로 받은 id가 학습 가능한 책인지 확인한다 — 퀴즈는 그 책들에만 있다.
  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const { wrong, solved } = useWrongQuizzes(studyBook?.id);

  // 들어온 자리(책 정보)로 돌려보낸다. 그 화면도 제가 어디서 왔는지(from)를 들고 있어야
  // 한 단계 더 뒤로 갈 수 있으므로 그대로 실어 보낸다.
  const back = id
    ? `/library/book/${id}${from ? `?from=${from}` : ''}`
    : '/library';

  return (
    <MyPageShell title="틀린 문제" back={back}>
      {wrong.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {solved === 0 ? '아직 푼 퀴즈가 없어요' : '틀린 문제가 없어요'}
          </Text>
          {solved > 0 ? <Text style={styles.emptyNote}>{`${solved}문제를 모두 맞혔어요`}</Text> : null}
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.count}>{`${wrong.length}문제`}</Text>
          {wrong.map((item) => (
            <WrongCard key={item.key} item={item} />
          ))}
        </View>
      )}
    </MyPageShell>
  );
}

/** 틀린 문제 한 장 — 어느 날 몇 번째 문제였는지, 문제, 보기 넷, 해설 순으로 읽힌다. */
function WrongCard({ item }: { item: WrongQuiz }) {
  const { quiz, picked } = item;

  return (
    <View style={styles.card}>
      <Text style={styles.cardWhere}>
        {`${item.month}월 ${item.day}일 · ${item.lessonTitle}`}
      </Text>
      <Text style={styles.cardNo}>{`${item.index + 1}번째 문제 (총 ${item.total}문제)`}</Text>

      <Text style={styles.question}>{quiz.question}</Text>

      <View style={styles.choices}>
        {quiz.choices.map((choice, i) => {
          // 보기는 늘 4개다(lib/quiz.ts가 개발 중에 검사한다).
          const no = (i + 1) as 1 | 2 | 3 | 4;
          const isAnswer = no === quiz.answer;
          // 내가 고른 것이 정답일 리는 없다(틀린 문제만 모았다) — 그래도 조건은 명시해 둔다.
          const isMine = no === picked && !isAnswer;
          return (
            <View
              key={choice}
              style={[styles.choice, isAnswer && styles.choiceRight, isMine && styles.choiceWrong]}>
              <Text
                style={[styles.choiceNo, isAnswer && styles.textRight, isMine && styles.textWrong]}>
                {no}
              </Text>
              <Text style={styles.choiceText}>{choice}</Text>
              {/* 넷 중 어느 것이 내 답이고 어느 것이 정답인지 색만으로 말하지 않는다 —
                  색을 못 가리는 사람에게는 넷이 똑같은 줄로 보인다. */}
              {(isAnswer || isMine) && (
                <Text style={[styles.tag, isAnswer ? styles.textRight : styles.textWrong]}>
                  {isAnswer ? '정답' : '내 답'}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.explanationBox}>
        <Text style={styles.explanationLabel}>{`정답은 ${quiz.answer}번 입니다`}</Text>
        <Text style={styles.explanation}>{quiz.explanation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Space[16],
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[8],
  },
  count: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  empty: {
    gap: Space[4],
    alignItems: 'center',
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[72],
  },
  emptyText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  emptyNote: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },

  /** 문제 한 장 — 테두리 없이 한 단 올라온 종이다(Surface.card). */
  card: {
    gap: Space[8],
    padding: Space[20],
    borderRadius: Corner.card,
    backgroundColor: Surface.card,
  },
  cardWhere: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.strong,
  },
  cardNo: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  question: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.primary,
    paddingTop: Space[4],
  },

  choices: {
    gap: Space[8],
    paddingTop: Space[4],
  },
  /** 번호와 보기를 한 줄에 — 보기가 두 줄로 넘어가도 번호는 첫 줄에 붙어 있게 한다. */
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[8],
    paddingVertical: Space[12],
    paddingHorizontal: Space[12],
    borderRadius: Corner.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  choiceRight: {
    borderColor: Feedback.right,
    backgroundColor: Feedback.rightSurface,
  },
  choiceWrong: {
    borderColor: Feedback.wrong,
    backgroundColor: Feedback.wrongSurface,
  },
  choiceNo: {
    fontFamily: Type.uiMedium,
    fontSize: 13,
    lineHeight: 21,
    color: Ink.strong,
  },
  choiceText: {
    flex: 1,
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: trackBody(13),
    color: Ink.primary,
  },
  /** '정답'·'내 답' 꼬리표 — 색을 못 가려도 어느 줄이 무엇인지 읽히게 한다. */
  tag: {
    fontFamily: Type.uiMedium,
    fontSize: 12,
    lineHeight: 21,
    letterSpacing: trackBody(12),
  },
  textRight: {
    color: Feedback.right,
  },
  textWrong: {
    color: Feedback.wrong,
  },

  /** 해설 — 보기와 구분되게 바탕을 한 단 더 깊게 둔다(보기는 종이색이다). */
  explanationBox: {
    gap: Space[4],
    padding: Space[16],
    borderRadius: Corner.small,
    backgroundColor: Surface.plate,
    marginTop: Space[4],
  },
  explanationLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: trackBody(14),
    color: Feedback.right,
  },
  explanation: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: trackBody(13),
    color: Ink.body,
  },
});
