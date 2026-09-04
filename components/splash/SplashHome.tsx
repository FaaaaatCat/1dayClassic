import { Image, StyleSheet, View } from 'react-native';

import WelcomeSheet from '@/components/splash/WelcomeSheet';
import { Ink } from '@/constants/theme';

/**
 * 마지막 걸음 — 미리보기 전용.
 *
 * 뒤에 깔린 것은 홈 화면을 찍어 둔 그림이다(assets/test/home-shot.png — 원래 이름에 빈칸과
 * 한글이 있어 번들러가 헛짚을 수 있으므로 영문으로 바꿔 두었다). 진짜 홈을 띄우지 않은 것은
 * 미리보기 안에서 홈을 열면 그 홈이 또 자기 일을 하기 시작하기 때문이다.
 *
 * 실제 온보딩에서는 이 자리에 진짜 홈이 온다 — 그때는 홈 화면이 WelcomeSheet를 직접 얹는다
 * (app/(tabs)/index.tsx). 창은 둘이 같은 것을 쓴다.
 */
export default function SplashHome({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.screen}>
      <Image source={require('@/assets/test/home-shot.png')} style={styles.shot} resizeMode="cover" />
      <WelcomeSheet onDone={onDone} />
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
});
