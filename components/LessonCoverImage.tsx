import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, tracking } from '@/constants/theme';
import { MEDIA_HEADERS, resolveLessonCoverImageUrl } from '@/lib/lessons';
import type { DailyLesson } from '@/types';

interface LessonCoverImageProps {
  lesson: DailyLesson;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** 'no image' 글자 크기 — 하루리오처럼 큰 자리엔 기본값, 목록의 작은 칸엔 줄여 쓴다. */
  placeholderLabelSize?: number;
}

/**
 * 항목 커버 이미지 — coverImage가 Firebase Storage 경로일 수도, 완성된 URL일 수도 있어
 * resolveLessonCoverImageUrl로 비동기 변환 후 렌더링한다.
 *
 * 아직 해석 중이거나 커버가 없는 항목(하루 서점 8권은 모두 준비 전이다)은 brown-50으로 채운
 * 자리표시자에 'no image'를 얹는다 — 크기는 그대로 유지되므로 레이아웃이 튀지 않는다.
 */
export default function LessonCoverImage({
  lesson,
  style,
  resizeMode = 'cover',
  placeholderLabelSize = 14,
}: LessonCoverImageProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    resolveLessonCoverImageUrl(lesson).then((resolved) => {
      if (!cancelled) setUri(resolved ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.coverImage]);

  if (!uri) {
    return (
      <View style={[style, styles.placeholder]}>
        <Text
          style={[styles.placeholderLabel, { fontSize: placeholderLabelSize }]}
          numberOfLines={1}>
          no image
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri, headers: MEDIA_HEADERS }}
      style={style}
      resizeMode={resizeMode}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brown50,
  },
  placeholderLabel: {
    fontFamily: Fonts.regular,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
});
