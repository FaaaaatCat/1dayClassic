import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import ScaleButton from '@/components/ScaleButton';
import { STREAK_DAYS } from '@/components/StudyReport';
import { Corner, Ink, Spark, Surface, Type, trackBody } from '@/constants/theme';
import type { CatalogBook } from '@/lib/catalog';

/** 연속 독서일이 0에서 올라가는 시간 — 끝에서 느려져 멎는다(StudyReport와 같은 맛). */
const COUNT_MS = 1100;
/** 숫자가 멎은 뒤 나머지가 하나씩 떠오르는 간격과 한 줄이 뜨는 시간. */
const STEP_MS = 160;
const SHOW_MS = 420;
/**
 * 다음 책 카드가 다 뜬 뒤 아래 버튼이 올라오기까지 쉬는 시간.
 *
 * 이 화면에서 가장 중요한 것은 다음 책 카드다. 버튼이 카드와 거의 함께 뜨면 눈이 곧장 '완료하고
 * 홈으로'로 내려가 나가 버린다. 1초 동안은 화면에 카드만 남아 눈이 거기 머문다.
 */
const BUTTON_WAIT_MS = 1000;
/**
 * 카드가 떠오르는 시간 — 다른 줄(SHOW_MS)보다 느리다. 이 화면의 주인공이라 천천히 들어온다.
 * 처음엔 다른 줄과 같았는데 과하고 빠르다고 해서 늦추고 움직임을 줄였다.
 */
const CARD_SHOW_MS = 900;
/** 제목(0)·'연속 독서중'(1)·카드(2)는 STEP_MS 간격으로, 버튼은 카드가 다 뜨고 BUTTON_WAIT_MS 뒤에. */
const STEP_START = [0, STEP_MS, STEP_MS * 2, STEP_MS * 2 + CARD_SHOW_MS + BUTTON_WAIT_MS];
/**
 * 카드가 다 뜬 뒤 주황 빛이 한 번 숨 쉬는 시간 — 부풀며 밝아졌다가 제자리로 가라앉는다.
 * 딱 한 번만이다. 계속 반짝이면 광고로 읽힌다.
 */
const PULSE_MS = 2400;
/** 숨 쉴 때 빛이 부푸는 정도와, 빛을 덮은 판이 옅어지는 정도(80% → 70%). 은은하게. */
const PULSE_GROW = 0.06;
const PANE_ALPHA = 0.8;
const PANE_ALPHA_PEAK = 0.7;
/** 카드가 떠오를 때 이만큼 작게 시작해 제 크기가 된다. */
const CARD_FROM_SCALE = 0.98;
/** 카드가 떠오르며 올라오는 거리. */
const CARD_RISE = 8;
const cardEase = Easing.out(Easing.cubic);
/** 마지막 것(버튼)까지 다 뜨는 데 걸리는 시간. */
const REVEAL_TOTAL_MS = STEP_START[3] + SHOW_MS;

/**
 * 오늘의 독서 완료 — 퀴즈를 다 풀면 뜨는 검은 화면(피그마 '공부 리포트').
 *
 * 순서가 이 화면의 전부다. 처음엔 연속 독서일만 있고, 그 수가 0에서 올라가 멎은 다음에야
 * 제목·다음 책 카드가 차례로 떠오르고, 카드가 다 뜨고 1초 뒤에 버튼이 올라온다. 예전 리포트(StudyReport)와 같은 흐름이고,
 * 연속 일수도 그쪽의 자리 값(STREAK_DAYS)을 같이 쓴다 — 기록이 쌓이기 시작하면 함께 바꾼다.
 *
 * 다음 책 카드는 서점의 다른 책 하나를 보여 준다(부르는 쪽이 고른다). 카드의 소개는 그 책의
 * '책 소개' 첫 문단이다 — 책에 없는 문구를 지어 넣지 않는다.
 */
