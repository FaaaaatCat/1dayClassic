import { Pressable, StyleSheet, Text, View } from "react-native";

import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';

interface TagChipProps {
  label: string;
  variant?: "series" | "field";
  compact?: boolean;
  detail?: boolean;
  onPress?: () => void;
  selected?: boolean;
}

export default function TagChip({
  label,
  variant = "field",
  compact = false,
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
        variant === "series" ? styles.series : styles.field,
        selected && styles.selected,
      ]}
    >
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          detail && styles.labelDetail,
          variant === "series" ? styles.seriesLabel : styles.fieldLabel,
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
  /**
   * 시리즈와 분야는 색이 아니라 표면 한 단으로 가른다.
   *
   * 예전에는 파랑·베이지로 갈랐는데, 이 시스템에는 UI에 쓸 수 있는 색이 없다. 대신
   * 시리즈를 한 단 깊은 판(plate) 위에 올려 구분한다.
   */
  series: {
    borderColor: Surface.plate,
    backgroundColor: Surface.plate,
  },
  field: {
    borderColor: Surface.plate,
    backgroundColor: Surface.card,
  },
  selected: {
    borderColor: Ink.primary,
    backgroundColor: Ink.primary,
  },
  seriesLabel: {
    color: Ink.strong,
  },
  fieldLabel: {
    color: Ink.body,
  },
  selectedLabel: {
    fontFamily: Type.uiMedium,
    color: Surface.canvas,
  },
});
