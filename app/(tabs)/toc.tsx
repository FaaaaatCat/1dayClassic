import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LessonQuizModal from '@/components/quiz/LessonQuizModal';
import Chevron from '@/components/Chevron';
import ScaleButton from '@/components/ScaleButton';
import ScreenHeader from '@/components/ScreenHeader';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookCalendar, getBookLesson } from '@/lib/books';
import type { CalendarDay } from '@/lib/calendar';
import { getFreeLessonIds } from '@/lib/progress';
import type { BookId } from '@/types';

/** 칩과 '퀴즈 풀기' 버튼이 함께 쓰는 높이 — 둘이 같은 줄에 있는 것처럼 보여야 한다. */
const CHIP_H = 24;

/**
 * 목차 한 줄이 퀴즈에 대해 말하는 것.
 *
 * - none    이 항목에는 퀴즈가 없다 — 아무것도 달지 않는다.
 * - unsolved 아직 안 풀었다(풀다 만 것도 여기다) — '퀴즈 풀기' 버튼.
 * - solved  다 풀었다 — 몇 개 맞혔는지 말하는 칩.
 */
type QuizState =
  | { kind: 'none' }
  | { kind: 'unsolved' }
  | { kind: 'solved'; correct: number; total: number };

/**
 * 목차.
 *
 * 홈에 붙어 있던 목록을 제 화면으로 떼어냈다. 홈은 지금 읽는 책 한 권을 보여 주는 자리고,
 * 그 안에 무엇이 들었는지는 여기서 본다 — 한 화면이 둘을 함께 말하면 어느 쪽이 주인공인지
 * 흐려진다.
 *
 * 앞의 다섯 줄만 누를 수 있다. 그 뒤는 잠겨 있고, 그 사실을 자물쇠로 말한다.
 *
 * 한 줄이 말하는 것은 둘이다 — 다 읽었는지(줄의 바탕색)와 퀴즈를 풀었는지(아래 칩).
 * 둘을 따로 두는 건 서로 다른 물음이라서다. 퀴즈를 안 풀고 마지막 장까지만 봐도 다 읽은
 * 것이고, 그때 이 줄은 짙은 바탕에 '퀴즈 풀기' 버튼을 함께 단다.
 */
