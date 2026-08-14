import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts, tracking } from "@/constants/theme";

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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
  },
  // 서점 카드에서 사용되는 태그
  chipCompact: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  labelCompact: {
    fontSize: 11,
    letterSpacing: tracking(11),
  },
  // 서점/내 서재 디테일페이지에서 사용되는 태그 — Figma 실측(높이24/radius4)에 맞춤
  chipDetail: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  labelDetail: {
    fontSize: 12,
    letterSpacing: tracking(12),
  },
  //하루서점 필터에서 사용되는 필터 태그
  series: {
    borderColor: Colors.blue50,
    backgroundColor: Colors.blue10,
  },
  field: {
    borderColor: Colors.beige50,
    backgroundColor: Colors.beige10,
  },
  selected: {
    borderColor: Colors.brown100,
    backgroundColor: Colors.brown100,
  },
  seriesLabel: {
    color: Colors.blue100,
  },
  fieldLabel: {
    color: Colors.brown100,
  },
  selectedLabel: {
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});
