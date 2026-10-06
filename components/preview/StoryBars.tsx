import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/** 진행 바 칸 사이 틈. */
const BAR_GAP = 4;

/**
 * 스토리의 칸 진행 바 — 몇 장 중 몇 번째인지만 말한다.
 *
 * 지나온 칸과 지금 칸을 채워 두고, 남은 칸은 비워 둔다. 예전에는 지금 칸이 시간에 맞춰
 * 차오르고 다 차면 저절로 다음 장으로 넘어갔는데, 자동 넘김을 없애면서 시간을 그리지 않게
 * 됐다. 장은 손으로만 넘긴다.
 */
export default function StoryBars({
  count,
  page,
}: {
  /** 장 수 — 칸이 이만큼 생긴다. */
  count: number;
  page: number;
}) {
  return (
    <View style={styles.bars}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.bar, i <= page && styles.barFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    gap: BAR_GAP,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.brown50,
  },
  barFilled: {
    backgroundColor: Colors.white,
  },
});
