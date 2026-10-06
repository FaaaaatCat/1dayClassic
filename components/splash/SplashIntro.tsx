import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import SplashLogin from '@/components/splash/SplashLogin';
import { Corner, Ink, Space, Spark, Type } from '@/constants/theme';

/**
 * 첫 화면 — 이 앱이 무엇인지 한 장으로 말한다(피그마 시안 '01 인트로').
 *
 * 가운데 종이 한 장이 점선을 따라 반으로 갈리는 그림, 그 아래 한 줄과 이름, 맨 아래
 * 시작하기 버튼과 로그인 길. 예전에는 세 장을 넘겼는데, 하고 싶은 말은 '좋은 책을 하루치로
 * 잘라 드린다' 하나라 한 장으로 줄였다.
 *
 * '하루서점 시작하기'와 '로그인하기'는 둘 다 아래에서 회원가입 시트를 올린다(SplashLogin).
 * 시트의 버튼은 아직 실제 가입을 하지 않고 그대로 다음 걸음으로 넘어간다 — MVP에는 서버가
 * 없어 계정으로 지킬 것이 없다.
 */
export default function SplashIntro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [login, setLogin] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <View style={styles.art}>
          <PageBreak />
        </View>
        <View style={styles.words}>
          <Text style={styles.lead}>좋은 책을 하루치로 잘라 드립니다</Text>
          <Text style={styles.logo}>하루서점</Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Space[36] + insets.bottom }]}>
        <ScaleButton
          accessibilityLabel="하루서점 시작하기"
          style={styles.cta}
          onPress={() => setLogin(true)}>
          <Text style={styles.ctaText}>하루서점 시작하기</Text>
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
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1);
  }, [progress]);

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
    <View style={styles.pageBreak} accessibilityRole="image" accessibilityLabel="반으로 갈리는 종이">
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
  body: {
    flex: 1,
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
