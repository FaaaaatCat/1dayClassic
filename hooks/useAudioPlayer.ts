import {
  setAudioModeAsync,
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MEDIA_HEADERS } from '@/lib/data';
import type { Track } from '@/types';

/** 데모 샘플은 30초까지만 재생한다. */
const SAMPLE_LIMIT_SECONDS = 30;

export function useAudioPlayer() {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
  }, []);

  // 샘플 한도(30초)에 도달하거나 재생이 끝나면 처음으로 되감고 멈춘다.
  useEffect(() => {
    if (!status.isLoaded) return;
    const reachedSampleEnd =
      status.didJustFinish || status.currentTime >= SAMPLE_LIMIT_SECONDS;
    if (reachedSampleEnd && (status.playing || status.didJustFinish)) {
      player.pause();
      player.seekTo(0);
    }
  }, [player, status.isLoaded, status.playing, status.didJustFinish, status.currentTime]);

  /** 재생 ↔ 일시정지 토글. 처음 누르면 로드 후 재생. */
  const togglePlay = useCallback(
    (track: Track) => {
      setHasError(false);
      try {
        // 새 곡이거나 직전 로드가 실패한 경우 소스를 다시 교체한다.
        if (loadedTrackIdRef.current !== track.id || status.error != null) {
          player.replace({ uri: track.audio, headers: MEDIA_HEADERS });
          loadedTrackIdRef.current = track.id;
          player.play();
          return;
        }

        if (status.playing) {
          player.pause();
        } else {
          player.play();
        }
      } catch {
        setHasError(true);
        loadedTrackIdRef.current = null;
      }
    },
    [player, status.playing, status.error]
  );

  const sampleDuration = Math.min(status.duration || SAMPLE_LIMIT_SECONDS, SAMPLE_LIMIT_SECONDS);
  const loadFailed = hasError || status.error != null;
  const isLoading =
    !loadFailed &&
    loadedTrackIdRef.current !== null &&
    (!status.isLoaded || status.isBuffering);

  return {
    isPlaying: status.playing,
    isLoading,
    hasError: loadFailed,
    /** 0~1 — 30초 샘플 기준 진행률 */
    progress:
      sampleDuration > 0 ? Math.min(status.currentTime / sampleDuration, 1) : 0,
    togglePlay,
  };
}
