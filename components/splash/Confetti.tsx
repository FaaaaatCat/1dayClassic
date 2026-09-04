import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Corner, Ink, Spark } from '@/constants/theme';

/** 터진 뒤 다 가라앉기까지. */
const DURATION = 1100;
/** 날리는 조각의 수. */
const PIECES = 34;
/** 조각이 사그라들기 시작하는 지점 — 이 뒤로 마저 떨어지며 지워진다. */
const FADE_FROM = 0.7;

/** 조각 색 — 팔레트에 있는 것만 쓴다. */
const COLORS = [Spark.ember, Spark.violet, Ink.primary, Ink.muted];

/**
 * 축하 포탄.
 *
 * 화면 아래 가운데에서 부채꼴로 터져 올라갔다가 떨어진다. 라이브러리를 들이지 않고 조각
 * 서른넷을 직접 날린다 — 한 번 쓰고 마는 효과에 패키지를 하나 더 얹을 일은 아니다.
 *
 * 조각마다 애니메이션을 따로 돌리지 않는다. 시간을 재는 값 하나(progress)를 모두가 나눠
 * 보고, 각자 자기 각도와 속도로 그 시간 위의 자리를 계산한다 — 서른넷이 아니라 하나가 돈다.
 *
 * 손가락은 받지 않는다. 축하는 보는 것이지 누르는 것이 아니다.
 */
export default function Confetti({ onDone }: { onDone?: () => void }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.linear },
      (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 조각들의 성질 — 한 번 정하면 끝까지 그대로다.
   *
   * 진짜 난수를 쓰면 다시 그릴 때마다 자리가 바뀌어 조각이 튄다. 번호에서 늘 같은 값이
   * 나오는 셈법으로 뽑아 두면 몇 번을 다시 그려도 같은 포탄이 터진다.
   */
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        // 위쪽 부채꼴(20°~160°)로 고르게 편다.
        const angle = ((20 + noise(i, 1) * 140) * Math.PI) / 180;
        const power = 0.65 + noise(i, 2) * 0.35;
        return {
          dx: Math.cos(angle) * width * 0.55 * power,
          rise: Math.sin(angle) * height * 0.62 * power,
          fall: height * 0.75,
          spin: (noise(i, 3) < 0.5 ? -1 : 1) * (360 + noise(i, 4) * 540),
          color: COLORS[i % COLORS.length],
          w: 5 + Math.round(noise(i, 5) * 4),
          h: 9 + Math.round(noise(i, 6) * 6),
          // 한꺼번에 터지되 아주 조금씩 어긋나야 뭉치지 않는다.
          delay: noise(i, 7) * 0.12,
        };
      }),
    [width, height],
  );

  return (
    <View style={styles.layer} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Piece key={i} piece={piece} progress={progress} />
      ))}
    </View>
  );
}

/** 조각 하나가 태어날 때 정해지는 것들. 날아가는 동안 바뀌지 않는다. */
interface PieceSpec {
  /** 가로로 밀려나는 거리. */
  dx: number;
  /** 처음에 솟는 높이. */
  rise: number;
  /** 떨어지는 힘 — 시간의 제곱으로 붙는다. */
  fall: number;
  /** 도는 각도(도). 음수면 반대로 돈다. */
  spin: number;
  color: string;
  w: number;
  h: number;
  /** 터지는 시각의 어긋남(0~1). */
  delay: number;
}

/** 조각 하나 — 올라갔다 떨어지며 돌고, 끝에서 지워진다. */
function Piece({ piece, progress }: { piece: PieceSpec; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // 제 차례가 오기 전에는 아직 통 안에 있다.
    const t = Math.max(0, (progress.value - piece.delay) / (1 - piece.delay));

    // 올라가는 힘은 일정하고 떨어지는 힘은 시간의 제곱으로 붙는다 — 던진 것의 길이다.
    const y = -piece.rise * t + piece.fall * t * t;
    const fade = t < FADE_FROM ? 1 : Math.max(0, 1 - (t - FADE_FROM) / (1 - FADE_FROM));

    return {
      opacity: t > 0 ? fade : 0,
      transform: [
        { translateX: piece.dx * t },
        { translateY: y },
        { rotate: `${piece.spin * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.w, height: piece.h, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

/**
 * 번호에서 0과 1 사이의 값을 하나 뽑는다.
 *
 * sin을 크게 부풀린 뒤 소수점 아래만 남기는, 흔히 쓰는 셈법이다. 진짜 난수는 아니지만
 * 같은 번호에는 늘 같은 값이 나오고 눈에는 흩어져 보인다 — 여기서 필요한 것이 그것뿐이다.
 */
function noise(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  /** 조각 — 터지는 자리(화면 아래 가운데)에 겹쳐 두고 거기서부터 옮긴다. */
  piece: {
    position: 'absolute',
    bottom: 0,
    borderRadius: Corner.input,
  },
});
