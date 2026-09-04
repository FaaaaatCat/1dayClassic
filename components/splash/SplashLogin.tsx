import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/** 시트가 올라오는 데 걸리는 시간. */
const RISE_MS = 320;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 로그인 — 마지막 장 위로 올라오는 시트.
 *
 * 화면을 갈아 끼우지 않는다. 첫 화면의 셋째 장이 뒤에 그대로 남고 그 위로 시트만 올라온다 —
 * 로그인은 '다음 장'이 아니라 '지금 이 자리에서 들어가는 문'이기 때문이다.
 *
 * 딤을 누르면 도로 내려간다. 시트에는 닫는 버튼이 따로 없어서, 그것이 유일한 무르는 길이다.
 *
 * 지금은 어느 버튼을 눌러도 그냥 다음으로 간다 — 미리보기라 실제 로그인은 붙이지 않았다.
 */
export default function SplashLogin({
  onDone,
  onDismiss,
}: {
  onDone: () => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <AnimatedPressable
        entering={FadeIn.duration(RISE_MS)}
        accessibilityRole="button"
        accessibilityLabel="로그인 닫기"
        style={styles.dim}
        onPress={onDismiss}
      />

      <Animated.View
        entering={SlideInDown.duration(RISE_MS)}
        style={[styles.sheet, { paddingBottom: Space[20] + insets.bottom }]}>
        <Text style={styles.headline}>{'하루를 여는 알람이\n한 쪽의 책이 되도록'}</Text>

        <ScaleButton accessibilityLabel="카카오로 계속하기" style={styles.kakao} onPress={onDone}>
          <Ionicons name="chatbubble" color={KAKAO_LABEL} size={18} />
          <Text style={styles.kakaoText}>카카오로 계속하기</Text>
        </ScaleButton>

        <ScaleButton accessibilityLabel="구글로 계속하기" style={styles.google} onPress={onDone}>
          <Ionicons name="logo-google" color={Ink.primary} size={18} />
          <Text style={styles.googleText}>Google로 계속하기</Text>
        </ScaleButton>

        <Text style={styles.terms}>회원가입 시 이용약관 및 개인정보처리방침에 동의합니다.</Text>
      </Animated.View>
    </View>
  );
}

/** 카카오의 노랑과 그 위 글자색 — 브랜드 색이라 팔레트가 아니라 여기 둔다. */
const KAKAO = '#FEE500';
const KAKAO_LABEL = '#191600';

const styles = StyleSheet.create({
  /** 뒤 화면 위에 통째로 얹히는 층. 빈 데는 뒤가 그대로 보인다. */
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  /** 뒤를 가라앉힌다. 누르면 시트가 내려간다. */
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  /** 시트 — 위 두 귀만 둥글다. 여기부터가 누르는 자리다. */
  sheet: {
    gap: Space[12],
    paddingHorizontal: Space[20],
    paddingTop: Space[32],
    borderTopLeftRadius: Corner.largeCard,
    borderTopRightRadius: Corner.largeCard,
    backgroundColor: Surface.canvas,
  },
  headline: {
    fontFamily: Type.readingBold,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.primary,
    marginBottom: Space[8],
  },
  kakao: {
    flexDirection: 'row',
    gap: Space[8],
    height: 52,
    borderRadius: Corner.pill,
    backgroundColor: KAKAO,
  },
  kakaoText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: KAKAO_LABEL,
  },
  google: {
    flexDirection: 'row',
    gap: Space[8],
    height: 52,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Surface.canvas,
  },
  googleText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  terms: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    textAlign: 'center',
    color: Ink.muted,
    marginTop: Space[8],
  },
});
