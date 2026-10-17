import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import SplashFlow from '@/components/splash/SplashFlow';
import SplashHome from '@/components/splash/SplashHome';
import { Ink } from '@/constants/theme';

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
  const [done, setDone] = useState(false);

  /** 미리보기를 닫고 설정으로 — 기기의 뒤로가기와 마지막 화면의 버튼이 함께 쓴다. */
  const close = useCallback(() => router.replace('/settings'), [router]);

  /**
   * 나가는 길은 기기의 뒤로가기다. 예전에는 오른쪽 위에 ✕를 띄웠는데, 진짜 첫 실행과 똑같이
   * 보이도록 걷어냈다(질문 화면의 진행 줄이 그 자리를 비워 두지 않아도 된다).
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      });
      return () => subscription.remove();
    }, [close]),
  );

  return (
    <View style={styles.screen}>
      {done ? <SplashHome onDone={close} /> : <SplashFlow askPermissions={false} onFinish={() => setDone(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
