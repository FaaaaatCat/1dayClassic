import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { AlarmProvider } from '@/context/AlarmContext';
import { BgmProvider } from '@/context/BgmContext';
import { BookSelectionProvider } from '@/context/BookSelectionContext';
import { LikesProvider } from '@/context/LikesContext';
import { NotesProvider } from '@/context/NotesContext';
import { QuizProvider } from '@/context/QuizContext';
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

  // 앱 시작 시 한 번만 확인한다. 권한이 모두 있으면 아무것도 표시하지 않는다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getPermissionStatus();
        if (cancelled || hasAllAlarmPermissions(status)) return;
        Alert.alert('알람 권한 필요', '알람을 위해 필요한 권한을 허용해 주세요.', [
          { text: '나중에', style: 'cancel' },
          { text: '설정 열기', onPress: () => void openAlarmPermissionSettings() },
        ]);
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
          <LikesProvider>
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
          </LikesProvider>
        </BookSelectionProvider>
      </AlarmProvider>
    </ThemeProvider>
  );
}
