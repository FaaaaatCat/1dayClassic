import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import { Colors } from '@/constants/theme';

interface Props {
  paragraphs: string[];
}

/** 무료 사용자에게 보여 주는 비율 — 본문 전체 길이 중 앞에서부터 이만큼만 보인다. */
const VISIBLE_RATIO = 0.8;
/** 아래로 갈수록 배경색에 묻히게 하는 덮개의 높이 */
const FADE_HEIGHT = 160;

/**
 * 본문 전체 길이의 앞 80%만 남긴다. 문단 경계와 무관하게 글자 수로 자르므로
 * 마지막 문단은 문장 도중에 끊기는데, 아래의 그라데이션이 그 자리를 덮어
 * '서서히 사라지는' 것처럼 보이게 한다.
 *
 * 화면에 그려진 뒤 높이를 재서 자르는 방법(onLayout)을 쓰지 않는다 —
 * react-native-web에서 onLayout이 발화하지 않아 웹에서는 잘리지 않았다.
 * 글자 수로 자르면 웹과 앱이 똑같이 동작하고, 그릴 때 이미 잘려 있어
 * 두 번 렌더할 일도 없다.
 */
function clipToRatio(paragraphs: string[], ratio: number): string[] {
  const total = paragraphs.reduce((sum, p) => sum + p.length, 0);
  const limit = Math.round(total * ratio);

  const kept: string[] = [];
  let used = 0;
  for (const paragraph of paragraphs) {
    if (used >= limit) break;
    const room = limit - used;
    kept.push(room >= paragraph.length ? paragraph : paragraph.slice(0, room));
    used += paragraph.length;
  }
  return kept;
}

export default function DescBlock({ paragraphs }: Props) {
  const visible = clipToRatio(paragraphs, VISIBLE_RATIO);
  const isClipped = visible.join('').length < paragraphs.join('').length;

  return (
    <View style={blockStyles.block}>
      <View style={styles.clip}>
        <View style={styles.content}>
          {visible.map((paragraph, i) => (
            <Text key={i} style={blockStyles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>

        {isClipped && (
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
