import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import ProgressBar from '@/components/ProgressBar';
import ScaleButton from '@/components/ScaleButton';
import { Palette, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import type { Track } from '@/types';

interface TodayCardProps {
  track: Track;
  isPlaying: boolean;
  isLoading: boolean;
  /** 0~1, 재생 중이 아니면 0 */
  progress: number;
  onTogglePlay: () => void;
}

/** 오늘 화면의 히어로 카드 — 커버, 곡 정보, 재생 컨트롤. */
export default function TodayCard({
  track,
  isPlaying,
  isLoading,
  progress,
  onTogglePlay,
}: TodayCardProps) {
  const showProgress = isPlaying || progress > 0;

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: track.coverImage }}
        style={styles.cover}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.body}>
        <View style={styles.info}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.composer}>{track.composer}</Text>
        </View>
        <ScaleButton
          onPress={onTogglePlay}
          style={styles.playButton}
          accessibilityLabel={isPlaying ? '일시정지' : '재생'}>
          {isLoading ? (
            <ActivityIndicator color={Palette.card} size="small" />
          ) : (
            <SymbolView
              name={{
                ios: isPlaying ? 'pause.fill' : 'play.fill',
                android: isPlaying ? 'pause' : 'play_arrow',
                web: isPlaying ? 'pause' : 'play_arrow',
              }}
              tintColor={Palette.card}
              size={26}
            />
          )}
        </ScaleButton>
      </View>
      {showProgress && (
        <View style={styles.progress}>
          <ProgressBar progress={progress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.image,
    backgroundColor: Palette.primary,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  info: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    ...Typography.title,
  },
  composer: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primary,
  },
  progress: {
    marginTop: Spacing.lg,
  },
});