export default function StudyComplete({
  recommend,
  onPreviewBook,
  onHome,
  onNextLesson,
}: {
  /** 다음에 만나 볼 책. 없으면 카드를 그리지 않는다. */
  recommend?: CatalogBook;
  onPreviewBook: () => void;
  onHome: () => void;
  onNextLesson: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const reveal = useSharedValue(0);
  /** 주황 빛의 숨 — 0에서 1로 한 번 간다. 가운데(0.5)에서 가장 부풀고 밝다. */
  const pulse = useSharedValue(0);
  /** 버튼이 눌리는가 — 아직 보이지 않는 버튼이 손가락을 받으면 안 된다. */
  const [buttonsLive, setButtonsLive] = useState(false);

  useEffect(() => {
    let raf = 0;
    let liveTimer: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / COUNT_MS, 1);
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * STREAK_DAYS));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // 숫자가 멎고 나서야 나머지가 차례로.
      reveal.set(withTiming(1, { duration: REVEAL_TOTAL_MS, easing: Easing.linear }));
      // 카드가 다 떠오르면 빛이 한 번 천천히 숨 쉰다 — 버튼은 그 숨이 가라앉는 도중에 오른다.
      pulse.set(
        withDelay(
          STEP_START[2] + CARD_SHOW_MS,
          withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        ),
      );
      liveTimer = setTimeout(() => setButtonsLive(true), STEP_START[3]);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (liveTimer) clearTimeout(liveTimer);
    };
  }, [reveal, pulse]);

  const titleStyle = useStep(reveal, 0);
  const labelStyle = useStep(reveal, 1);
  /** 카드 — 다른 줄처럼 떠오르되, 살짝 작게 시작해 제 크기로 커지며 온다. */
  const cardStyle = useAnimatedStyle(() => {
    const elapsed = reveal.value * REVEAL_TOTAL_MS;
    const start = STEP_START[2];
    const t = interpolate(elapsed, [start, start + CARD_SHOW_MS], [0, 1], Extrapolation.CLAMP);
    const eased = cardEase(t);
    return {
      opacity: eased,
      transform: [
        { translateY: (1 - eased) * CARD_RISE },
        { scale: CARD_FROM_SCALE + (1 - CARD_FROM_SCALE) * eased },
      ],
    };
  });
  /** 숨의 세기 — 0에서 시작해 가운데서 1, 끝에서 다시 0. */
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + PULSE_GROW * Math.sin(pulse.value * Math.PI) }],
  }));
  const paneTintStyle = useAnimatedStyle(() => ({
    opacity: PANE_ALPHA - (PANE_ALPHA - PANE_ALPHA_PEAK) * Math.sin(pulse.value * Math.PI),
  }));
  const buttonsStyle = useStep(reveal, 3);

  const intro = recommend?.sections.find((section) => section.title === '책 소개')?.paragraphs[0];

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        <Animated.Text style={[styles.title, titleStyle]}>오늘의 독서 완료!</Animated.Text>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBig}>
            {count}
            <Text style={styles.scoreUnit}>일</Text>
          </Text>
          <Animated.Text style={[styles.scoreLabel, labelStyle]}>연속 독서중</Animated.Text>
        </View>
      </View>

      {recommend ? (
        <Animated.View style={[styles.card, cardStyle]}>
          {/* 카드 뒤의 주황 빛 두 덩이 — 시안은 주황 원 둘 위에 배경 흐림(50)을 건 판이다.
              흐림을 걸 수단이 없어(새 라이브러리 없이) 원을 흐린 모양 그대로, 가운데가 짙고
              바깥으로 사라지는 빛으로 그린다. */}
          <Animated.View style={[styles.glow, styles.glowRight, glowStyle]} pointerEvents="none" />
          <Animated.View style={[styles.glow, styles.glowLeft, glowStyle]} pointerEvents="none" />
          {/* 빛을 덮는 판의 색 — 숨 쉴 때 옅어져 뒤의 빛이 더 비친다. */}
          <Animated.View style={[styles.paneTint, paneTintStyle]} pointerEvents="none" />
          {/* 카드 전체가 '책 미리보기'다 — 크게 눌리는 것이 곧 이 화면의 주인공이라는 신호다. */}
          <ScaleButton
            accessibilityLabel={`『${recommend.title}』 미리보기`}
            style={styles.cardPane}
            onPress={onPreviewBook}>
            <Text style={styles.cardHeading}>다음에는 어떤 책을 만나볼까요?</Text>
            <View style={styles.cardRow}>
              <BookCoverArt
                bookId={recommend.bookId}
                coverImage={recommend.coverImage}
                coverDesign={recommend.coverDesign}
                width={80}
                radius={4}
                style={styles.cardCover}
              />
              <View style={styles.cardTexts}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{`『${recommend.title}』`}</Text>
                  {intro ? (
                    <Text style={styles.cardIntro} numberOfLines={2}>
                      {intro}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.cardLink}>책 미리보기 →</Text>
              </View>
            </View>
          </ScaleButton>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[styles.buttons, buttonsStyle]}
        pointerEvents={buttonsLive ? 'auto' : 'none'}>
        <ScaleButton accessibilityLabel="완료하고 홈으로" style={styles.homeButton} onPress={onHome}>
          <Text style={styles.homeText}>완료하고 홈으로</Text>
        </ScaleButton>
        <Text
          style={styles.nextLink}
          onPress={onNextLesson}
          accessibilityRole="button"
          suppressHighlighting>
          다음 화 읽기
        </Text>
      </Animated.View>
    </View>
  );
}

