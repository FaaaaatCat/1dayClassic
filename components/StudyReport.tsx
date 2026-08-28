import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 며칠째 이어 왔는지 — 아직 기록하는 곳이 없어 넣어 둔 값이다.
 *
 * 서재 상세의 독서 기록도 지금은 전부 0으로 박혀 있다(LibraryBookDetailScreen).
 * 공부 기록이 실제로 쌓이기 시작하면 그 값을 여기로 넘겨받아 지운다.
 */
const STREAK_DAYS = 7;

/** 숫자가 촤르르 올라가는 시간. 끝에서 느려져 멎는 맛이 나도록 뒤를 눌러 뒀다. */
const COUNT_MS = 1100;
/** 숫자가 멎은 뒤 나머지가 떠오르는 시간. */
const REVEAL_MS = 420;
/** 나머지가 다 뜬 뒤에야 버튼이 아래에서 올라온다. */
const BUTTON_DELAY_MS = 320;
const BUTTON_MS = 420;
/** 버튼이 올라오기 시작하는 높이. */
const BUTTON_RISE = 32;

/**
 * 오늘의 공부 리포트 — 공부를 마치면 뜨는 검은 화면.
 *
 * 순서가 이 화면의 전부다. 처음에는 숫자 하나만 있고, 그 숫자가 0에서 촤르르 올라가
 * 멎은 다음에야 나머지가 떠오르고, 그게 다 뜬 뒤에 버튼이 아래에서 올라온다. 셋이
 * 겹치면 무엇을 보라는 화면인지 흐려진다.
 *
 * 숫자는 리애니메이티드가 아니라 평범한 state로 센다. 리애니메이티드로 글자를 바꾸려면
 * TextInput에 animatedProps를 물려야 하는데, 그러면 안드로이드에서 자체 여백과 baseline이
 * 딸려 와 큰 글자의 자리가 틀어진다. 1초 남짓 도는 숫자에 치를 값이 아니다.
 */
export default function StudyReport({
  date,
  bookTitle,
  onOpenReport,
}: {
  /** 책을 읽은 날짜 — '2026년 8월 28일' 꼴로 넘긴다. */
  date: string;
  bookTitle: string;
  onOpenReport: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const reveal = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    let raf = 0;
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / COUNT_MS, 1);
      // 뒤로 갈수록 느려진다 — 끝에서 딱 멎지 않고 미끄러져 서는 느낌.
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * STREAK_DAYS));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // 숫자가 멎고 나서야 나머지, 그다음 버튼.
      reveal.value = withTiming(1, { duration: REVEAL_MS });
      lift.value = withDelay(
        REVEAL_MS + BUTTON_DELAY_MS,
        withTiming(1, { duration: BUTTON_MS, easing: Easing.out(Easing.cubic) }),
      );
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reveal, lift]);

  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const liftStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ translateY: (1 - lift.value) * BUTTON_RISE }],
  }));

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}>
      {/* 검은 바탕에서는 앱의 기본 상태바(어두운 아이콘)가 묻힌다. 이 화면에서만 밝게. */}
      <StatusBar style="light" />

      <View style={styles.center}>
        <Animated.Text style={[styles.headline, revealStyle]}>Keep it up!</Animated.Text>

        <Text style={styles.count}>
          {count}
          <Text style={styles.countUnit}>일</Text>
        </Text>

        <Animated.View style={[styles.chip, revealStyle]}>
          <Text style={styles.chipText}>🔥 연속 공부</Text>
        </Animated.View>

        <Animated.View style={[styles.meta, revealStyle]}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.book}>{bookTitle}</Text>
        </Animated.View>
      </View>

      <Animated.View style={liftStyle}>
        <ScaleButton
          accessibilityLabel="리포트 보러가기"
          style={styles.button}
          onPress={onOpenReport}>
          <Text style={styles.buttonText}>리포트 보러가기</Text>
        </ScaleButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 화면 전체를 먹으로 채운다 — 팔레트에서 가장 어두운 색(#030303). */
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: Colors.brown100,
  },
  /** 숫자 묶음은 화면 한가운데. 버튼은 아래에 남는다. */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  headline: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 30,
    color: Colors.white,
  },
  /** 큰 숫자에는 흰 빛을 흘려 둔다 — 검은 바탕에서 이것만 떠 보여야 한다. */
  count: {
    fontFamily: Fonts.semiBold,
    fontSize: 96,
    lineHeight: 112,
    color: Colors.white,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  countUnit: {
    fontFamily: Fonts.semiBold,
    fontSize: 36,
    color: Colors.white,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.brown90,
  },
  chipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  /** 날짜와 책 제목 — 숫자보다 뒤로 물러나 앉는다. */
  meta: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 24,
  },
  date: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
  },
  book: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown10,
  },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
});
