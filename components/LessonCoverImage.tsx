import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Ink, Type, TypeScale } from '@/constants/theme';
import { getCoverPlan, type UnsplashPhoto } from '@/lib/cover';
import { MEDIA_HEADERS, resolveLessonCoverImageUrl } from '@/lib/lessons';
import type { BookId, DailyLesson } from '@/types';

interface LessonCoverImageProps {
  lesson: DailyLesson;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /**
   * 이 항목이 실린 책. 표지를 무엇으로 채울지 정하는 데 쓴다.
   * 안 넘기면 항목 id로 찾는다 — 아는 쪽에서 넘겨 주면 그 조회를 건너뛴다.
   */
  bookId?: BookId;
}

/** 표식이 그림인지(주소) 글자인지 가른다. */
function isImageSymbol(symbol: string): boolean {
  return symbol.startsWith('http');
}

/**
 * 항목 표지.
 *
 * 무엇을 그릴지는 lib/cover가 정하고(우선순위는 그 주석 참고), 여기서는 그리기만 한다.
 * 그림이 없는 자리도 '아직 준비 안 됨'이 아니라 제대로 된 표지여야 한다 — 아홉 권 ×
 * 365일이면 3,285장이고 그 대부분은 오래도록 그림이 없을 것이다.
 *
 * 검은 바탕인 건 표지가 놓이는 자리(홈의 히어로, 상세의 히어로)가 모두 글자를 위에 얹는
 * 자리라, 어두운 바탕이라야 그 글자가 읽히기 때문이다.
 */
export default function LessonCoverImage({
  lesson,
  style,
  resizeMode = 'cover',
  bookId,
}: LessonCoverImageProps) {
  const plan = useMemo(() => getCoverPlan(lesson, bookId), [lesson, bookId]);

  /** coverImage는 Storage 경로일 수 있어 주소로 바꿔야 한다. Unsplash는 이미 주소다. */
  const [resolved, setResolved] = useState<string | null>(null);
  /** 사진을 못 불러온 경우 — 검은 바탕으로 되돌아간다. */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (plan.kind !== 'image') return;
    let cancelled = false;
    setResolved(null);
    setFailed(false);
    resolveLessonCoverImageUrl(lesson).then((url) => {
      if (!cancelled) setResolved(url ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [plan.kind, lesson.id, lesson.coverImage]);

  if (plan.kind === 'image' && resolved && !failed) {
    return (
      <Image
        source={{ uri: resolved, headers: MEDIA_HEADERS }}
        style={style}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (plan.kind === 'unsplash' && !failed) {
    return (
      <View style={style}>
        <Image
          source={{ uri: plan.photo.url }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
        <UnsplashCredit photo={plan.photo} />
      </View>
    );
  }

  // 표식이 있으면 표식을, 없으면(또는 사진을 못 불러왔으면) 검은 바탕만.
  return <SymbolCover style={style} symbol={plan.kind === 'symbol' ? plan.symbol : undefined} />;
}

/** 검은 바탕에 책의 표식 하나. 표식이 없으면 바탕만 남는다. */
function SymbolCover({ style, symbol }: { style?: StyleProp<ImageStyle>; symbol?: string }) {
  /** 표식 크기는 상자에 맞춘다 — 히어로든 목록의 작은 칸이든 같은 비율로 보이게. */
  const [box, setBox] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox(Math.min(width, height));
  };

  /**
   * 표식을 가운데보다 조금 위에 앉힌다.
   *
   * 표지 아래쪽에는 제목과 버튼이 얹히므로, 한가운데에 두면 표식이 그 글자와 겹친다.
   * 가운데 정렬을 유지한 채 아래 여백만 주면, 표식은 그 여백의 절반만큼 위로 올라간다.
   */
  const lift = { marginBottom: box * 0.4 };

  return (
    <View style={[style, styles.symbolCover]} onLayout={onLayout}>
      {box > 0 && symbol ? (
        isImageSymbol(symbol) ? (
          <Image
            source={{ uri: symbol }}
            style={[lift, { width: box * 0.42, height: box * 0.42, opacity: 0.4 }]}
            // 표식은 검게 그려진 그림이라, 어두운 바탕 위에서는 밝은 쪽으로 물들인다.
            tintColor={Ink.onDark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.mark, lift, { fontSize: box * 0.22 }]} numberOfLines={1}>
            {symbol}
          </Text>
        )
      ) : null}
    </View>
  );
}

/**
 * 사진가 크레딧.
 *
 * Unsplash API 가이드라인이 정한 의무다 — 사진을 보여줄 때 사진가와 Unsplash를 밝히고
 * 사진가 프로필로 가는 길을 둬야 한다. 그래서 이 줄은 꾸밈이 아니라 사진을 쓸 자격이고,
 * 지울 수 없다.
 *
 * 사진 위 오른쪽 위에 둔다 — 왼쪽 위에는 쪽 번호가, 아래에는 제목과 버튼이 있다.
 */
function UnsplashCredit({ photo }: { photo: UnsplashPhoto }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`사진 ${photo.photographer}, Unsplash. 사진가 페이지 열기`}
      style={styles.credit}
      hitSlop={8}
      onPress={() => Linking.openURL(photo.profile).catch(() => {})}>
      <Text style={styles.creditText} numberOfLines={1}>
        {`Photo ${photo.photographer} / Unsplash`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** 표식만 놓인 검은 면. */
  symbolCover: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.primary,
  },
  mark: {
    fontFamily: Type.serifDisplay,
    textAlign: 'center',
    color: Ink.onDark,
    // 표지 위에 다시 제목이 얹히므로, 표식은 바탕처럼 물러나 있는다.
    opacity: 0.4,
  },
  credit: {
    position: 'absolute',
    top: 16,
    right: 16,
    maxWidth: '60%',
  },
  creditText: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    /*
     * eggshell로 둔다. 이 줄에는 opacity가 걸려 있지 않은데도 흐려 보이는 건, 홈의
     * 히어로가 표지 위에 35% 어둠을 한 겹 더 깔기 때문이다(index의 heroScrim). 그 어둠이
     * 이 글자 위에도 얹혀 한 단 어두워진다.
     */
    color: Ink.onDark,
  },
});
