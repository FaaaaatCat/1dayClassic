import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookPreviewModal from '@/components/BookPreviewModal';
import BookOpening, { LightVeil, OPENING_MS, veilAt } from '@/components/book/BookOpening';
import HomeLayout, { COVER_W } from '@/components/home/HomeLayout';
import CardDeckDetail from '@/components/lesson/CardDeckDetail';
import TodayQuiz from '@/components/quiz/TodayQuiz';
import ReadingIntro from '@/components/reading/ReadingIntro';
import StudyComplete from '@/components/reading/StudyComplete';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Ink } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookLesson, getBookName } from '@/lib/books';
import { getCatalogBookByBookId, getCatalogBooks, type CatalogBook } from '@/lib/catalog';
import { getCoverDesign } from '@/lib/coverDesign';
import { getReadingProgress, getReadPlan } from '@/lib/progress';

// ── 타임라인 ─────────────────────────────────────────────────────────────
/** 화면을 다 덮은 노란빛이 흰빛으로 바래는 시간과, 다 바랜 뒤 숨 고르는 시간. */
const WHITEN_MS = 600;
const HOLD_MS = 200;
/** 흰 화면이 첫페이지장(사진만)으로 바뀌는 시간. */
const INTRO_REVEAL_MS = 1500;
/** 첫페이지장의 글 네 줄(마크·책 이름·표제·부제)이 차례로 떠오르는 데 걸리는 시간. */
const INTRO_TEXT_MS = 1600;
/** 글이 다 뜬 뒤 본문으로 넘어가기까지 기다리는 시간과, 넘어가는 시간. */
const INTRO_STAY_MS = 2000;
const TO_BODY_MS = 800;
/** 퀴즈가 오른쪽에서 덮으며 들어오는 시간 — 다른 메뉴들과 같다(app/(tabs)/_layout의 TRANSITION). */
const SLIDE_MS = 300;

type Stage = 'book' | 'intro' | 'body' | 'quiz' | 'done';

/**
 * 책 펼침 전환 미리보기 — 설정에서 연다.
 *
 * 홈의 읽기 버튼을 눌렀을 때 오늘의 공부를 끝내기까지의 흐름 전체를 여기서 먼저 본다.
 *
 *  1. 읽기를 누르면 책이 펴지고 열리며 빛이 뿜어져 나온다(BookOpening).
 *  2. 열린 책이 다가와 화면을 노랗게 채웠다가 흰빛으로 바랜다(LightVeil).
 *  3. 흰 화면이 1.5초 동안 첫페이지장(사진만)으로 바뀐다(ReadingIntro).
 *  4. 첫페이지장의 마크와 글이 차례로 떠오른다.
 *  5. 글이 다 뜨고 2초 뒤 본문(스크롤 보기)으로 서서히 넘어간다(CardDeckDetail).
 *  6. 끝까지 내리면 '읽기 완료하고 퀴즈 풀기'가 아래에서 올라오고, 다시 올리면 내려간다.
 *  7. 누르면 오늘의 퀴즈가 오른쪽에서 덮으며 들어온다(TodayQuiz).
 *  8. 다 풀면 오늘의 학습 완료가 뜬다(StudyComplete).
 *
 * 생김새는 홈과 같은 것(HomeLayout)을 그대로 쓰고, 열리는 화는 홈의 읽기 버튼이 여는 것과
 * 같다(getReadPlan). 아무것도 저장하지 않는다 — 퀴즈도 진도도 기록하지 않는다.
 *
 * 펼침 없이 보기(?skip=1) — 설정의 '펼침없이 전환 보기'가 연다. 홈에서 시작하는 것은 같고, 읽기를
 * 누르면 1·2(책이 열리고 빛이 차는 것)를 건너뛰고 홈 위로 첫페이지장이 떠오르는 3부터 이어진다.
 *
 * 어느 단계에서든 닫기(꺾쇠·완료하고 홈으로·기기의 뒤로가기)는 닫힌 책으로 돌아와 다시 볼 수
 * 있게 한다. 퀴즈의 꺾쇠만 본문으로 돌아간다. 닫힌 책에서의 뒤로가기는 설정으로 나간다.
 */
