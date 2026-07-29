import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, View } from 'react-native';

import { MEDIA_HEADERS, resolveLessonCoverImageUrl } from '@/lib/lessons';
import type { Track } from '@/types';

interface TrackCoverImageProps {
  track: Track;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * 트랙 커버 이미지 — coverImage가 Firebase Storage 경로일 수도, 완성된 URL일 수도 있어
 * resolveLessonCoverImageUrl로 비동기 변환 후 렌더링한다. 해석 전이거나 커버가 없으면
 * 스타일만 유지한 빈 자리표시자를 보여줘 레이아웃이 튀지 않게 한다.
 */
export default function TrackCoverImage({ track, style, resizeMode = 'cover' }: TrackCoverImageProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    resolveLessonCoverImageUrl(track).then((resolved) => {
      if (!cancelled) setUri(resolved ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [track.id, track.coverImage]);

  if (!uri) {
    return <View style={style} />;
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
