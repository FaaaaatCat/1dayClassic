import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
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
 * 별도 층에 겹쳐 두고 scrollX로 직접 변형해 그린다 — 이래야 넘어가는 카드가 제자리에서
 * 젖혀지고 뒤 카드는 따라 흐르지 않고 쌓인 채 기다리는 '책' 느낌이 난다.
 *
 * 다만 본문(desc)만은 예외로 그 ScrollView 안에 직접 넣는다. 전체화면인 데다 세로로
 * 스크롤돼야 하는데, 카드층은 터치를 받지 않게 해 둬서(pointerEvents=none) 밖에 두면
 * 세로 스크롤을 못 받기 때문이다. 가로 ScrollView 안에 있으면 바깥은 가로, 안쪽은 세로로
 * 제스처가 자연스럽게 갈린다.
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
/** 뒤에 몇 장까지 겹쳐 보일지. */
const VISIBLE_BEHIND = 2;
/** 뒤 카드가 한 장마다 오른쪽으로 밀려나는 정도(px). */
const STACK_X = 26;
/** 뒤 카드가 한 장마다 위로 올라가는 정도(px). */
const STACK_Y = -6;
/** 뒤 카드가 한 장마다 작아지는 비율. */
const STACK_SCALE = 0.075;
/** 원근 거리 — 작을수록 3D가 과장된다. */
const PERSPECTIVE = 800;

// 넘김은 스크롤 위치에 그대로 비례시키지 않는다. 그러면 손가락을 따라 밋밋하게 미끄러질
// 뿐이라 '넘어갔다'는 인상이 남지 않는다. 나가는 카드는 뒤로 갈수록 가속해 화면 밖으로
// 빠져나가고, 들어오는 카드는 제자리를 살짝 지나쳤다가 되돌아와 멈춘다.
/** 넘어간 카드가 빠져나가는 거리(화면 폭 배수). */
const EXIT_TRAVEL = 0.9;
/** 빠져나가며 카메라 쪽으로 다가오는 정도. */
const EXIT_ZOOM = 0.24;
/** 빠져나가며 도는 각도(Y축). */
const EXIT_TURN_DEG = 34;
/** 빠져나가며 기우는 각도(화면 평면). */
const EXIT_TILT_DEG = 7;
/** 다가오는 카드가 제자리를 지나치는 지점. 0에 가까울수록 늦게 튄다. */
const ARRIVE_PEAK = 0.26;
/** 지나치는 정도(배율). */
const ARRIVE_OVERSHOOT = 0.055;

// ── 화면 구성 ─────────────────────────────────────────────────────────────

type PageKind = 'intro' | 'quote' | 'desc' | 'note' | 'quiz' | 'answer';

interface Page {
  kind: PageKind;
  /** 카드 위에 뜨는 안내 문구. 본문(desc)에는 없다. */
  headline?: string;
}

const PAGES: Page[] = [
  { kind: 'intro', headline: '듣기 공부의 시간입니다.' },
  { kind: 'quote', headline: '듣기 공부의 시간입니다.' },
  { kind: 'desc' },
  { kind: 'note', headline: '오늘의 공부는 어떠셨나요.\n떠오르는 게 있다면 적어봅시다.' },
  { kind: 'quiz', headline: '잘 읽었는지 확인해볼까요?' },
  { kind: 'answer', headline: '정답입니다!' },
];

/** 본문이 아닌, 카드로 그려지는 페이지들의 인덱스. */
const CARD_INDEXES = PAGES.map((p, i) => (p.kind === 'desc' ? -1 : i)).filter((i) => i >= 0);
/** 본문 페이지의 인덱스. */
const DESC_INDEX = PAGES.findIndex((p) => p.kind === 'desc');
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

const QUOTE_TEXT =
  '모든 인류에게 부여된 천부적인 재능일 수 있는 경청이 어려워진 이유는 무얼까.\n' +
  '심리학자인 데이비드 배너 교수는 우리 대부분이 이미 스스로 잘 듣는 사람이라 생각하기 때문이라고 지적한다.';