export default function TocScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId } = useBookSelection();
  const { quizOf, isDone } = useQuiz();
  const { isCompleted } = useReadingCursor();

  /**
   * 정렬 — 첫장부터(1월 1일이 위)와 최신순(오늘이 위)을 오간다.
   *
   * 기본이 첫장부터인 건 이 책이 1월 1일부터 차례로 읽어 나가는 물건이라서다.
   */
  const [newestFirst, setNewestFirst] = useState(false);

  /**
   * 열려 있는 퀴즈 팝업 — 어느 항목을, 되읽는 것인지 새로 푸는 것인지까지.
   *
   * 목차를 떠나지 않고 그 위에 띄운다. 퀴즈를 보려고 항목을 열었다가 다시 목차로
   * 돌아오는 길을 만들면, 목록에서 하나를 짚어 확인하는 일이 왕복이 된다.
   */
  const [quizOpen, setQuizOpen] = useState<{ lessonId: string; review: boolean } | null>(null);

  /** 다시 들어올 때는 처음 상태로 — 이 화면도 Tabs의 형제라 떠나도 사라지지 않는다. */
  useFocusEffect(
    useCallback(() => {
      setNewestFirst(false);
      setQuizOpen(null);
    }, []),
  );

  /**
   * 원고가 있는 날만 남긴다. 잠긴 날까지 365줄을 그리면 스크롤이 끝나지 않고, 아직 없는
   * 것을 세는 목록이 된다.
   */
  const days = useMemo(() => {
    const real = getBookCalendar(selectedBookId).filter((day) => day.lessonId !== undefined);
    return newestFirst ? [...real].reverse() : real;
  }, [selectedBookId, newestFirst]);

  /**
   * 무료로 열려 있는 항목들. 목록을 최신순으로 뒤집어도 열려 있는 다섯은 그대로여야
   * 하므로, 뒤집기 전 차례(달력 원본)에서 고른다 — 그 일은 lib/progress가 한다.
   * 홈의 이어읽기가 고르는 범위와 같은 값을 봐야 해서 그 한 곳에 뒀다.
   */
  const freeLessonIds = useMemo(() => getFreeLessonIds(selectedBookId), [selectedBookId]);

  const openLesson = (lessonId: string) => {
    router.push({ pathname: '/today', params: { bookId: selectedBookId, lessonId } });
  };

  /**
   * 그 줄을 다 읽었는지.
   *
   * 읽기 기록(ReadingCursorContext)이 본래 답이지만, 퀴즈를 다 푼 것도 여기서는 끝으로
   * 친다 — 퀴즈를 푼 것이 '끝'의 세 기준 중 하나이고(CardDeckDetail 주석 참고), 읽기
   * 기록을 쓰기 전에 쌓인 옛 기록도 이 갈래로 함께 받아 준다.
   */
  const completed = (lessonId: string) =>
    isCompleted(selectedBookId, lessonId) || isDone(lessonId);

  /** 그 줄의 퀴즈가 어떤 상태인지 — 칩을 달지, 버튼을 달지, 아무것도 안 달지. */
  const quizStateOf = (lessonId: string): QuizState => {
    const quizzes = quizzesOf(selectedBookId, lessonId);
    if (quizzes === 0) return { kind: 'none' };
    // 다 풀어야 푼 것으로 친다 — 풀다 만 줄은 이어서 풀라고 버튼을 그대로 둔다.
    if (!isDone(lessonId)) return { kind: 'unsolved' };
    const record = quizOf(lessonId);
    const answers = Object.values(record?.answers ?? {});
    return {
      kind: 'solved',
      correct: answers.filter((a) => a.correct).length,
      total: record?.total ?? quizzes,
    };
  };

  return (
    <View style={styles.screen}>
      {/* 홈은 Tabs의 형제라 back()이 아니라 이름으로 되돌린다. */}
      <ScreenHeader title="목차" back="/" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Space[40] }}>
        {/* 정렬 — 오른쪽 끝에 붙는다. */}
        <View style={styles.sortRow}>
          <ScaleButton
            accessibilityLabel={`정렬 ${newestFirst ? '최신순' : '첫장부터'}, 바꾸기`}
            style={styles.sortButton}
            onPress={() => setNewestFirst((v) => !v)}>
            <Ionicons name="swap-vertical" color={Ink.primary} size={18} />
            <Text style={styles.sortText}>{newestFirst ? '최신순' : '첫장부터'}</Text>
          </ScaleButton>
        </View>

        <View style={styles.list}>
          {days.map((day) => {
            const lessonId = day.lessonId!;
            const free = freeLessonIds.has(lessonId);
            return (
              <TocRow
                key={lessonId}
                day={day}
                free={free}
                read={completed(lessonId)}
                // 잠긴 줄은 읽을 수도 풀 수도 없다 — 자물쇠 하나만 단다.
                quiz={free ? quizStateOf(lessonId) : { kind: 'none' }}
                onPress={free ? () => openLesson(lessonId) : undefined}
                onOpenQuiz={(review) => setQuizOpen({ lessonId, review })}
              />
            );
          })}
        </View>
      </ScrollView>

      <LessonQuizModal
        bookId={selectedBookId}
        lessonId={quizOpen?.lessonId}
        visible={quizOpen !== null}
        review={quizOpen?.review ?? true}
        onClose={() => setQuizOpen(null)}
      />
    </View>
  );
}

/** 그 항목이 든 문제 수 — 0이면 퀴즈가 없는 항목이다. */
function quizzesOf(bookId: BookId, lessonId: string): number {
  const lesson = getBookLesson(bookId, lessonId)?.lesson;
  // 한 문제만 드는 책은 quizzes 대신 quiz에 들어 있다(types/index.ts 참고).
  return lesson?.quizzes?.length ?? (lesson?.quiz ? 1 : 0);
}

/**
 * 목차 한 줄.
 *
 * 다 읽은 줄은 바탕이 한 단 짙어진다(Surface.plate). 체크 표식을 따로 달지 않는 건,
 * 아래에 퀴즈 칩이 이미 서 있어서 오른쪽에 표식을 하나 더 두면 한 줄이 세 가지를 동시에
 * 말하게 되기 때문이다. 잠긴 줄은 자물쇠 하나뿐이다.
 */
