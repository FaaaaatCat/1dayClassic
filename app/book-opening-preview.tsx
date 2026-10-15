import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookOpening, { LightVeil, OPENING_MS, veilAt } from '@/components/book/BookOpening';
import HomeLayout, { COVER_W } from '@/components/home/HomeLayout';
import { renderBookDetail } from '@/components/lesson/books';
import LessonDetailShell from '@/components/lesson/LessonDetailShell';
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

/** 화면을 다 덮은 노란빛이 흰빛으로 바래는 시간. */
const WHITEN_MS = 600;
/** 다 바랜 뒤 숨 고르는 시간과, 장막이 걷히는 시간. */
const HOLD_MS = 100;
const REVEAL_MS = 900;

/**
 * 책 펼침 전환 미리보기 — 설정에서 연다.
 *
 * 홈의 읽기 버튼을 누르면 서 있던 책이 열리고, 빛이 새어 나와 화면을 채우고, 그 빛이
 * 흰빛으로 바랜 뒤 오늘의 공부가 천천히 떠오르는 전환이다. 홈에 바로 붙이기 전에 여기서
 * 먼저 본다.
 *
 * 생김새는 홈과 같은 것(HomeLayout)을 그대로 쓴다 — 표지 자리에만 펼쳐지는 책을 놓는다.
 * 진짜 홈을 열지 않는 건, 그 홈이 제 일(환영 창·알람 창)을 또 시작해서다. 그래서 읽기 말고
 * 다른 버튼은 눌러도 아무 일이 없다. 열리는 항목은 진짜다 — 홈의 읽기 버튼이 여는 것과 같은
 * 화(getReadPlan)를 연다. 아무것도 저장하지 않는다.
 *
 * 오늘의 공부에서 ✕를 누르면 닫힌 책으로 돌아와 다시 볼 수 있다. 설정으로 나가는 길은
 * 기기의 뒤로가기다(홈과 똑같이 보이도록 화면에 닫기 버튼을 두지 않았다).
 */
export default function BookOpeningPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();

  const book = getCatalogBookByBookId(selectedBookId);
  const design = book?.coverDesign ?? getCoverDesign(selectedBookId);
  const readingProgress = getReadingProgress(selectedBookId, isDone);
  const plan = getReadPlan(selectedBookId, cursorOf(selectedBookId));
  const bookLesson = getBookLesson(selectedBookId, plan?.lessonId);

  /** 'book' — 닫힌 책 앞, 'lesson' — 빛 속에서 떠오른 오늘의 공부. */
  const [stage, setStage] = useState<'book' | 'lesson'>('book');
  const [playing, setPlaying] = useState(false);

  /** 펼침의 진행(0~1), 장막이 흰빛으로 바랜 정도(0→1), 다 밝아진 뒤 장막이 남은 정도(1→0). */
  const progress = useSharedValue(0);
  const whiten = useSharedValue(0);
  const remain = useSharedValue(1);
  const veil = useDerivedValue(() => veilAt(progress.value) * remain.value);

  const close = useCallback(() => router.replace('/settings'), [router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      });
      return () => subscription.remove();
    }, [close]),
  );

  /**
   * 화면이 빛으로 가득 찬 순간 — 뒤를 오늘의 공부로 갈아 끼우고, 노란빛을 흰빛으로 바랜 뒤
   * 장막을 걷는다.
   */
  const onLit = useCallback(() => {
    setStage('lesson');
    setPlaying(false);
    whiten.set(withTiming(1, { duration: WHITEN_MS, easing: Easing.inOut(Easing.quad) }));
    remain.set(
      withDelay(
        WHITEN_MS + HOLD_MS,
        withTiming(0, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [whiten, remain]);

  const play = () => {
    if (playing || !bookLesson) return;
    setPlaying(true);
    whiten.set(0);
    remain.set(1);
    progress.set(0);
    progress.set(
      withTiming(1, { duration: OPENING_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(onLit)();
      }),
    );
  };

  /** 오늘의 공부를 닫으면 닫힌 책으로 — 다시 볼 수 있게. */
  const reset = () => {
    progress.set(0);
    whiten.set(0);
    remain.set(1);
    setStage('book');
  };

  /** 책 말고 나머지는 표지가 열리기 시작하면 어둠 속으로 물러난다. */
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={[styles.screen, stage === 'book' && { paddingTop: insets.top }]}>
      {stage === 'lesson' && bookLesson ? (
        <LessonDetailShell bookLesson={bookLesson} onClose={reset}>
          <Fragment key={`${bookLesson.book}:${bookLesson.lesson.id}`}>
            {renderBookDetail(bookLesson)}
          </Fragment>
        </LessonDetailShell>
      ) : (
        <>
          <StatusBarTint />
          <HomeLayout
            cover={<BookOpening design={design} width={COVER_W} progress={progress} />}
            title={book?.title ?? getBookName(selectedBookId)}
            author={book?.author}
            alarm={alarm}
            readPages={readingProgress.readPages}
            totalPages={readingProgress.totalPages}
            plan={plan}
            onRead={play}
            chromeStyle={chromeStyle}
          />
        </>
      )}

      <LightVeil opacity={veil} whiten={whiten} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
