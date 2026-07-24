import { Tabs } from 'expo-router';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Colors, Fonts } from '@/constants/theme';

function tabIcon(name: SymbolViewProps['name']) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} tintColor={color} size={24} />
  );
}

/**
 * 하단 탭바(알람/하루 서점/기록/설정) 레이아웃.
 * today, bookstore-detail은 탭바에는 안 보이지만(href: null) 이 네비게이터 안에서
 * 목록 화면을 탭했을 때 라우팅되는 상세 화면이다 — 각자 자체 헤더(X 닫기 버튼)를 그린다.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <AppHeader title={TITLES[route.name] ?? ''} />,
        sceneStyle: { backgroundColor: Colors.bg },
        tabBarActiveTintColor: Colors.brown100,
        tabBarInactiveTintColor: Colors.brown50,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.brown10,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.regular,
          fontSize: 11,
        },
      })}>
      <Tabs.Screen
        name="index"
        options={{
          title: '알람',
          headerShown: false,
          tabBarIcon: tabIcon({ ios: 'alarm', android: 'alarm', web: 'alarm' }),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{ headerShown: false, href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="alarm-detail"
        options={{ headerShown: false, href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="bookstore"
        options={{
          title: '하루 서점',
          tabBarIcon: tabIcon({ ios: 'book', android: 'book_2', web: 'book_2' }),
        }}
      />
      <Tabs.Screen
        name="bookstore-detail"
        options={{ headerShown: false, href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '기록',
          tabBarIcon: tabIcon({ ios: 'bookmark', android: 'bookmark', web: 'bookmark' }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: tabIcon({ ios: 'gearshape', android: 'settings', web: 'settings' }),
        }}
      />
    </Tabs>
  );
}

/** 헤더에 표시되는 페이지 타이틀 — 자체 헤더를 그리는 화면(index, today, bookstore-detail)은 제외 */
const TITLES: Record<string, string> = {
  bookstore: '하루 서점',
  library: '기록',
  settings: '설정',
};
