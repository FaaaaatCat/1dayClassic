import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
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
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
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
// 돌아가게 만든다(TURN). 종이의 곡면은 순수 JS로 표현할 수 없지만, 각도별 명암과
// 회전 타이밍만으로도 종이 느낌이 꽤 산다.
/** 전체 넘김 진행(0~1) 중 회전이 본격적으로 시작되기 전 준비 구간의 비율. */
const LIFT_FRACTION = 0.12;
/**
 * 원근 거리. 회전축(왼쪽 모서리)에서 가장 먼 점(오른쪽 모서리, CARD_W만큼 떨어져
 * 있다)이 이 거리를 넘어서면 투영이 뒤집혀 카드가 마름모꼴로 깨진다 — 카드 폭보다
 * 충분히 커야 한다(경험적으로 3~4배 이상).
 */
const PERSPECTIVE = 1600;
/** 이미 넘긴(왼쪽)·아직 안 넘긴(오른쪽) 페이지가 새어 나오는 폭(px, 한 장당). */
const EDGE_PEEK = 3;
/** 가장자리로 보여줄 최대 장수 — 그 이상 쌓여도 더 넓어지지 않는다. */
const EDGE_MAX_DEPTH = 4;
/**
 * 두 장 이상 떨어진 페이지는 아예 opacity 0으로 지운다. elevation만으로 여러 겹친
 * 절대배치 뷰의 그리기 순서를 맡기면, 뒤로 갈수록 elevation 값이 조밀해지다 못해
 * 겹쳐 버려서(4장 넘게 떨어진 페이지는 전부 같은 값으로 클램프된다) 애니메이션 중
 * 안드로이드가 프레임 사이에 순서를 잘못 정렬해 아주 먼 페이지가 한 프레임 튀어
 * 보이는 문제가 있었다. z-order에 기대는 대신 안 보여야 할 페이지는 아예 안 그려
 * 지게 만들면 순서가 어떻게 꼬이든 안전하다 — 덤으로 다음/이전 페이지가 서서히
 * 드러나는 효과도 생긴다.
 */
const EDGE_FADE_RANGE = 1.2;
/** 카드가 바닥에서 떠 보이게 하는 그림자 높이(dp). */
const CARD_ELEVATION = 12;
/**
 * 종이가 다 넘어갈 즈음 그림자를 걷어내는 구간(회전 진행 0~1 기준).
 *
 * 넘어가는 종이는 회전 내내 맨 위에 있고, 90도를 지나면 책등을 넘어 다음 장 위에
 * 걸친다. 그동안 이 종이의 드롭 그림자가 다음 장의 왼쪽 모서리에 어두운 띠를 그린다.
 * 회전이 끝나 레이어가 재배치되는 순간 그 종이가 아래로 내려가면 띠도 같이 사라지는데,
 * 그게 한 프레임에 일어나서 그림자가 톡 튀어 보였다(실측 6dp 폭). 레이어를 언제
 * 재배치하든 남는 문제라, 재배치 시점을 옮기는 대신 그때쯤 그림자가 이미 없도록
 * 회전 후반에 걸쳐 서서히 걷는다 — 교체 순간에는 달라질 것이 남아 있지 않다.
 *
 * 다 넘어가 왼쪽에 엎어진 종이에 그림자가 없는 것도 물리적으로 맞다(들려 있지 않으니).
 * 되돌리기는 이 과정이 그대로 거꾸로 돌아, 종이가 일어서면서 그림자가 다시 든다.
 */
const SHADOW_FADE_FROM = 0.6;
const SHADOW_FADE_TO = 0.95;
/**
 * 손을 뗀 뒤(스크롤 정착)나 탭으로 넘어갈 때, 카드가 실제로 넘어가는 데 걸리는
 * 시간(ms). 예전엔 이 값이 없었다 — ScrollView의 페이지 스냅에 그대로 얹혀서
 * 안드로이드 네이티브 기본 속도(대략 300ms)를 그대로 썼다. "너무 빠르고 정신
 * 없다"는 피드백을 받아 그 기본값의 2배로 늦췄다. 드래그하는 동안은 이 값과
 * 무관하게 손가락을 1:1로 따라간다 — 손 뗀 뒤/탭 넘김만 이 속도로 움직인다.
 */
