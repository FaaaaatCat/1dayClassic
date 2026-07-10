import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

interface ProgressBarProps {
  /** 0~1 */
  progress: number;
}

/** 재생 위치를 보여주는 얇은 바. */
export default function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: Palette.divider,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
});
