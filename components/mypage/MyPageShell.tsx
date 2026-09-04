import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '@/components/ScreenHeader';
import { Space, Surface } from '@/constants/theme';

/**
 * 마이페이지와 그 안의 화면들이 함께 쓰는 껍데기.
 *
 * 위 한 줄은 공용 헤더(ScreenHeader)에 맡기고, 그 아래를 부르는 쪽이 채운다. 이 껍데기가
 * 따로 있는 건 헤더 때문이 아니라 그 아래 때문이다 — 아홉 화면이 같은 스크롤 규칙(다시
 * 들어오면 맨 위)과 같은 아래 붙박이 자리를 쓴다.
 */
export default function MyPageShell({
  title,
  children,
  back = '/library',
  /** 헤더 오른쪽에 놓을 것 — 대개 없다. */
  action,
  /** 아래에 붙박이로 둘 것(계정 관리의 버튼처럼). 스크롤을 따라오지 않는다. */
  footer,
}: {
  title: string;
  children: React.ReactNode;
  /** 뒤로 갈 곳. 기본은 마이페이지다(자세한 것은 ScreenHeader의 back 주석). */
  back?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  /**
   * 다시 들어올 때는 맨 위에서 시작한다.
   *
   * 이 화면들은 Tabs의 형제라 떠나도 사라지지 않는다 — 스크롤 자리가 그대로 남아 있어서,
   * 홈에 갔다 돌아오면 아까 내려 둔 자리가 보인다. 저장하지 않은 것은 화면을 나가면
   * 없던 일이 되는 편이 맞다.
   */
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  // 위 세이프에어리어는 헤더가 맡는다 — 여기서 또 대면 제목만 그만큼 내려앉는다.
  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} back={back} action={action} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Space[40] }]}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Space[16] }]}>{footer}</View>
      ) : null}
    </View>
  );
}

/** 이 화면들이 함께 쓰는 값 — 줄 높이와 좌우 여백이 화면마다 달라지지 않게 한다. */
export const MY_PAGE = {
  gutter: Space[20],
  rowHeight: 56,
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  body: {
    paddingTop: Space[8],
  },
  footer: {
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[16],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Surface.plate,
  },
});
