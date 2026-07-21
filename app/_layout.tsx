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
