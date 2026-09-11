import { Tabs } from 'expo-router';
import { Easing, useWindowDimensions } from 'react-native';

import AppHeader from '@/components/AppHeader';
import { Surface } from '@/constants/theme';

/**
 * 화면들을 담는 네비게이터.
 *
 * 이름은 (tabs)지만 하단 탭바는 없다 — 홈 위 줄의 버튼 셋(내 서재·하루 서점·설정)이 그
 * 자리를 대신한다. 하루에 한 쪽이라는 화면에서 늘 떠 있는 탭바는 갈 곳이 많다는 인상을
 * 줘서 걷어냈다. 폴더 이름을 그대로 두는 건 경로(/library·/bookstore)가 이미 여러 곳에
 * 박혀 있어서다.
 *
 * ── 넘어가는 모양 ──
 *
 * 새 화면이 오른쪽에서 들어와 원래 화면 위를 덮는다. 원래 화면은 제자리에 가만히 있다.
 * 탭 네비게이터는 원래 애니메이션 없이 갈아 끼우는데, 탭바를 걷어 낸 뒤로는 화면을 여는
 * 일이 '탭 전환'이 아니라 '한 장 위에 얹기'라 그렇게 보여야 맞다.
 *
 * 닫을 때는 애니메이션 없이 바로 돌아간다. 탭은 전환 중에 '가려는 화면'을 늘 위에 그리므로
 * (BottomTabView의 zIndex), 덮던 화면이 오른쪽으로 걷히는 모습은 돌아갈 화면 밑에 가려져
 * 보이지 않는다. 걷히는 모습까지 보이려면 이 화면들을 Stack으로 옮겨야 한다.
 *
 * 어느 쪽이 '새 화면'인지는 아래 등록 순서가 정한다. 탭은 먼저 등록된 화면을 왼쪽(-1),
 * 나중 화면을 오른쪽(1)에 두고 그 사이를 옮겨 다닌다. 그래서 부모를 먼저, 그 안에서 여는
 * 화면을 나중에 적는다 — 홈 → 목차 → 오늘의 공부, 홈 → 서점 → 책 상세, 홈 → 마이페이지 →
 * 서재 → 리포트 → 기록. 새 화면을 넣을 때도 이 규칙을 따라야 덮는 방향이 뒤집히지 않는다.
 *
 * 몇 화면에만 걸 수 없어 전부에 건다. 탭은 떠나는 화면에 애니메이션이 없으면 그 자리에서
 * 바로 숨기므로, 일부에만 걸면 새 화면이 덮고 들어오는 동안 그 밑이 빈 바탕으로 보인다.
 */
export default function TabLayout() {
  const { width } = useWindowDimensions();

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => <AppHeader title={TITLES[route.name] ?? ''} />,
        sceneStyle: { backgroundColor: Surface.canvas },
        transitionSpec: {
          animation: 'timing',
          config: { duration: 300, easing: Easing.out(Easing.cubic) },
        },
        // 오른쪽에 대기하던 화면(1)만 제 폭만큼 밀려 들어온다. 뒤로 물러나는 화면(0 → -1)은
        // 움직이지 않아서, 새 화면이 그 위를 덮는 모양이 된다.
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [0, 0, width],
                }),
              },
            ],
          },
        }),
      })}>
      <Tabs.Screen name="index" options={{ title: '오늘의 공부', headerShown: false }} />
      {/* 목차 — 홈에서 떼어낸 화면이라 홈과 마찬가지로 제 헤더를 그린다. 오늘의 공부는
          목차에서 한 칸 더 들어가는 화면이라 그 뒤에 둔다. */}
      <Tabs.Screen name="toc" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="today" options={{ headerShown: false, href: null }} />
      {/* 서점은 타이틀이 스크롤을 따라 올라가야 해서 공용 헤더를 쓰지 않고 화면이 직접 그린다. */}
      <Tabs.Screen name="bookstore" options={{ title: '하루 서점', headerShown: false }} />
      <Tabs.Screen name="book/[id]" options={{ headerShown: false, href: null }} />
      {/* 마이페이지와 그 안의 화면들 — 홈의 사람 버튼으로 들어온다. 저마다 제 헤더를
          그리므로 공용 헤더를 끈다. 리포트(library/book/[id])는 서재 목록에서 한 칸 더
          들어가고, 오답·책갈피·노트는 리포트에서 한 칸 더 들어간다. */}
      <Tabs.Screen name="library" options={{ headerShown: false }} />
      <Tabs.Screen name="library/planned" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/finished" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/book/[id]" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/wrong-quizzes" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/bookmarks" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/notes" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/bgm" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/book-theme" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
      <Tabs.Screen name="library/permissions" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="library/account" options={{ headerShown: false, href: null }} />
      <Tabs.Screen name="alarm-detail" options={{ headerShown: false, href: null }} />
    </Tabs>
  );
}

/** 헤더에 표시되는 페이지 타이틀 — 자체 헤더를 그리는 화면(index, today, book/[id])은 제외 */
const TITLES: Record<string, string> = {
  library: '내 서재',
  bookstore: '하루 서점',
  settings: '설정',
};
