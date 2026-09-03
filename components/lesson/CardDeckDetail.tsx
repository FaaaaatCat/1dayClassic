import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
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
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
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

import QuizSolver, { quizModalStyles } from '@/components/preview/QuizSolver';
import ScaleButton from '@/components/ScaleButton';
import {
  useCardNarration,
  type NarrationStep,
  type SpokenRange,
} from '@/hooks/useCardNarration';
import BookPurchaseNotice from '@/components/lesson/BookPurchaseNotice';
import MusicPlayer from '@/components/lesson/MusicPlayer';
import LessonCoverImage from '@/components/LessonCoverImage';
import { StatusBarTint } from '@/components/StatusBarTint';
import StudyReport from '@/components/StudyReport';
import { useBookmarks } from '@/context/BookmarkContext';
import { useNotes } from '@/context/NotesContext';
import { useAlarmLockFlow } from '@/modules/alarm-clock';
import {
  buildCardNarration,
  buildCardPages,
  getCardCover,
  getLessonEpigraph,
  BODY_FONT_SIZE,
  BODY_LINE_HEIGHT,
  BODY_PADDING_X,
  BODY_PADDING_Y,
  CARD_H,
  CARD_W,
  PLAYER_BLOCK,
  PLAYER_H,
  type CardCover,
  type CardEpigraph,
  type CardPage,
  type CardPageKind,
} from '@/lib/card-pages';
import { getBookName, type BookLesson } from '@/lib/books';
import { getCoverPlan } from '@/lib/cover';
import { getCatalogBookByBookId, type CatalogBook } from '@/lib/catalog';
import type { BookId, DailyLesson } from '@/types';
import { openBookDetail } from '@/lib/preview-nav';
import { FREE_LESSON_COUNT, getLockedLessonCount, getNextLesson } from '@/lib/progress';
import { Colors, Corner, Fonts, Ink, Spark, Type, TypeScale, tracking } from '@/constants/theme';

/**
 * 오늘의 공부 상세 — 좌우로 넘겨 읽는 카드 형식.
 *
 * 아홉 권 어느 항목이든 받는다. 장 구성(표지·인용·본문·구매 안내)과 낭독 대본은
 * lib/card-pages가 항목 하나에서 뽑아 준다 — 표제와 인용문이 담긴 필드가 책마다 달라
 * 그 갈래를 화면이 아니라 그쪽에서 처리한다.
 *
 * 예전의 한 페이지 형식은 설정의 '원페이지 미리보기'에 그대로 남아 있다.
 *
 * ── 넘김 방식 ─────────────────────────────────────────────────────────────
 * 가로 ScrollView는 눈에 보이지 않고 제스처와 페이지 스냅만 맡는다. 카드는 그 아래
 * 별도 층에 겹쳐 두고 flipX로 직접 변형해 그린다 — 이래야 넘어가는 카드가 제자리에서
 * 젖혀지고 뒤 카드는 따라 흐르지 않고 쌓인 채 기다리는 '책' 느낌이 난다.
 *
 * 본문(desc)도 다른 카드와 똑같은 카드 한 장이다 — 다만 문단이 여러 개라 한 카드에
 * 한 문단씩 담아 여러 장으로 나눈다(lib/card-pages 참고).
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
 * 화면에 처음 들어왔을 때 첫 장 글이 떠오르는 방식 — 들어오자마자 아래에서 살짝
 * 올라오며 켜진다. 넘김과는 무관한, 입장할 때 한 번뿐인 연출이다.
 *
 * 예전에는 0.8초를 비워 뒀다가 켰다. 열자마자 빈 카드를 마주하게 되어 무엇을 기다리는지
 * 알 수 없었고, 그 사이에 손가락이 먼저 움직였다. 이제 기다림 없이 시작하고, 대신
 * 올라오는 몸짓으로 '지금 놓인다'를 말한다.
 */
const ENTER_DURATION = 420;
/** 글이 올라오기 시작하는 높이(dp). 눈에 걸리지 않을 만큼만 든다. */
const ENTER_RISE = 14;
/**
 * 감상 노트 줄 간격(dp). 줄노트 바탕의 줄 간격이자 글자 줄높이다 — 두 값이 여기 하나
 * 에서 나와야 글이 줄 위에 앉는다(NoteBlock 주석 참고).
 */
const NOTE_LINE_H = 26;
/** 토스트가 떠 있는 시간과 뜨고 지는 시간(ms). */
const TOAST_HOLD = 1800;
const TOAST_FADE = 220;

/** 카드 표지의 표식이 놓이는 자리의 높이. 표식이 무엇이든 이 높이는 변하지 않는다. */
const SYMBOL_BOX_H = 100;
/** 재생기가 있는 항목의 표식 자리 — 카드가 짧아 그만큼 덜 쓴다. */
const SYMBOL_BOX_H_SMALL = 72;

/** 하단 동그란 버튼의 지름. 자동으로 읽기는 펼쳐져도 이 높이를 지킨다. */
/** 글이 없는 장(표지·마침)에 주는 시간. */
const PLAIN_MS = 6000;
/** 글 한 자에 주는 시간. 한국어를 눈으로 읽는 속도에 맞춘 값이다. */
const MS_PER_CHAR = 110;
const AUTO_MIN_MS = 6000;
const AUTO_MAX_MS = 30000;

/**
 * 이 장에 줄 시간.
 *
 * 장마다 글 길이가 제각각이라(한 줄짜리 표제부터 200자 남짓 본문까지) 같은 시간을 주면
 * 짧은 장은 지루하고 긴 장은 다 못 읽고 넘어간다. 글자 수로 정하되 위아래를 잘라 둔다.
 */
function durationFor(page: CardPage | undefined, epigraph: CardEpigraph | undefined): number {
  if (!page) return PLAIN_MS;
  const text = page.kind === 'quote' ? (epigraph?.text ?? '') : (page.paragraph ?? '');
  if (!text) return PLAIN_MS;
  return Math.min(AUTO_MAX_MS, Math.max(AUTO_MIN_MS, 1200 + text.length * MS_PER_CHAR));
}

/** 위 진행 바 줄과 아래 버튼 줄의 높이 — 덱은 이 사이에 눕는다. */
const BARS_H = 14;
/** 진행 바 칸 사이 틈과 좌우 여백 — 칸 하나의 폭을 재려면 둘 다 알아야 한다. */
const BAR_GAP = 4;
const BAR_PAD = 12;
/** 한 장에 최소한 이만큼은 머문다 — 시간 계산이 어긋나도 장이 우르르 넘어가지 않게. */
const MIN_REMAINING_MS = 600;
const HEADER_H = 48;
const FOOTER_H = 56;

// ── 화면 구성 ─────────────────────────────────────────────────────────────

/**
 * 무엇을 보여 줄지는 lib/preview-content 한 곳에서 온다 — 인스타 스토리 미리보기와
 * 같은 항목을 쓰기 때문이다. 여기서 정하는 것은 그것을 어떻게 보여 줄지뿐이다.
 */

// 표지는 클래식의 '음악 듣기' 때문에 들어 있다. 그 버튼이 없는 책에서는 카드 안이 전부
// box-none이라 손가락이 그대로 아래 제스처 층으로 내려가고, 탭 넘김은 그대로다.
const INTERACTIVE_KINDS: CardPageKind[] = ['cover', 'outro'];

