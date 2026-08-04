import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import { Colors, Fonts, tracking } from '@/constants/theme';

interface Props {
  text: string;
  by?: string;
}

/**
 * 인용문 + 출처. 기존 today.tsx의 quoteOuter/quoteInner/quoteText 조판을 그대로 옮긴다.
 * `Fonts.serifDisplay`를 쓰는 현재 조판을 유지한다(라틴 전용이라 한글은 시스템 폴백으로 그려진다).
 *
 * 앞 블록과의 간격은 blockStyles.block이 9종에 똑같이 준다 — 이 블록은 갖지 않는다.
 */
export default function QuoteBlock({ text, by }: Props) {
  return (
    <View style={[blockStyles.block, styles.wrap]}>
      <View style={styles.quoteOuter}>
        <View style={styles.quoteInner}>
          <Text style={styles.quoteText}>{text}</Text>
          {by && <Text style={styles.quoteText}>{by}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
  },
  quoteOuter: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.brown10,
    paddingVertical: 17,
  },
  quoteInner: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.yellow,
    paddingLeft: 22,
    gap: 4,
  },
  quoteText: {
    // 피그마 시안 지정 서체. 라틴 전용이라 한글은 시스템 폴백으로 렌더링된다.
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    lineHeight: 26,
    letterSpacing: tracking(14),
    color: Colors.blue100,
  },
});