const TURN_DURATION = 600;
/**
 * 페이지가 '현재 페이지'가 된 뒤 그 콘텐츠가 드러나는 방식 — 도착하자마자 바로
 * 보이는 대신, 잠깐 완전히 비어 있다가(REVEAL_DELAY) 천천히 떠오른다(REVEAL_
 * DURATION). 책장이 넘어가는 물리적 동작(TURN_DURATION)과는 별개의, 시간 기반
 * 애니메이션이다 — 얼마나 빨리 넘겼든 이 페이스만큼은 항상 똑같이 흘러간다.
 *
 * 이 대기는 '회전이 끝난 시점'부터 잰다. 예전엔 넘기기 시작하는 시점부터 재느라
 * 800이었는데(넘김 600 + 200), 이제 page가 회전이 끝난 뒤에 갱신되므로 그 200만
 * 남는다 — 손가락으로 보면 콘텐츠가 떠오르기 시작하는 시각은 전과 똑같다.
 */
const REVEAL_DELAY = 200;
const REVEAL_DURATION = 500;

// ── 화면 구성 ─────────────────────────────────────────────────────────────

type PageKind = 'intro' | 'quote' | 'desc' | 'note' | 'quiz' | 'answer';

interface Page {
  kind: PageKind;
  /** 카드 위에 뜨는 안내 문구. 본문(desc) 카드에는 없다. */
  headline?: string;
  /** desc 카드 전용 — 이 카드 한 장에 담을 문단 하나. */
  paragraph?: string;
}

const QUOTE_TEXT =
  '모든 인류에게 부여된 천부적인 재능일 수 있는 경청이 어려워진 이유는 무얼까.\n' +
  '심리학자인 데이비드 배너 교수는 우리 대부분이 이미 스스로 잘 듣는 사람이라 생각하기 때문이라고 지적한다.';
const QUOTE_SOURCE = '애덤 S. 맥휴, 『경청, 영혼의 치료제』\n(윤종석 옮김, 도서출판 CUP, 2018)';

/** 본문 — 문단마다 카드 한 장씩 담는다(PAGES 참고). */
const DESC_PARAGRAPHS = [
  '‘익명의 알코올중독자들’ Alcoholics Anonymous을 비롯한 재활모임에서 가장 중히 여기는 것이 무엇인지 아는가? 본인이 중독이라는 사실을 인정하는 것이 1단계다. 내가 중독에 빠졌고 내 힘으로는 중독에서 벗어날 수 없다는 사실을 수긍하는 것. 이것이 이뤄지지 않으면 재활센터에서도 치료에 들어가지 않는다.',
  '경청도 마찬가지다. 내가 잘 듣는 사람이 아니라는 것. 달리 말하면 말하기 중독에 빠져서 자꾸 상대의 말을 끊는다는 걸 인정하지 않고서는 듣기의 갱신은 요원하다.',
  '과분하게도 내 주위엔 훌륭한 분들이 즐비하다. 그런 분들이 대화 자리에서 툭하면 상대의 말허리를 끊는다. 물론 고의는 아니다. 자기도 모르게 그런다. 커피 타임이나 술자리에서 가만히 살펴보라. 남이 말할 때 끼어들 기회를 엿보며 화제를 주도하려는 사람이 태반이다. 그런데 나 정도면 잘 들어 준다고 자평한다. 이 책을 쓰기 전까지는 나 자신도 그런 줄 몰랐다.',
  '우리는 대화의 기준이 너무 낮다. 정보 교환, 감정 배설, 재치있는 말의 경연장 정도로 간주한다. 그러니 자신이 잘 듣는다고 착각하는 것도 무리는 아니다.',
];

