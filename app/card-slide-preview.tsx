import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import listeningData from '@/data/listening.json';
import { getCatalogBooks } from '@/lib/catalog';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 카드 슬라이드 미리보기 — 오늘의 공부 상세를 카드뉴스로 바꿀지 판단하려고 만든 데모 화면.
 * 설정에서만 들어올 수 있고 실제 학습 데이터와는 연결돼 있지 않다(PAGES는 예시 문구).
 *
 * ── 넘김 방식 ─────────────────────────────────────────────────────────────
 * 가로 ScrollView는 눈에 보이지 않고 제스처와 페이지 스냅만 맡는다. 카드는 그 아래
 * 별도 층에 겹쳐 두고 flipX로 직접 변형해 그린다 — 이래야 넘어가는 카드가 제자리에서
 * 젖혀지고 뒤 카드는 따라 흐르지 않고 쌓인 채 기다리는 '책' 느낌이 난다.
 *
 * 본문(desc)도 다른 카드와 똑같은 카드 한 장이다 — 다만 문단이 여러 개라 한 카드에
 * 한 문단씩 담아 여러 장으로 나눈다(PAGES 구성 참고).
 *
 * ── rawX와 flipX가 따로 있는 이유 ──────────────────────────────────────────
 * ScrollView.scrollTo는 애니메이션 길이를 지정할 수 없다(안드로이드 네이티브
 * 기본값이 그대로 쓰인다 — 대략 300ms 안팎으로 꽤 빠르다). 그런데 손을 뗀 뒤/탭
 * 넘김의 '넘어가는 속도'를 우리가 직접 늦추려면 그 시간을 우리가 정할 수 있어야
 * 한다. 그래서 두 값을 둔다:
 *  - rawX: 실제 스크롤 위치를 매 프레임 그대로 받는다(손가락을 드래그하는 동안은
 *    이 값을 카드에 1:1로 반영해야 반응이 즉각적이다).
 *  - flipX: 카드·문구·버튼이 실제로 읽는 값. 드래그 중에는 rawX를 그대로 따라가지만,
 *    손을 떼거나(스크롤이 정착) 탭으로 넘길 때는 rawX를 곧장 따라가지 않고
 *    withTiming(TURN_DURATION)으로 우리가 정한 속도로만 움직인다 — 그 동안
 *    ScrollView 자체는 (보이지 않으니) 제 속도대로 빨리 끝나도 상관없다.
 *
 * 새 라이브러리 없이 이미 쓰던 reanimated만 쓴다.
 */

const { width: SCREEN_W } = Dimensions.get('window');

/** Figma 카드 비율 320×466. 좁은 기기에서는 화면 폭에 맞춰 줄인다. */
const CARD_W = Math.min(320, SCREEN_W - 56);
const CARD_H = Math.round((CARD_W * 466) / 320);

/** 한 장 넘기는 데 필요한 스와이프 거리 — 페이지 스냅 단위와 같다. */
const PAGE_W = SCREEN_W;

// ── 넘김 감각을 만지는 값들 ────────────────────────────────────────────────
// 실제 책장처럼 책등(왼쪽 모서리)을 축으로 뻣뻣한 종이 한 장이 뒤집힌다. 스크롤
// 위치에 선형으로 매핑하지 않고, 초반의 짧은 준비 구간 뒤 책등을 축으로 180도
// 돌아가게 만든다. 종이의 곡면은 아직 표현하지 않지만, 각도별 명암과 회전 타이밍
// 만으로도 종이 느낌이 꽤 산다.
/** 전체 넘김 진행(0~1) 중 회전이 본격적으로 시작되기 전 준비 구간의 비율. */
const LIFT_FRACTION = 0.12;
/**
 * 원근 거리. 회전축(왼쪽 모서리)에서 가장 먼 점(오른쪽 모서리, CARD_W만큼 떨어져
 * 있다)이 이 거리를 넘어서면 투영이 뒤집혀 카드가 마름모꼴로 깨진다 — 카드 폭보다
 * 충분히 커야 한다(경험적으로 3~4배 이상).
 */
const PERSPECTIVE = 1600;
/**
 * 책등에 지는 접힌 골 그늘의 폭(dp)과 가장 짙은 쪽 농도 — FoldShade 주석 참고.
 * 카드에는 elevation을 주지 않으므로 종이에 지는 그림자는 이것 하나뿐이다.
 */
const FOLD_SHADE_W = 12;
/**
 * 밑장의 본문이 떠오르는 구간 — p(이 장이 넘김의 어디쯤에 있나) 기준이다.
 *
 * 밑장은 젖혀지는 종이가 들리는 순간부터 드러나기 시작하는데, 그때 본문이 이미 떠
 * 있으면 뒷장 내용이 비쳐 보인다. 그래서 종이가 책등을 넘어간 뒤에야(p < 0.44,
 * 회전으로 치면 100도쯤) 떠오르기 시작해 거의 도착할 때(p ≤ 0.14) 다 찬다.
 *
 * 시간이 아니라 넘김 진행에 매다는 것이 핵심이다. 예전에는 타이머로 걸었는데, 그러면
 * 언제 걸었는지와 지금 종이가 어디까지 넘어갔는지가 어긋날 수 있어서 한 번 본
 * 페이지로 되돌아올 때마다 본문이 비쳤다 사라졌다 했다. 진행도에 매달면 어긋날 여지
 * 자체가 없고, 되돌리기에서도 같은 식이 그대로 거꾸로 돈다.
 */
const CONTENT_IN_FROM = 0.44;
const CONTENT_IN_TO = 0.14;
/**
 * 왼쪽에 눕는 빈 종이(LeftEdge)가 드러나는 구간 — 넘김 진행 0~1 기준.
 * 첫 장을 넘기는 동안에만 의미가 있고 그 뒤로는 계속 1이다. 이 구간에서는 젖혀지는
 * 종이가 이미 책등을 넘어 그 자리를 덮고 있어서 드러나는 과정이 보이지 않는다.
 */
const LEFT_EDGE_IN_FROM = 0.62;
const LEFT_EDGE_IN_TO = 0.75;
/**
 * 손을 뗀 뒤(스크롤 정착)나 탭으로 넘어갈 때, 카드가 실제로 넘어가는 데 걸리는
 * 시간(ms). 예전엔 이 값이 없었다 — ScrollView의 페이지 스냅에 그대로 얹혀서
 * 안드로이드 네이티브 기본 속도(대략 300ms)를 그대로 썼다. "너무 빠르고 정신
 * 없다"는 피드백을 받아 그 기본값의 2배로 늦췄다. 드래그하는 동안은 이 값과
 * 무관하게 손가락을 1:1로 따라간다 — 손 뗀 뒤/탭 넘김만 이 속도로 움직인다.
 */
const TURN_DURATION = 600;
/**
 * 화면에 처음 들어왔을 때 첫 장 본문이 떠오르는 방식 — 곧장 보이는 대신 잠깐 비어
 * 있다가(ENTER_DELAY) 천천히 떠오른다(ENTER_DURATION). 넘김과는 무관한, 입장할 때
 * 한 번뿐인 연출이다.
 */
