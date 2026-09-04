import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import SplashFlow from '@/components/splash/SplashFlow';
import SplashHome from '@/components/splash/SplashHome';
import { Corner, Ink, Space, Type, TypeScale } from '@/constants/theme';

/**
 * 첫 실행 흐름 미리보기 — 설정에서 연다.
 *
 * 흐름 자체는 진짜 온보딩과 같은 것을 쓴다(SplashFlow). 다른 점은 둘뿐이다.
 *
 * 하나, **아무것도 저장하지 않는다.** 책을 고르든 알람을 맞추든 그 답은 이 화면을 닫는
 * 순간 사라지고, 권한도 묻지 않는다 — 미리보기에서 맞춘 시각으로 아침에 알람이 울리면
 * 안 된다. 저장하는 자리는 app/onboarding.tsx다.
 *
 * 둘, 로그인 시트를 띄운다. 실제 흐름에서는 지나가지만 화면은 만들어 두었으므로,
 * 눈으로 확인할 수 있는 자리를 여기 남긴다.
 *
 * 마지막 홈은 찍어 둔 그림이다 — 여기서 진짜 홈을 열면 그 홈이 또 자기 일을 시작한다.
 */
export default function SplashPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [done, setDone] = useState(false);

  /** 미리보기를 닫고 설정으로 — 우측 위 ✕와 마지막 화면의 버튼이 함께 쓴다. */
  const close = () => router.replace('/settings');

  return (
    <View style={styles.screen}>
      {done ? <SplashHome onDone={close} /> : <SplashFlow withLogin onFinish={() => setDone(true)} />}

      {/*
        나가는 문 — 어느 걸음에서든 바로 설정으로 되돌아간다. 걸음이 바뀌어도 같은 자리에
        못 박혀 있어야 찾지 않고 누를 수 있어 오른쪽 맨 위에 둔다.
      */}
      <ScaleButton
        accessibilityLabel="미리보기 닫기"
        style={[styles.close, { top: insets.top + Space[8] }]}
        onPress={close}>
        <Text style={styles.closeText}>✕</Text>
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /** 닫기 — 어느 화면 위에든 뜬다. 밝은 화면에서도 보이게 어두운 알약을 깐다. */
  close: {
    position: 'absolute',
    right: Space[16],
    width: 36,
    height: 36,
    borderRadius: Corner.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
});
