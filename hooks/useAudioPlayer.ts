import {
  setAudioModeAsync,
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

import { buildNarrationScript, MEDIA_HEADERS } from '@/lib/data';
import { fadeVolume, type FadeHandle } from '@/lib/fade';
import type { Track } from '@/types';

/** 데모 샘플은 30초까지만 재생한다. 단, 나레이션 중에는 컷을 유예한다. */
const SAMPLE_LIMIT_SECONDS = 30;
/** 나레이션이 30초를 넘겨 끝난 경우, 볼륨 복구 후 이만큼 더 들려주고 멈춘다. */
const OUTRO_SECONDS = 15;
/** 나레이션 시작 전 음악만 들려주는 인트로 길이 */
const INTRO_SECONDS = 5;
/** 나레이션 중 음악 배경 볼륨 */
const DUCK_VOLUME = 0.25;
/** 덕킹/복구 페이드 길이 */
const FADE_MS = 800;
/** 재생 시작을 알리는 진동 길이 */
const OPENING_VIBRATION_MS = 500;
/** 진동 직후, 음악 시작 전에 읽어 주는 오프닝 멘트 */
const OPENING_NARRATION = '하루 클래식 공부의 시간입니다.';
/** TTS가 onDone/onError를 안 주는 환경(일부 웹 등)에서도 음악이 반드시 시작되도록 하는 최대 대기 */
const OPENING_MAX_WAIT_MS = 8000;

/**
 * 라디오 DJ 플로우: opening(0.5초 진동 → 오프닝 멘트) → 음악 시작과 함께
 * intro(음악 100%) → 5초 후 덕킹 → narration(TTS) → onDone 시 볼륨 복구 → music.
 * 정지·곡 전환·30초 컷은 어디서든 idle로 전이.
 */
export type DjPhase = 'idle' | 'opening' | 'intro' | 'narration' | 'music';

export function useAudioPlayer() {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<DjPhase>('idle');

  // 세션 토큰 — 재생 시작/정지/곡 전환 때마다 증가한다. 타이머·페이드·TTS 콜백 등
  // 모든 비동기 연쇄는 실행 시점에 자기 세션이 아직 유효한지 확인하고 아니면 죽는다.
  const sessionRef = useRef(0);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<FadeHandle | null>(null);
  /** 정지 기준 시각 — 나레이션이 30초를 넘기면 복구 시점에 뒤로 밀린다. */
  const sampleDeadlineRef = useRef(SAMPLE_LIMIT_SECONDS);
  /** 시스템 TTS 엔진에서 고른 최적 한국어 목소리 identifier */
  const voiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });

    // 사용 가능한 한국어 목소리 중 가장 품질 좋은 것을 고른다.
    // (Enhanced > 네트워크 보이스 > 첫 번째 한국어 보이스)
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const korean = voices.filter((v) => {
          // 'ko'로 시작만 검사하면 콘칸어(kok-IN)까지 걸리므로 언어 코드를 정확히 비교한다.
          const lang = v.language?.toLowerCase().replace('_', '-');
          return lang === 'ko' || lang?.startsWith('ko-');
        });
        if (korean.length === 0) return;
        const preferred =
          korean.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ??
          korean.find((v) => v.identifier.includes('network')) ??
          korean[0];
        voiceRef.current = preferred.identifier;
      })
      .catch(() => {
        // 목소리 조회 실패 시 엔진 기본값으로 말한다.
      });
  }, []);

  /** 진행 중인 DJ 플로우(타이머·페이드·TTS)를 전부 무효화한다. 음악은 건드리지 않는다. */
  const cancelDjFlow = useCallback(() => {
    sessionRef.current += 1;
    if (introTimerRef.current != null) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    fadeRef.current?.cancel();
    fadeRef.current = null;
    Vibration.cancel();
    Speech.stop();
  }, []);

  const startDjFlow = useCallback(
    (track: Track) => {
      cancelDjFlow();
      const session = sessionRef.current;
      sampleDeadlineRef.current = SAMPLE_LIMIT_SECONDS;
      player.volume = 1;
      setPhase('opening');

      /** 인트로 5초가 지난 뒤 실행: 덕킹 → 곡 해설 나레이션 → 볼륨 복구 */
      const runDuckAndNarration = () => {
        fadeRef.current = fadeVolume(player, DUCK_VOLUME, FADE_MS);
        fadeRef.current.done.then((completed) => {
          if (!completed || session !== sessionRef.current) return;
          setPhase('narration');

          // 자연 종료(onDone)와 오류(onError)만 볼륨을 복구한다.
          // Speech.stop()에 의한 onStopped는 정지/곡 전환 경로라 복구하지 않는다.
          const restore = () => {
            if (session !== sessionRef.current) return;
            // 이야기가 30초를 넘겨 끝났으면 아웃트로만큼 더 듣고 멈추도록 연장한다.
            sampleDeadlineRef.current = Math.max(
              SAMPLE_LIMIT_SECONDS,
              player.currentTime + OUTRO_SECONDS
            );
            setPhase('music');
            fadeRef.current = fadeVolume(player, 1, FADE_MS);
          };
          Speech.speak(buildNarrationScript(track), {
            language: 'ko-KR',
            voice: voiceRef.current,
            // 시스템 TTS 설정(음높이·속도)에 좌우되지 않도록 고정한다.
            // 기기 음높이가 비정상(예: 186%)이면 목소리가 짓눌린 것처럼 들린다.
            pitch: 1.0,
            rate: 1.0,
            onDone: restore,
            onError: restore,
          });
        });
      };

      // 오프닝: 0.5초 진동 → 진동이 끝나면 오프닝 멘트 → 멘트가 끝나면 음악 시작.
      Vibration.vibrate(OPENING_VIBRATION_MS);
      introTimerRef.current = setTimeout(() => {
        if (session !== sessionRef.current) return;
        let musicStarted = false;
        const beginMusic = () => {
          if (musicStarted || session !== sessionRef.current) return;
          musicStarted = true;
          // 최대 대기로 진입한 경우 걸려 있는 멘트를 정리한다.
          // (onStopped 경로라 onDone/onError를 다시 부르지 않는다.)
          Speech.stop();
          player.play();
          setPhase('intro');
          introTimerRef.current = setTimeout(() => {
            if (session !== sessionRef.current) return;
            runDuckAndNarration();
          }, INTRO_SECONDS * 1000);
        };
        Speech.speak(OPENING_NARRATION, {
          language: 'ko-KR',
          voice: voiceRef.current,
          pitch: 1.0,
          rate: 1.0,
          onDone: beginMusic,
          onError: beginMusic,
        });
        // 멘트가 끝나지 않는 환경에서도 음악이 반드시 시작되도록 하는 안전장치.
        // 정상 종료 시에는 musicStarted 플래그와 세션 검사로 무시된다.
        setTimeout(beginMusic, OPENING_MAX_WAIT_MS);
      }, OPENING_VIBRATION_MS);
    },
    [cancelDjFlow, player]
  );

  // 언마운트 시 TTS와 타이머 정리
  useEffect(() => cancelDjFlow, [cancelDjFlow]);

  // 샘플 한도에 도달하거나 재생이 끝나면 처음으로 되감고 멈춘다.
  // 나레이션 중에는 이야기가 끊기지 않도록 컷을 유예한다.
  useEffect(() => {
    if (!status.isLoaded || phase === 'narration') return;
    const reachedSampleEnd =
      status.didJustFinish || status.currentTime >= sampleDeadlineRef.current;
    if (reachedSampleEnd && (status.playing || status.didJustFinish)) {
      cancelDjFlow();
      player.pause();
      player.seekTo(0);
      setPhase('idle');
    }
  }, [player, cancelDjFlow, phase, status.isLoaded, status.playing, status.didJustFinish, status.currentTime]);

  /** 재생 ↔ 일시정지 토글. 처음 누르면 로드 후 DJ 플로우 시작. */
  const togglePlay = useCallback(
    (track: Track) => {
      setHasError(false);
      try {
        // 새 곡이거나 직전 로드가 실패한 경우: 기존 플로우 취소 후 새로 시작.
        // 음악은 오프닝(진동+멘트)이 끝난 뒤 DJ 플로우가 직접 시작한다.
        if (loadedTrackIdRef.current !== track.id || status.error != null) {
          player.replace({ uri: track.audio, headers: MEDIA_HEADERS });
          loadedTrackIdRef.current = track.id;
          startDjFlow(track);
          return;
        }

        if (status.playing || phase === 'opening') {
          // 정지: 음악과 TTS를 즉시 함께 멈춘다.
          // 오프닝 중에는 음악이 아직 안 나오지만(playing=false) 진동·멘트를 멈춰야 한다.
          cancelDjFlow();
          player.pause();
          setPhase('idle');
        } else if (status.currentTime < 0.5) {
          // 곡 처음부터의 재생(30초 컷 후 재시작 등): DJ 플로우 전체를 다시 태운다.
          startDjFlow(track);
        } else {
          // 중간 재개: 나레이션은 다시 재생하지 않고 원래 볼륨의 음악만 잇는다.
          // 나레이션 중 정지했다 재개한 경우 즉시 컷되지 않도록 데드라인을 보정한다.
          cancelDjFlow();
          sampleDeadlineRef.current = Math.max(
            sampleDeadlineRef.current,
            status.currentTime + OUTRO_SECONDS
          );
          player.volume = 1;
          player.play();
          setPhase('music');
        }
      } catch {
        setHasError(true);
        loadedTrackIdRef.current = null;
        setPhase('idle');
      }
    },
    [player, phase, status.playing, status.error, status.currentTime, cancelDjFlow, startDjFlow]
  );

  /** 다시듣기 — 처음부터 오프닝(진동+멘트) 포함 전체 플로우를 다시 태운다. */
  const restart = useCallback(
    (track: Track) => {
      setHasError(false);
      try {
        if (loadedTrackIdRef.current !== track.id || status.error != null) {
          player.replace({ uri: track.audio, headers: MEDIA_HEADERS });
          loadedTrackIdRef.current = track.id;
        } else {
          player.pause();
          player.seekTo(0);
        }
        startDjFlow(track);
      } catch {
        setHasError(true);
        loadedTrackIdRef.current = null;
        setPhase('idle');
      }
    },
    [player, status.error, startDjFlow]
  );

  const sampleDuration = Math.min(status.duration || SAMPLE_LIMIT_SECONDS, SAMPLE_LIMIT_SECONDS);
  const loadFailed = hasError || status.error != null;
  // 오프닝(진동+멘트) 중에는 음악이 백그라운드에서 로드되는 중이어도
  // 시퀀스가 진행되고 있으므로 로딩 스피너 대신 일시정지 버튼을 보여 준다.
  const isLoading =
    !loadFailed &&
    phase !== 'opening' &&
    loadedTrackIdRef.current !== null &&
    (!status.isLoaded || status.isBuffering);

  return {
    // 오프닝 중에는 음악이 아직 재생 전이지만 사용자 입장에선 '재생 중'이다.
    isPlaying: status.playing || phase === 'opening',
    isLoading,
    hasError: loadFailed,
    /** DJ 플로우 현재 단계 — UI에서 나레이션 중임을 표시할 때 사용 */
    phase,
    isNarrating: phase === 'narration',
    /** 0~1 — 30초 샘플 기준 진행률 */
    progress:
      sampleDuration > 0 ? Math.min(status.currentTime / sampleDuration, 1) : 0,
    togglePlay,
    restart,
  };
}
