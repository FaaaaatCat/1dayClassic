import { Tabs } from 'expo-router';

import AppHeader from '@/components/AppHeader';
import { Surface } from '@/constants/theme';

/**
 * 화면들을 담는 네비게이터.
 *
 * 이름은 (tabs)지만 하단 탭바는 없다 — 홈 위 줄의 버튼 셋(내 서재·하루 서점·설정)이 그
 * 자리를 대신한다. 하루에 한 쪽이라는 화면에서 늘 떠 있는 탭바는 갈 곳이 많다는 인상을
 * 줘서 걷어냈다. 폴더 이름을 그대로 두는 건 경로(/library·/bookstore)가 이미 여러 곳에
 * 박혀 있어서다.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <AppHeader title={TITLES[route.name] ?? ''} />,
        sceneStyle: { backgroundColor: Surface.canvas },
      })}>
      <Tabs.Screen name="index" options={{ title: '오늘의 공부', headerShown: false }} />
      <Tabs.Screen name="today" options={{ headerShown: false, href: null }} />
      {/* 목차 — 홈에서 떼어낸 화면이라 홈과 마찬가지로 제 헤더를 그린다. */}
      <Tabs.Screen name="toc" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="alarm-detail" options={{ headerShown: false, href: null }} />
      {/* 마이페이지와 그 안의 화면들 — 홈의 사람 버튼으로 들어온다. 저마다 제 헤더를
          그리므로 공용 헤더를 끈다. */}
      <Tabs.Screen name="library" options={{ headerShown: false }} />
      <Tabs.Screen name="library/planned" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/finished" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/bgm" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/book-theme" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/permissions" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/wrong-quizzes" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/bookmarks" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/notes" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/account" options={{ headerShown: false, href: null }} />
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
