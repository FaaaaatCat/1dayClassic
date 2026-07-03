import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Track } from '@/types';

type TrackCardProps = {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
};

export default function TrackCard({ track, isActive, isPlaying, onPress }: TrackCardProps) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme].tint;

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            isActive && { borderColor: tint, borderWidth: 2 },
            pressed && styles.pressed,
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>{track.title}</Text>
            {isActive && isPlaying && <Text style={[styles.badge, { color: tint }]}>재생 중</Text>}
          </View>
          <Text style={styles.composer}>{track.composer}</Text>
          {track.description && <Text style={styles.description}>{track.description}</Text>}
          <Text style={styles.duration}>{track.duration}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
  },
  composer: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    opacity: 0.5,
  },
});
