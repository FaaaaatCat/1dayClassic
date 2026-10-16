import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import BookPurchaseNotice from '@/components/lesson/BookPurchaseNotice';
import CardDeckDetail from '@/components/lesson/CardDeckDetail';
import TodayQuiz from '@/components/quiz/TodayQuiz';
import ReadingIntro from '@/components/reading/ReadingIntro';
import GoogleAdScreen from '@/components/reading/GoogleAdScreen';
import NextBookAd from '@/components/reading/NextBookAd';
import StudyComplete from '@/components/reading/StudyComplete';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Colors, Ink } from '@/constants/theme';
import { useQuiz } from '@/context/QuizContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { useShelf } from '@/context/ShelfContext';
import { useToast } from '@/context/ToastContext';
import type { BookLesson } from '@/lib/books';
import { getCatalogBookByBookId, getCatalogBooks, type CatalogBook } from '@/lib/catalog';
import { openBookDetail } from '@/lib/preview-nav';
import { pickReadingQuote, type ReadingQuote } from '@/lib/quotes';
import {
  getFreeLessonCount,
  getLockedLessonCount,
  getNextLesson,
  getReadingProgress,
} from '@/lib/progress';
import { useAlarmLockFlow } from '@/modules/alarm-clock';
import type { BookId } from '@/types';

// ── 타임라인 ─────────────────────────────────────────────────────────────
/** 빛의 장막에서 들어올 때, 다 하얀 화면을 잠깐 보여 주는 시간. */
const VEIL_HOLD_MS = 200;
/** 흰 화면(또는 검은 화면)이 첫표지(사진만)로 바뀌는 시간. */
const INTRO_REVEAL_MS = 1500;
/** 첫표지의 글 네 줄(마크·책 이름·표제·부제)이 차례로 떠오르는 데 걸리는 시간. */
const INTRO_TEXT_MS = 1600;
/** 글이 다 뜬 뒤 본문으로 넘어가기까지 기다리는 시간과, 넘어가는 시간. */
const INTRO_STAY_MS = 2000;
const TO_BODY_MS = 800;
/** 퀴즈가 오른쪽에서 덮으며 들어오는 시간 — 다른 메뉴들과 같다(app/(tabs)/_layout의 TRANSITION). */
const SLIDE_MS = 300;

/**
 * 단계 — 첫표지·본문·퀴즈·독서 완료, 그리고 나가는 길의 광고 둘.
 * nextBook(광고_다음책)은 다음에 만나 볼 책을 권하고, ads(광고_구글애즈)는 광고 한 장을 보여 준 뒤
 * 홈으로 보낸다. '오늘 독서 완료하기'를 누르면 이 둘을 차례로 지난다.
 */
type Stage = 'intro' | 'body' | 'quiz' | 'done' | 'nextBook' | 'ads';

/** 권할 수 있는 책 — 학습 콘텐츠가 있어 고를 수 있는 책(bookId가 있다). */
type PickableBook = CatalogBook & { bookId: BookId };

/**
 * 어떻게 들어왔는가.
 * - veil: 홈에서 책이 펼쳐지고 빛이 화면을 덮은 채로 넘어왔다 — 흰 화면에서 첫표지가 드러난다.
 * - fade: 그 밖의 모든 길(책 오픈 효과 끔·다음 화 읽기·알람) — 바탕에서 첫표지가 떠오른다.
 */
export type ReadingEntry = 'veil' | 'fade';

/**
 * 오늘의 공부를 열 때 붙여 보내는 값(t) — 열 때마다 달라서, 오늘의 공부가 지난번에 멈춘 자리가
 * 아니라 첫표지부터 새로 선다(app/(tabs)/today의 visitKey 주석). 오늘의 공부를 여는 곳은 모두
 * 이것을 붙인다.
 */
export function freshVisit(): string {
  return String(Date.now());
}

