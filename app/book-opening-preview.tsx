import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookOpening, { LightVeil, OPENING_MS, veilAt } from '@/components/book/BookOpening';
import HomeLayout, { COVER_W } from '@/components/home/HomeLayout';
import ReadingFlow, { type ReadingEntry } from '@/components/reading/ReadingFlow';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Ink } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookLesson, getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getCoverDesign } from '@/lib/coverDesign';
import { getReadingProgress, getReadPlan } from '@/lib/progress';
import type { BookId } from '@/types';

/**
 * 책 펼침 전환 미리보기 — 설정에서 연다.
 *
 * 홈의 읽기 버튼을 눌렀을 때 오늘의 공부를 끝내기까지의 흐름 전체를 아무것도 저장하지 않고 본다.
 * 이 흐름은 이제 실제 앱의 것이다 — 홈(app/(tabs)/index)이 책을 펼치고, 오늘의 공부
 * (app/(tabs)/today)가 ReadingFlow로 첫표지·본문·퀴즈·독서 완료를 그린다. 여기는 그 둘을
 * 한 화면에 이어 붙여, 기록 없이(track=false) 몇 번이고 다시 볼 수 있게 한 것이다.
 *
 *  1. 읽기를 누르면 책이 펼쳐지고 빛이 화면을 덮는다(BookOpening·LightVeil).
 *  2. 흰 화면이 걷히며 첫표지 → 본문 → 오늘의 퀴즈 → 오늘의 독서 완료(ReadingFlow, entry=veil).
 *
 * 생김새는 홈과 같은 것(HomeLayout)을 그대로 쓰고, 열리는 화는 홈의 읽기 버튼이 여는 것과
 * 같다(getReadPlan).
 *
 * 펼침 없이 보기(?skip=1) — 읽기를 누르면 1을 건너뛰고 홈 위로 첫표지가 떠오른다(entry=fade).
 * 책 오픈 효과를 끈 실제 앱과 같은 모양이다. ?book=으로 다른 책을 지목할 수 있다(설정의 '유튜브
 * 없는 화'가 명심보감을 지목한다).
 *
 * 어느 단계에서든 닫기(꺾쇠·오늘 독서 완료하기·다음 화 읽기·기기의 뒤로가기)는 닫힌 책으로 돌아와
 * 다시 볼 수 있게 한다. 닫힌 책에서의 뒤로가기는 설정으로 나간다.
 */
export default function BookOpeningPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ skip?: string; book?: string }>();
  const skipOpening = params.skip === '1';
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  /** 어느 책으로 볼지 — 보통은 지금 고른 책이고, ?book=으로 다른 책을 지목할 수 있다. */
  const bookId = (params.book as BookId | undefined) ?? selectedBookId;
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();

  const book = getCatalogBookByBookId(bookId);
  const design = book?.coverDesign ?? getCoverDesign(bookId);
  const readingProgress = getReadingProgress(bookId, isDone);
  const plan = getReadPlan(bookId, cursorOf(bookId));
  const bookLesson = getBookLesson(bookId, plan?.lessonId);

  /** 흐름이 떠 있는가와 어떻게 들어왔는가. run은 다시 볼 때마다 흐름을 새로 세우는 값이다. */
  const [flow, setFlow] = useState<ReadingEntry | null>(null);
  const [run, setRun] = useState(0);

  /** 책이 펼쳐지는 진행(0~1). */
  const progress = useSharedValue(0);
  const whiten = useSharedValue(0);
  const veil = useDerivedValue(() => veilAt(progress.value));

  /** 처음으로 — 닫힌 책 앞. */
  const reset = useCallback(() => {
    progress.set(0);
    setFlow(null);
  }, [progress]);

  // 닫힌 책에서의 뒤로가기는 설정으로. 흐름이 떠 있을 때는 흐름이 먼저 받는다(나중에 붙어서).
  const flowRef = useRef(flow);
  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (flowRef.current) reset();
        else router.replace('/settings');
        return true;
      });
      return () => subscription.remove();
    }, [reset, router]),
  );

  /** 흐름을 띄운다 — 빛이 다 덮은 뒤(veil)거나, 펼침 없이 곧장(fade). */
  const startFlow = useCallback((entry: ReadingEntry) => {
    setRun((r) => r + 1);
    setFlow(entry);
  }, []);

  const play = () => {
    if (flow || !bookLesson) return;
    if (skipOpening) {
      startFlow('fade');
      return;
    }
    progress.set(0);
    progress.set(
      withTiming(1, { duration: OPENING_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(startFlow)('veil');
      }),
    );
  };

  /** 책 말고 나머지는 표지가 열리기 시작하면 어둠 속으로 물러난다. */
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.screen}>
      {/* 홈 — 펼침 없이 보기에서는 첫표지가 떠오르는 동안 그 밑에 남는다. */}
      <View style={[styles.home, { paddingTop: insets.top }]}>
        <StatusBarTint />
        <HomeLayout
          cover={<BookOpening design={design} width={COVER_W} progress={progress} />}
          title={book?.title ?? getBookName(bookId)}
          author={book?.author}
          alarm={alarm}
          readPages={readingProgress.readPages}
          totalPages={readingProgress.totalPages}
          plan={plan}
          onRead={play}
          chromeStyle={chromeStyle}
        />
      </View>

      {/* 빛이 화면을 다 덮는다 — 흐름이 같은 흰빛에서 이어받으므로 흐름이 뜨면 걷는다. */}
      {flow ? null : <LightVeil opacity={veil} whiten={whiten} />}

      {flow && bookLesson ? (
        <ReadingFlow
          key={run}
          bookLesson={bookLesson}
          entry={flow}
          track={false}
          onExit={reset}
          onHome={reset}
          onNextLesson={reset}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  home: {
    flex: 1,
  },
});
