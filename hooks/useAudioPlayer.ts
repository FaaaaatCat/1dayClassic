import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Track } from '@/types';

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis ?? 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  }, []);

  const unloadCurrentSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  const playTrack = useCallback(
    async (track: Track) => {
      try {
        setIsLoading(true);

        if (currentTrack?.id !== track.id) {
          await unloadCurrentSound();
          const { sound } = await Audio.Sound.createAsync(
            { uri: track.uri },
            { shouldPlay: true },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
          setCurrentTrack(track);
        } else if (soundRef.current) {
          await soundRef.current.playAsync();
        }

        setIsPlaying(true);
      } finally {
        setIsLoading(false);
      }
    },
    [currentTrack?.id, onPlaybackStatusUpdate, unloadCurrentSound]
  );

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) return;

    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    if (!soundRef.current) return;

    await soundRef.current.stopAsync();
    await soundRef.current.setPositionAsync(0);
    setIsPlaying(false);
    setPositionMillis(0);
  }, []);

  return {
    currentTrack,
    isPlaying,
    isLoading,
    positionMillis,
    durationMillis,
    playTrack,
    togglePlayback,
    stopPlayback,
  };
}