const ENTER_DELAY = 800;
const ENTER_DURATION = 500;
/**
 * 감상 노트 줄 간격(dp). 줄노트 바탕의 줄 간격이자 글자 줄높이다 — 두 값이 여기 하나
 * 에서 나와야 글이 줄 위에 앉는다(NoteBlock 주석 참고).
 */
const NOTE_LINE_H = 26;
/** 토스트가 떠 있는 시간과 뜨고 지는 시간(ms). */
const TOAST_HOLD = 1800;
const TOAST_FADE = 220;

// ── 화면 구성 ─────────────────────────────────────────────────────────────

type PageKind = 'intro' | 'quote' | 'desc' | 'buy';

interface Page {
  kind: PageKind;
  /** 카드 위에 뜨는 안내 문구. 본문(desc) 카드에는 없다. */
  headline?: string;
  /** desc 카드 전용 — 이 카드 한 장에 담을 문단 하나. */
  paragraph?: string;
}

/**
 * 구매 안내 장 표지의 높이(dp). 카드 높이를 다 쓰지 않고 문구·버튼과 한 덩어리로
 * 묶여 가운데에 모이도록, 늘어나는 값이 아니라 정해진 높이를 쓴다.
 */
const BUY_COVER_H = 152;

/** 구매 안내 장에서 소개하는 책 — 카탈로그에서 제목으로 찾는다(BuyBlock 주석 참고). */
const BUY_BOOK_TITLE = '듣기의 말들';

/**
 * 이 미리보기가 보여 주는 항목 — 인용문·본문·퀴즈를 전부 여기서 읽는다.
 *
 * 예전에는 같은 글이 이 파일에도 하드코딩돼 있었는데, 데이터가 생기고 나니 한 문장이
 * 두 군데에 사는 꼴이라 실제로 어긋나 있었다(책 본문은 다섯 문단인데 화면에는 네
 * 문단만 들어 있었다). 이제 여기 한 곳에서만 읽는다.
 *
 * 제목이 아니라 id로 찾는 건 이 화면이 항목 하나를 콕 집어 쓰기 때문이다.
 */
const PREVIEW_LESSON_ID = 'listening_2_admit_first';
const PREVIEW_LESSON = (() => {
  const lesson = listeningData.lessons.find((l) => l.id === PREVIEW_LESSON_ID);
  if (!lesson) console.warn(`[card-slide-preview] 없는 항목입니다: ${PREVIEW_LESSON_ID}`);
  return lesson;
})();

const QUOTE_TEXT = PREVIEW_LESSON?.epigraph ?? '';
const QUOTE_SOURCE = PREVIEW_LESSON?.epigraphBy ?? '';
/** 본문 — 문단마다 카드 한 장씩 담는다(PAGES 참고). */
const DESC_PARAGRAPHS = PREVIEW_LESSON?.story ?? [];
const PREVIEW_QUIZ = PREVIEW_LESSON?.quiz;

const PAGES: Page[] = [
  { kind: 'intro', headline: '듣기 공부의 시간입니다.' },
  { kind: 'quote', headline: '듣기 공부의 시간입니다.' },
  // 본문은 문단마다 카드 한 장 — 문단이 늘거나 줄면 카드 수도 그만큼 자동으로 바뀐다.
  ...DESC_PARAGRAPHS.map((paragraph): Page => ({ kind: 'desc', paragraph })),
  // 본문이 끝나면 구매 안내 한 장으로 맺는다. 퀴즈와 감상 노트는 넘김 흐름이 아니라
  // 하단 버튼으로 여는 전체 화면 팝업이다.
  { kind: 'buy' },
];

/** 카드 안에 눌러야 할 것이 있는 장 — 이 장이 펼쳐져 있을 때만 손가락을 받는다. */
const INTERACTIVE_KINDS: PageKind[] = ['buy'];

/** 하단이 '오늘의 공부 마치기'로 바뀌는 페이지 — 마지막 장이다. */
const LAST_INDEX = PAGES.length - 1;

/**
 * 같은 문구가 이어지는 페이지는 한 덩어리로 묶는다 — 안 그러면 0→1처럼 문구가 같은
 * 구간에서도 글자가 한 번 사라졌다 다시 나타나 깜빡인다.
 */
const HEADLINE_GROUPS = PAGES.reduce<{ text: string; from: number; to: number }[]>(
  (groups, page, index) => {
    if (!page.headline) return groups;
    const last = groups[groups.length - 1];
    if (last && last.text === page.headline && last.to === index - 1) {
      last.to = index;
      return groups;
    }
    groups.push({ text: page.headline, from: index, to: index });
    return groups;
  },
  [],
);

