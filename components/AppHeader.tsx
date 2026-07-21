import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Palette, Spacing, Typography } from '@/constants/theme';

interface AppHeaderProps {
  /** 헤더 왼쪽에 표시할 페이지 타이틀 */
  title: string;
}

/** 상단 공용 헤더 — 왼쪽에 페이지 타이틀, 오른쪽에 메뉴 버튼. */
export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <ScaleButton
        accessibilityLabel="메뉴"
        style={styles.menuButton}
        // 메뉴 페이지가 현재 페이지를 표시할 수 있도록 출발 경로를 넘긴다.
        onPress={() => router.push({ pathname: '/menu', params: { from: pathname } })}>
        <SymbolView
          name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
          tintColor={Palette.text}
          size={26}
        />
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Palette.background,
  },
  title: {
    ...Typography.display,
    flexShrink: 1,
    marginRight: Spacing.md,
  },
  menuButton: {
    width: 44,
    height: 44,
  },
});
