import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScaleButton from '@/components/ScaleButton';
import { Palette, Radius, Spacing, tracking } from '@/constants/theme';

/** "책으로 더 읽기" CTA — 데모에서는 동작하지 않는 시각적 마무리. */
export default function ReadMoreButton() {
  return (
    <ScaleButton style={styles.button} accessibilityLabel="책으로 더 읽기">
      <Ionicons
        name="book"
        color={Palette.card}
        size={20}
      />
      <Text style={styles.text}>책으로 더 읽기</Text>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primary,
  },
  text: {
    color: Palette.card,
    fontSize: 16,
    letterSpacing: tracking(16),
    fontWeight: '600',
  },
});
