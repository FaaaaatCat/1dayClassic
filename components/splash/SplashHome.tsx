import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

/** 아래에서 올라오는 창이 차지하는 높이의 몫. 위로는 표지가 보일 만큼 남긴다. */
const SHEET_RATIO = 0.57;
/** 창이 올라오는 데 걸리는 시간. */
const RISE_MS = 420;

/**
 * 마지막 걸음 — 홈에 닿았다.
 *
 * 뒤에 깔린 것은 홈 화면을 찍어 둔 그림이다(assets/test/home-shot.png — 원래 이름에 빈칸과
 * 한글이 있어 번들러가 헛짚을 수 있으므로 영문으로 바꿔 두었다). 진짜 홈을 띄우지 않은 것은
 * 미리보기 안에서 홈을 열면 그 홈이 또 자기 일을 하기 시작하기 때문이다 — 여기서 볼 것은
 * 첫 실행의 마지막 장면이지 홈 자체가 아니다.
 *
 * 그 위로 창 하나가 올라와 첫 선물을 알린다.
 */
export default function SplashHome({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Image
        source={require('@/assets/test/home-shot.png')}
        style={styles.shot}
        resizeMode="cover"
      />

      {/* 창이 올라오는 동안 뒤가 살짝 가라앉는다. */}
      <Animated.View
        entering={FadeIn.duration(RISE_MS)}
        style={styles.dim}
        pointerEvents="none"
      />

      <Animated.View
        entering={SlideInDown.duration(RISE_MS)}
        style={[styles.sheet, { paddingBottom: Space[8] + insets.bottom }]}>
        <View style={styles.message}>
          <Text style={styles.line}>특별히</Text>
          <Text style={styles.line}>무료로 10화 미리보기를 넣어드렸어요.</Text>
        </View>

        <ScaleButton accessibilityLabel="지금 바로 확인하기" style={styles.cta} onPress={onDone}>
          <Text style={styles.ctaText} numberOfLines={1}>
            지금 바로 확인하기
          </Text>
        </ScaleButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /** 홈 그림 — 화면을 가득 채운다. 위로 창이 덮으므로 아래쪽은 어차피 가려진다. */
  shot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  /**
   * 아래에서 올라오는 창 — 위 두 귀만 둥글다. 아래는 화면 끝에 닿아 있어 둥글릴 것이 없다.
   */
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${SHEET_RATIO * 100}%`,
    paddingHorizontal: Space[8],
    borderTopLeftRadius: Corner.card,
    borderTopRightRadius: Corner.card,
    backgroundColor: Surface.canvas,
  },
  /** 말은 창 한가운데에 놓는다 — 이 창에 있는 것은 그 한 마디뿐이다. */
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[4],
    paddingHorizontal: Space[20],
  },
  line: {
    fontFamily: Type.uiMedium,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.primary,
  },

  cta: {
    height: 48,
    borderRadius: Corner.input,
    backgroundColor: Spark.ember,
  },
  ctaText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.onDark,
  },
});