export default function CardSlidePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // rawX: 실제 스크롤 위치(매 프레임 그대로). flipX: 카드가 실제로 읽는 값 —
  // 드래그 중엔 rawX를 그대로 따르고, 정착/탭 넘김일 때만 우리가 정한 속도
  // (TURN_DURATION)로 움직인다. 위 파일 상단 주석 참고.
  const rawX = useSharedValue(0);
  const flipX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  /**
   * 정착된 페이지 — 넘김이 끝난 뒤에만 바뀐다. 하단 버튼이 어느 페이지인지 알아야
   * 해서 남겨 둔 값이고, 카드가 어떻게 그려지는지에는 전혀 관여하지 않는다. 카드는
   * 전부 flipX 하나로만 그려진다(DeckCard 주석 참고).
   */
  const [page, setPage] = useState(0);
  /** 지금 향해 가고 있는 페이지. */
  const targetPage = useRef(0);
  /** 우리 속도의 넘김이 지금 돌고 있는지 — 같은 넘김을 두 번 걸지 않으려고 둔다. */
  const gliding = useSharedValue(false);
  /** 입장할 때 첫 장 본문이 한 번 떠오르는 값(ENTER_DELAY 주석 참고). */
  const enter = useSharedValue(0);
  /**
   * 토스트를 띄운 시각. 값이 바뀔 때마다 새로 뜬다 — 연달아 눌러도 매번 다시 뜨도록
   * 불리언이 아니라 시각을 쓴다(같은 값이면 리액트가 갱신을 건너뛴다).
   */
  const [toastAt, setToastAt] = useState(0);
  const showToast = () => setToastAt(Date.now());
  /** 감상 노트 팝업이 열려 있는지. */
  const [noteOpen, setNoteOpen] = useState(false);
  const closeNote = () => setNoteOpen(false);
  /** 퀴즈 팝업이 열려 있는지. */
  const [quizOpen, setQuizOpen] = useState(false);
  const closeQuiz = () => setQuizOpen(false);

  useEffect(() => {
    enter.value = withDelay(ENTER_DELAY, withTiming(1, { duration: ENTER_DURATION }));
  }, [enter]);

  /** 넘김 시작 — flipX를 우리 속도로 최종 위치까지 옮긴다. */
  const startTurn = (next: number) => {
    // 이미 그 자리로 가고 있으면 그대로 둔다 — 다시 걸면 애니메이션이 처음부터 다시
    // 시작돼 넘김이 끊겨 보인다. 탭 넘김이 옮겨 둔 스크롤이 정착하면서 onSettle이
    // 뒤따라 들어오는 경우가 대표적이고, 안드로이드가 정착 이벤트를 두 번 흘리는
    // 경우도 여기서 걸러진다.
    if (gliding.value && next === targetPage.current) return;
    targetPage.current = next;
    gliding.value = true;
    flipX.value = withTiming(next * PAGE_W, { duration: TURN_DURATION }, (finished) => {
      // 도중에 다른 넘김이 끼어들면 finished가 false로 온다 — 그때는 그 넘김이
      // 자기 몫을 정리하도록 두고 여기서는 아무것도 하지 않는다.
      if (finished) runOnJS(commitTurn)(next);
    });
  };

  /** 회전이 끝난 뒤 — 하단 버튼이 읽는 페이지 번호만 맞춰 둔다. */
  const commitTurn = (arrived: number) => {
    if (targetPage.current !== arrived) return;
    gliding.value = false;
    setPage(arrived);
  };

  // onScroll·onBeginDrag·onEndDrag를 한 핸들러 객체로 묶어야 셋 다 UI 스레드
  // 워클릿으로 제대로 바인딩된다(useAnimatedScrollHandler의 표준 사용법).
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      rawX.value = event.contentOffset.x;
      // 드래그하는 동안만 1:1로 따라간다 — 정착 애니메이션(네이티브, 빠르다)이
      // 진행되는 동안은 따라가지 않고 아래 onSettle이 우리 속도로 직접 옮긴다.
      if (isDragging.value) flipX.value = rawX.value;
    },
    onBeginDrag: () => {
      isDragging.value = true;
      // 진행 중이던 정착 애니메이션이 있었다면 즉시 취소하고 손가락 위치로 스냅 —
      // 안 그러면 드래그 시작이 이전 애니메이션과 씨름하는 것처럼 느껴진다.
      flipX.value = rawX.value;
      gliding.value = false; // 방금 그 애니메이션을 끊었으니 더는 돌고 있지 않다
    },
    onEndDrag: () => {
      isDragging.value = false;
    },
  });

  /**
   * 스크롤이 어딘가에 정착했을 때(손을 떼고 난 뒤의 네이티브 스냅이 끝났을 때,
   * 또는 탭 넘김으로 시작된 스크롤이 끝났을 때) 불린다. ScrollView 자체는 보이지
   * 않으니 그 스냅이 얼마나 빨리 끝나든 상관없다 — 여기서 flipX를 우리 속도
   * (TURN_DURATION)로 최종 위치까지 옮기는 게 화면에 실제로 보이는 움직임이다.
   *
   * 페이지가 바뀌지 않은 정착(반쯤 끌었다 놓아 원래 자리로 튕겨 온 경우)도 그대로
   * 넘긴다 — 손가락이 남겨 둔 각도를 우리 속도로 0도까지 되돌려야 하기 때문이다.
   * 탭 넘김이 이미 걸어 둔 넘김을 다시 트는 일은 startTurn이 막는다.
   */
  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    startTurn(Math.round(event.nativeEvent.contentOffset.x / PAGE_W));
  };

  /**
   * 탭으로 한 장 넘긴다. 화면을 가로로 3등분해 왼쪽은 이전, 오른쪽은 다음이고
   * 가운데는 아무 일도 하지 않는다(탭 영역은 각 페이지 안에 있다).
   * 실제 스크롤 위치는 네이티브 속도로(animated:true) 옮겨 둔다 — 보이지 않는
   * 층이라 빨라도 상관없고, 다음 드래그가 정확한 지점에서 시작되려면 필요하다.
   * 화면에 보이는 넘김 자체는 flipX를 우리 속도로 직접 움직여서 만든다.
   */
  const goBy = (delta: number) => {
    const next = Math.max(0, Math.min(PAGES.length - 1, targetPage.current + delta));
    if (next === targetPage.current) return;
    scrollRef.current?.scrollTo({ x: next * PAGE_W, animated: true });
    startTurn(next);
  };

  const onLastPage = page === LAST_INDEX;

  return (
    <View style={styles.screen}>
      <Headlines top={insets.top + 24} flipX={flipX} />

      <CloseButton top={insets.top + 24} onPress={() => router.replace('/settings')} />

      <Dots flipX={flipX} bottom={insets.bottom + 104} />

      <Actions
        bottom={insets.bottom + 40}
        flipX={flipX}
        finishEnabled={onLastPage}
        onFinish={() => router.replace('/settings')}
        onOpenNote={() => setNoteOpen(true)}
      />

      {/* 제스처 층 — 페이지마다 좌/중/우 3등분 탭 영역만 있다(가운데는 무동작). */}
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.gestureLayer}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onSettle}
        scrollEventThrottle={16}>
        {PAGES.map((_, index) => (
          <View key={index} style={styles.gesturePage}>
            <Pressable
              accessibilityLabel="이전 장"
              style={styles.tapZone}
              onPress={() => goBy(-1)}
            />
            {/* 가운데는 일부러 아무것도 하지 않는다 — 읽는 중 실수로 넘어가지 않게. */}
            <View style={styles.tapZone} />
            <Pressable
              accessibilityLabel="다음 장"
              style={styles.tapZone}
              onPress={() => goBy(1)}
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* 카드층 — 제스처 층보다 뒤에 둬야 감상 노트가 손가락을 받는다. 제스처 층은
          제 영역 안의 터치를 다 가져가므로 그 아래에 있으면 입력칸까지 닿지 않는다.
          box-none이라 카드 자체는 터치를 잡지 않고, 지금 펼쳐진 장의 입력칸·버튼만
          잡는다 — 나머지 자리의 스와이프·탭은 그대로 아래 제스처 층으로 내려간다.
          그리기 순서는 이래도 달라지지 않는다. 위 문구·점·버튼은 zIndex가 더 높고
          (2~3) 카드층은 0이라, 앞에 있든 뒤에 있든 그 위로 올라오지 않는다.

          쌓임 순서는 인덱스 역순으로 한 번 박아 두고 다시는 건드리지 않는다. 어느
          순간에도 실제로 그려지는 건 두 장뿐이라, 앞장이 뒷장 위에만 있으면 그걸로
          끝이다 — DeckCard 주석 참고. */}
      <View style={styles.deck} pointerEvents="box-none">
        <LeftEdge flipX={flipX} />
        {PAGES.map((p, index) => (
          <DeckCard
            key={index}
            index={index}
            kind={p.kind}
            paragraph={p.paragraph}
            flipX={flipX}
            enter={enter}
            interactive={INTERACTIVE_KINDS.includes(p.kind) && page === index}
            onOpenQuiz={() => setQuizOpen(true)}
          />
        ))}
        <FoldShade />
      </View>

      {/**
        * 감상 노트 — 넘김 흐름에서 빠지고 하단 메모 버튼으로 전체 화면에 뜬다.
        * 토스트도 여기 안에 둔다. 모달은 별도 창이라 뒤 화면의 토스트는 가려서 안 보인다.
        */}
      <Modal
        visible={noteOpen}
        animationType="fade"
        onRequestClose={closeNote}>
        {/* 안드로이드에서는 모달 창이 키보드에 맞춰 줄어들지 않아 기록하기 버튼이 키보드
            뒤로 숨는다. 그래서 높이를 직접 줄인다. */}
        <KeyboardAvoidingView
          behavior="height"
          style={[
            styles.noteModal,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}>
          <CloseButton top={insets.top + 24} onPress={closeNote} />
          <View style={styles.noteModalBody}>
            <NoteBlock onSaved={showToast} />
          </View>
          {/* 기록하기/수정하기 버튼 바로 위 — 버튼을 가리지 않게 그 높이만큼 띄운다. */}
          <Toast bottom={insets.bottom + 24 + 44 + 12} at={toastAt} />
        </KeyboardAvoidingView>
      </Modal>

      {/**
        * 퀴즈 — 구매 안내 장의 버튼으로 전체 화면에 뜬다. 감상 노트 팝업과 같은 틀이다.
        */}
      <Modal visible={quizOpen} animationType="fade" onRequestClose={closeQuiz}>
        <View
          style={[
            styles.noteModal,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}>
          <CloseButton top={insets.top + 24} onPress={closeQuiz} />
          <ScrollView
            style={styles.noteModalBody}
            contentContainerStyle={styles.quizModalContent}
            showsVerticalScrollIndicator={false}>
            <QuizSolver />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 책등에 지는 접힌 골 그늘 — 오른쪽 장이 왼쪽에 눕는 종이에 드리우는 그림자다.
 *
 * 뷰의 elevation 그림자로 두면 안 된다. 그 그림자는 젖혀지는 종이의 '몸통'에 가려져
 * 있다가 그 종이가 사라지는 순간 통째로 드러난다 — 실측으로 책등 옆 한 줄이 균일한
 * 182에서 168→143 그라데이션으로 한 프레임에 바뀌었다. 종이는 90도를 넘는 내내 이
 * 자리를 덮고 있으므로 그리는 순서를 어떻게 바꿔도 이 문제는 남는다.
 *
 * 그래서 레퍼런스처럼 골을 직접 그리고 카드보다 위에 둔다. 이러면 그 밑에 무엇이
 * 있든 — 눕는 빈 종이든, 책등을 넘어온 종이든 — 똑같이 어두워지고 교대하는 순간
 * 달라지는 것이 없다. 카드에서 elevation을 뺀 것도 같은 이유다. 어차피 어두운
 * 배경에서는 카드 바깥으로 지는 그림자가 보이지 않아(측정: 카드 밖은 배경값 10 그대로)
 * 그 그림자가 하던 일은 사실상 이 골 하나뿐이었다.
 */
function FoldShade() {
  return (
    <View style={styles.foldShade} pointerEvents="none">
      <LinearGradient
        colors={['rgba(3,3,3,0)', 'rgba(3,3,3,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * 왼쪽에 눕는 빈 종이 — 이미 넘긴 장들이 쌓인 자리다.
 *
 * 내용이 없는 빈 종이라는 게 핵심이다. 다 넘어간 종이는 뒷면이 위로 오므로 어차피
 * 빈 종이만 보이고, 화면에는 책등 왼쪽 한 뼘만 걸친다. 그래서 넘긴 장들을 실제로
 * 계속 그려 둘 이유가 없다 — 여기 이 한 장이 그 자리를 대신 지키면 그만이고, 대신
 * 뒤에 남아 비칠 내용 자체가 없어진다.
 *
 * 젖혀지던 종이가 180도에서 사라지는 자리와 정확히 같은 자리에 같은 모습으로 놓인다.
 * 그 종이는 180도에 이를 즈음 이미 그림자가 걷혀 있고(SHADOW_FADE_*) 이 빈 종이도
 * 그림자가 없으므로, 교대하는 순간 화면에서 달라지는 것이 없다.
 */
function LeftEdge({ flipX }: { flipX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      flipX.value / PAGE_W,
      [LEFT_EDGE_IN_FROM, LEFT_EDGE_IN_TO],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View style={[styles.hinge, styles.leftEdgeHinge, style]} pointerEvents="none">
      <View style={styles.card}>
        {/* 넘어간 종이의 뒷면과 똑같이 쌓는다 — 경첩이 180도 돌아간 만큼 여기서 다시
            180도를 되돌려야 결이 같은 방향으로 눕는다. 이 되돌림을 빠뜨렸더니 교대
            순간 왼쪽 한 줄의 밝기가 182에서 173으로 튀었다(그라데이션이 좌우 반대). */}
        <View style={[styles.cardFace, styles.cardBack]}>
          <LinearGradient
            colors={[Colors.beige10, Colors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    </Animated.View>
  );
}

// ── 카드 ──────────────────────────────────────────────────────────────────

/**
 * 덱에 놓인 카드 한 장 — 진짜 책장처럼 책등(왼쪽 모서리)을 축으로 뒤집힌다.
 *
 * p = 이 장이 지금 넘김의 어디쯤에 있나 (index - flipX/PAGE_W).
 *
 * ── 그리는 장은 언제나 두 장뿐 ────────────────────────────────────────────
 *  - p ∈ (-1, 0] : 지금 젖혀지고 있는 종이. 0도(오른쪽에 평평)에서 180도(왼쪽에
 *    엎어짐)까지 돈다. 앞면에 이 장의 내용이 있다.
 *  - p ∈ (0, 1]  : 그 밑에 깔린 장. 평평하게 누워서 종이가 들리는 만큼 드러난다.
 *  - 그 밖 : 아예 안 그린다(opacity 0).
 *
 * 예전에는 아홉 장을 전부 늘어놓고 opacity·쌓임 순서·타이머로 가려 뒀는데, 이번
 * 화면에서 나온 문제가 전부 그 가리기에서 나왔다. 뒷장 내용이 비치고, 레이어가
 * 뒤바뀌고, 그림자가 튀는 것 모두 "보이면 안 되는 것이 거기 있다"는 한 가지 원인의
 * 다른 얼굴이었다. 그래서 있을 이유가 없는 장은 그리지 않는 쪽으로 뒤집었다.
 *
 * 그리는 장이 둘뿐이면 쌓임 순서도 따라서 단순해진다. 앞장(p가 작은 쪽)이 뒷장 위에
 * 있기만 하면 되므로, 인덱스 역순으로 zIndex를 한 번 박아 두고 끝이다 — 넘김 중에
 * 바뀌는 값이 아니니 순서가 튈 일이 없다.
 *
 * 여기서 flipX 말고 참조하는 상태는 없다. 화면 쪽 page/turningSheet 같은 값이
 * 카드 그리기에 끼어들지 않으므로, 리액트 상태 갱신과 UI 스레드 애니메이션이 어긋나
 * 생기던 깜빡임도 구조적으로 없다.
 */
function DeckCard({
  index,
  kind,
  paragraph,
  flipX,
  enter,
  interactive,
  onOpenQuiz,
}: {
  index: number;
  kind: PageKind;
  paragraph?: string;
  flipX: SharedValue<number>;
  /** 입장할 때 한 번 도는 값 — 첫 장 본문이 떠오르는 연출에만 쓴다. */
  enter: SharedValue<number>;
  /** 이 장이 지금 손가락을 받을 수 있는가(구매 버튼 같은 것). */
  interactive: boolean;
  onOpenQuiz: () => void;
}) {
  /**
   * 이 장이 얼마나 젖혀져 있는지. 0(평평, 오른쪽에 놓임)~1(180도, 왼쪽에 엎어짐).
   * 젖혀지는 중인 한 장만 그 사이를 오가고, 밑장은 0으로 평평하게 눕는다.
   */
  const turnProgress = (p: number) => {
    'worklet';
    if (p <= -1) return 1;
    if (p > 0) return 0;
    return interpolate(-p, [LIFT_FRACTION, 1], [0, 1], Extrapolation.CLAMP);
  };

  /**
   * 경첩에 거는 변형 — 원근과 회전, 딱 둘뿐이다.
   *
   * styles.hinge에 적힌 이유로 이 뷰의 중심선이 곧 책등이라, 여기에 순수 rotateY만
   * 걸면 책등이 0도에서 180도까지 한 픽셀도 움직이지 않는다. transform에 이동을
   * 섞으면 안 된다 — 안드로이드는 변형 행렬을 이동·회전·확대로 분해해 네이티브 뷰
   * 속성으로 적용하는데, 원근이 걸린 회전에 이동이 섞이면 그 분해가 정확하지 않아
   * 중간 각도에서 종이가 통째로 앞으로 떠오르며 책등에서 떨어진다.
   */
  const rotateAtSpine = (angleDeg: number) => {
    'worklet';
    return [{ perspective: PERSPECTIVE }, { rotateY: `${angleDeg}deg` }];
  };

  const hingeStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    // 젖혀지는 종이도 밑장도 아니면 그리지 않는다.
    if (p <= -1 || p > 1) return { opacity: 0, transform: rotateAtSpine(0) };
    return { opacity: 1, transform: rotateAtSpine(-turnProgress(p) * 180) };
  });

  /**
   * 본문 — 밑장일 때는 종이가 책등을 넘어간 뒤에야 떠오른다(CONTENT_IN_* 주석 참고).
   * 젖혀지는 종이(p ≤ 0)는 읽고 있던 장이니 그대로 떠 있다. 입장 연출(enter)은 첫
   * 장에만 걸리고, 한 번 1이 되면 그 뒤로는 이 식에 영향을 주지 않는다.
   */
  const bodyStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const shown = interpolate(p, [CONTENT_IN_TO, CONTENT_IN_FROM], [1, 0], Extrapolation.CLAMP);
    return { opacity: shown * (index === 0 ? enter.value : 1) };
  });

  // 앞면 — 90도를 넘기면 숨는다(뒷면이 대신 보인다). backfaceVisibility만으로는
  // 안드로이드에서 가끔 안 먹혀 각도로 직접 opacity를 끈다(이중 안전장치).
  const frontStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    return { opacity: turnProgress(p) * 180 < 90 ? 1 : 0 };
  });

  // 뒷면 — 종이 뒷면. 90도를 넘어야 보인다.
  const backStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    return { opacity: turnProgress(p) * 180 >= 90 ? 1 : 0 };
  });

  // 종이 위에 얹는 그늘 — 책등 쪽이 짙다. 각도 변화만으로는 종이가 젖혀지는 깊이가
  // 잘 안 읽혀서 명암으로 보완한다. 레퍼런스처럼 양 끝에서 0이고 중간에서 가장 짙다.
  const shadeStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    return { opacity: Math.sin(Math.PI * turnProgress(p)) * 0.55 };
  });

  return (
    <Animated.View
      style={[styles.hinge, { zIndex: PAGES.length - index }, hingeStyle]}
      // 손가락은 이 장이 지금 펼쳐져 있을 때만 받는다 — 안 그러면 보이지도 않는 장의
      // 입력칸이 다른 페이지에서 스와이프를 가로챈다.
      pointerEvents={interactive ? 'box-none' : 'none'}>
      {/* 이 아래로는 진짜 눌러야 할 것(감상 노트 입력칸, 구매 버튼)만 손가락을 가져가야
          한다. RN에서는 핸들러가 없는 평범한 View도 auto면 제 영역의 터치를 그대로
          가져가므로, 카드부터 본문까지 box-none으로 뚫어 둔다. 안 그러면 카드 위를
          탭했을 때 페이지가 넘어가지 않는다. */}
      <View style={styles.card} pointerEvents="box-none">
        <Animated.View
          // 구매 안내 장만 종이를 한 단계 어둡게 — 넘김 흐름 안에서 성격이 다른 장이라
          // 바탕으로 구분한다. brown100을 10%로 덮은 것과 같은 색이라(계산: #E1DED6)
          // 겹을 더 쌓지 않고 팔레트 색을 그대로 쓴다.
          style={[styles.cardFace, kind === 'buy' && styles.cardFaceBuy, frontStyle]}
          pointerEvents="box-none">
          <Animated.View style={[styles.cardBody, bodyStyle]} pointerEvents="box-none">
            <CardContent kind={kind} paragraph={paragraph} onOpenQuiz={onOpenQuiz} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, shadeStyle]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(3,3,3,0.85)', 'rgba(3,3,3,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {/* 뒷면은 경첩과 함께 -180도까지 돌아가므로, 다시 읽을 수 있게 그 자리에서
            180도를 되돌려 둔다(뒤집힌 채로 두 번 뒤집으면 제대로 보인다). */}
        <Animated.View
          style={[styles.cardFace, styles.cardBack, backStyle]}
          // 장식용 면이다. 카드를 통째로 덮으면서 앞면보다 뒤에 그려지는 탓에, 손가락이
          // 앞면(감상 노트 입력칸)까지 내려가지 못하고 여기서 걸린다.
          pointerEvents="none">
          <LinearGradient
            colors={[Colors.beige10, Colors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {/* 뒷면도 같은 그늘을 쓰되, 이 면은 제자리에서 180도 뒤집혀 있으니 방향도
              뒤집는다 — 그래야 앞면과 똑같이 책등 쪽이 짙게 보인다. */}
          <Animated.View style={[StyleSheet.absoluteFill, shadeStyle]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(3,3,3,0)', 'rgba(3,3,3,0.85)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function CardContent({
  kind,
  paragraph,
  onOpenQuiz,
}: {
  kind: PageKind;
  paragraph?: string;
  /** 구매 안내 장의 '퀴즈 풀러 가기' — 퀴즈를 전체 화면으로 연다. */
  onOpenQuiz: () => void;
}) {
  if (kind === 'intro') {
    return (
      <>
        <Text style={styles.introMark}>{') ) )'}</Text>
        <View style={styles.labelChip}>
          <Text style={styles.labelText}>듣기의 말들</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.no}>001</Text>
          <Text style={styles.title}>번째 듣는 법</Text>
        </View>
      </>
    );
  }

  if (kind === 'quote') {
    return (
      <View style={styles.quoteBlock}>
        <Text style={styles.quoteText}>{QUOTE_TEXT}</Text>
        <Text style={styles.quoteSource}>{QUOTE_SOURCE}</Text>
      </View>
    );
  }

  if (kind === 'desc') {
    return (
      <View style={styles.descBlock}>
        <Text style={styles.descText}>{paragraph}</Text>
      </View>
    );
  }

  if (kind === 'buy') {
    return <BuyBlock onOpenQuiz={onOpenQuiz} />;
  }

  return null;
}

/**
 * 퀴즈 풀기 — 구매 안내 장의 버튼으로 전체 화면에 뜬다.
 *
 * 카드 위가 아니라 팝업이라 보기를 손가락으로 고를 수 있다. 카드 덱에서는 탭이 페이지
 * 넘김에 쓰여서 같은 자리에서 '넘기기'와 '고르기'를 함께 둘 수 없었다.
 *
 * 틀린 보기는 표시만 하고 그대로 남긴다 — 무엇을 짚었는지 보이고 다시 고를 수 있다.
 * 정답을 맞히면 그 아래에 해설이 열리고 더는 고를 수 없다.
 */
function QuizSolver() {
  const [picked, setPicked] = useState<number[]>([]);

  if (!PREVIEW_QUIZ) {
    return <Text style={styles.quizText}>퀴즈를 찾지 못했습니다.</Text>;
  }

  const answer = PREVIEW_QUIZ.answer;
  const solved = picked.includes(answer);

  return (
    <View style={styles.quizSolver}>
      <CardHeading text={PREVIEW_QUIZ.title} />
      <Text style={styles.quizQuestion}>{PREVIEW_QUIZ.question}</Text>

      <View style={styles.quizChoices}>
        {PREVIEW_QUIZ.choices.map((choice, i) => {
          const no = i + 1;
          const tried = picked.includes(no);
          const right = tried && no === answer;
          const wrong = tried && !right;
          return (
            <Pressable
              key={choice}
              // 이미 짚어 본 보기와 정답을 맞힌 뒤에는 더 누르지 않는다.
              disabled={tried || solved}
              onPress={() => setPicked((prev) => [...prev, no])}
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

      {solved ? <Text style={styles.quizExplanation}>{PREVIEW_QUIZ.explanation}</Text> : null}
    </View>
  );
}


/**
 * 감상 노트 — 카드 위쪽부터 채우고 '기록하기'는 아래에 붙는다.
 *
 * 줄노트 바탕은 이미지가 아니라 여기서 직접 그린다. 줄 간격과 글자 줄높이가 같은 값
 * (NOTE_LINE_H)에서 나와야 글이 줄 위에 앉는데, 이미지로 하면 두 값이 따로 놀아 글이
 * 길어질수록 어긋난다. 카드 크기도 기기마다 달라서(CARD_W) 고정 이미지는 늘어나거나
 * 잘리지만, 그려서 채우면 남는 높이만큼 알아서 늘어나고 해상도와도 무관하다.
 *
 * 저장은 아직 없다(테스트 화면). 기록하면 입력칸이 그 자리에서 기록 보기로 바뀌고
 * 버튼이 '수정하기'가 된다.
 */
/**
 * 구매 안내 장 — 본문이 끝나고 감상 노트로 넘어가기 전에 낀다.
 *
 * 표지는 새로 받지 않고 카탈로그에 있는 것을 그대로 쓴다(상세 화면도 같은 URL을
 * <Image source={{ uri }}>로 그린다). 제목으로 찾는 건 lib/purchase.ts와 같은 이유다 —
 * 사람이 읽고 고치기 쉽고, 카탈로그 제목은 서로 겹치지 않는다.
 */
const BUY_BOOK = (() => {
  const book = getCatalogBooks().find((b) => b.title === BUY_BOOK_TITLE);
  if (!book) console.warn(`[card-slide-preview] 카탈로그에 없는 제목입니다: ${BUY_BOOK_TITLE}`);
  return book;
})();

function BuyBlock({ onOpenQuiz }: { onOpenQuiz: () => void }) {
  const router = useRouter();

  return (
    <View style={styles.buyBlock} pointerEvents="box-none">
      {/* 눌러야 할 것은 아래 버튼뿐이다. 나머지는 터치를 흘려보내야 카드 위를 탭했을 때
          그대로 페이지가 넘어간다 — 안 그러면 여기서 걸려 아무 일도 일어나지 않는다. */}
      <Text style={styles.buyLead} pointerEvents="none">
        {
          "뒷 내용이 더 궁금하시다면\n‘잘 듣는’ 사람이 되기 위한 필독도서\n『듣기의 말들』 을 구매해보세요."
        }
      </Text>

      <View style={styles.buyCoverArea} pointerEvents="none">
        {BUY_BOOK ? (
          <Image
            source={{ uri: BUY_BOOK.coverImage }}
            style={styles.buyCover}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <Pressable
        style={[styles.cardButton, styles.buyButton]}
        onPress={() => BUY_BOOK && router.push(`/book/${BUY_BOOK.id}`)}
      >
        <Text style={styles.cardButtonText}>￦8,820</Text>
      </Pressable>

      <Pressable style={[styles.cardButton, styles.buyButton, styles.quizButton]} onPress={onOpenQuiz}>
        <Text style={[styles.cardButtonText, styles.quizButtonText]}>퀴즈 풀러 가기</Text>
      </Pressable>
    </View>
  );
}

function NoteBlock({ onSaved }: { onSaved: () => void }) {
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState<{ date: string; text: string } | null>(null);

  const submit = () => {
    if (saved) {
      setSaved(null); // 수정하기 — 쓰던 글 그대로 다시 입력칸으로
      return;
    }
    const text = draft.trim();
    if (!text) return; // 빈 노트는 기록하지 않는다
    setSaved({ date: todayLabel(), text });
    onSaved();
  };

  return (
    <View style={styles.noteBlock} pointerEvents="box-none">
      <CardHeading text="감상 노트" />

      <View style={styles.notePaper}>
        <RuledLines />
        {saved ? (
          <View style={styles.noteSavedBody}>
            <Text style={styles.noteDate}>{saved.date}</Text>
            <Text style={styles.noteText}>{saved.text}</Text>
          </View>
        ) : (
          <TextInput
            style={styles.noteText}
            value={draft}
            onChangeText={setDraft}
            placeholder={'이 곡을 들으며 떠오른 생각을\n자유롭게 적어보세요.'}
            placeholderTextColor={Colors.brown50}
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
          />
        )}
      </View>

      <Pressable style={styles.cardButton} onPress={submit}>
        <Text style={styles.cardButtonText}>{saved ? '수정하기' : '기록하기'}</Text>
      </Pressable>
    </View>
  );
}

/**
 * 줄노트의 줄. 노트 영역을 넘치도록 넉넉히 그려 두고 넘치는 만큼은 잘라 낸다
 * (styles.notePaper의 overflow) — 영역 높이를 재서 개수를 맞출 필요가 없다.
 */
function RuledLines() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: Math.ceil(CARD_H / NOTE_LINE_H) }, (_, i) => (
        <View key={i} style={styles.ruledLine} />
      ))}
    </View>
  );
}

/** 기록한 날짜 표시 — 실제 저장은 없으니 누른 시각을 그대로 쓴다. */
function todayLabel() {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

/**
 * 화면 아래 토스트 — 감상 노트를 기록했을 때 잠깐 떴다 사라진다.
 *
 * at은 '띄운 시각'이다. 같은 버튼을 연달아 눌러도 값이 매번 달라져 그때마다 다시
 * 뜬다(불리언이면 true→true라 리액트가 갱신을 건너뛴다). 0은 아직 한 번도 안 띄운
 * 상태라 입장하자마자 뜨는 일이 없다.
 */
function Toast({ bottom, at }: { bottom: number; at: number }) {
  const shown = useSharedValue(0);

  useEffect(() => {
    if (!at) return;
    // 떠오름 → 잠깐 머묾 → 사라짐을 한 줄기로 잇는다. 두 번 대입하면 뒤엣것이 앞엣것을
    // 지워서(지연 동안 현재값을 붙들고 있으므로) 아예 뜨지 않는다.
    shown.value = withSequence(
      withTiming(1, { duration: TOAST_FADE }),
      withDelay(TOAST_HOLD, withTiming(0, { duration: TOAST_FADE })),
    );
  }, [at, shown]);

  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    // 뜰 때 살짝 떠오른다 — 아래에서 밀려 올라오는 만큼만.
    transform: [{ translateY: (1 - shown.value) * 8 }],
  }));

  return (
    <Animated.View style={[styles.toast, { bottom }, style]} pointerEvents="none">
      <Text style={styles.toastText}>감상노트에 저장되었습니다.</Text>
    </Animated.View>
  );
}

function CardHeading({ text }: { text: string }) {
  return (
    <View style={styles.cardHeading}>
      <SymbolView
        name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
        tintColor={Colors.brown100}
        size={14}
      />
      <Text style={styles.cardHeadingText}>{text}</Text>
    </View>
  );
}

// ── 문구 · 버튼 · 인디케이터 ───────────────────────────────────────────────

/** 카드가 바뀌면 위 문구도 함께 바뀐다. 같은 문구가 이어지는 구간은 켜 둔 채로 넘어간다. */
function Headlines({ top, flipX }: { top: number; flipX: SharedValue<number> }) {
  return (
    <View style={[styles.headlineArea, { top }]} pointerEvents="none">
      {HEADLINE_GROUPS.map((group) => (
        <Headline key={group.text} group={group} flipX={flipX} />
      ))}
    </View>
  );
}

function Headline({
  group,
  flipX,
}: {
  group: { text: string; from: number; to: number };
  flipX: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const x = flipX.value / PAGE_W;
    return {
      opacity: interpolate(
        x,
        [group.from - 1, group.from, group.to, group.to + 1],
        [0, 1, 1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });
  return (
    <Animated.Text style={[styles.headline, style]} numberOfLines={2}>
      {group.text}
    </Animated.Text>
  );
}

/**
 * 하단 버튼 — 모든 카드에서 책갈피·오디오 버튼이 뜨다가, 마지막 해설 카드에서만
 * '오늘의 공부 마치기'로 바뀐다. 전환 지점은 LAST_INDEX 하나로 정해지므로
 * desc가 몇 장으로 나뉘든 자동으로 맞다.
 */
function Actions({
  bottom,
  flipX,
  finishEnabled,
  onFinish,
  onOpenNote,
}: {
  bottom: number;
  flipX: SharedValue<number>;
  finishEnabled: boolean;
  onFinish: () => void;
  /** 감상 노트를 전체 화면으로 연다. */
  onOpenNote: () => void;
}) {
  const roundStyle = useAnimatedStyle(() => {
    const x = flipX.value / PAGE_W;
    return { opacity: interpolate(x, [LAST_INDEX - 1, LAST_INDEX], [1, 0], Extrapolation.CLAMP) };
  });
  const finishStyle = useAnimatedStyle(() => {
    const x = flipX.value / PAGE_W;
    return {
      opacity: interpolate(x, [LAST_INDEX - 1, LAST_INDEX], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={[styles.actions, { bottom }]} pointerEvents="box-none">
      <Animated.View
        style={[styles.roundRow, roundStyle]}
        pointerEvents={finishEnabled ? 'none' : 'auto'}>
        <ScaleButton accessibilityLabel="책갈피" style={styles.roundButton} onPress={() => {}}>
          <SymbolView
            name={{ ios: 'bookmark', android: 'bookmark', web: 'bookmark' }}
            tintColor={Colors.white}
            size={24}
          />
        </ScaleButton>
        <ScaleButton accessibilityLabel="오디오 듣기" style={styles.roundButton} onPress={() => {}}>
          <SymbolView
            name={{ ios: 'headphones', android: 'headphones', web: 'headphones' }}
            tintColor={Colors.white}
            size={24}
          />
        </ScaleButton>
        <ScaleButton accessibilityLabel="감상 노트" style={styles.roundButton} onPress={onOpenNote}>
          <SymbolView
            name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
            tintColor={Colors.white}
            size={24}
          />
        </ScaleButton>
      </Animated.View>

      <Animated.View
        style={[styles.finishWrap, finishStyle]}
        pointerEvents={finishEnabled ? 'auto' : 'none'}>
        <ScaleButton
          accessibilityLabel="오늘의 공부 마치기"
          style={styles.finishButton}
          onPress={onFinish}>
          <Text style={styles.finishText}>오늘의 공부 마치기</Text>
        </ScaleButton>
      </Animated.View>
    </View>
  );
}

/** 닫기 버튼 — 모든 카드에서 늘 같은 자리에 뜬다. */
function CloseButton({
  top,
  onPress,
}: {
  top: number;
  onPress: () => void;
}) {
  return (
    <View style={[styles.closeButton, { top }]}>
      <ScaleButton accessibilityLabel="미리보기 닫기" style={styles.closeHit} onPress={onPress}>
        <SymbolView
          name={{ ios: 'xmark', android: 'close', web: 'close' }}
          tintColor={Colors.brown50}
          size={24}
        />
      </ScaleButton>
    </View>
  );
}

/** 몇 장 중 몇 번째인지 알려 주는 점. */
function Dots({ flipX, bottom }: { flipX: SharedValue<number>; bottom: number }) {
  return (
    <View style={[styles.dots, { bottom }]} pointerEvents="none">
      {PAGES.map((_, i) => (
        <Dot key={i} index={i} flipX={flipX} />
      ))}
    </View>
  );
}

function Dot({ index, flipX }: { index: number; flipX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(index - flipX.value / PAGE_W);
    return {
      opacity: interpolate(d, [0, 1], [1, 0.28], Extrapolation.CLAMP),
      width: interpolate(d, [0, 1], [18, 6], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.brown100,
  },
  gestureLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 페이지는 세로로도 화면을 가득 채워야 한다 — 안 그러면 본문 페이지가 제 내용 높이에
  // 맞춰 줄어들어 아래에 배경이 비치고, 내용이 길어져도 세로 스크롤이 걸리지 않는다.
  gesturePage: {
    width: PAGE_W,
    height: '100%',
    flexDirection: 'row',
  },
  // 화면을 가로로 3등분한 탭 영역. 페이지 안에 두어야 스와이프는 그대로 바깥
  // ScrollView가 받고, 탭만 여기서 걸린다.
  tapZone: {
    flex: 1,
  },

  // 위 문구와 닫기 버튼
  headlineArea: {
    position: 'absolute',
    left: 20,
    right: 72,
    height: 56,
    zIndex: 2,
  },
  headline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: tracking(20),
    color: Colors.brown50,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 41,
    height: 41,
    zIndex: 3,
  },
  closeHit: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },

  // 카드
  deck: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 경첩 — 종이를 젖히는 회전은 카드가 아니라 이 뷰가 맡는다.
   *
   * rotateY는 언제나 '뷰의 중심선'을 축으로 돈다. 그 축을 옮기는 방법(직접 이동을
   * 앞뒤로 덧대든, transformOrigin을 쓰든)은 안드로이드에서 정확하지 않다 —
   * DeckCard의 hingeStyle 주석 참고. 그래서 축을 옮기는 대신, 축 위에 뷰를 앉힌다:
   * 카드 두 장 폭으로 만들고 오른쪽 절반에만 카드를 담으면 이 뷰의 중심선이 곧
   * 카드의 왼쪽 모서리, 즉 책등이 된다. 그 상태로 순수 rotateY만 걸면 책등은
   * 어느 각도에서도 움직이지 않는다.
   *
   * 화면에서 카드가 여전히 가운데 오도록, 왼쪽으로 카드 한 장만큼 당겨 둔다.
   * (이 자리 잡기는 transform이 아니라 레이아웃으로 한다 — 위와 같은 이유로 회전하는
   *  뷰의 transform에는 이동을 섞지 않는다.)
   */
  hinge: {
    position: 'absolute',
    left: (SCREEN_W - CARD_W) / 2 - CARD_W,
    top: '50%',
    marginTop: -CARD_H / 2,
    width: CARD_W * 2,
    height: CARD_H,
  },
  /** 다 넘어간 종이가 눕는 자리 — 경첩을 180도 돌려 둔 것과 같다. */
  leftEdgeHinge: {
    zIndex: 0,
    transform: [{ rotateY: '180deg' }],
  },
  card: {
    position: 'absolute',
    // 경첩의 오른쪽 절반 — 카드의 왼쪽 모서리가 경첩의 중심선(=책등)에 맞물린다.
    left: CARD_W,
    top: 0,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: Colors.bg,
    overflow: 'hidden',
    // 그림자는 여기 두지 않는다 — 종이에 지는 그림자는 FoldShade 하나뿐이다(그 주석 참고).
  },
  /** 책등 왼쪽에 붙는 골 그늘. 카드보다 위에 둬야 아래에 무엇이 오든 똑같이 어두워진다. */
  foldShade: {
    position: 'absolute',
    left: (SCREEN_W - CARD_W) / 2 - FOLD_SHADE_W,
    top: '50%',
    marginTop: -CARD_H / 2,
    width: FOLD_SHADE_W,
    height: CARD_H,
    zIndex: 100,
  },
  // 앞면·뒷면 공용 — 카드를 꽉 채우고 뒷면이 보일 차례가 아니면 숨는다.
  // backfaceVisibility는 opacity 토글의 이중 안전장치(안드로이드 일부 버전 대비).
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
    backgroundColor: Colors.bg,
  },
  /** 구매 안내 장의 종이색. */
  cardFaceBuy: {
    backgroundColor: Colors.brown50,
  },
  cardBack: {
    // 부모가 -180도까지 돌아가므로, 그 안에서 180도를 다시 돌려 두면 다 넘어갔을
    // 때 뒷면 내용이 거울상이 아니라 똑바로 보인다.
    transform: [{ rotateY: '180deg' }],
  },
  cardBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  introMark: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: 6,
    color: Colors.brown50,
  },
  labelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.beige10,
  },
  labelText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  no: {
    fontFamily: Fonts.semiBold,
    fontSize: 36,
    letterSpacing: tracking(36),
    color: Colors.brown100,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },

  // 인용 카드 — 왼쪽에 굵은 세로줄을 두고 글을 왼쪽으로 붙인다.
  quoteBlock: {
    alignSelf: 'stretch',
    gap: 16,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brown100,
  },
  quoteText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  quoteSource: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: tracking(11),
    color: Colors.brown50,
  },

  // 노트 · 퀴즈 카드
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeadingText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  /** 감상 노트 팝업 — 전체 화면을 카드와 같은 종이색으로 채운다. */
  noteModal: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.bg,
  },
  /** 닫기 버튼 아래로 노트가 들어갈 자리. */
  noteModalBody: {
    flex: 1,
    paddingTop: 56,
  },
  /** 감상 노트 — 위에서부터 채우고 버튼은 아래에 붙는다(가운데 정렬이 아니다). */
  noteBlock: {
    flex: 1,
    alignSelf: 'stretch',
    gap: 12,
  },
  /** 줄노트 바탕이 깔리는 영역. 남는 높이를 다 차지하고 넘치는 줄은 여기서 잘린다. */
  notePaper: {
    flex: 1,
    overflow: 'hidden',
  },
  ruledLine: {
    height: NOTE_LINE_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.brown10,
  },
  /** 입력칸과 기록 보기 공용 — 줄 간격과 같은 줄높이여야 글이 줄 위에 앉는다. */
  noteText: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: NOTE_LINE_H,
    letterSpacing: tracking(13),
    color: Colors.brown100,
  },
  noteSavedBody: {
    flex: 1,
  },
  /** 기록한 날짜 — 본문과 같은 줄 위에 앉도록 줄높이를 맞춘다. */
  noteDate: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: NOTE_LINE_H,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  /**
   * 구매 안내 장 — 문구·표지·버튼을 한 덩어리로 묶어 카드 가운데에 모은다.
   * 높이를 늘려 잡지 않으므로(flex 없음) 제 내용만큼만 차지하고, 카드 본문의
   * justifyContent가 그 덩어리를 세로 가운데에 놓는다.
   */
  buyBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  buyLead: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: tracking(14),
    textAlign: 'center',
    color: Colors.brown100,
  },
  /** 표지가 놓이는 자리 — 높이를 정해 두고 그 안에서 비율을 지킨다(resizeMode contain). */
  buyCoverArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    height: BUY_COVER_H,
  },
  buyCover: {
    width: '100%',
    height: '100%',
  },
  /** 카드 안 버튼 공용 — 감상 노트의 기록하기와 구매 안내의 구매하러 가기가 같이 쓴다. */
  cardButton: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige50,
  },
  cardButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  /** 구매 버튼만 가로를 글자에 맞춘다(감상 노트의 기록하기는 그대로 꽉 찬 폭). */
  buyButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.blue50,
  },
  /** 화면 아래 토스트. 카드·버튼보다 위에 뜬다. */
  toast: {
    position: 'absolute',
    left: 28,
    right: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.brown90,
    zIndex: 10,
  },
  toastText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.bg,
  },
  quizText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Colors.brown100,
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
  /** 퀴즈 팝업 — 카드가 아니라 화면을 쓰므로 위에서부터 채운다. */
  quizModalContent: {
    paddingBottom: 24,
  },
  quizSolver: {
    gap: 16,
  },
  /** 고를 수 있는 보기는 눌리는 자리가 보이도록 테두리와 여백을 준다. */
  quizChoiceBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
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
  /** 구매 안내 장의 두 번째 버튼 — 가격 버튼 아래에 같은 폭으로 선다. */
  quizButton: {
    backgroundColor: Colors.brown100,
  },
  quizButtonText: {
    color: Colors.bg,
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
  quizExplanation: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },

  // 본문 카드 — 문단 하나를 카드 한 장에 꽉 채운다(다른 카드처럼 alignSelf: stretch).
  descBlock: {
    alignSelf: 'stretch',
  },
  descText: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },

  // 하단 버튼
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    zIndex: 3,
  },
  roundRow: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 66,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brown50,
  },
  finishWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
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

  // 인디케이터
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brown50,
  },
});