const QUOTE_SOURCE = '애덤 S. 맥휴, 『경청, 영혼의 치료제』\n(윤종석 옮김, 도서출판 CUP, 2018)';

const DESC_PARAGRAPHS = [
  '‘익명의 알코올중독자들’ Alcoholics Anonymous을 비롯한 재활모임에서 가장 중히 여기는 것이 무엇인지 아는가? 본인이 중독이라는 사실을 인정하는 것이 1단계다. 내가 중독에 빠졌고 내 힘으로는 중독에서 벗어날 수 없다는 사실을 수긍하는 것. 이것이 이뤄지지 않으면 재활센터에서도 치료에 들어가지 않는다.',
  '경청도 마찬가지다. 내가 잘 듣는 사람이 아니라는 것. 달리 말하면 말하기 중독에 빠져서 자꾸 상대의 말을 끊는다는 걸 인정하지 않고서는 듣기의 갱신은 요원하다.',
  '과분하게도 내 주위엔 훌륭한 분들이 즐비하다. 그런 분들이 대화 자리에서 툭하면 상대의 말허리를 끊는다. 물론 고의는 아니다. 자기도 모르게 그런다. 커피 타임이나 술자리에서 가만히 살펴보라. 남이 말할 때 끼어들 기회를 엿보며 화제를 주도하려는 사람이 태반이다. 그런데 나 정도면 잘 들어 준다고 자평한다. 이 책을 쓰기 전까지는 나 자신도 그런 줄 몰랐다.',
  '우리는 대화의 기준이 너무 낮다. 정보 교환, 감정 배설, 재치있는 말의 경연장 정도로 간주한다. 그러니 자신이 잘 듣는다고 착각하는 것도 무리는 아니다.',
];

export default function CardSlidePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  // 버튼을 누를 수 있는지는 애니메이션이 아니라 '지금 몇 번째 페이지인가'로 정한다 —
  // 투명해진 버튼이 눌리면 안 되기 때문.
  const [page, setPage] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / PAGE_W));
  };

  /**
   * 탭으로 한 장 넘긴다. 화면을 가로로 3등분해 왼쪽은 이전, 오른쪽은 다음이고
   * 가운데는 아무 일도 하지 않는다(탭 영역은 각 페이지 안에 있다).
   * 프로그램으로 스크롤하면 onMomentumScrollEnd가 안 오는 기기가 있어 페이지를 직접 맞춘다.
   */
  const goBy = (delta: number) => {
    const next = Math.max(0, Math.min(PAGES.length - 1, page + delta));
    if (next === page) return;
    scrollRef.current?.scrollTo({ x: next * PAGE_W, animated: true });
    setPage(next);
  };

  const onDesc = page === DESC_INDEX;
  const onAnswer = page === ANSWER_INDEX;

  return (
    <View style={styles.screen}>
      {/* 카드층 — 보이기만 하고 손가락은 위의 ScrollView가 받는다. */}
      <View style={styles.deck} pointerEvents="none">
        {/* 뒤 카드가 앞 카드에 가리도록 큰 번호부터 그린다. 덕분에 넘어가는 카드가 늘
            다음 카드 위에서 젖혀진다(책장이 넘어가는 순서). */}
        {[...CARD_INDEXES].reverse().map((index) => (
          <DeckCard key={index} index={index} kind={PAGES[index].kind} scrollX={scrollX} />
        ))}
      </View>

      <Headlines top={insets.top + 24} scrollX={scrollX} />

      <CloseButton
        top={insets.top + 24}
        scrollX={scrollX}
        enabled={!onDesc}
        onPress={() => router.replace('/settings')}
      />

      <Dots scrollX={scrollX} bottom={insets.bottom + 104} />

      <Actions
        bottom={insets.bottom + 40}
        scrollX={scrollX}
        roundEnabled={!onDesc && !onAnswer}
        finishEnabled={onAnswer}
        onFinish={() => router.replace('/settings')}
      />

      {/* 제스처 층 — 본문 페이지만 실제 내용을 담고 나머지는 탭 영역만 있다. */}
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.gestureLayer}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onSettle}
        scrollEventThrottle={16}>
        {PAGES.map((p, index) =>
          p.kind === 'desc' ? (
            <DescPage key={index} insets={insets} />
          ) : (
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
          ),
        )}
      </Animated.ScrollView>
    </View>
  );
}

