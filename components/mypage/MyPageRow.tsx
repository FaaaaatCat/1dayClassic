import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Chevron from '@/components/Chevron';
import { MY_PAGE } from '@/components/mypage/MyPageShell';
import { Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 마이페이지의 줄 하나 — 아이콘·이름·지금 값·화살표.
 *
 * 아이콘이 없는 줄(권한 관리·계정 관리)도 같은 컴포넌트를 쓴다. 아이콘 자리를 비워 두는
 * 대신 아예 넣지 않는 건, 디자인에서 그 둘이 아래 묶음으로 따로 떨어져 있어서다.
 */
export default function MyPageRow({
  icon,
  label,
  value,
  onPress,
  /**
   * 아래에 선을 긋지 않는다.
   *
   * 묶음의 마지막 줄이거나, 바로 아래에 그 줄에 딸린 것이 이어질 때다 — '읽을 예정인 책'
   * 아래에는 표지 띠(PlannedStrip)가 붙어서, 선을 그으면 줄이 제 것과 갈라진다.
   */
  last = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  /** 오른쪽에 옅게 적는 지금 값(권수·고른 음악 이름). */
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}>
      {icon ? <Ionicons name={icon} color={Ink.primary} size={20} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <Chevron direction="forward" color={Ink.muted} size={18} />
    </Pressable>
  );
}

/** 줄들을 묶는 자리 — 묶음 사이는 빈 칸으로 벌어진다. */
export function MyPageGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    marginTop: Space[8],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    minHeight: MY_PAGE.rowHeight,
    paddingHorizontal: MY_PAGE.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.primary,
  },
  value: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
});
