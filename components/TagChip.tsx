import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, tracking } from '@/constants/theme';

interface TagChipProps {
  label: string;
  /** 시리즈는 파랑, 분야는 베이지 — 두 축을 색으로 구분한다. */
  variant?: 'series' | 'field';
  /** 카드 안에 들어가는 작은 칩. 필터 줄에서는 쓰지 않는다. */
  compact?: boolean;
  /** 필터로 쓸 때만 준다. 없으면 누를 수 없는 표시용 칩이다. */
  onPress?: () => void;
  selected?: boolean;
}

/**
 * 태그 칩 — 서점 카드·상세 페이지의 표시용 칩과 목록 상단의 필터 칩이 같은 모양을 쓴다.
 *
 * onPress가 없으면 Pressable을 씌우지 않는다. 표시용 칩까지 누를 수 있게 두면
 * 스크린리더가 전부 버튼으로 읽어 화면이 시끄러워진다.
 */
export default function TagChip({
  label,
  variant = 'field',
  compact = false,
  onPress,
  selected = false,
}: TagChipProps) {
  const body = (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        variant === 'series' ? styles.series : styles.field,
        selected && styles.selected,
      ]}>
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          variant === 'series' ? styles.seriesLabel : styles.fieldLabel,
          selected && styles.selectedLabel,
        ]}>
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
      onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCompact: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
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
  label: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
  },
  labelCompact: {
    fontSize: 11,
    letterSpacing: tracking(11),
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
