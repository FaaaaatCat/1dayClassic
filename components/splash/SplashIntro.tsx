import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import SplashLogin from '@/components/splash/SplashLogin';
import { Corner, Ink, Space, Spark, Type } from '@/constants/theme';

/** 세 장의 그림과 한 줄. 넘기는 차례가 곧 이 앱이 하는 일의 차례다 — 자르고, 깨우고, 되묻는다. */
const SLIDES = [
  { key: 'cut', lead: '좋은 책을 하루치로 잘라 드립니다', label: '반으로 갈리는 종이' },
  { key: 'alarm', lead: '까먹지 않게 매일 알람을 드려요', label: '울리는 자명종' },
  { key: 'quiz', lead: '퀴즈로 까먹지않게 복습까지 챙겨요.', label: '퀴즈 위로 떠오르는 말풍선' },
] as const;

/**
 * 첫 화면 — 이 앱이 무엇인지 세 장으로 말한다.
 *
 * 장마다 가운데에 움직이는 그림 하나와 그 아래 한 줄, 그리고 이름(하루서점). 좌우로 넘기거나
 * '다음'을 눌러 넘기고, 아래 점이 몇 번째 장인지 알린다. 마지막 장에서는 버튼이
 * '하루서점 시작하기'가 되어 회원가입 시트를 올린다.
 *
 * '하루서점 시작하기'와 '로그인하기'는 둘 다 아래에서 회원가입 시트를 올린다(SplashLogin).
 * 시트의 버튼은 아직 실제 가입을 하지 않고 그대로 다음 걸음으로 넘어간다 — MVP에는 서버가
 * 없어 계정으로 지킬 것이 없다.
 */
export default function SplashIntro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [login, setLogin] = useState(false);
  const [page, setPage] = useState(0);
  const pagerRef = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goNext = () => {
    if (last) {
      setLogin(true);
      return;
    }
    pagerRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettle}
        style={styles.pager}>
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.body, { width }]}>
            <View style={styles.art} accessibilityRole="image" accessibilityLabel={slide.label}>
              {slide.key === 'cut' ? <PageBreak /> : null}
              {slide.key === 'alarm' ? <AlarmRing /> : null}
              {slide.key === 'quiz' ? <QuizBubbles /> : null}
            </View>
            <View style={styles.words}>
              <Text style={styles.lead}>{slide.lead}</Text>
              <Text style={styles.logo}>하루서점</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 몇 장 중 몇 번째인지. 누르는 것이 아니라 알려 주는 것이라 점으로만 둔다. */}
      <View style={styles.dots}>
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={[styles.dot, index === page && styles.dotOn]} />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: Space[36] + insets.bottom }]}>
        <ScaleButton
          accessibilityLabel={last ? '하루서점 시작하기' : '다음'}
          style={styles.cta}
          onPress={goNext}>
          <Text style={styles.ctaText}>{last ? '하루서점 시작하기' : '다음'}</Text>
        </ScaleButton>
        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>이미 계정이 있나요?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="로그인하기"
            hitSlop={10}
            onPress={() => setLogin(true)}>
            <Text style={styles.loginLink}>로그인하기</Text>
          </Pressable>
        </View>
      </View>

      {login ? <SplashLogin onDone={onDone} onDismiss={() => setLogin(false)} /> : null}
    </View>
  );
}

/** 끝없이 0→1을 되풀이하는 시계 — 세 그림이 저마다 한 바퀴의 길이로 쓴다. */
function useLoop(cycleMs: number): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: cycleMs, easing: Easing.linear }), -1);
  }, [progress, cycleMs]);
  return progress;
}

/**
 * 울리는 자명종 — 한 바퀴의 앞 절반 동안 좌우로 떨고, 그 양옆에 울림 선이 번진다.
 * 뒤 절반은 가만히 쉰다. 계속 떨기만 하면 울림이 아니라 고장처럼 보인다.
 */
const ALARM_CYCLE_MS = 1800;
const RING_UNTIL = 0.45;

