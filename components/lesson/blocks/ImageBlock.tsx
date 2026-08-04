import { StyleSheet, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import LessonCoverImage from '@/components/LessonCoverImage';
import type { DailyLesson } from '@/types';

interface Props {
  /** Firebase Storage 경로 또는 http(s) URL */
  source: string;
}

/**
 * 히어로 이미지 — 320×200, 안쪽 패딩 없이 꽉 채운다.
 * 기존 today.tsx는 320(바깥) + 안쪽 패딩 20(이미지 280)이었지만 Figma는 다르다 — 의도된 변경이다.
 *
 * `LessonCoverImage`는 `DailyLesson` 전체를 받아 id를 캐시 키로 쓰지만, 이 블록은
 * 이미지 경로 하나만 안다. id 자리에도 source를 그대로 써서(경로가 바뀌면 캐시 키도 바뀌는
 * 게 맞다) 최소한의 값만 채운 lesson을 만들어 넘긴다.
 */
export default function ImageBlock({ source }: Props) {
  const lesson: DailyLesson = { id: source, coverImage: source, story: [] };

  return (
    <View style={blockStyles.block}>
      <View style={styles.frame}>
        <LessonCoverImage lesson={lesson} style={styles.image} resizeMode="cover" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 200,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