/** 흐림 50을 건 반지름 r의 주황 원 — 상자(반지름 r+50) 가운데에서 바깥으로 사라진다. */
function glowGradient(r: number) {
  const edge = Math.round((r / (r + 50)) * 100);
  const core = Math.round(((r - 50) / (r + 50)) * 100);
  return `radial-gradient(circle closest-side, ${Spark.ember} ${core}%, rgba(255,71,4,0.5) ${edge}%, rgba(255,71,4,0) 100%)`;
}

/** order번째 것이 제 차례(STEP_START)부터 SHOW_MS 동안 떠오른다 — 살짝 아래에서. */
function useStep(reveal: SharedValue<number>, order: number) {
  const start = STEP_START[order];
  return useAnimatedStyle(() => {
    const elapsed = reveal.value * REVEAL_TOTAL_MS;
    const t = interpolate(elapsed, [start, start + SHOW_MS], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: (1 - t) * 12 }] };
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 32,
    paddingHorizontal: 20,
    backgroundColor: Ink.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 40,
  },
  /** 시안은 행간 24지만 안드로이드는 글자보다 작은 행간에서 획이 잘려 32로 둔다. */
  title: {
    fontFamily: Type.readingBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: Ink.onDark,
  },
  scoreBlock: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  /** 큰 숫자에는 흰 빛을 흘려 둔다 — 검은 바탕에서 이것만 떠 보여야 한다. */
  scoreBig: {
    fontFamily: Type.uiMedium,
    fontSize: 96,
    lineHeight: 112,
    color: Ink.onDark,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  scoreUnit: {
    fontFamily: Type.uiMedium,
    fontSize: 36,
    color: Ink.onDark,
  },
  scoreLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 25,
    color: Ink.onDark,
  },
  /** 다음 책 카드 — 높이 198, 넘치는 빛은 모서리에서 잘린다. */
  card: {
    height: 198,
    borderRadius: 20,
    overflow: 'hidden',
  },
  /**
   * 흐린 주황 원. 원래 원(지름 d)에 흐림 50을 건 모양이라, 상자를 사방 50씩 키우고 원의
   * 가장자리(상자 반지름의 r/(r+50) 자리)에서 반쯤 사라지게 칠한다.
   */
  glow: {
    position: 'absolute',
  },
  /** 오른쪽 아래 — 시안의 지름 214 원(오른쪽 변에서 47 밖, 위에서 82). */
  glowRight: {
    width: 314,
    height: 314,
    right: -97,
    top: 32,
    experimental_backgroundImage: glowGradient(107),
  },
  /** 왼쪽 위 — 시안의 지름 157 원(왼쪽 변에서 10 밖, 위에서 48.5 밖). */
  glowLeft: {
    width: 257,
    height: 257,
    left: -60,
    top: -98.5,
    experimental_backgroundImage: glowGradient(78.5),
  },
  /** 빛 위에 덮는 판의 색 — graphite. 투명도(80%)는 paneTintStyle이 맡는다(숨 쉴 때 옅어진다). */
  paneTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: Ink.strong,
  },
  /** 카드의 글과 표지 — 바탕은 paneTint가 깐다. 시안의 흰 테두리는 빼기로 했다. */
  cardPane: {
    flex: 1,
    // ScaleButton은 기본으로 안엣것을 가운데에 모은다 — 카드는 위에서부터 쌓아야 한다.
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: 20,
  },
  /** 표지에 지는 그림자(시안의 Elevation 1). */
  cardCover: {
    boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
  },
  cardHeading: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 26,
    color: Ink.onDark,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardTexts: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTop: {
    gap: 2,
  },
  cardTitle: {
    fontFamily: Type.readingBold,
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Ink.onDark,
  },
  cardIntro: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    lineHeight: 22,
    color: Surface.plate,
  },
  cardLink: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 25,
    color: Spark.ember,
  },
  buttons: {
    alignItems: 'center',
    gap: 16,
  },
  /**
   * 완료하고 홈으로 — 테두리만 있는 버튼.
   *
   * 시안은 흰 바탕에 채운 알약인데, 검은 화면에서 그것이 가장 밝아 눈이 카드를 건너뛰고 곧장
   * 이리 왔다. 나가는 길은 늘 있어야 하지만 주인공일 필요는 없어서 한 단계 낮췄다.
   */
  homeButton: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Ink.muted,
  },
  homeText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.onDark,
  },
  nextLink: {
    paddingVertical: 8,
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.muted,
  },
});
