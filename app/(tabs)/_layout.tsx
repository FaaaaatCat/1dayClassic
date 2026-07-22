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
      {/* 홈과 오늘의 클래식 화면은 각자 자체 고정 헤더를 렌더링한다 */}
      <Tabs.Screen name="index" options={{ title: '홈', headerShown: false }} />
      <Tabs.Screen name="today" options={{ title: '오늘의 클래식', headerShown: false }} />
      <Tabs.Screen name="library" options={{ title: '보관함' }} />
      <Tabs.Screen name="bookstore" options={{ title: '하루 서점' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}

/** 헤더 왼쪽에 표시되는 페이지 타이틀 */
const TITLES: Record<string, string> = {
  index: '홈',
  today: '오늘의 클래식',
  library: '보관함',
  bookstore: '하루 서점',
  settings: '설정',
};