const PAGES: Page[] = [
  { kind: 'intro', headline: '듣기 공부의 시간입니다.' },
  { kind: 'quote', headline: '듣기 공부의 시간입니다.' },
  // 본문은 문단마다 카드 한 장 — 문단이 늘거나 줄면 카드 수도 그만큼 자동으로 바뀐다.
  ...DESC_PARAGRAPHS.map((paragraph): Page => ({ kind: 'desc', paragraph })),
  { kind: 'note', headline: '오늘의 공부는 어떠셨나요.\n떠오르는 게 있다면 적어봅시다.' },
  { kind: 'quiz', headline: '잘 읽었는지 확인해볼까요?' },
  { kind: 'answer', headline: '정답입니다!' },
];

/** 하단이 '오늘의 공부 마치기'로 바뀌는 페이지. */
const ANSWER_INDEX = PAGES.findIndex((p) => p.kind === 'answer');

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
   * 정착된 페이지 — 넘김이 '끝난' 뒤에만 바뀐다(넘기기 시작할 때가 아니다).
   * 쌓임 순서와 콘텐츠 리빌, 하단 버튼이 이 값을 읽는다. 회전이 도는 동안 이 값이
   * 그대로여야 레이어가 중간에 재배치되지 않는다 — 아래 layerOf 주석 참고.
   */
  const [page, setPage] = useState(0);
  /**
   * 지금 넘어가는 중인 종이의 인덱스. n번과 n+1번 사이를 오갈 때 실제로 젖혀지는
   * 종이는 언제나 n번 한 장이다(앞으로 넘기면 0→180도, 되돌리면 180→0도).
   * 이 한 장만 넘김이 시작될 때부터 끝날 때까지 통째로 맨 위에 둔다.
   */
  const [turningSheet, setTurningSheet] = useState(0);
  /** 지금 향해 가고 있는 페이지. */
  const targetPage = useRef(0);
  /** 우리 속도의 넘김이 지금 돌고 있는지 — 같은 넘김을 두 번 걸지 않으려고 둔다. */
  const gliding = useSharedValue(false);
  /** 드래그 중 손가락 밑에서 젖혀지는 종이가 바뀌었는지 보려고 둔다. */
  const draggedSheet = useSharedValue(-1);

  /**
   * 넘김 시작 — flipX를 우리 속도로 옮기고, 젖혀지는 종이를 맨 위로 올린다.
   * 회전이 끝난 뒤에야 page를 갱신한다(commitTurn). 그 사이 레이어는 손대지 않는다.
   */
  const startTurn = (next: number) => {
    const from = targetPage.current;
    // 이미 그 자리로 가고 있으면 그대로 둔다 — 다시 걸면 애니메이션이 처음부터 다시
    // 시작돼 넘김이 끊겨 보인다. 탭 넘김이 옮겨 둔 스크롤이 정착하면서 onSettle이
    // 뒤따라 들어오는 경우가 대표적이고, 안드로이드가 정착 이벤트를 두 번 흘리는
    // 경우도 여기서 걸러진다.
    if (gliding.value && next === from) return;
    targetPage.current = next;
    gliding.value = true;
    // n↔n+1 사이에서 젖혀지는 종이는 늘 둘 중 작은 쪽이다. 제자리 정착(next === from)
    // 이면 지금 젖혀져 있던 종이를 그대로 둔 채 각도만 되돌린다.
    if (next !== from) setTurningSheet(Math.min(from, next));
    flipX.value = withTiming(next * PAGE_W, { duration: TURN_DURATION }, (finished) => {
      // 도중에 다른 넘김이 끼어들면 finished가 false로 온다 — 그때는 그 넘김이
      // 자기 몫을 정리하도록 두고 여기서는 아무것도 하지 않는다.
      if (finished) runOnJS(commitTurn)(next);
    });
  };

  /** 회전이 완전히 끝난 뒤 — 여기서만 페이지 상태와 레이어 순서를 재배치한다. */
  const commitTurn = (arrived: number) => {
    if (targetPage.current !== arrived) return;
    gliding.value = false;
    setPage(arrived);
    setTurningSheet(arrived);
  };

  // onScroll·onBeginDrag·onEndDrag를 한 핸들러 객체로 묶어야 셋 다 UI 스레드
  // 워클릿으로 제대로 바인딩된다(useAnimatedScrollHandler의 표준 사용법).
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      rawX.value = event.contentOffset.x;
      // 드래그하는 동안만 1:1로 따라간다 — 정착 애니메이션(네이티브, 빠르다)이
      // 진행되는 동안은 따라가지 않고 아래 onSettle이 우리 속도로 직접 옮긴다.
      if (!isDragging.value) return;
      flipX.value = rawX.value;
      // 손가락이 페이지 경계를 넘으면 젖혀지는 종이도 다음 장으로 넘어간다. 이때는
      // 두 장 다 평평하게 누워 있는 순간이라(하나는 0도, 하나는 180도) 순서가 바뀌어도
      // 눈에 띄지 않는다 — 레이어를 옮겨도 되는 유일한 지점이다.
      const sheet = Math.max(0, Math.min(PAGES.length - 1, Math.floor(rawX.value / PAGE_W)));
      if (sheet !== draggedSheet.value) {
        draggedSheet.value = sheet;
        runOnJS(setTurningSheet)(sheet);
      }
    },
    onBeginDrag: () => {
      isDragging.value = true;
      // 진행 중이던 정착 애니메이션이 있었다면 즉시 취소하고 손가락 위치로 스냅 —
      // 안 그러면 드래그 시작이 이전 애니메이션과 씨름하는 것처럼 느껴진다.
      flipX.value = rawX.value;
      gliding.value = false; // 방금 그 애니메이션을 끊었으니 더는 돌고 있지 않다
      draggedSheet.value = -1; // 젖혀지는 종이는 첫 onScroll에서 다시 정한다
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

  /**
   * 그리기 순서. flipX가 아니라 '정착된 페이지'와 '젖혀지는 종이'로만 정해지므로
   * 넘김이 도는 동안에는 값이 바뀌지 않고, 회전이 끝난 뒤에만 한 번 재배치된다.
   * 예전엔 이 값을 flipX에서 매 프레임 계산해서, 넘김이 끝나는 순간 두 장의 순서가
   * 서로 뒤바뀌며 그림자가 튀었다.
   *
   * 젖혀지는 종이는 책등 양쪽을 가로질러 지나가므로 무조건 맨 위다. 나머지는 실제
   * 책의 물리적 순서 그대로 — 아직 안 넘긴 오른쪽 더미는 위 장이 먼저(작은 인덱스가
   * 위), 이미 넘긴 왼쪽 더미는 방금 넘긴 장이 맨 위(큰 인덱스가 위)다. 두 더미는
   * 책등을 사이에 두고 갈라져 있어 서로 겹치지 않으니, 오른쪽 더미를 통째로 왼쪽
   * 더미보다 위에 둬도 화면에서는 차이가 없다.
   */
  const layerOf = (index: number) => {
    if (index === turningSheet) return 300;
    if (index >= page) return 200 - (index - page);
    return 100 - (page - 1 - index);
  };

  const onAnswer = page === ANSWER_INDEX;

  return (
    <View style={styles.screen}>
      {/* 카드층 — 보이기만 하고 손가락은 위의 ScrollView가 받는다. 렌더 순서는 상관없다
          (layerOf가 정해 준 elevation/zIndex로 쌓임 순서가 정해진다). */}
      <View style={styles.deck} pointerEvents="none">
        {PAGES.map((p, index) => (
          <DeckCard
            key={index}
            index={index}
            kind={p.kind}
            paragraph={p.paragraph}
            flipX={flipX}
            layer={layerOf(index)}
            isCurrent={page === index}
          />
        ))}
      </View>

      <Headlines top={insets.top + 24} flipX={flipX} />

      <CloseButton top={insets.top + 24} onPress={() => router.replace('/settings')} />

      <Dots flipX={flipX} bottom={insets.bottom + 104} />

      <Actions
        bottom={insets.bottom + 40}
        flipX={flipX}
        finishEnabled={onAnswer}
        onFinish={() => router.replace('/settings')}
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
    </View>
  );
}