function AlarmRing() {
  const progress = useLoop(ALARM_CYCLE_MS);

  const shake = useAnimatedStyle(() => {
    const p = progress.value;
    if (p >= RING_UNTIL) return { transform: [{ rotate: '0deg' }] };
    // 여덟 번 오가며 끝으로 갈수록 잦아든다.
    const t = p / RING_UNTIL;
    const angle = Math.sin(t * Math.PI * 16) * 12 * (1 - t * 0.6);
    return { transform: [{ rotate: `${angle}deg` }] };
  });

  const waves = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.05, RING_UNTIL - 0.05, RING_UNTIL], [0, 1, 1, 0], 'clamp'),
  }));

  return (
    <View style={styles.alarm}>
      <Animated.View style={[styles.alarmWaves, waves]}>
        <View style={[styles.wave, styles.waveLeftTop]} />
        <View style={[styles.wave, styles.waveLeftBottom]} />
        <View style={[styles.wave, styles.waveRightTop]} />
        <View style={[styles.wave, styles.waveRightBottom]} />
      </Animated.View>
      <Animated.View style={shake}>
        <Ionicons name="alarm-outline" size={ART} color={Ink.onDark} />
      </Animated.View>
    </View>
  );
}

/**
 * '퀴즈' 위로 말풍선 셋이 차례로 떠오른다 — 하나씩 톡 튀어나와 셋이 다 모이면 잠시 머물고,
 * 함께 사라진 뒤 다시 처음부터.
 */
const QUIZ_CYCLE_MS = 3000;
/** 말풍선 셋 — 자리(퀴즈 글자 가운데 위 기준)와 안의 글자, 튀어나오는 때(0~1). */
const BUBBLES = [
  { x: -64, y: -78, glyph: '?', at: 0.08 },
  { x: 0, y: -104, glyph: '!', at: 0.22 },
  { x: 64, y: -78, glyph: '✓', at: 0.36 },
];
const BUBBLE_POP = 0.08;
const BUBBLES_OUT = [0.84, 0.94];

function QuizBubbles() {
  const progress = useLoop(QUIZ_CYCLE_MS);
  return (
    <View style={styles.quiz}>
      {BUBBLES.map((bubble) => (
        <Bubble key={bubble.glyph} progress={progress} {...bubble} />
      ))}
      <Text style={styles.quizWord}>퀴즈</Text>
    </View>
  );
}