interface Props {
  bookLesson: BookLesson;
  /** 닫기(X)를 눌렀을 때 갈 곳. */
  onClose: () => void;
}

export default function CardDeckDetail({ bookLesson, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { autoplay } = useLocalSearchParams<{ autoplay?: string }>();

  const bookName = getBookName(bookLesson.book);
  const lesson = bookLesson.lesson;
  const catalogBook = getCatalogBookByBookId(bookLesson.book);

  /** 이 항목이 몇 장인지, 무엇을 읽어 줄지 — 항목이 바뀌면 통째로 다시 만든다. */
  const { pages, cover, epigraph, narrationSteps, quizzes } = useMemo(() => {
    const list = lesson.quizzes ?? (lesson.quiz ? [lesson.quiz] : []);
    const built = buildCardPages(bookLesson, { hasQuiz: list.length > 0 });
    const coverInfo = getCardCover(bookLesson, bookName);
    const epi = getLessonEpigraph(bookLesson);
    return {
      pages: built,
      cover: coverInfo,
      epigraph: epi,
      narrationSteps: buildCardNarration(built, { cover: coverInfo, epigraph: epi }),
      quizzes: list,
    };
  }, [bookLesson, bookName, lesson]);


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
  /** 위 진행 바가 보는 장 — 넘김이 끝나기를 기다리지 않고 시작할 때 바로 바뀐다. */
  const [barPage, setBarPage] = useState(0);
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

  /**
   * 책갈피 — '이 페이지를' 접어 두는 일이라 화면 하나가 아니라 장마다 따로 기억한다.
   *
   * 예전에는 이 화면 안의 useState 하나였고, 그래서 화면을 나가면 사라졌다. 이제
   * BookmarkContext가 들고 앱을 껐다 켜도 남는다 — 마이페이지의 책 정보가 그 수를 센다.
   */
  const { isMarked, toggle: toggleBookmark } = useBookmarks();
  /** 책갈피 토스트 — 켰는지 껐는지에 따라 문구가 다르다(Toast의 at 주석 참고). */
  const [markToast, setMarkToast] = useState({ at: 0, text: '' });

  const toggleMark = (index: number) => {
    const saved = toggleBookmark(lesson.id, index, bookLesson.book);
    setMarkToast({
      at: Date.now(),
      text: saved ? '이 페이지를 북마크에 저장했습니다.' : '북마크를 해지했습니다.',
    });
  };
  /** 감상 노트 팝업이 열려 있는지. */
  const [noteOpen, setNoteOpen] = useState(false);
  const closeNote = () => setNoteOpen(false);
  /** 퀴즈 팝업이 열려 있는지. */
  const [quizOpen, setQuizOpen] = useState(false);
  const closeQuiz = () => setQuizOpen(false);
  /** 오늘의 공부 리포트(퀴즈 엔딩 화면)가 떠 있는지. */
  const [reportOpen, setReportOpen] = useState(false);
  /** 그 위에 얹히는 구매 안내 — 다음 화가 잠겨 있을 때만 뜬다. */
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  /**
   * 해설까지 읽고 마치기 — 바로 상세로 보내지 않고 리포트를 한 장 거친다.
   *
   * 퀴즈 팝업을 먼저 닫는 건 리포트가 그 위에 겹쳐 뜨지 않게 하기 위해서다.
   */
  const finishStudy = () => {
    setQuizOpen(false);
    setReportOpen(true);
  };

  /**
   * 퀴즈 엔딩 화면의 '다음 화 읽기'.
   *
   * 세 갈래다 — 다음 화가 열려 있으면 그리로 가고, 잠겨 있으면 구매 안내를 대신 띄우고,
   * 다음 화 자체가 없으면(이 책의 마지막) 홈으로 돌아간다. 잠긴 화를 열어 주지 않는 것이
   * 이 분기의 요점이다 — 목차의 자물쇠와 같은 선을 여기서도 지킨다.
   *
   * 열린 다음 화로 갈 때 화면을 갈아 끼우지 않고 lessonId만 바꾸는 건, 읽기 흐름이
   * 끊기지 않게 하기 위해서다. 카드 덱이 새 항목으로 다시 서는 일은 today.tsx가 key로
   * 맡는다(그쪽 주석 참고).
   */
  /**
   * 표지 장에 깔 사진이 있는가.
   *
   * 사진이 없는 책(하루 클래식·듣기의 말들)은 예전 그대로 종이색 표지에 검은 글씨다 —
   * 없는 사진 자리에 검은 바탕을 깔면 표식이 두 번 그려지고 글도 읽기 어려워진다.
   * 무엇이 깔릴지는 lib/cover가 정한다(coverImage → 표식 → Unsplash 순).
   */
  const coverPhoto = useMemo(() => {
    const plan = getCoverPlan(lesson, bookLesson.book);
    return plan.kind === 'image' || plan.kind === 'unsplash';
  }, [lesson, bookLesson.book]);

  /** 잠긴 화 수 — 구매 안내가 '아직 잠긴 n편이 남아 있어요'로 말한다. */
  const lockedCount = useMemo(() => getLockedLessonCount(bookLesson.book), [bookLesson.book]);

  /** 이 항목의 다음 화 — 없으면 undefined(이 책의 마지막 화다). */
  const nextLesson = useMemo(
    () => getNextLesson(bookLesson.book, lesson.id),
    [bookLesson.book, lesson.id],
  );

  const openNext = () => {
    const next = nextLesson;
    if (!next) {
      setReportOpen(false);
      router.replace('/');
      return;
    }
    if (next.locked) {
      setPurchaseOpen(true);
      return;
    }
    setReportOpen(false);
    router.replace({
      pathname: '/today',
      params: { bookId: bookLesson.book, lessonId: next.lessonId },
    });
  };

  /** 구매 안내의 값 버튼 — 스택을 거치는 순서는 lib/preview-nav 주석 참고. */
  const goToBookDetail = () => {
    setPurchaseOpen(false);
    setReportOpen(false);
    openBookDetail(router, catalogBook);
  };

  useEffect(() => {
    // 끝에서 느려지며 멎는다 — 올라오다 멈추는 것이 아니라 제자리에 놓이는 느낌이 난다.
    enter.value = withTiming(1, {
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter]);

  /**
   * 알람 알림을 탭해서 들어온 경우(autoplay=타임스탬프) 자동으로 읽기를 시작한다.
   * autoplay 값은 탭마다 새로 생기므로 같은 항목이어도(반복 알람) 매번 다시 걸린다.
   */
  const handledAutoplayRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoplay || handledAutoplayRef.current === autoplay) return;
    handledAutoplayRef.current = autoplay;
    setReaderOpen(true);
    narration.restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  /** 넘김 시작 — flipX를 우리 속도로 최종 위치까지 옮긴다. */
  const startTurn = (next: number) => {
    // 이미 그 자리로 가고 있으면 그대로 둔다 — 다시 걸면 애니메이션이 처음부터 다시
    // 시작돼 넘김이 끊겨 보인다. 탭 넘김이 옮겨 둔 스크롤이 정착하면서 onSettle이
    // 뒤따라 들어오는 경우가 대표적이고, 안드로이드가 정착 이벤트를 두 번 흘리는
    // 경우도 여기서 걸러진다.
    if (gliding.value && next === targetPage.current) return;
    targetPage.current = next;
    // 바는 카드가 도착하기를 기다리지 않는다 — 넘기는 순간 다음 칸이 차기 시작해야
    // 손에 맞는다(page는 넘김이 끝난 뒤에야 바뀐다).
    setBarPage(next);
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
  const goTo = (page: number) => {
    const next = Math.max(0, Math.min(pages.length - 1, page));
    if (next === targetPage.current) return;
    scrollRef.current?.scrollTo({ x: next * PAGE_W, animated: true });
    startTurn(next);
  };

  const goBy = (delta: number) => goTo(targetPage.current + delta);

  /**
   * 자동으로 읽기 — 낭독이 카드를 끌고 간다.
   *
   * goTo를 그대로 넘기는 건 사람이 탭해서 넘길 때와 같은 길로 보내려는 것이다. 넘김
   * 애니메이션도, 정착 처리도 한 군데에만 있어야 어긋나지 않는다.
   */
  /**
   * 잠금 위 알람에서 들어온 경우. 이 화면을 벗어날 길이 없어야 하므로 닫기를 감추고
   * 뒤로가기를 삼킨다 — 예전 LessonDetailShell이 하던 일을 그대로 옮겨 왔다.
   */
  const lockFlow = useAlarmLockFlow();
  useEffect(() => {
    if (!lockFlow) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [lockFlow]);

  /** 헤드폰 버튼이 펼쳐져 조작 아이콘을 드러내고 있는지. */
  const [readerOpen, setReaderOpen] = useState(false);

  /**
   * 유튜브가 딸린 항목인가. 딸렸으면 카드가 재생기 몫만큼 짧아지고, 그 자리에 재생기가
   * 늘 앉아 있다 — 여닫는 버튼은 없다.
   */
  const hasMusic = !!cover.listenId;
  const cardH = hasMusic ? CARD_H - PLAYER_BLOCK : CARD_H;

  const narration = useCardNarration({
    steps: narrationSteps,
    onPage: goTo,
    // 끝까지 다 읽으면 듣기 모드도 함께 접는다. 도중에 멈춘 경우에는 열어 둔다 —
    // 다시 듣거나 이어 갈 사람이 버튼을 다시 찾아 눌러야 하면 번거롭다.
    onFinish: () => setReaderOpen(false),
  });

  /**
   * 다시 열면 언제나 첫 장부터.
   *
   * 이 화면은 Tabs의 형제라 X로 닫아도 사라지지 않는다 — 넘겨 둔 자리와 열어 둔 팝업이
   * 그대로 남아 있어서, 홈에 갔다 돌아오면 읽던 자리가 그대로 펼쳐진다. 하루에 한 쪽을
   * 처음부터 읽는 화면이라 이어 보기가 아니라 다시 펴기가 맞다.
   *
   * 애니메이션 없이 값을 곧장 되돌린다. goTo를 쓰면 되돌아가는 장면이 그대로 보인다.
   */
  // 위 초기화가 낭독을 세우려면 낭독이 필요한데, 그 값은 렌더마다 새로 만들어진다.
  const narrationRef = useRef(narration);
  narrationRef.current = narration;

  useFocusEffect(
    useCallback(() => {
      flipX.value = 0;
      rawX.value = 0;
      gliding.value = false;
      targetPage.current = 0;
      setPage(0);
      setBarPage(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });

      setAutoPaused(false);
      setNoteOpen(false);
      setQuizOpen(false);
      setReaderOpen(false);
      narrationRef.current?.stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );


  /**
   * 시간이 차면 저절로 다음 장으로 — 스토리에서 가져온 것이다. 다만 위 바는 차오르지
   * 않는다. 이 화면의 바는 몇 장째인지만 말하는 물건이라 시간을 그리지 않는다.
   */
  const [autoPaused, setAutoPaused] = useState(false);
  const last = barPage === pages.length - 1;
  /**
   * 시간이 흐르지 않는 자리들.
   * - 자동으로 읽기를 켜 둔 동안: 낭독이 장을 끌고 간다. 둘이 함께 넘기면 읽던
   *   자리를 낭독이 도로 끌어온다.
   * - 가운데를 탭해 세워 둔 뒤: 오래 보고 싶은 장이라는 뜻이다.
   * - 팝업(퀴즈·노트·리포트) 위: 뒤에서 장이 넘어가면 닫았을 때 딴 장이 나온다.
   */
  const autoStopped =
    autoPaused || readerOpen || noteOpen || quizOpen || reportOpen;

  return (
    <View style={styles.screen}>
      {/* 어두운 화면이라 상태바도 검게, 시계는 희게. */}
      <StatusBarTint />

      {/* 위 진행 바 — 몇 장 중 몇 번째인지만 말한다. 시간이 차는 게 아니다.
          세이프에어리어를 스크린의 padding으로 주지 않는 건, 절대 배치된 덱·아래 줄이
          그 padding을 타지 않아서다(그러면 아래 줄이 내비게이션 바에 깔린다). */}
      <View style={{ height: insets.top }} />
      <PageBars
        page={barPage}
        total={pages.length}
        duration={durationFor(pages[barPage], epigraph)}
        stopped={autoStopped}
        onDone={() => goBy(1)}
      />

      {/* 계정 줄 — 표지·책 이름·날짜, 그리고 닫기.
          잠금 위 알람에서는 닫기를 그리지 않는다 — 유일한 출구를 막아야 한다. */}
      <View style={styles.header}>
        {catalogBook ? (
          <Image
            source={{ uri: catalogBook.coverImage }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.avatar} />
        )}
        <Text style={styles.account}>{bookName}</Text>
        {lesson.date ? <Text style={styles.when}>{lesson.date}</Text> : null}
        <View style={styles.headerSpacer} />
        {!lockFlow && (
          <ScaleButton accessibilityLabel="닫기" style={styles.headerClose} onPress={onClose}>
            <Ionicons name="close" color={Colors.white} size={24} />
          </ScaleButton>
        )}
      </View>

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
        {pages.map((_, index) => (
          <View key={index} style={styles.gesturePage}>
            <Pressable
              accessibilityLabel="이전 장"
              style={styles.tapZone}
              onPress={() => goBy(-1)}
            />
            {/* 가운데는 장을 넘기지 않는다 — 대신 저절로 넘어가는 시간을 세운다. */}
            <Pressable
              accessibilityLabel={autoPaused ? '자동 넘김 다시 시작' : '자동 넘김 멈추기'}
              style={styles.tapZone}
              onPress={() => setAutoPaused((v) => !v)}
            />
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
      <View
        style={[styles.deck, { top: insets.top, bottom: insets.bottom }]}
        pointerEvents="box-none">
        <LeftEdge flipX={flipX} cardH={cardH} />
        {pages.map((p, index) => (
          <DeckCard
            key={index}
            index={index}
            kind={p.kind}
            paragraph={p.paragraph}
            flipX={flipX}
            enter={enter}
            cardH={cardH}
            total={pages.length}
            interactive={INTERACTIVE_KINDS.includes(p.kind) && page === index}
            spoken={narration.spoken?.page === index ? narration.spoken : null}
            cover={cover}
            epigraph={epigraph}
            catalogBook={catalogBook}
            onOpenQuiz={() => setQuizOpen(true)}
            onNext={openNext}
            isLastLesson={!nextLesson}
            lesson={lesson}
            bookId={bookLesson.book}
            coverPhoto={coverPhoto}
            hasMusic={hasMusic}
          />
        ))}
        <FoldShade cardH={cardH} />

        {/* 붙박이 재생기 — 카드가 내준 자리에 앉는다. 카드 '안'이 아니라 덱 위에 있어야
            장을 넘겨도 언마운트되지 않는다(그러면 음악이 끊긴다).
            낭독을 켜면 세운다 — 배경음악과 목소리 위에 유튜브까지 얹히면 아무것도
            들리지 않는다. */}
        {cover.listenId ? (
          <View style={styles.musicSlot}>
            <MusicPlayer videoId={cover.listenId} paused={readerOpen} />
          </View>
        ) : null}
        {/* 책갈피는 카드 '안'이 아니라 덱 위에 얹는다. 카드 안에 넣으면 그 장이 손가락을
            받게 되어 본문의 탭 넘김이 막힌다. 덱의 마지막 자식이자 zIndex가 가장 높아
            카드 위에 그려진다 — 다른 크롬(닫기·점·하단 버튼)은 죄다 카드 바깥이라
            이 층 다툼이 없었지만, 이것은 카드 사각형 안에 앉는 첫 버튼이다. */}
        <DescBookmark
          hasMusic={hasMusic}
          active={pages[page]?.kind === 'desc'}
          saved={isMarked(lesson.id, page)}
          onToggle={() => toggleMark(page)}
        />
      </View>

      {/* 아래 줄 — 몇 장째인지와 버튼 둘. 책갈피는 여기가 아니라 카드 오른쪽 아래에 있다. */}
      <View style={[styles.footer, { bottom: insets.bottom + 8 }]}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerHint}>{`${barPage + 1} / ${pages.length}`}</Text>
          {/* 가운데를 탭해 세워 둔 상태 — 왜 안 넘어가는지 보이게 표시한다. */}
          {autoPaused && !last ? <Ionicons name="pause" color={Colors.brown50} size={13} /> : null}
        </View>
        <View style={styles.footerIcons}>
          {readerOpen ? (
            <>
              <ScaleButton
                accessibilityLabel={narration.playing ? '읽기 멈추기' : '읽기 재생'}
                style={styles.footerHit}
                onPress={narration.toggle}>
                <Ionicons
                  name={narration.playing ? 'pause' : 'play'}
                  color={Colors.white}
                  size={24}
                />
              </ScaleButton>
              <ScaleButton
                accessibilityLabel="처음부터 다시 듣기"
                style={styles.footerHit}
                onPress={narration.restart}>
                <Ionicons name="refresh" color={Colors.white} size={24} />
              </ScaleButton>
              <ScaleButton
                accessibilityLabel="자동으로 읽기 닫기"
                style={styles.footerHit}
                onPress={() => {
                  setReaderOpen(false);
                  narration.stop();
                }}>
                <Ionicons name="close" color={Colors.white} size={24} />
              </ScaleButton>
            </>
          ) : (
            <ScaleButton
              accessibilityLabel="자동으로 읽기"
              style={styles.footerHit}
              onPress={() => {
                setReaderOpen(true);
                narration.restart();
              }}>
              <Ionicons name="headset" color={Colors.white} size={24} />
            </ScaleButton>
          )}
          <ScaleButton
            accessibilityLabel="감상 노트"
            style={styles.footerHit}
            onPress={() => setNoteOpen(true)}>
            <Ionicons name="create" color={Colors.white} size={24} />
          </ScaleButton>
        </View>
      </View>

      {/* 책갈피 토스트 — 하단 줄 위에 뜬다. 감상 노트의 것은 모달 안에 따로 있다. */}
      <Toast bottom={insets.bottom + 8 + FOOTER_H + 12} at={markToast.at} text={markToast.text} />

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
            <NoteBlock lessonId={lesson.id} onSaved={showToast} />
          </View>
          {/* 기록하기/수정하기 버튼 바로 위 — 버튼을 가리지 않게 그 높이만큼 띄운다. */}
          <Toast
            bottom={insets.bottom + 24 + 44 + 12}
            at={toastAt}
            text="감상노트에 저장되었습니다."
          />
        </KeyboardAvoidingView>
      </Modal>

      {/**
        * 퀴즈 — 구매 안내 장의 버튼으로 전체 화면에 뜬다. 감상 노트 팝업과 같은 틀이다.
        *
        * 닫기 버튼을 여기서 띄우지 않고 QuizSolver에 맡기는 건 제목과 한 줄에 세우기
        * 위해서다. 노트 팝업의 CloseButton은 절대 위치라 옆에 무엇을 나란히 둘 수 없다.
        */}
      <Modal visible={quizOpen} animationType="fade" onRequestClose={closeQuiz}>
        <View
          style={[
            quizModalStyles.screen,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}>
          <QuizSolver
            quizzes={quizzes}
            target={{ lessonId: lesson.id, bookId: bookLesson.book }}
            onClose={closeQuiz}
            onFinish={finishStudy}
          />
        </View>
      </Modal>

      {/*
        구매 안내가 리포트 없이 뜨는 경우 — 맺음 장의 '다음 화 읽기'로 들어왔을 때다.
        리포트가 떠 있을 때는 그 Modal 안에 얹는다(아래) — 네이티브 Modal은 무엇 위에나
        떠서, 여기 그린 층은 리포트에 가려 보이지 않기 때문이다. 그래서 자리만 둘이고
        그리는 것은 하나다.
      */}
      {purchaseOpen && !reportOpen && (
        <BookPurchaseNotice
          book={catalogBook}
          freeCount={FREE_LESSON_COUNT}
          lockedCount={lockedCount}
          onBuy={goToBookDetail}
          onClose={() => setPurchaseOpen(false)}
        />
      )}

      {/**
        * 오늘의 공부 리포트 — 마치기를 누르면 뜨는 검은 화면.
        *
        * 아래 버튼은 '다음 화 읽기'다(openNext). 다음 화가 잠겨 있으면 그 위에 구매
        * 안내가 한 겹 얹힌다 — 이 화면이 이미 Modal 안이라 Modal을 또 쓰지 않는다.
        * 뒤로가기(onRequestClose)는 일부러 비워 두지 않았다 — 물러나면 읽던 자리로 돌아간다.
        */}
      {/* statusBarTranslucent — 이것이 없으면 상태바 자리에 앱의 밝은 바탕이 남아
          검은 화면 위쪽에 띠로 보인다. 안쪽 여백은 insets.top으로 이미 잡아 뒀다. */}
      <Modal
        visible={reportOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // 구매 안내가 떠 있으면 그것부터 닫는다 — 뒤로가기가 두 겹을 한 번에 걷지 않게.
          if (purchaseOpen) {
            setPurchaseOpen(false);
            return;
          }
          setReportOpen(false);
        }}>
        <StudyReport
          date={lesson.date ?? todayLabel()}
          bookTitle={bookName}
          onNext={openNext}
        />
        {purchaseOpen && (
          <BookPurchaseNotice
            book={catalogBook}
            freeCount={FREE_LESSON_COUNT}
            lockedCount={lockedCount}
            onBuy={goToBookDetail}
            onClose={() => setPurchaseOpen(false)}
          />
        )}
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
function FoldShade({ cardH }: { cardH: number }) {
  return (
    <View style={[styles.foldShade, { height: cardH }]} pointerEvents="none">
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
function LeftEdge({ flipX, cardH }: { flipX: SharedValue<number>; cardH: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      flipX.value / PAGE_W,
      [LEFT_EDGE_IN_FROM, LEFT_EDGE_IN_TO],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Animated.View
      style={[styles.hinge, styles.leftEdgeHinge, { height: cardH }, style]}
      pointerEvents="none">
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
  cardH,
  total,
  interactive,
  spoken,
  cover,
  epigraph,
  catalogBook,
  onOpenQuiz,
  onNext,
  isLastLesson,
  lesson,
  bookId,
  coverPhoto,
  hasMusic,
}: {
  index: number;
  kind: CardPageKind;
  paragraph?: string;
  /** 이 항목의 장 수 — 쌓임 순서를 인덱스 역순으로 박아 두는 데 쓴다. */
  total: number;
  cover: CardCover;
  epigraph?: CardEpigraph;
  catalogBook?: CatalogBook;
  flipX: SharedValue<number>;
  /** 입장할 때 한 번 도는 값 — 첫 장 본문이 떠오르는 연출에만 쓴다. */
  enter: SharedValue<number>;
  /** 이 항목의 카드 높이 — 유튜브가 딸렸으면 재생기 몫만큼 짧다. */
  cardH: number;
  /** 이 장이 지금 손가락을 받을 수 있는가(구매 버튼 같은 것). */
  interactive: boolean;
  /** 낭독이 지금 이 장에서 읽고 있는 글자 범위. 다른 장이면 null이다. */
  spoken: SpokenRange | null;
  onOpenQuiz: () => void;
  onNext: () => void;
  isLastLesson: boolean;
  /** 표지 장 배경으로 깔 사진을 고르는 데 쓴다. */
  lesson: DailyLesson;
  bookId: BookId;
  /** 표지 장에 사진이 깔리는가 — 깔리면 그 위 글자가 흰색이 된다. */
  coverPhoto: boolean;
  /** 유튜브가 딸린 항목인가 — 표지의 표식 크기가 달라진다. */
  hasMusic: boolean;
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
   * 장에만 걸리고, 한 번 1이 되면 그 뒤로는 이 식에 영향을 주지 않는다 — 다른 장은
   * entering이 늘 1이라 올라오는 몸짓도 걸리지 않는다.
   */
  const bodyStyle = useAnimatedStyle(() => {
    const p = index - flipX.value / PAGE_W;
    const shown = interpolate(p, [CONTENT_IN_TO, CONTENT_IN_FROM], [1, 0], Extrapolation.CLAMP);
    const entering = index === 0 ? enter.value : 1;
    return {
      opacity: shown * entering,
      transform: [{ translateY: (1 - entering) * ENTER_RISE }],
    };
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
      style={[styles.hinge, { height: cardH, zIndex: total - index }, hingeStyle]}
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
          style={[styles.cardFace, frontStyle]}
          pointerEvents="box-none">
          {/* 표지 장의 배경 사진 — 카드가 overflow를 감추므로 모서리에 맞춰 잘린다.
              그 위에 검정 30%를 깔아 흰 글자가 설 자리를 만든다. */}
          {kind === 'cover' && coverPhoto ? (
            <>
              <LessonCoverImage
                lesson={lesson}
                bookId={bookId}
                style={StyleSheet.absoluteFill}
                creditPlacement="bottomLeft"
              />
              <View style={styles.coverScrim} pointerEvents="none" />
            </>
          ) : null}
          <Animated.View style={[styles.cardBody, bodyStyle]} pointerEvents="box-none">
            <CardContent
              kind={kind}
              paragraph={paragraph}
              spoken={spoken}
              cover={cover}
              epigraph={epigraph}
              catalogBook={catalogBook}
              onOpenQuiz={onOpenQuiz}
              onNext={onNext}
              isLastLesson={isLastLesson}
              onPhoto={coverPhoto}
              hasMusic={hasMusic}
            />
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

/**
 * 낭독이 읽고 있는 자리에 밑칠을 하는 글.
 *
 * 밀리·리디처럼 지금 소리 나는 단어를 따라간다. 자리는 TTS가 단어를 시작할 때마다
 * 알려 주는 값이다(안드로이드 onRangeStart / iOS willSpeakRangeOfSpeechString).
 *
 * 세 조각으로 나눠 가운데만 다른 스타일을 주는 건, 리액트 네이티브에서 글의 일부만
 * 칠하는 방법이 중첩 Text뿐이기 때문이다. 줄바꿈과 자간은 바깥 Text의 것을 그대로
 * 물려받으므로 글이 밀리지 않는다.
 */
function SpokenText({
  text,
  style,
  spoken,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  spoken: SpokenRange | null;
}) {
  // 범위가 글 밖으로 나가면(문장 자리 계산이 어긋나면) 그냥 평범한 글로 둔다.
  if (!spoken || spoken.start >= text.length || spoken.end <= spoken.start) {
    return <Text style={style}>{text}</Text>;
  }
  const end = Math.min(spoken.end, text.length);

  return (
    <Text style={style}>
      {text.slice(0, spoken.start)}
      <Text style={styles.spokenWord}>{text.slice(spoken.start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}

/**
 * 표식을 어떤 글꼴로 그릴지 가른다.
 *
 * 듣기의 말들의 ') ) )'처럼 로마자 범위 안에 있는 표식은 본문 서체(DM Serif Display)로
 * 그린다. 클래식의 높은음자리표(𝄞, U+1D11E)처럼 그 밖의 글자는 그 서체에 자모가 없어
 * 두부(□)로 나오므로, 글꼴을 지정하지 않고 기기 기본 글꼴이 대신 그리게 둔다.
 */
/** 표식이 그림 주소인지. 아니면 글자로 본다. */
function isSymbolImage(symbol: string): boolean {
  return symbol.startsWith('http://') || symbol.startsWith('https://');
}

function isAsciiSymbol(symbol: string): boolean {
  for (const ch of symbol) {
    if (ch.codePointAt(0)! > 0x7f) return false;
  }
  return true;
}

function CardContent({
  kind,
  paragraph,
  spoken,
  cover,
  epigraph,
  catalogBook,
  onOpenQuiz,
  onNext,
  isLastLesson,
  onPhoto,
  hasMusic,
}: {
  kind: CardPageKind;
  paragraph?: string;
  /** 낭독이 지금 읽고 있는 글자 범위. 이 카드가 아니면 null이다. */
  spoken: SpokenRange | null;
  cover: CardCover;
  epigraph?: CardEpigraph;
  catalogBook?: CatalogBook;
  /** 맺음 장의 '퀴즈 풀기' — 퀴즈를 전체 화면으로 연다. */
  onOpenQuiz: () => void;
  /** 맺음 장의 '다음 화 읽기' — 다음 화가 잠겼으면 부르는 쪽이 구매 안내를 띄운다. */
  onNext: () => void;
  /** 이 항목이 그 책의 마지막 화인가 — 맺음 장의 버튼 문구가 갈린다. */
  isLastLesson: boolean;
  /** 표지 장에 사진이 깔렸는가 — 그러면 그 위 글자를 흰색으로 바꾼다. */
  onPhoto: boolean;
  /** 유튜브가 딸린 항목인가 — 카드가 짧아 표식을 작게 앉힌다. */
  hasMusic: boolean;
}) {
  if (kind === 'cover') {
    return (
      <View style={styles.coverBlock} pointerEvents="box-none">
        <View style={styles.coverMain} pointerEvents="none">
          {/* 책의 표식 — 없는 책은 이 자리가 빈다(lib/bookstore의 symbol).
              유튜브가 딸린 항목은 카드가 짧아 표식도 작게 앉힌다. */}
          {cover.symbol ? (
            <View style={[styles.coverSymbolBox, hasMusic && styles.coverSymbolBoxSmall]}>
              {isSymbolImage(cover.symbol) ? (
                <Image
                  source={{ uri: cover.symbol }}
                  style={[styles.coverSymbolImage, onPhoto && styles.coverSymbolImageOnPhoto]}
                  // 책마다 그림 크기가 달라도 잘리지 않고 상자 안에 들어오게 한다.
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Text
                  style={[
                    isAsciiSymbol(cover.symbol) ? styles.coverSymbol : styles.coverGlyph,
                    onPhoto && styles.coverTextOnPhoto,
                  ]}>
                  {cover.symbol}
                </Text>
              )}
            </View>
          ) : null}
          <View style={[styles.labelChip, onPhoto && styles.labelChipOnPhoto]}>
            <Text style={[styles.labelText, onPhoto && styles.coverTextOnPhoto]}>
              {cover.bookName}
            </Text>
          </View>
          {/* 표제는 책마다 뽑는 곳이 달라 getLessonHeading이 정해 준다 — 곡명·한자·라틴어
              원문이 모두 여기로 들어온다(lib/card-pages). */}
          <Text style={[styles.title, onPhoto && styles.coverTextOnPhoto]}>{cover.title}</Text>
          {cover.subtitle ? (
            <Text style={[styles.coverSubtitle, onPhoto && styles.coverTextOnPhoto]}>
              {cover.subtitle}
            </Text>
          ) : null}
        </View>

      </View>
    );
  }

  if (kind === 'quote') {
    return (
      <View style={styles.quoteBlock}>
        <SpokenText text={epigraph?.text ?? ''} style={styles.quoteText} spoken={spoken} />
        {epigraph?.by ? <Text style={styles.quoteSource}>{epigraph.by}</Text> : null}
      </View>
    );
  }

  if (kind === 'desc') {
    return (
      <View style={styles.descBlock}>
        <SpokenText text={paragraph ?? ''} style={styles.descText} spoken={spoken} />
      </View>
    );
  }

  if (kind === 'outro') {
    return <OutroBlock onOpenQuiz={onOpenQuiz} onNext={onNext} isLastLesson={isLastLesson} />;
  }

  return null;
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
 * 맺음 장 — 본문이 끝나고 오늘의 공부를 맺는 자리.
 *
 * 오늘의 공부를 맺는 흐름(퀴즈 → 마치기 → 리포트)이 전부 이 버튼에서 시작한다. 조건에
 * 따라 이 장이 사라지면 흐름이 통째로 끊기므로, 퀴즈가 있는 한 늘 놓인다.
 */
function OutroBlock({
  onOpenQuiz,
  onNext,
  isLastLesson,
}: {
  onOpenQuiz: () => void;
  onNext: () => void;
  isLastLesson: boolean;
}) {
  return (
    <View style={styles.buyBlock} pointerEvents="box-none">
      {/* 눌러야 할 것은 아래 버튼뿐이다. 나머지는 터치를 흘려보내야 카드 위를 탭했을 때
          그대로 페이지가 넘어간다 — 안 그러면 여기서 걸려 아무 일도 일어나지 않는다. */}
      <Text style={styles.buyLead} pointerEvents="none">
        {'오늘의 이야기는 여기까지입니다.\n읽은 것을 퀴즈로 확인해 보세요.'}
      </Text>

      <View style={styles.outroButtons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="퀴즈 풀기"
          style={styles.outroQuizButton}
          onPress={onOpenQuiz}>
          <Text style={styles.outroQuizText}>퀴즈 풀기</Text>
        </Pressable>

        {/* 마지막 화에는 갈 다음이 없다 — 주황으로 이어 가라고 하는 대신 끝났다고 말한다. */}
        {isLastLesson ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="마지막 페이지입니다. 홈으로 가기"
            style={styles.outroEndButton}
            onPress={onNext}>
            <Text style={styles.outroEndText}>마지막 페이지입니다</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 화 읽기"
            style={styles.outroNextButton}
            onPress={onNext}>
            <Text style={styles.outroNextText}>다음 화 읽기</Text>
            <Ionicons name="chevron-forward" color={Ink.onDark} size={16} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** 노트 제목 줄 — 연필과 글자를 한 줄에. */
function CardHeading({ text }: { text: string }) {
  return (
    <View style={styles.cardHeading}>
      <Ionicons name="pencil" color={Colors.brown100} size={14} />
      <Text style={styles.cardHeadingText}>{text}</Text>
    </View>
  );
}

function NoteBlock({ lessonId, onSaved }: { lessonId: string; onSaved: () => void }) {
  const { notesOf, addNote } = useNotes();
  // 이 항목에 남긴 가장 최근 기록. 있으면 입력칸 대신 그것을 보여 준다.
  const latest = notesOf(lessonId)[0];
  const [draft, setDraft] = useState('');
  /** 기록을 보고 있다가 '수정하기'를 누르면 다시 입력칸으로 돌아온다. */
  const [editing, setEditing] = useState(false);
  const saved = editing ? undefined : latest;

  const submit = () => {
    if (saved) {
      setEditing(true);
      return;
    }
    const text = draft.trim();
    if (!text) return; // 빈 노트는 기록하지 않는다
    addNote(lessonId, text);
    setDraft('');
    setEditing(false);
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
 * 화면 아래 토스트 — 감상 노트를 기록했을 때, 책갈피를 켜고 껐을 때 잠깐 떴다 사라진다.
 *
 * at은 '띄운 시각'이다. 같은 버튼을 연달아 눌러도 값이 매번 달라져 그때마다 다시
 * 뜬다(불리언이면 true→true라 리액트가 갱신을 건너뛴다). 0은 아직 한 번도 안 띄운
 * 상태라 입장하자마자 뜨는 일이 없다.
 */
function Toast({ bottom, at, text }: { bottom: number; at: number; text: string }) {
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
      <Text style={styles.toastText}>{text}</Text>
    </Animated.View>
  );
}


// ── 버튼 · 인디케이터 ──────────────────────────────────────────────────────

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
        <Ionicons
          name="close"
          color={Colors.brown50}
          size={24}
        />
      </ScaleButton>
    </View>
  );
}

/**
 * 본문 장의 책갈피 — 카드 오른쪽 아래에 얹는 작은 버튼.
 *
 * 카드 안이 아니라 카드 위 층에 둔다. 본문은 탭으로 넘기는 장이라, 카드가 손가락을
 * 받기 시작하면 넘김이 막힌다. 닫기·점·하단 버튼과 같은 층에 두면 이 다툼이 없다.
 *
 * 나타나고 사라지는 연출은 없다. 넘김마다 흐려졌다 배어 나오게 했더니 본문에서 본문으로
 * 이어 넘길 때 깜빡이는 것처럼 보였다 — 종이를 따라 돌지도 않는 것이 종이 속도에 맞춰
 * 명멸하니 어느 쪽에 속한 물건인지 흐려진 탓이다. 본문 장에 있는 동안에는 붙박이로
 * 서 있고, 본문을 벗어나면 그 자리에서 빠진다.
 */
function DescBookmark({
  active,
  saved,
  hasMusic,
  onToggle,
}: {
  active: boolean;
  saved: boolean;
  /** 카드가 재생기에 내준 자리 — 책갈피도 카드 아랫변을 따라 함께 올라온다. */
  hasMusic: boolean;
  onToggle: () => void;
}) {
  if (!active) return null;

  return (
    <View style={[styles.descBookmark, hasMusic && styles.descBookmarkWithMusic]}>
      <ScaleButton
        accessibilityLabel={saved ? '북마크 해지' : '북마크'}
        style={styles.descBookmarkHit}
        onPress={onToggle}>
        {/* 꽂아 둔 장은 속을 채운 책갈피로 바꾼다 — Ionicons는 채움과 테두리가 짝이다. */}
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          color={saved ? Colors.red100 : Colors.brown50}
          size={18}
        />
      </ScaleButton>
    </View>
  );
}

/**
 * 위 진행 바 — 지나온 칸은 채워 두고, 지금 칸만 시간에 맞춰 차오른다. 다 차면 onDone으로
 * 다음 장을 부른다. 마지막 칸도 똑같이 차오른다 — 도착하자마자 채워 버리면 직전 칸과 함께
 * 두 칸이 한꺼번에 하얘져 두 장을 건너뛴 것처럼 보인다. 다 차도 갈 곳이 없으니 그대로 멈춘다. 즉, 저절로 넘어가는 시간을 세는 것이 이 바다(따로 도는 타이머가
 * 없어야 화면과 시간이 어긋나지 않는다).
 *
 * 차오르는 폭은 퍼센트가 아니라 픽셀로 준다 — 칸이 flex로 나뉘어 있어 폭을 미리 알 수
 * 없으므로 onLayout으로 한 번 재 둔다.
 *
 * onDone을 ref에 담는 건, 매 렌더 새로 만들어진 함수가 의존성으로 들어오면 타이머가
 * 계속 다시 걸려 영영 차지 않기 때문이다.
 */
function PageBars({
  page,
  total,
  duration,
  stopped,
  onDone,
}: {
  page: number;
  total: number;
  duration: number;
  /** 시간이 흐르지 않는다(듣는 중·손으로 세워 둠·팝업 위). 차오르던 자리에 세운다. */
  stopped: boolean;
  /** 다 차면 부른다. 마지막 장에서는 갈 곳이 없어 아무 일도 일어나지 않는다. */
  onDone: () => void;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  /** 지금 시간이 걸려 있는 장. 장이 바뀐 것과 세웠다 푼 것을 가른다. */
  const timedPage = useRef(-1);
  /** 이 장에서 이미 흘러간 시간(ms). 세웠다 풀면 여기서 이어 간다. */
  const elapsed = useRef(0);

  useEffect(() => {
    // 장이 바뀌었으면 처음부터.
    if (timedPage.current !== page) {
      timedPage.current = page;
      elapsed.current = 0;
    }
    cancelAnimation(progress);

    // 차오른 만큼에서 다시 시작한다 — 세웠다 풀면 그 자리에서 이어 가고, 새 장이면 0이다.
    const done = Math.min(elapsed.current / duration, 1);
    progress.value = done;
    // 세워 둔 동안에는 그 자리에 그대로. 채워 버리면 풀기도 전에 다 본 것처럼 보이고,
    // 0으로 되돌리면 세울 때마다 처음부터 다시 봐야 한다.
    if (stopped) return;

    // 남은 시간은 흘러간 시간을 빼서 자바스크립트 쪽에서 센다. 차오르는 값에서 되읽지
    // 않는 건, 그 값을 마지막에 쓴 것이 UI 스레드(애니메이션)라 여기서 읽으면 방금 쓴
    // 0이 아니라 직전 장에서 다 찬 1이 돌아올 수 있어서다 — 그러면 남은 시간이 0이
    // 되어 다음 장이 곧바로, 그 다음 장도 곧바로 넘어간다(장이 우르르 넘어가던 원인).
    const remaining = Math.max(duration - elapsed.current, MIN_REMAINING_MS);
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    const startedAt = Date.now();
    const timer = setTimeout(() => onDoneRef.current(), remaining);
    return () => {
      clearTimeout(timer);
      elapsed.current += Date.now() - startedAt;
    };
  }, [page, duration, stopped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * barWidth }));

  return (
    <View
      style={styles.bars}
      pointerEvents="none"
      onLayout={(event) => {
        const inner = event.nativeEvent.layout.width - BAR_PAD * 2;
        setBarWidth((inner - BAR_GAP * (total - 1)) / total);
      }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.bar}>
          {i < page ? <View style={styles.barFilled} /> : null}
          {i === page ? <Animated.View style={[styles.barFilled, fillStyle]} /> : null}
        </View>
      ))}
    </View>
  );
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

  // 닫기 버튼
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
    // 높이를 박지 않고 경첩의 아랫변에 맞춘다 — 음악 재생기가 열리면 경첩이 짧아지고
    // 카드도 따라 짧아진다.
    bottom: 0,
    width: CARD_W,
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
    paddingHorizontal: BODY_PADDING_X,
    paddingVertical: BODY_PADDING_Y,
  },
  /** 표지 장 전체 — 가운데 묶음이 남는 높이를 갖고, 버튼은 맨 아래에 선다. */
  coverBlock: {
    flex: 1,
    alignSelf: 'stretch',
  },
  coverMain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  /** 표지의 '음악 듣기' — 가로를 글자에 맞춰 가운데 세운다. */
  coverListenButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  /**
   * 표식이 놓이는 자리 — 높이를 100으로 못박는다.
   *
   * 책마다 표식의 크기가 달라도 표제와 칩이 늘 같은 자리에 오게 하려는 것이다. 그림은
   * contain으로 이 안에 맞춰 들어오고(잘리지 않는다), 글자는 가운데 선다.
   */
  coverSymbolBox: {
    alignSelf: 'stretch',
    height: SYMBOL_BOX_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 재생기가 있는 항목의 표식 — 카드가 짧아진 만큼 자리를 덜 쓴다. */
  coverSymbolBoxSmall: {
    height: SYMBOL_BOX_H_SMALL,
  },
  /**
   * 그림 표식 — 검게 그려진 그림을 표식 색(brown50)으로 물들인다.
   *
   * 리액트 네이티브에는 CSS filter가 없다. tintColor가 그 자리를 대신해서, 불투명한 자리를
   * 통째로 이 색으로 칠하고 투명도는 그대로 둔다 — 한 가지 색으로 그린 표식에 딱 맞는다.
   * 여러 색으로 그린 표식이 들어오면 그때 책마다 물들일지 말지를 고르게 하면 된다.
   */
  coverSymbolImage: {
    width: '100%',
    height: '100%',
    tintColor: Colors.brown50,
  },
  /** 로마자 범위 안의 표식(') ) )') — 본문 서체 그대로. */
  coverSymbol: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 44,
    letterSpacing: 6,
    color: Colors.brown50,
  },
  /**
   * 서체에 없는 글자(음악 기호 등) — 기기 기본 글꼴이 그린다.
   *
   * 높은음자리표는 글자 하나가 위아래로 아주 길어서 두 번 잘렸다. 원인이 둘이라 둘 다 푼다.
   *
   * 하나, 안드로이드는 글자를 Text 뷰의 테두리에서 자르는데 한 줄짜리 뷰의 높이는 줄높이가
   * 정한다. 그래서 줄높이를 글자 크기의 세 배로 크게 열어 둔다 — 어떤 글꼴이 와도 먹이
   * 그 안에 들어온다. 뷰가 표식 자리(100)보다 커지지만 자리 높이는 고정이라 아래 칩을
   * 밀지 않고, 눈에 보이는 먹은 가운데에 그대로 앉는다.
   *
   * 둘, 먹의 실제 높이가 글자 크기의 두 배에 이른다(60으로 줄여도 100을 넘었다). 그래서
   * 50까지 내린다 — 두 배로 잡아도 100 안에 들어온다.
   *
   * 크게 그리는 것보다 온전히 그리는 것이 먼저다. 온전히 나온 뒤에 키우면 된다.
   */
  coverGlyph: {
    fontSize: 50,
    lineHeight: 150,
    textAlignVertical: 'center',
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
    fontSize: 13,
    letterSpacing: tracking(13),
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
    fontSize: 24,
    lineHeight: 34,
    letterSpacing: tracking(24),
    textAlign: "center",
    color: Colors.brown100,
  },
  /**
   * 표지 사진 위에 까는 어둠 — 30%.
   *
   * 사진이 밝든 어둡든 흰 글자가 읽혀야 하는데, 사진 자체를 어둡게 만들 수는 없다.
   */
  coverScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  /**
   * 사진 위의 글자 — 순백이다.
   *
   * 이 시스템은 보통 순백을 쓰지 않지만(따뜻한 흰색 eggshell을 쓴다), 사진 위에서는
   * 무엇이 깔릴지 알 수 없어 가장 밝은 흰색이라야 어느 사진에서도 읽힌다.
   */
  coverTextOnPhoto: {
    color: Colors.white,
  },
  coverSymbolImageOnPhoto: {
    tintColor: Colors.white,
  },
  /** 사진 위의 책 이름 칩 — 베이지 바탕 대신 흰빛을 옅게 깐다. */
  labelChipOnPhoto: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  /** 표제 아래 한 줄 — 작곡가·훈음·뜻처럼 책마다 다른 것이 들어온다. */
  coverSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    textAlign: "center",
    color: Colors.brown50,
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
    fontSize: 17,
    lineHeight: 30,
    letterSpacing: tracking(17),
    color: Colors.brown100,
  },
  quoteSource: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 15,
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
    fontSize: 15,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  /** 맺음 장의 버튼 둘 — 퀴즈로 가는 길과 다음 화로 가는 길이 나란히 선다. */
  outroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  /** 퀴즈 풀기 — 마이페이지의 '틀린 문제 보러가기'와 같은 얼굴이다. */
  outroQuizButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Corner.small,
    borderWidth: 1,
    borderColor: Ink.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outroQuizText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  /** 다음 화 읽기 — 이 장에서 이어 갈 일이라 포인트 컬러가 여기 붙는다. */
  outroNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Corner.small,
    backgroundColor: Spark.ember,
  },
  outroNextText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
  },
  /** 마지막 화 — 이어 갈 곳이 없으니 주황이 아니라 검정이다. 눌리면 홈으로 간다. */
  outroEndButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Corner.small,
    backgroundColor: Ink.primary,
  },
  outroEndText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
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
  quizItemNo: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  /** 제목과 닫기 버튼이 나란히 서는 줄 — 높이는 닫기 버튼에 맞춘다. */
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 41,
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
  /** 구매 안내 장의 두 번째 버튼 — 가격 버튼 아래에 같은 폭으로 선다. */
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
  /** 보기를 고르기 전의 '다음' — 눌리지 않는다는 게 색으로 보여야 한다. */
  quizNextOff: {
    backgroundColor: Colors.brown10,
  },
  quizNextOffText: {
    color: Colors.brown50,
  },

  // 본문 카드 — 문단 하나를 카드 한 장에 꽉 채운다(다른 카드처럼 alignSelf: stretch).
  descBlock: {
    alignSelf: 'stretch',
  },
  /**
   * 본문 장 오른쪽 아래의 작은 책갈피 — 카드 안이 아니라 위에 얹는다.
   *
   * 자리는 카드에 맞춰 잡는다. 세로는 점(dots)과 같은 이유로 화면 높이가 아니라
   * top 50%에서 재고(카드도 컨테이너 높이의 절반에 앉는다), 카드 아래 모서리에서
   * 카드 안쪽 여백(28)만큼 올린 뒤 버튼 높이(32)를 뺀다. 가로는 카드 오른쪽
   * 모서리에서 안쪽 여백(24)만큼 들어온다.
   */
  /** 재생기가 있는 항목 — 카드 아랫변이 그만큼 올라오므로 책갈피도 따라 올라온다. */
  descBookmarkWithMusic: {
    transform: [{ translateY: -PLAYER_BLOCK }],
  },
  descBookmark: {
    position: 'absolute',
    top: '50%',
    marginTop: CARD_H / 2 - BODY_PADDING_Y - 32,
    left: (SCREEN_W - CARD_W) / 2 + CARD_W - 24 - 32,
    // 덱 안에서 가장 위 — 골 그늘(FoldShade)의 100보다 높다.
    zIndex: 101,
  },
  descBookmarkHit: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  /** 낭독이 지금 읽는 단어에 깔리는 밑칠. 종이색 위에서 또렷한 따뜻한 색을 쓴다. */
  spokenWord: {
    backgroundColor: Colors.beige50,
    color: Colors.brown100,
  },
  descText: {
    fontFamily: Fonts.regular,
    fontSize: BODY_FONT_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    letterSpacing: tracking(BODY_FONT_SIZE),
    color: Colors.brown100,
  },

  // 아래 줄 — 몇 장째인지와 버튼 둘. 동그라미 없이 맨 아이콘만 놓는다.
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FOOTER_H,
    zIndex: 3,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerHit: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  /**
   * 카드 윗변에서 20 띄워 올린다(점 높이 6 + 여백 20 = 26).
   *
   * 화면 높이가 아니라 카드와 똑같이 top 50%에서 잡는 건, 카드가 Dimensions가 아니라
   * 실제 컨테이너 높이의 절반에 앉기 때문이다. 상태바·내비게이션바가 잡아먹는 만큼
   * 둘이 어긋나면 안 된다.
   */
  /**
   * 음악 재생기가 앉는 자리 — 카드가 내준 만큼이다. 아랫변이 예전 카드 아랫변과
   * 같은 자리라, 카드와 재생기를 합치면 원래 카드 높이 그대로다.
   */
  musicSlot: {
    position: 'absolute',
    left: (SCREEN_W - CARD_W) / 2,
    top: '50%',
    marginTop: CARD_H / 2 - PLAYER_H,
    width: CARD_W,
    zIndex: 102,
  },

  /** 화면 맨 위 — 가로를 다 쓰고, 장 수만큼 나눠 갖는다. */
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
    height: BARS_H,
    paddingHorizontal: BAR_PAD,
    zIndex: 3,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.brown50,
    overflow: 'hidden',
  },
  barFilled: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.white,
  },

  // 계정 줄 — 인스타의 윗줄 자리에 표지·책 이름·날짜·닫기를 놓는다.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: HEADER_H,
    paddingLeft: 16,
    paddingRight: 8,
    zIndex: 3,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.brown50,
  },
  account: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  when: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  headerSpacer: {
    flex: 1,
  },
  headerClose: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
});