// ── 카드 ──────────────────────────────────────────────────────────────────

/**
 * 덱에 놓인 카드 한 장 — 진짜 책장처럼 책등(왼쪽 모서리)을 축으로 뒤집힌다.
 *
 * p = 이 페이지가 지금 보는 페이지보다 몇 장 앞(+)/뒤(-)에 있는지.
 *  - p ∈ (-1, 0] : 지금 넘어가는 중이거나 방금 도착한 페이지 — 유일하게 회전
 *    하는 페이지다. 나머지는 전부 제자리에 가만히 쌓여 있다(실제 책이 그렇듯,
 *    안 넘긴 페이지도 넘긴 페이지도 스스로 움직이지 않는다 — 움직이는 건 지금
 *    넘어가는 그 한 장뿐이다).
 *  - p ≥ 1 : 아직 안 넘긴 페이지 — 오른쪽 가장자리로 살짝 새어 나온 채 대기.
 *  - p ≤ -1 : 이미 넘긴 페이지 — 왼쪽 가장자리로 살짝 새어 나온 채 쌓여 있다.
 *
 * 쌓임 순서(layer)는 여기서 계산하지 않고 화면 쪽 layerOf가 정해 준 값을 그대로
 * 받는다 — 애니메이션 값이 아니라 평범한 스타일이라 넘김이 도는 동안 바뀌지 않는다.
 *
 * isCurrent(이 카드가 지금 '현재 페이지'인가)가 켜지는 순간, 물리적으로 넘어가는
 * 동작(위 로직, flipX 기반)과는 완전히 별개로 콘텐츠 자체의 등장을 한 번 더
 * 연출한다 — 곧장 보이는 대신 REVEAL_DELAY만큼 비어 있다가 REVEAL_DURATION에
 * 걸쳐 천천히 떠오른다. 시간 기반이라 얼마나 빨리 넘겼든 이 페이스는 항상 같다.
 */
