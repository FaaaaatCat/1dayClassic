import {
  setAudioModeAsync,
  useAudioPlayerStatus,
  useAudioPlayer as useExpoAudioPlayer,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import { MEDIA_HEADERS, resolveTrackAudioUrl } from "@/lib/data";
import { fadeVolume, type FadeHandle } from "@/lib/fade";
import type { Track } from "@/types";

/** 곡 길이(status.duration)를 아직 모를 때 총 재생시간 표시에 쓰는 기본값 */
const DEFAULT_DURATION_FALLBACK_SECONDS = 30;
/** 재생 시작을 알리는 진동 길이 */
const OPENING_VIBRATION_MS = 1000;
/** 진동 직후, 오프닝 멘트 전까지 음악만 들려주는 길이 */
const PRE_NARRATION_MUSIC_MS = 8000;
/** 오프닝 음악이 시작될 때의 볼륨 — 오프닝 멘트 후 VOLUME_RAMP_MS에 걸쳐 100%로 올라간다. */
const OPENING_MUSIC_VOLUME = 0.5;
/** 오프닝 멘트가 끝난 뒤 볼륨을 100%로 올리는 데 걸리는 시간 */
const VOLUME_RAMP_MS = 6000;
/** 이야기(story) 문단 사이사이, 음악만 들려주는 간격 */
const STORY_GAP_MS = 6000;
/** story[1]이 끝나고 마무리 멘트 전까지, 음악만 들려주는 간격 */
const CLOSING_GAP_MS = 3000;
/** 진동 직후 읽는 오프닝 멘트 */
const OPENING_NARRATION = "하루 클래식 공부의 시간입니다.";
/** 이야기 낭독이 모두 끝난 뒤 읽는 마무리 멘트 */
function buildClosingNarration(track: Track): string {
  return `오늘의 음악 '${track.title}' 어떠셨나요. 이제 감상해보세요`;
}
/**
 * TTS가 onDone/onError를 안 주는 환경(일부 웹 등)에서도 플로우가 반드시 진행되도록 하는 최대 대기.
 * story 문단 낭독은 실측 30초 안팎이 걸릴 수 있어 넉넉하게 잡는다 — 이보다 짧으면 실제 낭독이
 * 끝나기 전에 다음 단계(다음 멘트 전 음악 간격)로 넘어가버려서, 간격이 낭독 뒤가 아니라
 * 낭독 도중에 흘러가 버리고 다음 멘트가 이어 붙는 것처럼 들린다.
 */
const NARRATION_MAX_WAIT_MS = 60000;

/**
 * 라디오 DJ 플로우 (컷오프 없이 곡이 끝날 때까지 재생):
 * 진동 1초 → 음악 5초(50%) → 오프닝 멘트 → 음악 3초(50%→100% 램프) →
 * story[0] → 음악 3초 → story[1] → 음악 2초 → 마무리 멘트 → 나머지 곡 전체.
 * 음악은 진동이 끝난 뒤 한 번 시작되면 곡이 끝날 때까지 멈추지 않고, 멘트는 배경에 깔린 음악 위로 낭독된다.
 * 정지·곡 전환·자연 종료는 어디서든 idle로 전이.
 */
export type DjPhase = "idle" | "opening" | "narration" | "music";

export function useAudioPlayer() {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<DjPhase>("idle");
  // Firebase Storage 경로를 다운로드 URL로 바꾸는 동안(네트워크 조회) true.
  // ref는 같은 클릭 핸들러 안에서도 즉시 읽히는 재진입 가드용, state는 UI(로딩 표시)용.
  const resolvingRef = useRef(false);
  const [isResolvingSource, setIsResolvingSource] = useState(false);

  // 세션 토큰 — 재생 시작/정지/곡 전환 때마다 증가한다. 타이머·페이드·TTS 콜백 등
  // 모든 비동기 연쇄는 실행 시점에 자기 세션이 아직 유효한지 확인하고 아니면 죽는다.
  const sessionRef = useRef(0);
  /** DJ 플로우 각 단계 사이의 대기(setTimeout) — 한 번에 하나만 걸려 있다. */
  const flowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<FadeHandle | null>(null);
  /** 오프닝(진동+멘트)이 실제로 걸린 시간(초) — 전체 재생시간에 더해진다. 음악 시작 시 확정된다. */
  const openingDurationRef = useRef(0);
  /** 오프닝 시작 시각(ms) — 음악이 시작되는 순간 이 값과의 차이로 오프닝 길이를 확정한다. */
  const openingStartedAtRef = useRef(0);
  /** 시스템 TTS 엔진에서 고른 최적 한국어 목소리 identifier */
  const voiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });

    // 사용 가능한 한국어 목소리 중 가장 품질 좋은 것을 고른다.
    // (Enhanced > 네트워크 보이스 > 첫 번째 한국어 보이스)
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        const korean = voices.filter((v) => {
          // 'ko'로 시작만 검사하면 콘칸어(kok-IN)까지 걸리므로 언어 코드를 정확히 비교한다.
          const lang = v.language?.toLowerCase().replace("_", "-");
          return lang === "ko" || lang?.startsWith("ko-");
        });
        if (korean.length === 0) return;
        const preferred =
          korean.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ??
          korean.find((v) => v.identifier.includes("network")) ??
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
    if (flowTimerRef.current != null) {
      clearTimeout(flowTimerRef.current);
      flowTimerRef.current = null;
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
      const isCurrentSession = () => session === sessionRef.current;
      openingDurationRef.current = 0;
      openingStartedAtRef.current = Date.now();
      setPhase("opening");

      /** text를 읽고 onDone/onError 또는 최대 대기 시간이 지나면 next로 진행한다. */
      const speakThenContinue = (text: string, next: () => void) => {
        let advanced = false;
        const advance = () => {
          if (advanced || !isCurrentSession()) return;
          advanced = true;
          if (flowTimerRef.current != null) {
            clearTimeout(flowTimerRef.current);
            flowTimerRef.current = null;
          }
          next();
        };
        Speech.speak(text, {
          language: "ko-KR",
          voice: voiceRef.current,
          // 시스템 TTS 설정(음높이·속도)에 좌우되지 않도록 고정한다.
          // 기기 음높이가 비정상(예: 186%)이면 목소리가 짓눌린 것처럼 들린다.
          pitch: 1.0,
          rate: 1.0,
          onDone: advance,
          onError: advance,
        });
        // 멘트가 끝나지 않는 환경(일부 웹 등)에서도 플로우가 반드시 진행되도록 하는 안전장치.
        flowTimerRef.current = setTimeout(advance, NARRATION_MAX_WAIT_MS);
      };

      /** ms만큼 음악만 재생한 뒤 next로 진행한다. */
      const waitThenContinue = (ms: number, next: () => void) => {
        flowTimerRef.current = setTimeout(() => {
          if (!isCurrentSession()) return;
          flowTimerRef.current = null;
          next();
        }, ms);
      };

      // 10. 나머지 음악 전부 재생 — 이후로는 자연 종료까지 그대로 흘러간다.
      const restOfSong = () => {
        setPhase("music");
      };

      // 9. 마무리 멘트
      const closingNarration = () => {
        setPhase("narration");
        speakThenContinue(buildClosingNarration(track), restOfSong);
      };

      // 8. 음악 2초
      const musicGapBeforeClosing = () => {
        setPhase("music");
        waitThenContinue(CLOSING_GAP_MS, closingNarration);
      };

      // 7. story[1] — 문단이 없는 트랙은 건너뛴다.
      const story1Narration = () => {
        const text = track.story[1];
        if (!text) {
          musicGapBeforeClosing();
          return;
        }
        setPhase("narration");
        speakThenContinue(text, musicGapBeforeClosing);
      };

      // 6. 음악 3초
      const musicGapBeforeStory1 = () => {
        setPhase("music");
        waitThenContinue(STORY_GAP_MS, story1Narration);
      };

      // 5. story[0] — 문단이 없는 트랙은 건너뛴다.
      const story0Narration = () => {
        const text = track.story[0];
        if (!text) {
          musicGapBeforeStory1();
          return;
        }
        setPhase("narration");
        speakThenContinue(text, musicGapBeforeStory1);
      };

      // 4. 음악 3초 — 볼륨을 50%에서 100%로 서서히 올린다.
      const volumeRampUp = () => {
        setPhase("music");
        fadeRef.current = fadeVolume(player, 1, VOLUME_RAMP_MS);
        fadeRef.current.done.then((completed) => {
          if (!completed || !isCurrentSession()) return;
          story0Narration();
        });
      };

      // 3. 오프닝 멘트
      const openingNarration = () => {
        setPhase("narration");
        speakThenContinue(OPENING_NARRATION, volumeRampUp);
      };

      // 2. 음악 5초 (볼륨 50%) — 진동이 끝나면 음악이 시작된다.
      const preNarrationMusic = () => {
        openingDurationRef.current =
          (Date.now() - openingStartedAtRef.current) / 1000;
        player.volume = OPENING_MUSIC_VOLUME;
        player.play();
        setPhase("music");
        waitThenContinue(PRE_NARRATION_MUSIC_MS, openingNarration);
      };

      // 1. 진동
      Vibration.vibrate(OPENING_VIBRATION_MS);
      waitThenContinue(OPENING_VIBRATION_MS, preNarrationMusic);
    },
    [cancelDjFlow, player],
  );

  // 언마운트 시 TTS와 타이머 정리
  useEffect(() => cancelDjFlow, [cancelDjFlow]);

  // 곡이 끝까지 재생되면(자연 종료) 처음으로 되감고 멈춘다.
  useEffect(() => {
    if (!status.isLoaded || !status.didJustFinish) return;
    cancelDjFlow();
    player.pause();
    player.seekTo(0);
    setPhase("idle");
  }, [player, cancelDjFlow, status.isLoaded, status.didJustFinish]);

  /**
   * track.audio(Storage 경로 또는 완성된 URL)를 실제 재생 URL로 바꿔 플레이어에 로드한다.
   * Storage 경로 조회는 네트워크 요청이라 실패할 수 있다(파일 미업로드, 권한 규칙 미설정 등) —
   * 실패하면 호출부의 catch가 hasError로 잡는다.
   */
  const loadTrackSource = useCallback(
    async (track: Track) => {
      resolvingRef.current = true;
      setIsResolvingSource(true);
      try {
        const uri = await resolveTrackAudioUrl(track);
        player.replace({ uri, headers: MEDIA_HEADERS });
        loadedTrackIdRef.current = track.id;
      } finally {
        resolvingRef.current = false;
        setIsResolvingSource(false);
      }
    },
    [player],
  );

  /** 재생 ↔ 일시정지 토글. 처음 누르면 로드 후 DJ 플로우 시작. */
  const togglePlay = useCallback(
    async (track: Track) => {
      setHasError(false);
      // URL 조회가 진행 중일 때 연타로 인한 중복 요청/이중 로드를 막는다.
      if (resolvingRef.current) return;
      try {
        // 새 곡이거나 직전 로드가 실패한 경우: 기존 플로우 취소 후 새로 시작.
        // 음악은 진동이 끝난 뒤 DJ 플로우가 직접 시작한다.
        if (loadedTrackIdRef.current !== track.id || status.error != null) {
          await loadTrackSource(track);
          startDjFlow(track);
          return;
        }

        if (status.playing || phase === "opening") {
          // 정지: 음악과 TTS를 즉시 함께 멈춘다.
          // 오프닝 중에는 음악이 아직 안 나오지만(playing=false) 진동·멘트를 멈춰야 한다.
          cancelDjFlow();
          player.pause();
          setPhase("idle");
        } else if (status.currentTime < 0.5) {
          // 곡 처음부터의 재생: DJ 플로우 전체를 다시 태운다.
          startDjFlow(track);
        } else {
          // 중간 재개: 나레이션은 다시 재생하지 않고 원래 볼륨의 음악만 잇는다.
          cancelDjFlow();
          player.volume = 1;
          player.play();
          setPhase("music");
        }
      } catch {
        setHasError(true);
        loadedTrackIdRef.current = null;
        setPhase("idle");
      }
    },
    [
      player,
      phase,
      status.playing,
      status.error,
      status.currentTime,
      cancelDjFlow,
      startDjFlow,
      loadTrackSource,
    ],
  );

  /** 다시듣기 — 처음부터 오프닝(진동+멘트) 포함 전체 플로우를 다시 태운다. */
  const restart = useCallback(
    async (track: Track) => {
      setHasError(false);
      if (resolvingRef.current) return;
      try {
        if (loadedTrackIdRef.current !== track.id || status.error != null) {
          await loadTrackSource(track);
        } else {
          player.pause();
          player.seekTo(0);
        }
        startDjFlow(track);
      } catch {
        setHasError(true);
        loadedTrackIdRef.current = null;
        setPhase("idle");
      }
    },
    [player, status.error, startDjFlow, loadTrackSource],
  );

  // 전체 재생시간 = 오프닝(진동+멘트) 실제 소요 시간 + 곡 실제 길이.
  // status.duration은 곡 로드가 끝나기 전엔 0/undefined이므로 그동안은 기본값으로 대체한다.
  // openingDurationRef는 음악이 실제로 시작되는 순간 확정되고, 그 전까지는 0이다.
  const totalSeconds =
    openingDurationRef.current +
    (status.duration || DEFAULT_DURATION_FALLBACK_SECONDS);
  const elapsedSeconds = Math.min(
    openingDurationRef.current + status.currentTime,
    totalSeconds,
  );
  const loadFailed = hasError || status.error != null;
  // 오프닝(진동+멘트) 중에는 음악이 백그라운드에서 로드되는 중이어도
  // 시퀀스가 진행되고 있으므로 로딩 스피너 대신 일시정지 버튼을 보여 준다.
  // isResolvingSource: Firebase Storage 다운로드 URL을 조회하는 동안 — player.replace가
  // 아직 호출되지 않아 status.isLoaded 기반 판정만으로는 이 구간을 잡아내지 못한다.
  const isLoading =
    !loadFailed &&
    (isResolvingSource ||
      (phase !== "opening" &&
        loadedTrackIdRef.current !== null &&
        (!status.isLoaded || status.isBuffering)));

  return {
    // 오프닝 중에는 음악이 아직 재생 전이지만 사용자 입장에선 '재생 중'이다.
    isPlaying: status.playing || phase === "opening",
    isLoading,
    hasError: loadFailed,
    /** DJ 플로우 현재 단계 — UI에서 나레이션 중임을 표시할 때 사용 */
    phase,
    isNarrating: phase === "narration",
    /** 0~1 — 오프닝+곡 전체 길이 기준 진행률 */
    progress: totalSeconds > 0 ? elapsedSeconds / totalSeconds : 0,
    /** 경과 시간(초) — 오프닝 포함 */
    elapsedSeconds,
    /** 전체 재생 시간(초) = 오프닝 소요 시간 + 곡 길이. 곡 로드 전엔 기본값으로 대체 표시됨 */
    totalSeconds,
    togglePlay,
    restart,
  };
}
