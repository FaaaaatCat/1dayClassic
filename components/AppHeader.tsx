import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ink, Surface, Type, trackBody } from '@/constants/theme';

interface AppHeaderProps {
  /** 헤더에 표시할 페이지 타이틀 */
  title: string;
}

/** 상단 공용 헤더 — 페이지 타이틀만 표시한다 (하단 탭바 도입으로 메뉴 버튼은 제거). */
export default function AppHeader({ title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Surface.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 17,
    letterSpacing: trackBody(17),
    color: Ink.primary,
  },
});
