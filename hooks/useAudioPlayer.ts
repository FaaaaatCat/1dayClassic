import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Track } from '@/types';

/** 데모 샘플은 30초까지만 재생한다. */
const SAMPLE_LIMIT_MILLIS = 30_000;

export function useAudioPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
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

    const reachedSampleEnd =
      status.didJustFinish || status.positionMillis >= SAMPLE_LIMIT_MILLIS;
    if (reachedSampleEnd) {
      setIsPlaying(false);
      setPositionMillis(0);
      soundRef.current?.stopAsync();
    }
  }, []);

  /** 재생 ↔ 일시정지 토글. 처음 누르면 로드 후 재생. */
  const togglePlay = useCallback(
    async (track: Track) => {
      setHasError(false);
      try {
        if (loadedTrackIdRef.current !== track.id) {
          setIsLoading(true);
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
          const { sound } = await Audio.Sound.createAsync(
            { uri: track.audio },
            { shouldPlay: true, progressUpdateIntervalMillis: 250 },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
          loadedTrackIdRef.current = track.id;
          return;
        }

        const status = await soundRef.current?.getStatusAsync();
        if (!status?.isLoaded) return;

        if (status.isPlaying) {
          await soundRef.current?.pauseAsync();
        } else {
          await soundRef.current?.playAsync();
        }
      } catch {
        setHasError(true);
        setIsPlaying(false);
        loadedTrackIdRef.current = null;
      } finally {
        setIsLoading(false);
      }
    },
    [onPlaybackStatusUpdate]
  );

  const sampleDuration = Math.min(durationMillis || SAMPLE_LIMIT_MILLIS, SAMPLE_LIMIT_MILLIS);

  return {
    isPlaying,
    isLoading,
    hasError,
    /** 0~1 — 30초 샘플 기준 진행률 */
    progress: sampleDuration > 0 ? positionMillis / sampleDuration : 0,
    togglePlay,
  };
}
