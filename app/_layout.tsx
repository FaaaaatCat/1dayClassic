import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { AlarmProvider } from '@/context/AlarmContext';
import { LikesProvider } from '@/context/LikesContext';
import { NotesProvider } from '@/context/NotesContext';
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
        <LikesProvider>
          <NotesProvider>
            <ToastProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </ToastProvider>
          </NotesProvider>
        </LikesProvider>
      </AlarmProvider>
    </ThemeProvider>
  );
}