function TocRow({
  day,
  free,
  read,
  quiz,
  onPress,
  onOpenQuiz,
}: {
  day: CalendarDay;
  /** 무료로 열려 있는 줄인지 — 잠긴 줄은 자물쇠만 단다. */
  free: boolean;
  read: boolean;
  quiz: QuizState;
  onPress?: () => void;
  /** 칩·버튼을 눌렀을 때. review면 다 푼 퀴즈를 되읽는 것이다. */
  onOpenQuiz: (review: boolean) => void;
}) {
  const body = (
    <View style={[styles.row, read && styles.rowRead]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {day.title}
        </Text>
        {day.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {day.subtitle}
          </Text>
        ) : null}

        {/* 퀴즈 칸 — 줄 전체를 누르면 항목이 열리므로, 이 자리만 따로 손가락을 받는다. */}
        {quiz.kind === 'solved' ? (
          <QuizScoreChip
            correct={quiz.correct}
            total={quiz.total}
            onPress={() => onOpenQuiz(true)}
          />
        ) : quiz.kind === 'unsolved' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${day.title} 퀴즈 풀기`}
            style={styles.quizButton}
            onPress={() => onOpenQuiz(false)}>
            <Text style={styles.quizButtonText}>퀴즈 풀기</Text>
          </Pressable>
        ) : null}
      </View>

      {free ? (
        <Chevron direction="forward" color={Ink.muted} size={18} />
      ) : (
        <Ionicons name="lock-closed" color={Ink.muted} size={18} />
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${day.title} 읽기`} onPress={onPress}>
      {body}
    </Pressable>
  );
}

/**
 * 다 푼 퀴즈의 성적 칩.
 *
 * 이미 끝낸 일이라 채우지 않고 선만 둔다 — 주황은 아직 남은 일('퀴즈 풀기') 하나에만
 * 붙는다. 한 화면에 주황이 둘이면 어디를 보라는 말인지 사라진다(constants/theme의 Spark
 * 주석). 전부 맞혔는지 몇 개를 맞혔는지는 색이 아니라 글로 갈린다.
 */
function QuizScoreChip({
  correct,
  total,
  onPress,
}: {
  correct: number;
  total: number;
  onPress: () => void;
}) {
  const label = correct === total ? '전부 정답' : `${correct}/${total} 정답`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, 퀴즈 다시 보기`}
      style={styles.chip}
      onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  sortRow: {
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Space[20],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    paddingVertical: Space[8],
  },
  sortText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.primary,
  },

  /** 줄들은 붙어 있지 않고 8씩 떨어진 카드다 — 저마다 한 장으로 읽힌다. */
  list: {
    gap: Space[8],
    paddingHorizontal: Space[20],
  },
  /**
   * 칩이 붙는 줄은 그만큼 키가 커야 한다 — 높이를 못 박지 않고 최소값만 준다.
   * 칩이 없는 줄은 예전 그대로 60이다.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    minHeight: 60,
    paddingHorizontal: Space[20],
    paddingVertical: Space[8],
    borderRadius: Corner.small,
    backgroundColor: Surface.card,
  },
  /** 다 읽은 줄 — 바탕이 한 단 더 깊어진다. */
  rowRead: {
    backgroundColor: Surface.plate,
  },
  rowText: {
    flex: 1,
    gap: Space[4],
  },
  /** 항목 표제 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  rowTitle: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  rowSubtitle: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },

  /**
   * 이미 푼 줄의 성적 칩 — 끝난 일이라 채우지 않고 선만 둔다.
   * 아래 '퀴즈 풀기'와 키(CHIP_H)가 같다. 나란히 놓이지 않아도 같은 물건으로 읽혀야 한다.
   */
  chip: {
    height: CHIP_H,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Space[8],
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Ink.muted,
    marginTop: Space[4],
  },
  chipText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.body,
  },
  /** 아직 안 푼 줄 — 이 줄에서 지금 할 일이라 포인트 컬러가 여기 붙는다. */
  quizButton: {
    height: CHIP_H,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: Space[8],
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
    marginTop: Space[4],
  },
  quizButtonText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.onDark,
  },
});
