import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { STREAK_DAYS } from '@/components/StudyReport';
import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';
import type { ReadingQuote } from '@/lib/quotes';

/** 맞힌 수가 0에서 올라가는 시간 — 끝에서 느려져 멎는다(StudyReport와 같은 맛). */
const COUNT_MS = 1100;
/**
 * 세기 전에 0을 보여 주는 시간.
 *
 * 처음엔 화면이 뜨자마자 셌는데, 이 화면은 0.4초에 걸쳐 떠오르고(ReadingFlow의 FadeIn) 숫자는
 * 반올림이라 0.07초 만에 1이 됐다 — 화면이 다 보일 즈음엔 이미 1이어서 1부터 세는 것처럼 보였다.
 * 0을 잠깐(0.25초) 잡아 두고 내림으로 세어 0이 제 몫의 시간을 갖게 한다. 0.6초는 0이 너무 오래 머물렀다.
 */
const COUNT_HOLD_MS = 250;
/** 한 덩이가 떠오르는 시간. */
const SHOW_MS = 500;
/** 연속 독서 칩이 다 뜬 뒤 버튼이 오르기 전에 쉬는 시간. */
const BUTTON_PAUSE_MS = 800;
/**
 * 숫자가 멎은 뒤 차례로 떠오르는 것들의 출발 시각(ms).
 *  0. 책 인용문
 *  1. 인용 출처
 *  2. 연속 독서 칩
 *  3. 아래 버튼 둘 — 칩이 다 뜨고 BUTTON_PAUSE_MS(0.8초) 쉰 뒤
 * '0 / 3'과 '오늘의 퀴즈 정답'은 처음부터 떠 있고 맞힌 수만 0에서 올라간다 — 그래서 여기 없다.
 */
const STEP_START = [0, 600, 1200, 1200 + SHOW_MS + BUTTON_PAUSE_MS];
/** 마지막 것(버튼)까지 다 뜨는 데 걸리는 시간. */
const REVEAL_TOTAL_MS = STEP_START[3] + SHOW_MS;

/**
 * 오늘의 독서 완료 — 퀴즈를 다 풀면 뜨는 검은 화면(피그마 '공부 리포트').
 *
 * 위에서부터 책 인용문과 출처, 오늘의 퀴즈 정답 수, 연속 독서 칩, 그리고 아래 버튼 둘이다.
 * 나타나는 순서는 자리 순서와 다르다 — 처음엔 '0 / 3'과 '오늘의 퀴즈 정답'만 있고 맞힌 수가
 * 0에서 올라간다. 멎으면 위쪽의 인용문, 그 출처, 아래의 연속 독서 칩이 차례로 뜨고, 0.8초 쉰 뒤
 * 버튼이 올라온다. 셈이 끝난 뒤에 문장이 오기 때문에, 축하를 받은 다음 한 문장을 곱씹는 흐름이 된다.
 *
 * 예전엔 다음에 읽을 책을 권하는 카드가 있었는데, 시안에서 빠지고 인용문이 그 자리에 왔다.
 *
 * 인용문은 부르는 쪽이 고른다(lib/quotes의 pickReadingQuote). 연속 일수는 StudyReport의 자리
 * 값(STREAK_DAYS)을 같이 쓴다 — 기록이 쌓이기 시작하면 함께 바꾼다.
 */
