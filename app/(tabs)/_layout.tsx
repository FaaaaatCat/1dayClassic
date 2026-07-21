import { Tabs } from 'expo-router';

import AppHeader from '@/components/AppHeader';
import { Palette } from '@/constants/theme';

/**
 * 하단 탭바 없이 화면들을 유지하는 레이아웃.
 * 페이지 이동은 상단 헤더의 메뉴 버튼 → 메뉴 페이지에서만 이루어진다.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <AppHeader title={TITLES[route.name] ?? ''} />,
        sceneStyle: { backgroundColor: Palette.background },
      })}>
      <Tabs.Screen name="index" options={{ title: '오늘' }} />
      <Tabs.Screen name="library" options={{ title: '보관함' }} />
      <Tabs.Screen name="alarm" options={{ title: '알람' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}

/** 헤더 왼쪽에 표시되는 페이지 타이틀 */
const TITLES: Record<string, string> = {
  index: '오늘의 클래식',
  library: '보관함',
  alarm: '알람',
  settings: '설정',
};