/**
 * 오늘의 공부 — 첫표지 → 본문 → 오늘의 퀴즈 → 오늘의 독서 완료.
 *
 * 설정의 '책 펼침 전환 미리보기'에서 다듬은 흐름을 실제 오늘의 공부로 올린 것이다. 오늘의 공부
 * 화면(app/(tabs)/today)과 그 미리보기가 함께 쓴다 — 둘이 따로 그리면 하나만 고쳐진다.
 *
 *  1. 첫표지(ReadingIntro) — 사진이 1.5초에 걸쳐 드러나고, 마크와 글이 차례로 떠오른다.
 *  2. 글이 다 뜨고 2초 뒤 본문(CardDeckDetail, 늘 스크롤 보기)으로 서서히 넘어간다.
 *     본문은 그 2초 동안 첫표지 밑에 미리 만들어 둔다(bodyReady 주석).
 *  3. 끝까지 내리면 '읽기 완료하고 퀴즈 풀기'가 올라오고, 누르면 오늘의 퀴즈(TodayQuiz)가
 *     오른쪽에서 덮으며 들어온다.
 *  4. 다 풀면 오늘의 독서 완료(StudyComplete)가 뜬다.
 *
 * 책이 펼쳐지는 장면(BookOpening)은 이 흐름에 없다 — 그것은 홈의 읽기 버튼이 홈 위에서 틀고,
 * 빛이 화면을 다 덮은 채로 여기로 넘긴다(entry='veil'). 그래서 다음 화 읽기·알람으로 들어올
 * 때는 그 장면이 나오지 않는다.
 *
 * track이 false면(미리보기) 아무것도 적지 않고, 다음 화로 가지도 않는다 — 부르는 쪽이 준
 * onNextLesson이 대신한다.
 */
