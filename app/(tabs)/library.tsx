import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import LibraryItem from '@/components/LibraryItem';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';

export default function LibraryScreen() {
  const { likedLessons } = useLikes();

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={styles.caption}>보관함에 담은 항목들이 모입니다</Text>
      </Animated.View>

      {likedLessons.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 담긴 항목이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={likedLessons}
          keyExtractor={(item) => item.lesson.id}
          renderItem={({ item }) => <LibraryItem bookLesson={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  caption: {
    ...Typography.caption,
  },
  list: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  separator: {
    height: Spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.caption,
  },
});
