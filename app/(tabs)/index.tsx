import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

import TrackCard from '@/components/TrackCard';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getTracks } from '@/lib/data';
import type { Track } from '@/types';

function formatTime(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function MusicScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme].tint;
  const tracks = getTracks();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    positionMillis,
    durationMillis,
    playTrack,
    togglePlayback,
    stopPlayback,
  } = useAudioPlayer();

  const renderItem = ({ item }: { item: Track }) => (
    <TrackCard
      track={item}
      isActive={currentTrack?.id === item.id}
      isPlaying={isPlaying && currentTrack?.id === item.id}
      onPress={() => playTrack(item)}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>오늘의 클래식</Text>
      <Text style={styles.subheader}>로컬 JSON 데이터에서 불러온 곡 목록</Text>

      {currentTrack && (
        <View style={styles.playerBar}>
          <View style={styles.playerInfo}>
            <Text style={styles.nowPlaying} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.nowPlayingComposer} numberOfLines={1}>
              {currentTrack.composer}
            </Text>
            {durationMillis > 0 && (
              <Text style={styles.progress}>
                {formatTime(positionMillis)} / {formatTime(durationMillis)}
              </Text>
            )}
          </View>
          <View style={styles.controls}>
            {isLoading ? (
              <ActivityIndicator color={tint} />
            ) : (
              <>
                <Pressable
                  style={[styles.controlButton, { backgroundColor: tint }]}
                  onPress={togglePlayback}>
                  <Text style={styles.controlButtonText}>{isPlaying ? '일시정지' : '재생'}</Text>
                </Pressable>
                <Pressable style={styles.stopButton} onPress={stopPlayback}>
                  <Text style={styles.stopButtonText}>정지</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  subheader: {
    fontSize: 13,
    opacity: 0.6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  playerBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  playerInfo: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  nowPlaying: {
    fontSize: 16,
    fontWeight: '600',
  },
  nowPlayingComposer: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  progress: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  stopButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
