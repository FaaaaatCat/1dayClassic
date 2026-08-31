import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';

interface Props {
  paragraphs: string[];
}

/** 본문 — 문단을 그대로 다 보여 준다. */
export default function DescBlock({ paragraphs }: Props) {
  return (
    <View style={blockStyles.block}>
      <View style={styles.content}>
        {paragraphs.map((paragraph, i) => (
          <Text key={i} style={blockStyles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
  },
});
