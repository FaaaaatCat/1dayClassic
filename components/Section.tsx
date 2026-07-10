import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';

interface SectionProps {
  label: string;
  children: React.ReactNode;
}

/** "오늘의 이야기" 등 라벨 + 본문으로 이루어진 섹션 레이아웃. */
export default function Section({ label, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.xxl,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
});