export default function ReadingFlow({
  bookLesson,
  entry,
  track,
  onExit,
  onHome,
  onNextLesson,
}: {
  bookLesson: BookLesson;
  entry: ReadingEntry;
  /** 진도·퀴즈를 적을지. 미리보기는 false. */
  track: boolean;
  /** 첫표지·본문에서 나갈 때(꺾쇠·기기의 뒤로가기). */
  onExit: () => void;
  /** 독서 완료의 '오늘 독서 완료하기'. */
  onHome: () => void;
  /** 독서 완료의 '다음 화 읽기'. 주지 않으면 실제로 다음 화를 연다(잠겼으면 구매 안내). */
  onNextLesson?: () => void;
}) {
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const { isDone } = useQuiz();
  const { markCompleted } = useReadingCursor();
  const lockFlow = useAlarmLockFlow();
  const { selectBook } = useBookSelection();
  const { isInShelf, addToShelf } = useShelf();
  const { showToast } = useToast();

  const bookId = bookLesson.book;
  const lesson = bookLesson.lesson;
  const quizzes = lesson.quizzes ?? (lesson.quiz ? [lesson.quiz] : []);
  const catalogBook = getCatalogBookByBookId(bookId);

  /**
   * 이 화를 다 읽으면 책의 몇 %인가 — 홈의 진행 줄과 같은 쪽수 셈(lib/progress)에 이 화
   * 한 편 몫을 더한다. 이미 끝낸 화면 더하지 않는다.
   */
  const readPercent = (() => {
    const { totalPages, readPages, totalLessons } = getReadingProgress(bookId, isDone);
    if (totalPages === 0 || totalLessons === 0) return 0;
    const perLesson = Math.max(1, Math.round(totalPages / totalLessons));
    const pages = Math.min(totalPages, readPages + (isDone(lesson.id) ? 0 : perLesson));
    return Math.round((pages / totalPages) * 100);
  })();

  const [stage, setStage] = useState<Stage>('intro');
  /** 본문으로 넘어가는 동안에도 첫표지가 위에 남아 걷힌다. */
  const [introShown, setIntroShown] = useState(true);
  /**
   * 본문을 미리 만들어 두었는가 — 첫표지 글이 다 뜬 뒤 2초 기다리는 동안 그 밑에 만든다.
   *
   * 본문(CardDeckDetail)은 무겁다. 장을 나누고 낭독 대본을 짜고, 유튜브가 딸린 화는 재생기
   * (WebView)까지 띄운다. 넘어가는 그 순간에 처음 만들면 걷히는 첫표지가 몇 프레임 멈칫한다.
   * 첫표지가 화면을 다 덮고 가만히 있는 2초 동안 만들어 두면, 넘어갈 때는 투명도만 바뀐다.
   */
  const [bodyReady, setBodyReady] = useState(false);
  /** 독서 완료에 띄울 것 — 퀴즈에서 맞힌 수와, 그때 고른 인용문 한 줄. */
  const [score, setScore] = useState(0);
  const [quote, setQuote] = useState<ReadingQuote | null>(null);
  /** 광고_다음책에서 권할 책 — 지금 읽는 책이 아닌, 고를 수 있는 책 하나. */
  const [nextBook, setNextBook] = useState<PickableBook | undefined>(undefined);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  /** 흰 장막이 남은 정도(veil로 들어왔을 때만 1에서 시작). */
  const veil = useSharedValue(entry === 'veil' ? 1 : 0);
  /**
   * 첫표지가 보이는 정도와 그 글(0~4).
   *
   * veil이면 처음부터 1 — 흰 장막 밑에서 이미 다 보여야 장막이 걷히며 드러난다. fade면 0에서
   * 시작해 떠오른다. 쉬는 값을 처음부터 맞춰 두어야 첫 프레임에 다 보였다가 사라지는 깜빡임이 없다.
   */
  const introLeft = useSharedValue(entry === 'veil' ? 1 : 0);
  const introText = useSharedValue(0);
  /** 퀴즈가 들어온 정도 — 0이면 오른쪽 밖, 1이면 제자리. */
  const quizIn = useSharedValue(0);

  /** 첫표지에서 본문으로 넘어갈 때를 재는 타이머 — 도중에 나가면 지운다. */
  const stayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (stayTimer.current) clearTimeout(stayTimer.current);
    },
    [],
  );

  /** 2. 첫표지를 걷고 본문으로 — 본문은 이미 밑에 깔려 있다. */
  const toBody = useCallback(() => {
    setStage('body');
    introLeft.set(
      withTiming(0, { duration: TO_BODY_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setIntroShown)(false);
      }),
    );
  }, [introLeft]);

  /** 1. 글이 다 뜨면 본문을 미리 만들고, 2초 쉬었다가 본문으로. */
  const afterIntroText = useCallback(() => {
    setBodyReady(true);
    stayTimer.current = setTimeout(toBody, INTRO_STAY_MS);
  }, [toBody]);

  /** 1. 사진이 다 드러나면 글을 차례로. */
  const showIntroText = useCallback(() => {
    introText.set(
      withTiming(4, { duration: INTRO_TEXT_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(afterIntroText)();
      }),
    );
  }, [introText, afterIntroText]);

  /** 들어오자마자 — 장막을 걷거나 첫표지를 띄운 뒤 글을 차례로. 처음 한 번만. */
  useEffect(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) runOnJS(showIntroText)();
    };
    const reveal = { duration: INTRO_REVEAL_MS, easing: Easing.inOut(Easing.quad) };
    if (entry === 'veil') {
      veil.set(withDelay(VEIL_HOLD_MS, withTiming(0, reveal, done)));
    } else {
      introLeft.set(withTiming(1, reveal, done));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 3. 퀴즈가 오른쪽에서 덮으며 들어온다. */
  const openQuiz = () => {
    setStage('quiz');
    quizIn.set(0);
    quizIn.set(withTiming(1, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) }));
  };
  const closeQuiz = useCallback(() => {
    quizIn.set(0);
    setStage('body');
  }, [quizIn]);

  /** 4. 다 풀면 독서 완료 — 맞힌 수와, 무작위로 고른 책 인용문 한 줄을 들고 간다. */
  const finishQuiz = (correct: number) => {
    if (track) markCompleted(bookId, lesson.id);
    setScore(correct);
    setQuote(pickReadingQuote());
    const pickable = getCatalogBooks().filter(
      (b): b is PickableBook => b.bookId !== null && b.bookId !== bookId,
    );
    setNextBook(pickable[Math.floor(Math.random() * pickable.length)]);
    setStage('done');
  };

  /** 다음 화 — 없으면 홈으로, 잠겼으면 구매 안내, 열려 있으면 그 화를 연다(효과 없이). */
  const nextLesson = useMemo(() => getNextLesson(bookId, lesson.id), [bookId, lesson.id]);
  const openNext = () => {
    if (onNextLesson) {
      onNextLesson();
      return;
    }
    if (track) markCompleted(bookId, lesson.id);
    if (!nextLesson) {
      onHome();
      return;
    }
    if (nextLesson.locked) {
      setPurchaseOpen(true);
      return;
    }
    router.replace({
      pathname: '/today',
      // t — 오늘의 공부가 새로 서게 하는 값(app/(tabs)/today의 visitKey 주석).
      params: { bookId, lessonId: nextLesson.lessonId, entry: 'fade', t: freshVisit() },
    });
  };

  // 기기의 뒤로가기 — 퀴즈면 본문으로, 구매 안내면 그것부터 닫고, 그 밖에는 나간다.
  // 잠금 위 알람으로 들어왔으면 나가지 않는다(본문이 유일한 출구를 막는 것과 같은 까닭).
  const stageRef = useRef(stage);
  const purchaseRef = useRef(purchaseOpen);
  useEffect(() => {
    stageRef.current = stage;
    purchaseRef.current = purchaseOpen;
  }, [stage, purchaseOpen]);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (purchaseRef.current) setPurchaseOpen(false);
        else if (stageRef.current === 'quiz') closeQuiz();
        else if (!lockFlow) onExit();
        return true;
      });
      return () => subscription.remove();
    }, [closeQuiz, lockFlow, onExit]),
  );

  const introStyle = useAnimatedStyle(() => ({ opacity: introLeft.value }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const quizStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - quizIn.value) * screenW }],
  }));

  const showBody = bodyReady || stage !== 'intro';
  /** 상태바를 검게 거는 단계 — 첫표지·본문은 빼고(위 상태바 주석). */
  const darkBar = stage === 'quiz' || stage === 'done' || stage === 'nextBook' || stage === 'ads';
  /** 광고 단계 — 그 밑에 검은 판을 깔아, 광고가 떠오르는 동안 본문이 비치지 않게. */
  const coverBody = stage === 'nextBook' || stage === 'ads';
  const target = track ? { lessonId: lesson.id, bookId } : ('preview' as const);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/*
        상태바 — 퀴즈·독서 완료·광고는 검은 화면이라 상태바도 검게, 시계·배터리는 희게.
        본문(종이)은 본문이 제 종이색을 건다. 첫표지에서는 아무도 건드리지 않는다 — 첫표지로 넘어오는
        순간 상태바를 검게 바꿨더니 띠가 한 번 깜빡여 오히려 화면 전환을 방해했다.
      */}
      {darkBar ? <StatusBarTint /> : null}
      {/*
        2·3. 본문 — 첫표지가 걷히기 전부터 밑에 깔려 있다.

        화면 가득 따로 띄우고(absoluteFill), 첫표지가 보이는 동안은 투명하게 숨긴다. 흐름 안에
        두면 밑에 남은 다른 화면과 높이를 나눠 가져 본문이 화면 아래쪽에 서고, 그 위 줄(꺾쇠·자동으로
        읽기)이 zIndex로 떠올라 첫표지 글 밑에 비쳤다. 숨겨 두어도 만드는 일은 그대로 미리 끝난다.
        collapsable={false} — 이 감싸개가 납작하게 지워지면 안의 zIndex가 다시 밖으로 샌다.
      */}
      {showBody ? (
        <View
          collapsable={false}
          style={[StyleSheet.absoluteFill, stage === 'intro' && styles.hidden]}
          pointerEvents={stage === 'intro' ? 'none' : 'auto'}>
          <CardDeckDetail
            bookLesson={bookLesson}
            onClose={onExit}
            trackProgress={track}
            forceScroll
            finishCta={{ progress: readPercent, onPress: openQuiz }}
            // 상태바는 본문이 보이는 동안만 본문(종이색)이 맡는다 — 첫표지·퀴즈·완료·광고는 아래.
            statusTint={stage === 'body'}
          />
        </View>
      ) : null}

      {/* 1. 첫표지. */}
      {introShown ? (
        <Animated.View style={[StyleSheet.absoluteFill, introStyle]} pointerEvents="none">
          <ReadingIntro bookLesson={bookLesson} reveal={introText} />
        </Animated.View>
      ) : null}

      {/* 3. 오늘의 퀴즈 — 본문 위를 오른쪽에서 덮는다. 꺾쇠는 본문으로 돌아간다. */}
      {stage === 'quiz' || stage === 'done' ? (
        <Animated.View style={[StyleSheet.absoluteFill, quizStyle]}>
          <TodayQuiz quizzes={quizzes} target={target} onBack={closeQuiz} onFinish={finishQuiz} />
        </Animated.View>
      ) : null}

      {/*
        광고 둘 밑에 까는 검은 판. 광고 화면은 0.4초에 걸쳐 떠오르는데, 앞 화면(독서 완료·광고_다음책)은
        그 순간 빠지므로 밑이 비어 본문이 잠깐 보였다가 바뀌었다. 검은 판 위에서 떠오르게 해 본문이
        끼어들지 않는다. 독서 완료는 퀴즈 위에서 떠오르므로(퀴즈가 아직 남아 있다) 판이 필요 없다.
      */}
      {coverBody ? <View style={[StyleSheet.absoluteFill, styles.blackout]} /> : null}

      {/* 4. 오늘의 독서 완료. */}
      {stage === 'done' && quote ? (
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(400)}>
          <StudyComplete
            correct={score}
            total={quizzes.length}
            quote={quote}
            // '오늘 독서 완료하기' — 곧장 홈으로 가지 않고 광고 둘을 지난다.
            onHome={() => setStage(nextBook ? 'nextBook' : 'ads')}
            onNextLesson={openNext}
            isLastLesson={!nextLesson}
          />
        </Animated.View>
      ) : null}

      {/*
        광고_다음책 — 어느 쪽을 누르든 다음은 광고_구글애즈다.
        '내일은 이 책으로 읽을래요'면: 그 책이 '읽을 예정인 책'(서재)에 없으면 담고, 이미 있으면 그대로
        둔 채, 읽는 책으로 고르고 토스트로 알린다. 미리보기(track=false)는 아무것도 바꾸지 않는다.
      */}
      {stage === 'nextBook' && nextBook ? (
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(400)}>
          <NextBookAd
            book={nextBook}
            onAccept={() => {
              if (track) {
                // 서재는 카탈로그 id로 담는다(ShelfContext 주석).
                if (!isInShelf(nextBook.id)) addToShelf(nextBook.id);
                selectBook(nextBook.bookId);
                showToast(`선택하신 책으로 이제 이 책을 읽습니다 · ${nextBook.title}`);
              }
              setStage('ads');
            }}
            onDecline={() => setStage('ads')}
          />
        </Animated.View>
      ) : null}

      {/* 광고_구글애즈 — 홈으로 돌아가기, 광고 제거는 아직 준비 중. */}
      {stage === 'ads' ? (
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn.duration(400)}>
          <GoogleAdScreen
            onHome={onHome}
            onRemoveAds={() => showToast('준비중인 기능입니다')}
          />
        </Animated.View>
      ) : null}

      {purchaseOpen ? (
        <BookPurchaseNotice
          book={catalogBook}
          freeCount={getFreeLessonCount(bookId)}
          lockedCount={getLockedLessonCount(bookId)}
          onBuy={() => {
            setPurchaseOpen(false);
            openBookDetail(router, catalogBook);
          }}
          onClose={() => setPurchaseOpen(false)}
        />
      ) : null}

      {/* 홈에서 넘어온 흰 장막 — 홈의 빛과 이어져 첫표지를 드러내며 걷힌다. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.veil, veilStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** 미리 만들어 둔 본문 — 첫표지가 걷힐 때까지 보이지 않는다. */
  hidden: {
    opacity: 0,
  },
  veil: {
    backgroundColor: Colors.white,
  },
  blackout: {
    backgroundColor: Ink.primary,
  },
});
