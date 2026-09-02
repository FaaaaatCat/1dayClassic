import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Ink, Type, trackDisplay } from '@/constants/theme';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import { findLesson, getBookName } from '@/lib/books';
import { MEDIA_HEADERS, resolveLessonCoverImageUrl } from '@/lib/lessons';
import type { BookId, DailyLesson } from '@/types';

interface LessonCoverImageProps {
  lesson: DailyLesson;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /**
   * 이 항목이 실린 책. 표지 그림이 없을 때 무엇을 그릴지 정하는 데 쓴다.
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
 * 그림이 있으면 그림을, 없으면 활자로 짠 표지를 그린다. 뒤엣것이 '아직 준비 안 됨'을
 * 알리는 자리표시자가 아니라 제대로 된 표지인 것이 중요하다 — 아홉 권 × 365일이면 3,285장이고,
 * 그 대부분은 오래도록 그림이 없을 것이다. 빈칸이 남아도 앱이 멀쩡해야 한다.
 *
 * 활자 표지는 책의 표식(lib/bookstore의 symbol)을 쓰고, 표식이 없는 책은 책 이름을 쓴다.
 * 검은 바탕인 건 이 앱에서 표지가 놓이는 자리(홈의 히어로, 상세의 히어로)가 모두 글자를
 * 위에 얹는 자리라, 어두운 바탕이라야 그 글자가 읽히기 때문이다.
 */
export default function LessonCoverImage({
  lesson,
  style,
  resizeMode = 'cover',
  bookId,
}: LessonCoverImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  /** 활자 표지의 크기는 상자에 맞춰 정한다 — 히어로든 목록의 작은 칸이든 같은 비율로 보이게. */
  const [box, setBox] = useState(0);

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

  /** 그림이 없을 때만 필요한 값이라 그때만 찾는다. */
  const book = useMemo(() => {
    if (uri) return undefined;
    const id = bookId ?? findLesson(lesson.id)?.book;
    if (!id) return undefined;
    return {
      name: getBookName(id),
      symbol: BOOKSTORE_BOOKS.find((entry) => entry.id === id)?.symbol,
    };
  }, [uri, bookId, lesson.id]);

  if (uri) {
    return (
      <Image
        source={{ uri, headers: MEDIA_HEADERS }}
        style={style}
        resizeMode={resizeMode}
        accessibilityIgnoresInvertColors
      />
    );
  }

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
  const markLift = { marginBottom: box * 0.4 };

  return (
    <View style={[style, styles.typeCover]} onLayout={onLayout}>
      {box > 0 && book ? (
        book.symbol && isImageSymbol(book.symbol) ? (
          <Image
            source={{ uri: book.symbol }}
            style={[markLift, { width: box * 0.42, height: box * 0.42, opacity: 0.4 }]}
            // 표식은 검게 그려진 그림이라, 어두운 바탕 위에서는 밝은 쪽으로 물들인다.
            tintColor={Ink.onDark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text
            style={[
              styles.mark,
              markLift,
              book.symbol
                ? { fontSize: box * 0.22, fontFamily: Type.serifDisplay }
                : { fontSize: box * 0.11, letterSpacing: trackDisplay(box * 0.11) },
            ]}
            numberOfLines={2}>
            {book.symbol ?? book.name}
          </Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** 활자 표지 — 표식 하나만 놓인 검은 면. */
  typeCover: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.primary,
  },
  mark: {
    fontFamily: Type.readingBold,
    textAlign: 'center',
    color: Ink.onDark,
    // 표지 위에 다시 제목이 얹히므로, 표식은 바탕처럼 물러나 있어야 한다.
    opacity: 0.4,
  },
});
