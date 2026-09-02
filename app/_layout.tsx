import AsyncStorage from '@react-native-async-storage/async-storage';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AlarmProvider } from '@/context/AlarmContext';
import { BgmProvider } from '@/context/BgmContext';
import { BookmarkProvider } from '@/context/BookmarkContext';
import { BookSelectionProvider } from '@/context/BookSelectionContext';
import { NotesProvider } from '@/context/NotesContext';
import { QuizProvider } from '@/context/QuizContext';
import { ShelfProvider } from '@/context/ShelfContext';
import { ToastProvider } from '@/context/ToastContext';
import { StatusTintProvider, useStatusTint } from '@/components/StatusBarTint';
import { Palette } from '@/constants/theme';
import {
  getPermissionStatus,
  hasAllAlarmPermissions,
  openAlarmPermissionSettings,
} from '@/modules/alarm-clock';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

/** 권한 안내를 이미 한 번 했는지. 설치 후 처음 켰을 때만 묻기 위해 남긴다. */
const PERMISSION_PROMPT_KEY = 'alarm-permission-prompted-v1';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Palette.background,
    card: Palette.card,
    text: Palette.text,
    primary: Palette.primary,
  },
};

export default function RootLayout() {
  /**
   * 서체는 둘로 나뉜다(constants/theme의 Fonts 주석 참고).
   * 을유1945 — 읽는 글(본문·인용). Pretendard — UI(버튼·라벨·입력칸·표제).
   * DM Serif Display — 인용문 블록 전용(라틴 전용, 한글은 폴백).
   */
  const [fontsLoaded] = useFonts({
    'Eulyoo1945-Regular': require('../assets/fonts/Eulyoo1945-Regular.ttf'),
    'Eulyoo1945-SemiBold': require('../assets/fonts/Eulyoo1945-SemiBold.ttf'),
    'Pretendard-Light': require('../assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    DMSerifDisplay_400Regular,
  });

  /**
   * 권한 안내는 설치 후 처음 앱을 켰을 때 딱 한 번만 한다.
   *
   * 켤 때마다 띄우면 권한을 미룬 사용자에게 매번 같은 팝업을 던지게 된다. 그 뒤로 권한을
   * 확인하고 켜는 곳은 설정 탭의 권한 카드다(components/AlarmPermissionCard.tsx).
   *
   * 물어봤다는 사실은 사용자의 선택과 무관하게 기록한다 — '나중에'를 누른 것도 대답이다.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asked = await AsyncStorage.getItem(PERMISSION_PROMPT_KEY);
        if (cancelled || asked) return;

        const status = await getPermissionStatus();
        if (cancelled) return;

        await AsyncStorage.setItem(PERMISSION_PROMPT_KEY, 'true');
        if (hasAllAlarmPermissions(status)) return;

        Alert.alert(
          '알람 권한 필요',
          '알람이 잘 울리려면 몇 가지 권한이 필요합니다.\n설정 > 알람 권한에서 언제든 확인할 수 있습니다.',
          [
            { text: '나중에', style: 'cancel' },
            { text: '설정 열기', onPress: () => void openAlarmPermissionSettings() },
          ],
        );
      } catch (error) {
        console.warn('[alarm] 권한 상태 확인 실패:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusTintProvider>
      <ThemeProvider value={AppTheme}>
      <AlarmProvider>
        <BookSelectionProvider>
          <ShelfProvider>
          <NotesProvider>
            <QuizProvider>
              <BookmarkProvider>
              <BgmProvider>
              <ToastProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  {/* 전면 광고 — 스와이프로 닫히면 안 되므로 제스처를 막는다.
                      지금은 여는 곳이 없다(app/ad.tsx 주석 참고). 라우트만 살려 두어
                      붙일 자리가 정해지면 router.push('/ad')로 바로 쓴다. */}
                  <Stack.Screen
                    name="ad"
                    options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
                  />
                  {/* 카드 슬라이드 미리보기 — 탭바 없이 전면으로 떠야 카드 넘김이 제대로 보인다.
                      좌우 스와이프가 카드 넘김이라 뒤로가기 제스처와 부딪히므로 막는다. */}
                  <Stack.Screen
                    name="card-slide-preview"
                    options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
                  />
                  {/* 인스타 스토리 미리보기 — 카드 슬라이드와 같은 이유로 전면에 띄운다.
                      좌우 탭이 장 넘김이라 뒤로가기 제스처와 부딪히므로 막는다. */}
                  <Stack.Screen
                    name="insta-preview"
                    options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
                  />
                  {/* 원페이지 미리보기 — 상세와 같은 껍데기라 탭바 없이 전면으로 떠야 한다.
                      여기는 좌우 스와이프를 쓰지 않으므로 뒤로가기 제스처를 막지 않는다. */}
                  <Stack.Screen name="onepage-preview" options={{ headerShown: false }} />
                </Stack>
              </ToastProvider>
              </BgmProvider>
              </BookmarkProvider>
            </QuizProvider>
          </NotesProvider>
          </ShelfProvider>
        </BookSelectionProvider>
        </AlarmProvider>

        {/* 상태바 — 지금 화면이 정한 색을 그대로 쓴다(components/StatusBarTint). */}
        <StatusBarBand />
      </ThemeProvider>
      </StatusTintProvider>
    </SafeAreaProvider>
  );
}

/**
 * 상태바 자리에 까는 띠.
 *
 * 색은 지금 보이는 화면이 정한다(components/StatusBarTint). 띠가 페이지와 같은 색이라야
 * 상태바가 화면 속으로 사라진다 — 하나로 고정하면 흰 화면 위에 띠 한 줄이 남는다. 글자
 * 밝기도 함께 따라가므로 흰 화면에서는 검은 시계가, 검은 화면에서는 흰 시계가 보인다.
 *
 * 배경색을 StatusBar 컴포넌트로 주지 않고 직접 뷰를 까는 건, 안드로이드가 edge-to-edge로
 * 바뀌면서 상태바 배경색을 앱이 정할 수 없게 됐기 때문이다. 화면은 상태바 아래까지 그려지고,
 * 그 위에 우리가 띠를 덮는 것이 지금 남은 방법이다.
 *
 * 화면들이 각자 insets.top만큼 여백을 두고 있으므로, 이 띠는 자리를 차지하지 않는
 * absolute로 얹는다 — 흐름에 넣으면 여백이 두 번 들어가 내용이 그만큼 내려간다.
 */
function StatusBarBand() {
  const insets = useSafeAreaInsets();
  const tint = useStatusTint();
  return (
    <>
      <View
        style={[styles.band, { height: insets.top, backgroundColor: tint.color }]}
        pointerEvents="none"
      />
      <StatusBar style={tint.icons} />
    </>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // 화면들 위에 얹혀야 한다. 뷰어의 카드나 팝업이 여기까지 올라오지 않도록.
    zIndex: 1000,
  },
});
