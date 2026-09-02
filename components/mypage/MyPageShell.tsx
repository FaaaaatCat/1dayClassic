import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 마이페이지와 그 안의 화면들이 함께 쓰는 껍데기.
 *
 * 뒤로 가기와 가운데 제목만 있는 단순한 줄이고, 그 아래는 부르는 쪽이 채운다. 껍데기를
 * 하나로 두는 건 여기서 들어가는 화면이 여덟이라, 저마다 헤더를 그리면 제목의 크기나
 * 뒤로 가기의 자리가 조금씩 어긋나기 때문이다.
 */
export default function MyPageShell({
  title,
  children,
  /** 아래에 붙박이로 둘 것(계정 관리의 버튼처럼). 스크롤을 따라오지 않는다. */
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ScaleButton accessibilityLabel="뒤로" style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" color={Ink.primary} size={22} />
        </ScaleButton>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {/* 제목을 가운데 두려면 왼쪽 버튼과 같은 폭이 오른쪽에도 있어야 한다. */}
        <View style={styles.back} />
      </View>

      <ScrollView
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: Space[8],
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: Corner.pill,
  },
  title: {
    flex: 1,
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.primary,
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
