import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

/** 원이 다 차는 데 걸리는 시간. */
const FILL_MS = 2600;
/** 다 차고 나서 다음 화면으로 넘어가기 전에 잠깐 머무는 시간. */
const HOLD_MS = 420;
/** 원의 지름. */
const SIZE = 160;

/**
 * 로딩 — 원이 아래에서부터 차오른다.
 *
 * 시안은 다 찬 모습(주황 원에 흰 숫자)만 있어서, 거기까지 가는 길을 만들었다. 호를 그리는
 * 방식은 쓰지 않았다 — 그러려면 SVG가 필요한데 이 프로젝트에는 그 패키지가 없고, 그것
 * 하나 때문에 들이기에는 값이 크다.
 *
 * 대신 물이 차오르듯 채운다. 숫자는 두 벌을 겹쳐 두고 그중 한 벌만 차오른 만큼 드러낸다 —
 * 물이 지나가면서 검은 숫자가 흰 숫자로 바뀐다. 색을 바꾸는 코드는 한 줄도 없고, 잘리는
 * 자리가 곧 물의 높이다.
 */
export default function SplashLoading({ onDone }: { onDone: () => void }) {
  const progress = useSharedValue(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    /** 다 찬 화면을 눈이 알아볼 틈을 준 뒤에 넘어간다. */
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hold = () => {
      timer = setTimeout(onDone, HOLD_MS);
    };

    progress.value = withTiming(
      1,
      { duration: FILL_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(hold)();
      },
    );

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 숫자를 화면에 올린다.
   *
   * 매 프레임 올리면 초당 60번 다시 그리게 되므로, 정수가 바뀔 때만 올린다 —
   * 어차피 눈에 보이는 것은 101개의 값뿐이다.
   */
  const shownPercent = useSharedValue(-1);
  useDerivedValue(() => {
    const next = Math.round(progress.value * 100);
    if (next === shownPercent.value) return;
    shownPercent.value = next;
    runOnJS(setPercent)(next);
  });

  /** 차오른 물의 높이. 아래에 붙어 있어 위로 자란다. */
  const fillStyle = useAnimatedStyle(() => ({ height: SIZE * progress.value }));

  /** 차오르는 동안 원이 아주 조금 커진다 — 멈춰 있는 그림이 아니라는 신호다. */
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + 0.06 * progress.value }],
  }));

  const label = `${percent}%`;

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.circle, circleStyle]}>
        {/* 아직 안 찬 자리 — 옅은 주황 바탕에 검은 숫자. */}
        <Text style={[styles.percent, styles.percentBelow]}>{label}</Text>

        {/*
          차오른 자리. 이 층은 아래에 붙어 높이만 자라고 넘치는 것을 잘라 낸다.
          안엣것은 원과 같은 크기로 두고 아래에 붙여 둬서, 잘려도 숫자가 제자리에 남는다.
        */}
        <Animated.View style={[styles.fillClip, fillStyle]}>
          <View style={styles.fillInner}>
            <Text style={[styles.percent, styles.percentAbove]}>{label}</Text>
          </View>
        </Animated.View>
      </Animated.View>

      <Text style={styles.note}>책 추천하는 중 …</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[20],
    backgroundColor: Surface.card,
  },
  /** 원 — 아직 안 찬 바탕은 주황을 옅게 깐 것이다. */
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  /** 물 — 원 안에서 아래에 붙어 위로 자란다. */
  fillClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: Spark.ember,
  },
  /** 잘려도 숫자가 제자리에 있도록, 원과 같은 크기로 두고 아래에 붙인다. */
  fillInner: {
    position: 'absolute',
    bottom: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontFamily: Type.uiMedium,
    fontSize: 32,
    lineHeight: 38,
  },
  percentBelow: {
    color: Ink.primary,
  },
  percentAbove: {
    color: Ink.onDark,
  },
  note: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
});
