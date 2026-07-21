import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import 'react-native-reanimated';

import { LikesProvider } from '@/context/LikesContext';
import { Palette } from '@/constants/theme';

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={AppTheme}>
      <LikesProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="menu"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
      </LikesProvider>
    </ThemeProvider>
  );
}
