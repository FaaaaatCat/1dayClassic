import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Spark, Surface, Type, trackBody } from '@/constants/theme';

/**
 * 광고 자리의 예시 그림 — 시안(피그마 '광고_구글애즈')에 넣어 둔 것을 그대로 쓴다.
 * 실제 광고(구글 애즈)를 붙이면 이 그림 대신 광고 보기가 이 자리에 선다.
 */
const SAMPLE_AD = require('@/assets/images/ads/sample-google-ad.png');
/** 시안의 광고 자리 비율 — 360×375. */
const AD_RATIO = 360 / 375;
/**
 * '홈으로 돌아가기'가 눌리기까지 세는 초 — 10에서 0까지 센 뒤에야 글자가 바뀌고 눌린다.
 * 광고를 한 번은 보게 하려는 것이다(광고 제거하기는 그동안에도 눌린다).
 */
const COUNTDOWN_FROM = 10;

/**
 * 광고_구글애즈 — 오늘 독서를 마치고 나가는 길에 한 번 보여 주는 광고 자리(피그마 '광고_구글애즈').
 *
 * 위에 고마움을 전하는 두 줄, 가운데 광고, 아래에 '홈으로 돌아가기'와 '광고 제거하기'.
 * 광고 제거(유료)는 아직 없어서 누르면 준비 중이라는 토스트만 띄운다 — 부르는 쪽이 정한다.
 */
export default function GoogleAdScreen({
  onHome,
  onRemoveAds,
}: {
  onHome: () => void;
  onRemoveAds: () => void;
}) {
  const insets = useSafeAreaInsets();
  /**
   * 광고 자리의 크기 — 화면 폭에 시안 비율(360×375)을 곱해 숫자로 박는다.
   *
   * 처음엔 width '100%' + aspectRatio로 두었는데 광고가 화면을 거의 다 덮었다. 그림 파일이
   * 3배 크기(1080×1125)인데 이름에 @3x가 없어, 리액트 네이티브가 그 픽셀을 그대로 dp로 읽어
   * 원래 크기를 1080×1125로 잡았고, 비율 셈보다 그 크기가 앞섰다. 폭과 높이를 숫자로 주면
   * 그림의 원래 크기와 상관없이 이 칸에 맞춰 그린다.
   */
  const { width: screenW } = useWindowDimensions();
  const adSize = { width: screenW, height: screenW / AD_RATIO };

  /** 남은 초 — 0이 되고 1초 뒤에 '홈으로 돌아가기'로 바뀐다(-1이 그 상태다). */
  const [left, setLeft] = useState(COUNTDOWN_FROM);
  useEffect(() => {
    if (left < 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  const ready = left < 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.thanks}>{'시청해 주신 광고는 더 좋은 앱을\n만드는 데 도움이 됩니다.'}</Text>
      </View>

      <Animated.View entering={FadeIn.duration(400)}>
        <Image
          source={SAMPLE_AD}
          style={adSize}
          resizeMode="cover"
          accessibilityLabel="광고"
        />
      </Animated.View>

      {/* 아래 버튼은 처음부터 떠 있다. '홈으로 돌아가기'는 세는 동안 흰 버튼 그대로 두고 누르기만 막는다. */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <ScaleButton
          accessibilityLabel={ready ? '홈으로 돌아가기' : `${left}초 뒤에 홈으로 돌아갈 수 있어요`}
          disabled={!ready}
          style={styles.home}
          onPress={onHome}>
          <Text style={styles.homeText}>
            {ready ? '홈으로 돌아가기' : String(left)}
          </Text>
          {ready ? <Ionicons name="arrow-forward" size={18} color={Ink.primary} /> : null}
        </ScaleButton>
        <Text
          style={styles.remove}
          onPress={onRemoveAds}
          accessibilityRole="button"
          suppressHighlighting>
          광고 제거하기
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /**
   * 위 — 글은 상태바 바로 아래에서 시작한다.
   *
   * 처음엔 위·아래가 남는 높이를 반씩 나눠 가져 광고가 가운데 섰는데, 광고와 아래 버튼 사이가
   * 너무 좁았다. 버튼은 더 내릴 수 없어서, 위를 제 높이만 쓰게 해 글과 광고를 위로 올리고 남는
   * 높이는 모두 광고와 버튼 사이(bottom)가 갖는다.
   */
  top: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  thanks: {
    fontFamily: Type.uiMedium,
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: -0.8,
    textAlign: 'center',
    color: Ink.onDark,
  },
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  /** 글자와 오른쪽 화살표를 한 줄에 — 다 센 뒤에만 화살표가 붙는다. */
  home: {
    flexDirection: 'row',
    gap: 6,
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
  remove: {
    paddingVertical: 8,
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Spark.ember,
  },
});
