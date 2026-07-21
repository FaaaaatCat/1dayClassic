import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import LikeButton from '@/components/LikeButton';
import ReadMoreButton from '@/components/ReadMoreButton';
import Section from '@/components/Section';
import TodayCard from '@/components/TodayCard';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatTodayDate, getTodayTrack } from '@/lib/data';

export default function TodayScreen() {
  const track = getTodayTrack();
  const { isPlaying, isLoading, hasError, progress, togglePlay } = useAudioPlayer();
  const { isLiked, toggleLike } = useLikes();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={styles.date}>{formatTodayDate()}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(700).delay(150)} style={styles.card}>
        <TodayCard
          track={track}
          isPlaying={isPlaying}
          isLoading={isLoading}
          progress={progress}
          onTogglePlay={() => togglePlay(track)}
        />
        {hasError && (
          <Text style={styles.error}>음원을 불러오지 못했습니다. 다시 시도해 주세요.</Text>
        )}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(400)}>
        <Section label="오늘의 이야기">
          <Text style={styles.story}>{track.description}</Text>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(550)}>
        <Section label="오늘의 감상 포인트">
          <Text style={styles.quote}>{track.listeningPoint}</Text>
        </Section>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(700)} style={styles.actions}>
        <LikeButton liked={isLiked(track.id)} onToggle={() => toggleLike(track.id)} />
        <View style={styles.readMore}>
          <ReadMoreButton />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  date: {
    ...Typography.caption,
  },
  card: {
    marginTop: Spacing.xl,
  },
  error: {
    ...Typography.caption,
    color: Palette.accent,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  story: {
    ...Typography.body,
  },
  quote: {
    ...Typography.quote,
  },
  actions: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  readMore: {
    alignSelf: 'stretch',
    marginTop: Spacing.lg,
  },
});
