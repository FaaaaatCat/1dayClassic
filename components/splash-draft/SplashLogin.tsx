import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

/** 시트가 올라오는 데 걸리는 시간. */
const RISE_MS = 320;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 회원가입·로그인 — 첫 화면 위로 아래에서 올라오는 시트(피그마 시안 '02 인트로 + 로그인 시트').
 *
 * 화면을 갈아 끼우지 않는다. 첫 화면이 뒤에 그대로 남고 그 위로 시트만 올라온다 —
 * 가입은 '다음 장'이 아니라 '지금 이 자리에서 들어가는 문'이기 때문이다.
 *
 * 딤을 누르면 도로 내려간다. 시트에는 닫는 버튼이 따로 없어서, 그것이 유일한 무르는 길이다.
 *
 * 출판사에 보일 데모 앱이라 실제 가입·로그인이 없다. '데모계정으로 계속하기'만 다음으로 넘어가고,
 * '회원가입'은 자리만 보여 줄 뿐 눌러도 아무 일도 하지 않는다.
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
        style={[styles.sheet, { paddingBottom: Space[36] + insets.bottom }]}>
        <Text style={styles.headline}>{'하루를 여는 알람이\n한 쪽의 책이 되도록'}</Text>

        <ScaleButton accessibilityLabel="데모계정으로 계속하기" style={styles.demo} onPress={onDone}>
          <Ionicons name="person-circle-outline" color={Ink.onDark} size={18} />
          <Text style={styles.demoText}>데모계정으로 계속하기</Text>
        </ScaleButton>

        {/* 데모 앱에는 가입할 곳이 없다 — 버튼 자리만 두고 누름은 받지 않는다. */}
        <ScaleButton accessibilityLabel="회원가입" style={styles.signup} disabled>
          <Text style={styles.signupText}>회원가입</Text>
        </ScaleButton>

        <Text style={styles.terms}>회원가입 시 이용약관 및 개인정보처리방침에 동의합니다.</Text>
      </Animated.View>
    </View>
  );
}

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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    // 두 줄이 붙어 보이지 않게 줄 간격을 넉넉히(시안: 글자 크기의 1.6배).
    lineHeight: 22 * 1.6,
    textAlign: 'center',
    color: Ink.primary,
    marginBottom: Space[8],
  },
  /** 데모 계정 — 이 시트에서 유일하게 앞으로 가는 버튼이라 포인트 색을 준다. */
  demo: {
    flexDirection: 'row',
    gap: Space[8],
    height: 56,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  demoText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
  signup: {
    height: 56,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Surface.canvas,
  },
  signupText: {
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
