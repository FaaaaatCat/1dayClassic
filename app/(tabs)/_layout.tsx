import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Dimensions, Easing } from 'react-native';

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
      {/* 홈과 읽기 화면은 그 위로 다른 화면이 덮고 들어오는 자리라 제자리에 가만히 있는다. */}
      <Tabs.Screen name="index" options={{ title: '오늘의 공부', headerShown: false, ...STAY_UNDER }} />
      <Tabs.Screen name="today" options={{ headerShown: false, href: null, ...STAY_UNDER }} />
      {/* 목차 — 홈에서 떼어낸 화면이라 홈과 마찬가지로 제 헤더를 그린다. */}
      <Tabs.Screen name="toc" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="alarm-detail" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      {/* 마이페이지와 그 안의 화면들 — 홈의 사람 버튼으로 들어온다. 저마다 제 헤더를
          그리므로 공용 헤더를 끈다. */}
      <Tabs.Screen name="library" options={{ headerShown: false, ...SLIDE_IN }} />
      <Tabs.Screen name="library/planned" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/finished" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/bgm" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/book-theme" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/tts" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/permissions" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/wrong-quizzes" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/bookmarks" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/notes" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      <Tabs.Screen name="library/account" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
      {/* 서점은 타이틀이 스크롤을 따라 올라가야 해서 공용 헤더를 쓰지 않고 화면이 직접 그린다. */}
      <Tabs.Screen
        name="bookstore"
        options={{ title: '하루 서점', headerShown: false, ...STAY_UNDER }}
      />
      <Tabs.Screen
        name="book/[id]"
        options={({ route }) => ({
          headerShown: false,
          href: null,
          ...((route.params as { from?: string } | undefined)?.from === 'bookstore'
            ? SLIDE_IN
            : {}),
        })}
      />
      <Tabs.Screen name="library/book/[id]" options={{ headerShown: false, href: null, ...SLIDE_IN }} />
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

/**
 * ── 오른쪽에서 덮으며 들어오는 화면들 ──
 *
 * 홈에서 여는 알림·목차·마이페이지, 마이페이지 안의 화면들, 서점에서 연 책 상세가 오른쪽에서
 * 들어와 앞 화면을 덮는다(SLIDE_IN). 덮이는 쪽(홈·읽기 화면·서점·마이페이지)은 제자리에
 * 가만히 있는다 — 홈과 읽기 화면·서점은 STAY_UNDER로, 마이페이지는 제 SLIDE_IN이 물러날 때
 * 움직이지 않으므로 그대로 덮이는 바닥이 된다. 방향은 등록 순서가 정하므로, 덮고 들어오는
 * 화면은 덮이는 화면보다 뒤에 등록되어 있어야 한다.
 *
 * ── 서점 → 책 상세의 넘어가는 모양 ──
 *
 * 서점에서 책을 열면 상세가 오른쪽에서 들어와 서점 위를 덮는다. 서점 안의 페이지들
 * (첫 화면·목록·검색)이 넘어가는 모양과 같다(app/(tabs)/bookstore.tsx).
 *
 * 탭 네비게이터는 애니메이션이 없는 화면을 떠나는 순간 바로 숨긴다. 그래서 서점에도
 * 애니메이션을 켜 두되 제자리에 가만히 있게 한다(STAY_UNDER) — 그래야 상세가 덮고 들어오는
 * 동안 그 밑에 서점이 보인다. 홈에서 서점으로 들어올 때는 서점이 움직이지 않으므로 지금처럼
 * 그 자리에서 바뀐다.
 *
 * 닫을 때는 애니메이션 없이 바로 돌아간다. 탭은 전환 중에 '가려는 화면'을 늘 위에 그려서
 * (BottomTabView의 zIndex), 상세가 걷히는 모습이 서점 밑에 가려지기 때문이다.
 *
 * 상세는 내 서재에서도 열린다. 그쪽은 서재에 애니메이션이 없어 밑이 빈 바탕으로 보이므로,
 * 서점에서 열었을 때(from=bookstore)만 건다. 방향은 등록 순서가 정한다 — 상세가 서점보다
 * 뒤에 등록되어 있어야 오른쪽에서 들어온다.
 */
/** 화면 하나의 옵션 객체 — 탭 네비게이터의 옵션 타입은 expo-router 밖으로 나와 있지 않아 여기서 꺼낸다. */
type TabOptions = Exclude<NonNullable<ComponentProps<typeof Tabs.Screen>['options']>, (...args: never[]) => unknown>;

const TRANSITION: TabOptions['transitionSpec'] = {
  animation: 'timing',
  config: { duration: 300, easing: Easing.out(Easing.cubic) },
};

const STAY_UNDER: TabOptions = {
  transitionSpec: TRANSITION,
  sceneStyleInterpolator: () => ({ sceneStyle: {} }),
};

const SLIDE_IN: TabOptions = {
  transitionSpec: TRANSITION,
  // 오른쪽에 대기하던 상세(1)만 제 폭만큼 밀려 들어온다. 물러날 때(0 → -1)는 움직이지 않는다.
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0, 0, Dimensions.get('window').width],
          }),
        },
      ],
    },
  }),
};
