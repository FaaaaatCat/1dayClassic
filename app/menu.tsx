import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Palette, Spacing, Typography } from '@/constants/theme';

const MENU_ITEMS = [
  { title: '홈', caption: '매일 한 곡, 연간 캘린더', href: '/' },
  { title: '보관함', caption: '좋아요를 누른 곡들', href: '/library' },
  { title: '설정', caption: '앱 소개와 정보', href: '/settings' },
] as const;

/** 헤더의 메뉴 버튼으로 여는 전체 메뉴 페이지. */
export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 헤더가 넘겨준 출발 경로 — 현재 페이지 표시에 사용한다.
  const { from } = useLocalSearchParams<{ from?: string }>();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.topBar}>
        <ScaleButton
          accessibilityLabel="메뉴 닫기"
          style={styles.closeButton}
          onPress={() => router.back()}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            tintColor={Palette.text}
            size={24}
          />
        </ScaleButton>
      </View>

      <View style={styles.items}>
        {MENU_ITEMS.map((item, index) => {
          const active = from === item.href;
          return (
            <Animated.View
              key={item.href}
              entering={FadeInDown.duration(500).delay(80 * index)}>
              <ScaleButton
                accessibilityLabel={item.title}
                style={styles.item}
                // 모달인 메뉴 자체를 대상 페이지로 교체해 스택에 흔적을 남기지 않는다.
                onPress={() => router.replace(item.href)}>
                <View style={styles.itemInner}>
                  <Text style={[styles.itemTitle, active && styles.itemTitleActive]}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemCaption}>{item.caption}</Text>
                </View>
              </ScaleButton>
              {index < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
            </Animated.View>
          );
        })}
      </View>

      <Animated.View
        entering={FadeIn.duration(700).delay(400)}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xxl }]}>
        <Text style={styles.footerName}>하루 클래식</Text>
        <Text style={styles.footerSlogan}>매일 아침, 클래식 한 곡으로 하루를 시작하세요.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
    paddingHorizontal: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
  },
  items: {
    marginTop: Spacing.xl,
  },
  item: {
    alignItems: 'stretch',
  },
  itemInner: {
    paddingVertical: Spacing.lg,
  },
  itemTitle: {
    ...Typography.display,
  },
  itemTitleActive: {
    color: Palette.accent,
  },
  itemCaption: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  footer: {
    marginTop: 'auto',
  },
  footerName: {
    ...Typography.quote,
  },
  footerSlogan: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
