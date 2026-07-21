import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import LibraryItem from '@/components/LibraryItem';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';

export default function LibraryScreen() {
  const { likedTracks } = useLikes();

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={styles.caption}>좋아요를 누른 곡들이 담깁니다</Text>
      </Animated.View>

      {likedTracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 담긴 곡이 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={likedTracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LibraryItem track={item} />}
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