// ── 카드 ──────────────────────────────────────────────────────────────────

/**
 * 덱에 놓인 카드 한 장.
 *
 * p = 이 카드가 맨 앞에서 몇 장 뒤인지. 0이면 지금 보는 카드, 1이면 바로 다음,
 * 음수면 이미 넘긴 카드다. 스크롤 위치를 그대로 이 값으로 바꿔 쓴다.
 */
function DeckCard({
  index,
  kind,
  scrollX,
}: {
  index: number;
  kind: PageKind;
  scrollX: SharedValue<number>;
}) {
  const cardStyle = useAnimatedStyle(() => {
    const p = index - scrollX.value / PAGE_W;

    // 이미 넘긴 카드 — 카메라 앞을 스치듯 커지면서 왼쪽으로 빠져나간다.
    // u를 제곱해 뒤로 갈수록 빨라지게 만든 게 '샥' 하는 인상의 핵심이다.
    if (p < 0) {
      const u = Math.min(-p, 1);
      const e = u * u;
      return {
        opacity: 1 - Math.pow(u, 1.5),
        elevation: 24,
        transform: [
          { perspective: PERSPECTIVE },
          { translateX: -e * SCREEN_W * EXIT_TRAVEL },
          { translateY: -e * 24 },
          { rotateY: `${e * EXIT_TURN_DEG}deg` },
          { rotateZ: `${-e * EXIT_TILT_DEG}deg` },
          { scale: 1 + e * EXIT_ZOOM },
        ],
      };
    }

    // 다가오는 카드 — 스택에서 올라오며 제자리를 살짝 지나쳤다가 멈춘다.
    const behind = Math.min(p, VISIBLE_BEHIND);
    return {
      opacity: interpolate(
        p,
        [VISIBLE_BEHIND, VISIBLE_BEHIND + 0.6],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      elevation: 20 - behind * 6,
      transform: [
        { perspective: PERSPECTIVE },
        { translateX: behind * STACK_X },
        {
          translateY: interpolate(
            p,
            [0, ARRIVE_PEAK, 1, VISIBLE_BEHIND],
            [0, -12, STACK_Y, VISIBLE_BEHIND * STACK_Y],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            p,
            [0, ARRIVE_PEAK, 1, VISIBLE_BEHIND],
            [1, 1 + ARRIVE_OVERSHOOT, 1 - STACK_SCALE, 1 - VISIBLE_BEHIND * STACK_SCALE],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  // 빠져나갈수록 카드에 그늘이 깔린다 — 형태 변화만으로는 깊이가 잘 안 읽힌다.
  const shadeStyle = useAnimatedStyle(() => {
    const p = index - scrollX.value / PAGE_W;
    if (p >= 0) return { opacity: 0 };
    const u = Math.min(-p, 1);
    return { opacity: Math.pow(u, 1.3) * 0.7 };
  });

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.cardBody}>
        <CardContent kind={kind} />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, shadeStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(3,3,3,0)', 'rgba(3,3,3,0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

function CardContent({ kind }: { kind: PageKind }) {
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

// ── 본문(전체화면) ─────────────────────────────────────────────────────────

/** 카드가 아니라 화면을 가득 채우는 본문. 세로로 스크롤된다. */
function DescPage({ insets }: { insets: { top: number; bottom: number } }) {
  return (
    <View style={styles.descPage}>
      <ScrollView
        style={styles.descScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.descContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 48 },
        ]}>
        {DESC_PARAGRAPHS.map((paragraph, index) => (
          <Text key={index} style={styles.descText}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

// ── 문구 · 버튼 · 인디케이터 ───────────────────────────────────────────────

/** 카드가 바뀌면 위 문구도 함께 바뀐다. 같은 문구가 이어지는 구간은 켜 둔 채로 넘어간다. */
function Headlines({ top, scrollX }: { top: number; scrollX: SharedValue<number> }) {
  return (
    <View style={[styles.headlineArea, { top }]} pointerEvents="none">
      {HEADLINE_GROUPS.map((group) => (
        <Headline key={group.text} group={group} scrollX={scrollX} />
      ))}
    </View>
  );
}

function Headline({
  group,
  scrollX,
}: {
  group: { text: string; from: number; to: number };
  scrollX: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const x = scrollX.value / PAGE_W;
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
 * 하단 버튼 — 본문에서는 사라지고, 마지막 해설 카드에서는 동그란 버튼 대신
 * '오늘의 공부 마치기'가 나온다.
 */
function Actions({
  bottom,
  scrollX,
  roundEnabled,
  finishEnabled,
  onFinish,
}: {
  bottom: number;
  scrollX: SharedValue<number>;
  roundEnabled: boolean;
  finishEnabled: boolean;
  onFinish: () => void;
}) {
  const roundStyle = useAnimatedStyle(() => {
    const x = scrollX.value / PAGE_W;
    return {
      opacity: interpolate(x, [1, 2, 3, 4, 5], [1, 0, 1, 1, 0], Extrapolation.CLAMP),
    };
  });
  const finishStyle = useAnimatedStyle(() => {
    const x = scrollX.value / PAGE_W;
    return { opacity: interpolate(x, [4, 5], [0, 1], Extrapolation.CLAMP) };
  });

  return (
    <View style={[styles.actions, { bottom }]} pointerEvents="box-none">
      <Animated.View
        style={[styles.roundRow, roundStyle]}
        pointerEvents={roundEnabled ? 'auto' : 'none'}>
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

/**
 * 닫기 버튼 — 본문(전체화면)에서는 글자 위에 겹쳐 읽기를 방해하므로 문구·하단 버튼과
 * 함께 사라진다. 본문에서는 좌우로 넘겨 앞뒤 카드로 빠져나온다.
 */
function CloseButton({
  top,
  scrollX,
  enabled,
  onPress,
}: {
  top: number;
  scrollX: SharedValue<number>;
  enabled: boolean;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const x = scrollX.value / PAGE_W;
    return { opacity: interpolate(x, [1, 2, 3], [1, 0, 1], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View
      style={[styles.closeButton, { top }, style]}
      pointerEvents={enabled ? 'auto' : 'none'}>
      <ScaleButton accessibilityLabel="미리보기 닫기" style={styles.closeHit} onPress={onPress}>
        <SymbolView
          name={{ ios: 'xmark', android: 'close', web: 'close' }}
          tintColor={Colors.brown50}
          size={24}
        />
      </ScaleButton>
    </Animated.View>
  );
}

/** 몇 장 중 몇 번째인지 알려 주는 점 — 본문에서는 같이 사라진다. */
function Dots({ scrollX, bottom }: { scrollX: SharedValue<number>; bottom: number }) {
  const areaStyle = useAnimatedStyle(() => {
    const x = scrollX.value / PAGE_W;
    return { opacity: interpolate(x, [1, 2, 3], [1, 0, 1], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View style={[styles.dots, { bottom }, areaStyle]} pointerEvents="none">
      {PAGES.map((_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} />
      ))}
    </Animated.View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(index - scrollX.value / PAGE_W);
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
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    backgroundColor: Colors.bg,
    overflow: 'hidden',
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
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

  // 본문 전체화면
  descPage: {
    width: PAGE_W,
    height: '100%',
    backgroundColor: Colors.bg,
  },
  // 부모 높이에 묶어 둬야 내용이 넘칠 때 세로로 스크롤된다 — 이게 없으면 ScrollView가
  // 제 내용 높이만큼 늘어나 화면 밖으로 잘리기만 하고 스크롤이 걸리지 않는다.
  descScroll: {
    flex: 1,
  },
  descContent: {
    paddingHorizontal: 28,
    gap: 20,
  },
  descText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 28,
    letterSpacing: tracking(15),
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
