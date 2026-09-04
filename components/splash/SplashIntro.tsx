import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import SplashLogin from '@/components/splash/SplashLogin';
import { Corner, Ink, Space, Spark, Type, TypeScale } from '@/constants/theme';

/**
 * 첫 화면 — 이 앱이 무엇인지 세 장으로 말한다.
 *
 * 레퍼런스(알라미 온보딩)에서 가져온 것은 짜임뿐이다 — 검은 바탕, 큰 두 줄 표제, 가운데
 * 그림, 아래 점 셋과 버튼 하나. 내용은 이 앱의 것으로 바꿨다. 저쪽이 '의학저널에 등재된'
 * 이라는 권위로 말한다면, 이쪽이 내밀 것은 매일 한 쪽씩 읽히는 책이다.
 *
 * 그림 자리는 아직 에셋이 없어 활자로 채웠다 — 책을 파는 앱이니 활자가 곧 그림이다.
 *
 * 마지막 장에서 시작하기를 누르면 화면을 갈아 끼우지 않고 로그인 시트가 이 위로 올라온다.
 * 그래서 로그인은 걸음이 아니라 이 화면이 품는 상태다 — 무르면 셋째 장이 그대로 남는다.
 *
 * 다만 로그인은 아직 붙일 것이 없다(MVP에는 결제도 서버도 없어 계정으로 지킬 것이 없다).
 * 그래서 실제 온보딩에서는 시트를 띄우지 않고 바로 다음으로 가고, 설정의 미리보기에서만
 * withLogin으로 켜 둔다 — 만들어 둔 화면을 지우지 않고 눈으로 확인할 수 있게.
 */
export default function SplashIntro({
  onDone,
  withLogin = false,
}: {
  onDone: () => void;
  withLogin?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [login, setLogin] = useState(false);
  const slide = SLIDES[page];
  const last = page === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        {/* 장이 바뀔 때마다 다시 떠오르게 key를 준다. */}
        <Animated.View key={page} entering={FadeIn.duration(420)} style={styles.slide}>
          <Text style={styles.headline}>{slide.headline}</Text>

          {/* 그림 자리 — 큰 활자 하나와 그 아래 한 줄. */}
          <View style={[styles.art, { height: Math.min(320, height * 0.36) }]}>
            <Text style={styles.artMark}>{slide.mark}</Text>
            <Text style={styles.artNote}>{slide.note}</Text>
          </View>
        </Animated.View>
      </View>

      {/* 몇 장 중 몇 번째인지. 누르는 것이 아니라 알려 주는 것이라 점으로만 둔다. */}
      <View style={styles.dots}>
        {SLIDES.map((_, index) => (
          <View key={index} style={[styles.dot, index === page && styles.dotOn]} />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: Space[20] + insets.bottom }]}>
        <ScaleButton
          accessibilityLabel={last ? '시작하기' : '다음'}
          style={styles.cta}
          onPress={() => {
            if (!last) return setPage((p) => p + 1);
            return withLogin ? setLogin(true) : onDone();
          }}>
          <Text style={styles.ctaText}>{last ? '시작하기' : '다음'}</Text>
        </ScaleButton>
      </View>

      {login ? <SplashLogin onDone={onDone} onDismiss={() => setLogin(false)} /> : null}
    </View>
  );
}

/**
 * 세 장에 담는 말.
 *
 * 셋 다 이 앱이 실제로 하는 일이다 — 지어낸 문구를 넣지 않았다. 다만 최종 카피는 아니니
 * 문장은 얼마든지 바꿔도 된다.
 */
const SLIDES = [
  {
    headline: '아침에 울리는 것은\n알람이 아니라 오늘 읽을 한 쪽',
    mark: '07:00',
    note: '알람을 끄면 오늘의 공부가 열립니다',
  },
  {
    headline: '하루 한 장,\n일 년이면 책 한 권',
    mark: '365',
    note: '읽은 만큼 쪽수가 쌓입니다',
  },
  {
    headline: '유유출판사의 책을\n하루치로 잘라 드립니다',
    mark: '유유',
    note: '읽고, 한 문제 풀고, 한 줄 남기고',
  },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Space[28],
  },
  slide: {
    alignItems: 'center',
    gap: Space[40],
  },
  headline: {
    fontFamily: Type.readingBold,
    ...TypeScale.heading,
    textAlign: 'center',
    color: Ink.onDark,
  },
  /** 그림이 들어갈 자리 — 지금은 활자가 그 몫을 한다. */
  art: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[16],
  },
  artMark: {
    fontFamily: Type.displayLight,
    fontSize: 72,
    lineHeight: 86,
    color: Spark.ember,
  },
  artNote: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    textAlign: 'center',
    color: Ink.muted,
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

  /** 아래 여백은 기기의 제스처 바만큼 더 준다 — 안 그러면 버튼이 그 아래로 깔린다. */
  footer: {
    paddingHorizontal: Space[20],
  },
  cta: {
    height: 56,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  ctaText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
});
