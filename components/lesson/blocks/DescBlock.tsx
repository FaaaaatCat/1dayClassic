import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';

interface Props {
  paragraphs: string[];
}

/**
 * 본문 문단들. 기존 today.tsx의 paragraph 스타일을 그대로 옮긴다.
 *
 * paddingTop:24는 기존 `content` 컨테이너의 gap(24)을 대신한다(앞 블록—표제부 또는
 * 인용문—과의 간격). 문단 사이 gap도 같은 값(24)이었으므로 내부 gap도 24로 맞춘다.
 */
export default function DescBlock({ paragraphs }: Props) {
  return (
    <View style={[blockStyles.block, styles.wrap]}>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={blockStyles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 24,
    gap: 24,
  },
});
