import AsyncStorage from '@react-native-async-storage/async-storage';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { AlarmProvider } from '@/context/AlarmContext';
import { BgmProvider } from '@/context/BgmContext';
import { BookSelectionProvider } from '@/context/BookSelectionContext';
import { NotesProvider } from '@/context/NotesContext';
import { QuizProvider } from '@/context/QuizContext';
import { ShelfProvider } from '@/context/ShelfContext';
import { ToastProvider } from '@/context/ToastContext';
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
  // 을유1945 — 기본 서체. DM Serif Display — 인용문 블록 전용(라틴 전용, 한글은 폴백).
  const [fontsLoaded] = useFonts({
    'Eulyoo1945-Regular': require('../assets/fonts/Eulyoo1945-Regular.ttf'),
    'Eulyoo1945-SemiBold': require('../assets/fonts/Eulyoo1945-SemiBold.ttf'),
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
    <ThemeProvider value={AppTheme}>
      <AlarmProvider>
        <BookSelectionProvider>
          <ShelfProvider>
          <NotesProvider>
            <QuizProvider>
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
                </Stack>
              </ToastProvider>
              </BgmProvider>
            </QuizProvider>
          </NotesProvider>
          </ShelfProvider>
        </BookSelectionProvider>
      </AlarmProvider>
    </ThemeProvider>
  );
}