function DeckCard({
  index,
  kind,
  paragraph,
  flipX,
  layer,
  isCurrent,
}: {
  index: number;
  kind: PageKind;
  paragraph?: string;
  flipX: SharedValue<number>;
  /** 그리기 순서 — 화면 쪽 layerOf가 정한다. 넘김이 도는 동안에는 바뀌지 않는다. */
  layer: number;
  isCurrent: boolean;
}) {
  const contentOpacity = useSharedValue(0);
  useEffect(() => {
    if (!isCurrent) return;
    contentOpacity.value = 0;
    contentOpacity.value = withDelay(REVEAL_DELAY, withTiming(1, { duration: REVEAL_DURATION }));
  }, [isCurrent, contentOpacity]);

  /**
   * 지금 이 페이지가 얼마나 젖혀져 있는지. 0(평평, 오른쪽에 놓임)~1(180도, 왼쪽에
   * 뒤집혀 누움). 넘어가는 중인 한 장만 그 사이를 오가고, 아직 안 넘긴 장은 0,
   * 이미 넘긴 장은 1로 고정 — 실제 책에서 넘어간 종이가 왼쪽에 그대로 눕는 것과 같다.
   */
  const turnProgress = (p: number) => {
    'worklet';
    if (p <= -1) return 1;
    if (p > 0) return 0;
    return interpolate(-p, [LIFT_FRACTION, 1], [0, 1], Extrapolation.CLAMP);
  };

  /** 경첩에 거는 변형 — 원근과 회전, 딱 둘뿐이다(이유는 아래 hingeStyle 주석). */
  const rotateAtSpine = (angleDeg: number) => {
    'worklet';
    return [{ perspective: PERSPECTIVE }, { rotateY: `${angleDeg}deg` }];
  };

  /**
   * 경첩(hinge) — 실제로 회전하는 건 카드가 아니라 이 뷰다. styles.hinge에 적힌
   * 이유로 이 뷰의 '중심선'이 곧 책등이라, 여기에 순수 rotateY만 걸면 책등이
   * 0도에서 180도까지 한 픽셀도 움직이지 않는다.
   *
   * transform에는 perspective와 rotateY 둘만 둔다 — translate를 섞으면 안 된다.
   * 안드로이드는 넘겨받은 변형 행렬을 이동·회전·확대로 '분해'해서 네이티브 뷰
   * 속성으로 적용하는데, 원근이 걸린 회전에 이동이 섞이면 그 분해가 정확하지
   * 않다. 카드 중심을 축으로 돌린 뒤 이동으로 되돌리든(직접 계산), transformOrigin
   * 스타일을 쓰든(RN 내부에서 똑같이 이동을 덧붙인다) 결과는 같아서, 중간 각도에서
   * 종이가 통째로 앞으로 떠오르며 책등에서 떨어졌다가 0도·180도에서만 정확히
   * 제자리로 돌아온다 — '떨어졌다 다시 붙는' 현상의 진짜 원인이 이거였다.
   * 이동을 아예 없애고 뷰 자체를 축 위에 앉히는 이 방법만 그 분해를 통과한다.
   *
   * 여기서 매 프레임 바뀌는 건 각도와 투명도뿐이다 — 쌓임 순서는 layer 프로퍼티로
   * 따로 받아 평범한 스타일로 얹는다(화면 쪽 layerOf 주석 참고).
   */
  const hingeStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const angle = -turnProgress(p) * 180;

    // 아직 안 넘긴 페이지 — 바로 다음 한 장은 현재 장과 꼭 붙어 대기하고, 그보다
    // 뒤쪽 장부터만 가장자리로 새어 나온다(아래 cardStyle). 그래야 넘기는 장의
    // 오른쪽 면이 회전 전후로 분리되지 않고 실제 책장처럼 이어져 보인다.
    if (p > 0) {
      return {
        opacity: interpolate(p, [1, 1 + EDGE_FADE_RANGE], [1, 0], Extrapolation.CLAMP),
        transform: rotateAtSpine(angle),
      };
    }

    // 이미 넘긴 페이지 — 책등 왼쪽에 뒤집힌 채 그대로 누워 있다(뒷면이 보인다).
    // 넘어가던 장이 180도에서 멈추는 그 자리와 정확히 같은 자리라, 회전이 끝나는
    // 순간 옮겨 앉는 티가 나지 않는다. 넘어가는 중인 한 장(-1 < p ≤ 0)은 depth가
    // 0이라 아래 식이 그대로 opacity 1을 준다.
    const depth = Math.min(Math.max(-p - 1, 0), EDGE_MAX_DEPTH);
    return {
      opacity: interpolate(depth, [0, EDGE_FADE_RANGE], [1, 0], Extrapolation.CLAMP),
      transform: rotateAtSpine(angle),
    };
  });

  /**
   * 쌓인 장이 가장자리로 새어 나오는 만큼 — 경첩이 아니라 그 안의 카드를 민다.
   * 회전하는 뷰의 변형에 이동을 섞지 않으려는 것도 있고(위 hingeStyle 참고), 여기서
   * 미는 방향이 마침 양쪽 다 맞아떨어지기도 한다: 책등에서 바깥쪽(+X)으로 밀면
   * 안 넘긴 장은 그대로 오른쪽으로, 180도 뒤집혀 누운 장은 화면에서 왼쪽으로 나온다.
   */
  const cardStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const depth = Math.min(Math.max(Math.abs(p) - 1, 0), EDGE_MAX_DEPTH);
    // 그림자는 종이가 넘어갈수록 걷힌다 — 레이어가 재배치되는 순간 그림자가 톡 튀지
    // 않게 하려는 것이다(SHADOW_FADE_FROM 주석 참고). 그림자는 이 카드 혼자 쓰는
    // 값이라(경첩 안에 이 카드뿐이다) 여기서 바꿔도 장끼리의 쌓임 순서에는 영향이 없다.
    const lift = interpolate(
      turnProgress(p),
      [SHADOW_FADE_FROM, SHADOW_FADE_TO],
      [1, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: depth * EDGE_PEEK }],
      elevation: CARD_ELEVATION * lift,
      shadowOpacity: 0.35 * lift,
    };
  });

  // 앞면 — 90도를 넘기면 숨는다(뒷면이 대신 보인다). backfaceVisibility만으로는
  // 안드로이드에서 가끔 안 먹혀 각도로 직접 opacity를 끈다(이중 안전장치).
  const frontStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const angle = turnProgress(p) * 180;
    return { opacity: angle < 90 ? 1 : 0 };
  });

  // 뒷면 — 종이 뒷면. 90도를 넘어야 보인다.
  const backStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const angle = turnProgress(p) * 180;
    return { opacity: angle >= 90 ? 1 : 0 };
  });

  // 종이 위에 얹는 그늘 — 책등 쪽이 짙다. 각도 변화만으로는 종이가 젖혀지는 깊이가
  // 잘 안 읽혀서 명암으로 보완한다. 빛을 가장 많이 등지는 중간 각도에서 제일 짙고,
  // 다 넘어가 왼쪽에 누우면 다시 걷힌다 — 누운 종이까지 어두우면 안 되기 때문.
  const shadeStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    if (!(p > -1 && p <= 0)) return { opacity: 0 };
    const turnT = turnProgress(p);
    return { opacity: interpolate(turnT, [0, 0.5, 0.9], [0, 0.55, 0], Extrapolation.CLAMP) };
  });

  const revealStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return (
    <Animated.View style={[styles.hinge, { elevation: layer, zIndex: layer }, hingeStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.View style={[styles.cardFace, frontStyle]}>
          <Animated.View style={[styles.cardBody, revealStyle]}>
            <CardContent kind={kind} paragraph={paragraph} />
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
        <Animated.View style={[styles.cardFace, styles.cardBack, backStyle]}>
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
      </Animated.View>
    </Animated.View>
  );
}

function CardContent({ kind, paragraph }: { kind: PageKind; paragraph?: string }) {
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

  if (kind === 'note') {
    return (
      <View style={styles.formBlock}>
        <CardHeading text="감상 노트" />
        <View style={styles.noteInput}>
          <Text style={styles.notePlaceholder}>
            이 곡을 들으며 떠오른 생각을 자유롭게 적어보세요.
          </Text>
        </View>
        <View style={styles.noteSubmit}>
          <Text style={styles.noteSubmitText}>기록하기</Text>
        </View>
      </View>
    );
  }

  // quiz · answer — 지금은 자리만 잡아 둔 문구다.
  return (
    <View style={styles.formBlock}>
      <CardHeading text="퀴즈" />
      <Text style={styles.quizText}>
        {kind === 'quiz' ? '퀴즈 내용이 들어갑니다.' : '해설내용이 들어갑니다.'}
      </Text>
    </View>
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
 * '오늘의 공부 마치기'로 바뀐다. 전환 지점은 ANSWER_INDEX 하나로 정해지므로
 * desc가 몇 장으로 나뉘든 자동으로 맞다.
 */
function Actions({
  bottom,
  flipX,
  finishEnabled,
  onFinish,
}: {
  bottom: number;
  flipX: SharedValue<number>;
  finishEnabled: boolean;
  onFinish: () => void;
}) {
  const roundStyle = useAnimatedStyle(() => {
    const x = flipX.value / PAGE_W;
    return { opacity: interpolate(x, [ANSWER_INDEX - 1, ANSWER_INDEX], [1, 0], Extrapolation.CLAMP) };
  });
  const finishStyle = useAnimatedStyle(() => {
    const x = flipX.value / PAGE_W;
    return {
      opacity: interpolate(x, [ANSWER_INDEX - 1, ANSWER_INDEX], [0, 1], Extrapolation.CLAMP),
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
    // 그림자용 값들 — 쌓임 순서는 경첩이 정한다(layerOf). elevation·shadowOpacity는
    // 넘어가는 동안 걷혔다 드니 여기 두지 않고 cardStyle에서 매긴다.
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
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
  formBlock: {
    alignSelf: 'stretch',
    gap: 16,
  },
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
  noteInput: {
    height: 120,
    borderRadius: 4,
    padding: 12,
    backgroundColor: Colors.beige10,
  },
  notePlaceholder: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  noteSubmit: {
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige50,
  },
  noteSubmitText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  quizText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Colors.brown100,
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