export default function StudyComplete({
  correct,
  total,
  quote,
  onHome,
  onNextLesson,
  isLastLesson = false,
}: {
  /** 오늘의 퀴즈에서 맞힌 수와 전체 문제 수. */
  correct: number;
  total: number;
  quote: ReadingQuote;
  onHome: () => void;
  onNextLesson: () => void;
  /** 이 책의 마지막 화인가 — 그러면 '다음 화 읽기'가 '마지막 화 입니다'가 되고 눌리지 않는다. */
  isLastLesson?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const reveal = useSharedValue(0);
  /** 버튼이 눌리는가 — 아직 보이지 않는 버튼이 손가락을 받으면 안 된다. */
  const [buttonsLive, setButtonsLive] = useState(false);

  useEffect(() => {
    let raf = 0;
    let liveTimer: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now() + COUNT_HOLD_MS;
    const tick = () => {
      const t = Math.min(Math.max(0, (Date.now() - start) / COUNT_MS), 1);
      // 내림 — 끝(t=1)에서만 맞힌 수에 닿는다. 0도 1도 같은 몫만큼 머문다.
      setCount(t >= 1 ? correct : Math.floor((1 - Math.pow(1 - t, 3)) * correct));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // 숫자가 멎고 나서야 나머지가 차례로.
      reveal.set(withTiming(1, { duration: REVEAL_TOTAL_MS, easing: Easing.linear }));
      liveTimer = setTimeout(() => setButtonsLive(true), STEP_START[3]);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (liveTimer) clearTimeout(liveTimer);
    };
  }, [correct, reveal]);

  const quoteStyle = useStep(reveal, 0);
  const sourceStyle = useStep(reveal, 1);
  const chipStyle = useStep(reveal, 2);
  const buttonsStyle = useStep(reveal, 3);

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.body}>
        {/* 책 인용문과 출처 — 셈이 끝난 뒤에 차례로. */}
        <View style={styles.quoteBlock}>
          <Animated.Text style={[styles.quote, quoteStyle]}>{`“${quote.ko}”`}</Animated.Text>
          <Animated.Text style={[styles.source, sourceStyle]}>{`『${quote.work}』`}</Animated.Text>
        </View>

        {/* 오늘의 퀴즈 정답 — 처음부터 '0 / 전체'로 떠 있고, 맞힌 수만 0에서 올라간다. */}
        <View style={styles.scoreBlock}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreBig}>{count}</Text>
            <Text style={styles.scoreSlash}>/</Text>
            <Text style={styles.scoreBig}>{total}</Text>
          </View>
          <Text style={styles.scoreLabel}>오늘의 퀴즈 정답</Text>
        </View>

        <Animated.View style={[styles.chip, chipStyle]}>
          <Text style={styles.chipText}>{`🔥 ${STREAK_DAYS}일째 독서중`}</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.buttons, buttonsStyle]}
        pointerEvents={buttonsLive ? 'auto' : 'none'}>
        <ScaleButton accessibilityLabel="오늘 독서 완료하기" style={styles.homeButton} onPress={onHome}>
          <Text style={styles.homeText}>오늘 독서 완료하기</Text>
        </ScaleButton>
        {isLastLesson ? (
          // 더 갈 곳이 없다 — 글만 남기고 누르지 못하게 한다.
          <Text
            style={[styles.nextLink, styles.nextLinkOff]}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}>
            마지막 화 입니다
          </Text>
        ) : (
          <Text
            style={styles.nextLink}
            onPress={onNextLesson}
            accessibilityRole="button"
            suppressHighlighting>
            다음 화 읽기
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

/** order번째 것이 제 차례(STEP_START)부터 SHOW_MS 동안 떠오른다 — 살짝 아래에서. */
function useStep(reveal: SharedValue<number>, order: number) {
  const start = STEP_START[order];
  return useAnimatedStyle(() => {
    const elapsed = reveal.value * REVEAL_TOTAL_MS;
    const t = interpolate(elapsed, [start, start + SHOW_MS], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: (1 - t) * 10 }] };
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 32,
    paddingHorizontal: 20,
    backgroundColor: Ink.primary,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  quoteBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  /** 인용문 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  quote: {
    fontFamily: Type.readingBold,
    fontSize: 22,
    lineHeight: 34,
    letterSpacing: -0.44,
    textAlign: 'center',
    color: Ink.onDark,
  },
  source: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Ink.muted,
  },
  scoreBlock: {
    alignItems: 'center',
  },
  /** 큰 숫자에는 흰 빛을 흘려 둔다 — 검은 바탕에서 이것만 떠 보여야 한다. */
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreBig: {
    fontFamily: Type.uiMedium,
    fontSize: 64,
    lineHeight: 76,
    color: Ink.onDark,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  scoreSlash: {
    fontFamily: Type.uiMedium,
    fontSize: 40,
    lineHeight: 48,
    color: Ink.onDark,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  scoreLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 25,
    color: Ink.onDark,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  chipText: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.onDark,
  },
  buttons: {
    alignItems: 'center',
    gap: 16,
  },
  homeButton: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  homeText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  nextLink: {
    paddingVertical: 8,
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.muted,
  },
  /** 눌리지 않는 '마지막 화 입니다' — 한 단 더 어둡게(Ink.body) 물러난다. */
  nextLinkOff: {
    color: Ink.body,
  },
});