function Bubble({
  progress,
  x,
  y,
  glyph,
  at,
}: {
  progress: SharedValue<number>;
  x: number;
  y: number;
  glyph: string;
  at: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 톡 — 조금 넘치게 커졌다가 제 크기로.
    const scale = interpolate(p, [at, at + BUBBLE_POP * 0.6, at + BUBBLE_POP], [0, 1.15, 1], 'clamp');
    const fade = interpolate(p, BUBBLES_OUT, [1, 0], 'clamp');
    return { opacity: p < at ? 0 : fade, transform: [{ translateX: x }, { translateY: y }, { scale }] };
  });
  return (
    <Animated.View style={[styles.bubble, style]}>
      <Text style={styles.bubbleGlyph}>{glyph}</Text>
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

/**
 * 종이가 반으로 갈리는 그림 — 끝없이 되풀이한다.
 *
 * 한 장의 종이로 시작해, 점선이 왼쪽에서부터 그어지고, 점선 자리에서 종이가 위아래로
 * 갈린다. 잠시 머문 뒤 다시 한 장으로 붙고 처음부터 되풀이한다.
 *
 * 그림은 시안의 아이콘(carbon:page-break)을 그대로 쓴다. 위 반쪽과 아래 반쪽은 그 SVG를
 * 그대로 잘라 낸 그림이고(assets/images/splash), 직접 그리는 것은 움직이는 두 가지뿐이다 —
 * 두 반쪽을 잇는 양옆 선(종이가 갈리면 사라진다)과 점선 네 토막. 자리는 모두 원본 SVG의
 * 좌표(120 칸 기준)다.
 */
const ART = 120;
/** 선 굵기 — 원본 SVG의 7.5. */
const LINE = 7.5;
/** 한 바퀴의 길이. */
const CYCLE_MS = 3200;
/**
 * 갈릴 때 두 반쪽이 위아래로 벌어지는 거리 — 점선을 사이에 두고 위로 8, 아래로 8.
 * 시안(assets/images/splitpage.svg)의 갈린 모양을 원본 아이콘과 맞대어 잰 값이다.
 */
const SPREAD = 8;

/**
 * 한 바퀴 안에서 일이 일어나는 자리(0~1).
 *
 * 갈릴 때는 잇는 선이 먼저 끊기고(cut) 그다음 반쪽이 벌어진다(spread). 붙을 때는 반쪽이 먼저
 * 붙고(close) 그다음 선이 이어진다(mend). 둘을 겹쳐 두면 벌어지는 동안 선이 제자리에 남아
 * 두 반쪽 사이에 떠 보인다.
 */
const AT = {
  drawFrom: 0.08,
  drawTo: 0.34,
  cutFrom: 0.38,
  cutTo: 0.4,
  spreadTo: 0.52,
  closeFrom: 0.82,
  closeTo: 0.92,
  mendTo: 0.94,
};

/** 점선 네 토막의 왼쪽 끝 — 원본 SVG 그대로(폭 15, 사이 15). */
const DASHES = [7.5, 37.5, 67.5, 97.5];
/** 점선이 그어지는 구간 — 첫 토막 왼쪽 끝부터 마지막 토막 오른쪽 끝까지. */
const DASH_FROM = 7.5;
const DASH_SPAN = 112.5 - DASH_FROM;

function PageBreak() {
  const progress = useLoop(CYCLE_MS);

  /** 점선 — 왼쪽에서부터 그어지는 것처럼 보이도록 감싼 틀의 폭을 늘린다. 붙을 때는 흐려진다. */
  const dashStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [AT.drawFrom, AT.drawTo], [0, DASH_SPAN], 'clamp'),
    opacity: interpolate(progress.value, [AT.closeFrom, AT.closeTo], [1, 0], 'clamp'),
  }));

  /** 두 반쪽을 잇는 양옆 선 — 반쪽이 움직이기 전에 끊기고, 다 붙은 뒤에 이어진다. */
  const bridgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [AT.cutFrom, AT.cutTo, AT.closeTo, AT.mendTo],
      [1, 0, 0, 1],
      'clamp',
    ),
  }));

  // 아래 두 애니메이션 스타일 안(UI 스레드)에서 불리므로 워클릿이어야 한다.
  const spread = (direction: 1 | -1) => {
    'worklet';
    return interpolate(
      progress.value,
      [AT.cutTo, AT.spreadTo, AT.closeFrom, AT.closeTo],
      [0, SPREAD * direction, SPREAD * direction, 0],
      'clamp',
    );
  };
  const topStyle = useAnimatedStyle(() => ({ transform: [{ translateY: spread(-1) }] }));
  const bottomStyle = useAnimatedStyle(() => ({ transform: [{ translateY: spread(1) }] }));

  return (
    <View style={styles.pageBreak}>
      {/* 움직임은 그림이 아니라 감싼 틀에 건다 — 안드로이드에서 그림에 건 변형이 덜 믿음직하다. */}
      <Animated.View style={[styles.top, topStyle]}>
        <Image source={require('@/assets/images/splash/page-break-top.png')} style={styles.fill} />
      </Animated.View>
      <Animated.View style={[styles.bridge, styles.bridgeLeft, bridgeStyle]} />
      <Animated.View style={[styles.bridge, styles.bridgeRight, bridgeStyle]} />
      <Animated.View style={[styles.bottom, bottomStyle]}>
        <Image source={require('@/assets/images/splash/page-break-bottom.png')} style={styles.fill} />
      </Animated.View>
      <Animated.View style={[styles.dashes, dashStyle]}>
        {DASHES.map((left) => (
          <View key={left} style={[styles.dash, { left: left - DASH_FROM }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  pager: {
    flex: 1,
  },
  /** 한 장 — 화면 폭 하나. 그림은 남는 높이 한가운데, 글은 아래. */
  body: {
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: Space[28],
  },
  /** 그림 자리 — 남는 높이를 다 갖고 그 한가운데에 그림이 선다. */
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: {
    alignItems: 'center',
    gap: Space[8],
    paddingVertical: Space[20],
  },
  lead: {
    fontFamily: Type.ui,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    color: Ink.muted,
    textAlign: 'center',
  },
  logo: {
    fontFamily: Type.readingBold,
    fontSize: 40,
    lineHeight: 86,
    letterSpacing: -1.6,
    color: Ink.onDark,
    textAlign: 'center',
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[8],
    paddingBottom: Space[24],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  dotOn: {
    backgroundColor: Ink.onDark,
  },

  footer: {
    gap: Space[20],
    paddingHorizontal: Space[20],
  },
  cta: {
    height: 60,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  ctaText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.onDark,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[8],
  },
  loginHint: {
    fontFamily: Type.ui,
    fontSize: 11,
    lineHeight: 17,
    color: Ink.muted,
  },
  loginLink: {
    fontFamily: Type.uiMedium,
    fontSize: 11,
    lineHeight: 17,
    color: Ink.onDark,
  },

  // 자명종 — 그림과 같은 크기의 틀에 울림 선 넷을 양옆 위아래로 둔다.
  alarm: {
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmWaves: {
    ...StyleSheet.absoluteFill,
  },
  wave: {
    position: 'absolute',
    width: 14,
    height: 4,
    borderRadius: Corner.pill,
    backgroundColor: Ink.onDark,
  },
  waveLeftTop: {
    left: -18,
    top: 34,
    transform: [{ rotate: '-30deg' }],
  },
  waveLeftBottom: {
    left: -20,
    top: 52,
  },
  waveRightTop: {
    right: -18,
    top: 34,
    transform: [{ rotate: '30deg' }],
  },
  waveRightBottom: {
    right: -20,
    top: 52,
  },

  // 퀴즈 — 글자 가운데에 말풍선 셋의 기준점을 둔다.
  quiz: {
    width: ART * 2,
    height: ART,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quizWord: {
    fontFamily: Type.readingBold,
    fontSize: 48,
    lineHeight: 60,
    letterSpacing: -1.92,
    color: Ink.onDark,
  },
  /** 말풍선 — 글자 바로 위 가운데가 제자리이고, 거기서 저마다의 자리로 옮겨 앉는다. */
  bubble: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    minWidth: 40,
    height: 40,
    paddingHorizontal: Space[12],
    borderRadius: Corner.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.onDark,
  },
  bubbleGlyph: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 22,
    color: Ink.primary,
  },
  /** 꼬리 — 아래로 향한 작은 마름모의 반쪽이 말풍선 밑에 비어져 나온다. */
  bubbleTail: {
    position: 'absolute',
    bottom: -4,
    width: 10,
    height: 10,
    backgroundColor: Ink.onDark,
    transform: [{ rotate: '45deg' }],
  },

  // 종이 그림 — 모든 자리는 원본 SVG(120×120)의 좌표다.
  pageBreak: {
    width: ART,
    height: ART,
  },
  /** 위 반쪽 — SVG의 y 0~60. */
  top: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ART,
    height: 60,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  /** 아래 반쪽 — SVG의 y 82.5~120. */
  bottom: {
    position: 'absolute',
    left: 0,
    top: 82.5,
    width: ART,
    height: 37.5,
  },
  /** 두 반쪽 사이(y 60~82.5)를 잇는 양옆 선 — 한 장일 때만 보인다. */
  bridge: {
    position: 'absolute',
    top: 60,
    width: LINE,
    height: 82.5 - 60,
    backgroundColor: Ink.onDark,
  },
  bridgeLeft: {
    left: 22.5,
  },
  bridgeRight: {
    left: 97.5 - LINE,
  },
  /** 점선을 감싼 틀 — 폭이 늘면서 왼쪽부터 드러난다. */
  dashes: {
    position: 'absolute',
    left: DASH_FROM,
    top: 67.5,
    height: LINE,
    overflow: 'hidden',
  },
  dash: {
    position: 'absolute',
    top: 0,
    width: 15,
    height: LINE,
    backgroundColor: Ink.onDark,
  },
});
