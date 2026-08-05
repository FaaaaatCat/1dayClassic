import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import { Colors } from '@/constants/theme';

interface Props {
  paragraphs: string[];
}

/** 무료 사용자에게 보여 주는 비율 — 위에서부터 이만큼만 보이고 나머지는 잘린다. */
const VISIBLE_RATIO = 0.8;
/** 아래로 갈수록 배경색에 묻히게 하는 덮개의 높이 */
const FADE_HEIGHT = 160;

/**
 * 본문 문단들.
 *
 * 무료 사용자는 전체를 보지 못한다 — 먼저 문단 전체 높이를 재고, 그 80%만 남기고
 * 잘라 낸다(overflow: hidden). 잘린 경계가 칼같이 끊겨 보이지 않도록 배경색과 같은
 * 그라데이션을 본문 위에 띄워 서서히 사라지게 한다.
 *
 * 높이는 한 번만 잰다. 높이를 정한 뒤에도 안쪽 문단은 제 높이를 그대로 유지하므로
 * onLayout이 같은 값을 다시 보내는데, 그때마다 상태를 갱신하면 렌더가 되풀이된다.
 */
export default function DescBlock({ paragraphs }: Props) {
  const [fullHeight, setFullHeight] = useState(0);
  const clipped = fullHeight > 0;

  return (
    <View style={blockStyles.block}>
      <View style={[styles.clip, clipped && { height: Math.round(fullHeight * VISIBLE_RATIO) }]}>
        <View
          style={styles.content}
          onLayout={(e) => {
            if (fullHeight === 0) setFullHeight(e.nativeEvent.layout.height);
          }}
        >
          {paragraphs.map((paragraph, i) => (
            <Text key={i} style={blockStyles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>

        {clipped && (
          // 'transparent'는 iOS에서 검게 번지는 일이 있어 배경색의 알파 0으로 시작한다.
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(250, 246, 238, 0)', Colors.bg]}
            style={styles.fade}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  content: {
    gap: 24,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
});
