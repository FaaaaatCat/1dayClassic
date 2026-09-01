import { Tabs } from 'expo-router';

import AppHeader from '@/components/AppHeader';
import AppTabBar from '@/components/AppTabBar';
import { Surface } from '@/constants/theme';

/**
 * 하단 탭바(오늘의 공부/내 서재/하루 서점/설정) 레이아웃 — 탭바 자체는 AppTabBar가 그린다.
 * today, alarm-detail, book/[id]은 탭바에는 안 보이지만(AppTabBar의 TABS 목록에서 제외)
 * 이 네비게이터 안에서 목록 화면을 탭했을 때 라우팅되는 상세 화면이다 — 각자 자체 헤더(X 닫기 버튼)를 그린다.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <AppHeader title={TITLES[route.name] ?? ''} />,
        sceneStyle: { backgroundColor: Surface.canvas },
      })}>
      <Tabs.Screen name="index" options={{ title: '오늘의 공부', headerShown: false }} />
      <Tabs.Screen name="today" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="alarm-detail" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library" options={{ title: '내 서재' }} />
      {/* 서점은 타이틀이 스크롤을 따라 올라가야 해서 공용 헤더를 쓰지 않고 화면이 직접 그린다. */}
      <Tabs.Screen name="bookstore" options={{ title: '하루 서점', headerShown: false }} />
      <Tabs.Screen name="book/[id]" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/book/[id]" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}

/** 헤더에 표시되는 페이지 타이틀 — 자체 헤더를 그리는 화면(index, today, book/[id])은 제외 */
const TITLES: Record<string, string> = {
  library: '내 서재',
  bookstore: '하루 서점',
  settings: '설정',
};
