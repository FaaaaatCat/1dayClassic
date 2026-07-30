import { StyleSheet, Text, View } from 'react-native';

import LessonCoverImage from '@/components/LessonCoverImage';
import { Palette, Radius, Shadow, Spacing, Typography, tracking } from '@/constants/theme';
import { getBookName, getLessonHeading, type BookLesson } from '@/lib/books';

interface LibraryItemProps {
  bookLesson: BookLesson;
}

/**
 * 보관함의 항목 한 줄 — 소형 커버 + 표제 + 어느 책의 것인지.
 * 표제를 어느 필드에서 뽑는지는 책마다 달라 목차와 같은 표제 함수에 맡긴다.
 */
export default function LibraryItem({ bookLesson }: LibraryItemProps) {
  const heading = getLessonHeading(bookLesson);

  return (
    <View style={styles.item}>
      <LessonCoverImage
        lesson={bookLesson.lesson}
        style={styles.cover}
        resizeMode="cover"
        placeholderLabelSize={9}
      />
      <View style={styles.info}>
        <Text style={styles.bookName} numberOfLines={1}>
          {getBookName(bookLesson.book)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {heading.title}
        </Text>
        {heading.subtitle != null && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {heading.subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    ...Shadow.card,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: Radius.image - 4,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  bookName: {
    ...Typography.caption,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Palette.text,
    fontWeight: '500',
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
});