export default function BookOpeningPreviewScreen() {
  const router = useRouter();
  /** 펼침 없이 보기 — 읽기를 누르면 책을 펴지 않고 곧장 첫페이지장으로. */
  const skipOpening = useLocalSearchParams<{ skip?: string }>().skip === '1';
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();

  const book = getCatalogBookByBookId(selectedBookId);
  const design = book?.coverDesign ?? getCoverDesign(selectedBookId);
  const readingProgress = getReadingProgress(selectedBookId, isDone);
  const plan = getReadPlan(selectedBookId, cursorOf(selectedBookId));
  const bookLesson = getBookLesson(selectedBookId, plan?.lessonId);
  const quizzes = bookLesson
    ? (bookLesson.lesson.quizzes ?? (bookLesson.lesson.quiz ? [bookLesson.lesson.quiz] : []))
    : [];

  /**
   * 이 화를 다 읽으면 책의 몇 %인가 — 홈의 진행 줄과 같은 쪽수 셈(lib/progress)에 이 화
   * 한 편 몫을 더한다. 이미 끝낸 화면 더하지 않는다.
   */
  const readPercent = (() => {
    const { totalPages, readPages, totalLessons } = readingProgress;
    if (totalPages === 0 || totalLessons === 0) return 0;
    const perLesson = Math.max(1, Math.round(totalPages / totalLessons));
    const already = bookLesson ? isDone(bookLesson.lesson.id) : true;
    const pages = Math.min(totalPages, readPages + (already ? 0 : perLesson));
    return Math.round((pages / totalPages) * 100);
  })();

  const [stage, setStage] = useState<Stage>('book');
  /** 본문으로 넘어가는 동안에도 첫페이지장이 위에 남아 걷힌다. */
  const [introShown, setIntroShown] = useState(false);
  /**
   * 본문을 미리 만들어 두었는가 — 첫페이지장 글이 다 뜬 뒤 2초 기다리는 동안 그 밑에 만든다.
   *
   * 본문(CardDeckDetail)은 무겁다. 장을 나누고 낭독 대본을 짜고, 유튜브가 딸린 화는 재생기
   * (WebView)까지 띄운다. 예전엔 넘어가는 그 순간에 처음 만들어서 걷히는 첫페이지장이 몇 프레임
   * 멈칫했다. 첫페이지장이 화면을 다 덮고 가만히 있는 2초 동안 만들어 두면, 정작 넘어갈 때는
   * 첫페이지장의 투명도만 바뀐다.
   */
  const [bodyReady, setBodyReady] = useState(false);
  const [recommend, setRecommend] = useState<CatalogBook | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);

  /** 펼침의 진행(0~1), 장막이 흰빛으로 바랜 정도(0→1), 다 밝아진 뒤 장막이 남은 정도(1→0). */
  const progress = useSharedValue(0);
  const whiten = useSharedValue(0);
  const remain = useSharedValue(1);
  const veil = useDerivedValue(() => veilAt(progress.value) * remain.value);
  /** 첫페이지장의 글(0~4)과, 본문으로 넘어갈 때 첫페이지장이 남은 정도(1→0). */
  const introText = useSharedValue(0);
  const introLeft = useSharedValue(1);
  /** 퀴즈가 들어온 정도 — 0이면 오른쪽 밖, 1이면 제자리. */
  const quizIn = useSharedValue(0);

  /** 첫페이지장에서 본문으로 넘어갈 때를 재는 타이머 — 도중에 닫으면 지운다. */
  const stayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStay = () => {
    if (stayTimer.current) clearTimeout(stayTimer.current);
    stayTimer.current = null;
  };
  useEffect(() => clearStay, []);

  /** 처음으로 — 닫힌 책 앞. 어느 단계에서 불러도 된다. */
  const reset = () => {
    clearStay();
    progress.set(0);
    whiten.set(0);
    remain.set(1);
    introText.set(0);
    introLeft.set(1);
    quizIn.set(0);
    setIntroShown(false);
    setBodyReady(false);
    setPreviewOpen(false);
    setStage('book');
  };

  const close = useCallback(() => router.replace('/settings'), [router]);

  // 기기의 뒤로가기 — 닫힌 책이면 설정으로, 퀴즈면 본문으로, 그 밖에는 닫힌 책으로.
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (stageRef.current === 'book') close();
        else if (stageRef.current === 'quiz') {
          quizIn.set(0);
          setStage('body');
        } else resetRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [close, quizIn]),
  );

  /** 5. 첫페이지장을 걷고 본문으로 — 본문은 이미 밑에 깔려 있다. */
  const toBody = useCallback(() => {
    setStage('body');
    introLeft.set(
      withTiming(0, { duration: TO_BODY_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setIntroShown)(false);
      }),
    );
  }, [introLeft]);

  /** 4. 글이 다 뜨면 2초 쉬었다가 본문으로. */
  const afterIntroText = useCallback(() => {
    clearStay();
    setBodyReady(true);
    stayTimer.current = setTimeout(toBody, INTRO_STAY_MS);
  }, [toBody]);

  /** 4. 사진이 다 드러나면 글을 차례로. */
  const showIntroText = useCallback(() => {
    introText.set(
      withTiming(4, { duration: INTRO_TEXT_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(afterIntroText)();
      }),
    );
  }, [introText, afterIntroText]);

  /** 2·3. 화면이 빛으로 가득 찬 순간 — 첫페이지장을 밑에 깔고, 흰빛으로 바랜 뒤 걷는다. */
  const onLit = useCallback(() => {
    setStage('intro');
    setIntroShown(true);
    whiten.set(withTiming(1, { duration: WHITEN_MS, easing: Easing.inOut(Easing.quad) }));
    remain.set(
      withDelay(
        WHITEN_MS + HOLD_MS,
        withTiming(
          0,
          { duration: INTRO_REVEAL_MS, easing: Easing.inOut(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(showIntroText)();
          },
        ),
      ),
    );
  }, [whiten, remain, showIntroText]);

  /** 1. 읽기. */
  const play = () => {
    if (stage !== 'book' || !bookLesson) return;
    // 펼침 없이 보기 — 홈 위로 첫페이지장(사진)이 1.5초 동안 떠오른다. 홈은 그동안 밑에 남는다.
    if (skipOpening) {
      setStage('intro');
      setIntroShown(true);
      introLeft.set(0);
      introLeft.set(
        withTiming(1, { duration: INTRO_REVEAL_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished) runOnJS(showIntroText)();
        }),
      );
      return;
    }
    progress.set(0);
    progress.set(
      withTiming(1, { duration: OPENING_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(onLit)();
      }),
    );
  };

  /** 7. 퀴즈가 오른쪽에서 덮으며 들어온다. */
  const openQuiz = () => {
    setStage('quiz');
    quizIn.set(0);
    quizIn.set(withTiming(1, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }));
  };

  /** 8. 다 풀면 학습 완료 — 다음에 만나 볼 책은 지금 읽는 책이 아닌 서점 책 하나. */
  const finishQuiz = () => {
    const others = getCatalogBooks().filter((b) => b.bookId !== selectedBookId);
    setRecommend(others[Math.floor(Math.random() * others.length)]);
    setStage('done');
  };

  /** 책 말고 나머지는 표지가 열리기 시작하면 어둠 속으로 물러난다. */
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
  }));
  const introStyle = useAnimatedStyle(() => ({ opacity: introLeft.value }));
  const quizStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - quizIn.value) * screenW }],
  }));

  const showBody = bodyReady || stage === 'body' || stage === 'quiz' || stage === 'done';
  /** 홈이 그려지는가 — 펼침 없이 보기에서는 첫페이지장이 다 떠오를 때까지 남는다. */
  const showHome = stage === 'book' || (skipOpening && stage === 'intro');

  return (
    <View style={[styles.screen, showHome && { paddingTop: insets.top }]}>
      {/* 홈 — 펼침 없이 보기에서는 첫페이지장이 다 떠오를 때까지 그 밑에 남는다. */}
      {showHome ? (
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
      ) : null}

      {/* 5·6. 본문 — 첫페이지장이 걷히기 전부터 밑에 깔려 있다. */}
      {showBody && bookLesson ? (
        <CardDeckDetail
          bookLesson={bookLesson}
          onClose={reset}
          trackProgress={false}
          forceScroll
          finishCta={{ progress: readPercent, onPress: openQuiz }}
          // 첫페이지장 밑에 미리 만들어 둔 동안은 상태바를 건드리지 않는다.
          statusTint={stage !== 'intro'}
        />
      ) : null}

      {/* 3·4. 첫페이지장. */}
      {introShown && bookLesson ? (
        <Animated.View style={[StyleSheet.absoluteFill, introStyle]}>
          <ReadingIntro bookLesson={bookLesson} reveal={introText} />
        </Animated.View>
      ) : null}

      {/* 7. 오늘의 퀴즈 — 본문 위를 오른쪽에서 덮는다. 꺾쇠는 본문으로 돌아간다. */}
      {stage === 'quiz' || stage === 'done' ? (
        <Animated.View style={[StyleSheet.absoluteFill, quizStyle]}>
          <TodayQuiz
            quizzes={quizzes}
            onBack={() => {
              quizIn.set(0);
              setStage('body');
            }}
            onFinish={finishQuiz}
          />
        </Animated.View>
      ) : null}

      {/* 8. 오늘의 학습 완료. */}
      {stage === 'done' ? (
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(400)}>
          <StudyComplete
            recommend={recommend}
            onPreviewBook={() => setPreviewOpen(true)}
            onHome={reset}
            onNextLesson={reset}
          />
        </Animated.View>
      ) : null}

      <LightVeil opacity={veil} whiten={whiten} />

      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
