import { StyleSheet, Text, View } from 'react-native';

import TrackCoverImage from '@/components/TrackCoverImage';
import { Palette, Radius, Shadow, Spacing, Typography, tracking } from '@/constants/theme';
import type { Track } from '@/types';

interface LibraryItemProps {
  track: Track;
}

/** 보관함의 곡 한 줄 — 소형 커버 + 곡 정보. */
export default function LibraryItem({ track }: LibraryItemProps) {
  return (
    <View style={styles.item}>
      <TrackCoverImage track={track} style={styles.cover} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.composer} numberOfLines={1}>
          {track.composer}
        </Text>
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
    backgroundColor: Palette.primary,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  title: {
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Palette.text,
    fontWeight: '500',
  },
  composer: {
    ...Typography.caption,
    marginTop: 2,
  },
});
