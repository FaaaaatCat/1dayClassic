import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { MY_PAGE } from '@/components/mypage/MyPageShell';
import type { ShelfBook } from '@/components/mypage/useShelfBooks';
import { Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import type { CatalogBook } from '@/lib/catalog';

/**
 * 서재의 책 목록.
 *
 * 하루 서점의 격자가 아니라 줄로 놓는다 — 여기서 궁금한 것은 표지가 아니라 '어디까지
 * 읽었나'이고, 그 숫자는 줄로 세울 때 훨씬 잘 견줘진다. 마이페이지의 '지금 읽고있는 책'
 * 카드와도 같은 결이 된다.
 */
export default function ShelfList({
  books,
  empty,
  onPress,
}: {
  books: ShelfBook[];
  empty: string;
  onPress: (book: CatalogBook) => void;
}) {
  if (books.length === 0) {
    return <Text style={styles.empty}>{empty}</Text>;
  }

  return (
    <View>
      {books.map((entry, index) => (
        <Pressable
          key={entry.book.id}
          accessibilityRole="button"
          accessibilityLabel={`${entry.book.title}, ${entry.percent}퍼센트`}
          style={[styles.row, index === books.length - 1 && styles.rowLast]}
          onPress={() => onPress(entry.book)}>
          <Image
            source={{ uri: entry.book.coverImage }}
            style={styles.cover}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>
              {entry.book.title}
            </Text>
            <Text style={styles.author} numberOfLines={1}>
              {entry.book.author}
            </Text>
            {/* 진행 줄 — 학습 콘텐츠가 없는 책은 셀 것이 없어 그리지 않는다. */}
            {entry.totalPages > 0 ? (
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(100, entry.percent)}%` }]} />
              </View>
            ) : null}
          </View>
          {entry.totalPages > 0 ? (
            <Text style={styles.percent}>{`${entry.percent}%`}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    textAlign: 'center',
    color: Ink.muted,
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[40],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  cover: {
    width: 44,
    height: 62,
    borderRadius: 2,
    backgroundColor: Surface.plate,
  },
  text: {
    flex: 1,
    gap: Space[4],
  },
  title: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  author: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  bar: {
    height: 4,
    marginTop: Space[4],
    borderRadius: 2,
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: Spark.ember,
  },
  percent: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.primary,
  },
});
