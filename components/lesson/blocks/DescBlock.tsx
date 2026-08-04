import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';

interface Props {
  paragraphs: string[];
}

/**
 * 본문 문단들. 기존 today.tsx의 paragraph 스타일을 그대로 옮긴다.
 *
 * 앞 블록과의 간격은 blockStyles.block이 준다. 여기 gap(24)은 문단 사이 간격이라 별개다.
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
    gap: 24,
  },
});
