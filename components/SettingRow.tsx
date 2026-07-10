import { StyleSheet, Switch, Text, View } from 'react-native';

import { Palette, Spacing, Typography } from '@/constants/theme';

interface SettingRowProps {
  label: string;
  /** 오른쪽에 보여줄 값 텍스트 (스위치와 배타적) */
  value?: string;
  /** 스위치로 표시할 때 */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

/** 알람·설정 화면 공용 행 — 라벨 + 값 또는 스위치. */
export default function SettingRow({
  label,
  value,
  switchValue,
  onSwitchChange,
}: SettingRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {switchValue !== undefined ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ true: Palette.accent, false: Palette.divider }}
          thumbColor={Palette.card}
          // react-native-web은 thumbColor 대신 activeThumbColor를 읽는다
          {...({ activeThumbColor: Palette.card } as object)}
        />
      ) : (
        <Text style={styles.value}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    ...Typography.body,
  },
  value: {
    ...Typography.caption,
  },
});
