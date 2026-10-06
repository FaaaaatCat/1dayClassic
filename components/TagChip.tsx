import { Pressable, StyleSheet, Text, View } from "react-native";

import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';

interface TagChipProps {
  label: string;
  compact?: boolean;
  /** 검은 칩 — 분야가 아니라 그 책의 상태(읽기 가능)를 알릴 때. 분야 칩들보다 앞에 둔다. */
  strong?: boolean;
  detail?: boolean;
  onPress?: () => void;
  selected?: boolean;
}

export default function TagChip({
  label,
  compact = false,
  strong = false,
  detail = false,
  onPress,
  selected = false,
}: TagChipProps) {
  const body = (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        detail && styles.chipDetail,
        styles.field,
        strong && styles.strong,
        selected && styles.selected,
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          detail && styles.labelDetail,
          styles.fieldLabel,
          strong && styles.strongLabel,
          selected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} 필터`}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  //기본
  chip: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: Corner.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: Type.ui,
    fontSize: 13,
    letterSpacing: trackBody(13),
  },
  // 서점 카드에서 사용되는 태그
  chipCompact: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: Corner.pill,
  },
  labelCompact: {
    fontSize: 11,
    letterSpacing: trackBody(11),
  },
  // 서점/내 서재 디테일페이지에서 사용되는 태그 — Figma 실측(높이24/radius4)에 맞춤
  chipDetail: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: Corner.pill,
  },
  labelDetail: {
    fontSize: 12,
    letterSpacing: trackBody(12),
  },
  //하루서점 필터에서 사용되는 필터 태그
  field: {
    borderColor: Surface.plate,
    backgroundColor: Surface.card,
  },
  strong: {
    borderWidth: 0,
    backgroundColor: Ink.primary,
  },
  strongLabel: {
    color: Surface.canvas,
  },
  selected: {
    borderColor: Ink.primary,
    backgroundColor: Ink.primary,
  },
  fieldLabel: {
    color: Ink.body,
  },
  selectedLabel: {
    fontFamily: Type.uiMedium,
    color: Surface.canvas,
  },
});
