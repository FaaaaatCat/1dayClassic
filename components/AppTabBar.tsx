import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, tracking } from '@/constants/theme';

interface TabConfig {
  name: string;
  label: string;
  lineIcon: keyof typeof Ionicons.glyphMap;
  fillIcon: keyof typeof Ionicons.glyphMap;
}

/**
 * expo-router의 `<Tabs tabBar>`가 실제로 넘겨주는 값 중 이 컴포넌트가 쓰는 부분만 정의한다.
 * `@react-navigation/bottom-tabs`가 최상위 의존성이 아니라(expo-router 내부에 번들됨)
 * 공식 `BottomTabBarProps` 타입을 안정적으로 import할 경로가 없어 구조적 타입으로 대체한다.
 */
interface TabBarProps {
  state: { routes: { key: string; name: string }[]; index: number };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** 탭바에 실제로 보여줄 탭만 순서대로 나열 — today/alarm-detail/book/[id]은 상세 화면이라 제외. */
const TABS: TabConfig[] = [
  { name: 'index', label: '오늘의 공부', lineIcon: 'pencil-outline', fillIcon: 'pencil' },
  { name: 'bookstore', label: '하루 서점', lineIcon: 'book-outline', fillIcon: 'book' },
  { name: 'library', label: '기록', lineIcon: 'bookmark-outline', fillIcon: 'bookmark' },
  { name: 'settings', label: '설정', lineIcon: 'settings-outline', fillIcon: 'settings' },
];

/** 상세 화면(자체 헤더를 그리는 화면)에서는 탭바 자체를 숨긴다. */
const HIDDEN_ROUTES = new Set(['today', 'alarm-detail', 'book/[id]']);

/** 탭 콘텐츠(아이콘+라벨) 영역의 고정 높이 — 세이프에어리어는 이 아래에 별도로 더해진다. */
const BAR_HEIGHT = 64;

/**
 * 피그마 하단 탭바 — 선택된 탭은 아래쪽 테두리 + 채움(fill) 아이콘으로,
 * 나머지는 반투명 처리된 라인(outline) 아이콘으로 보여준다.
 */
export default function AppTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  const focusedRouteName = state.routes[state.index]?.name;
  if (focusedRouteName && HIDDEN_ROUTES.has(focusedRouteName)) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
          if (routeIndex === -1) return null;
          const route = state.routes[routeIndex];
          const focused = state.index === routeIndex;
          const tint = focused ? Colors.beige100 : Colors.brown100;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={onPress}
              style={[styles.button, focused ? styles.buttonFocused : styles.buttonUnfocused]}>
              <Ionicons name={focused ? tab.fillIcon : tab.lineIcon} size={20} color={tint} />
              <Text
                style={[styles.label, { color: tint }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.bg,
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: Colors.bg,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  buttonFocused: {
    borderTopColor: Colors.beige100,
  },
  buttonUnfocused: {
    borderTopColor: Colors.brown10,
    opacity: 0.3,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    textAlign: 'center',
  },
});
