import {
  setAudioModeAsync,
  useAudioPlayerStatus,
  useAudioPlayer as useExpoAudioPlayer,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";

import { MEDIA_HEADERS, resolveLessonAudioUrl } from "@/lib/lessons";
import { fadeVolume, type FadeHandle } from "@/lib/fade";
import type { DailyLesson } from "@/types";

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
/** 마지막 문단이 끝나고 마무리 멘트 전까지, 음악만 들려주는 간격 */
const CLOSING_GAP_MS = 3000;
/** 음원이 없어 낭독만 할 때, 문단 사이의 짧은 정적. 음악이 없으니 6초는 끊긴 것처럼 들린다. */
const NARRATION_ONLY_GAP_MS = 800;
/**
 * 낭독 멘트에 들어가는 이름들. 항목 자체에서는 뽑을 수 없다 — 표제를 담은 필드가 책마다
 * 다르고(곡명/라틴어 원문/한자), 책 이름은 항목이 아니라 카탈로그가 갖고 있다.
 * 그래서 화면이 책별 표제 함수로 뽑아 넘겨 준다.
 */
export interface NarrationLabels {
  /** 예: '하루 라틴어 공부' */
  bookName: string;
  /** 그 날의 표제 — 목차에 뜨는 것과 같은 값 */
  lessonTitle: string;
}

/** 진동 직후 읽는 오프닝 멘트 */
function buildOpeningNarration({ bookName }: NarrationLabels): string {
  return `${bookName}의 시간입니다.`;
}
/** 이야기 낭독이 모두 끝난 뒤 읽는 마무리 멘트 — 뒤에 이어질 음악으로 넘긴다. */
function buildClosingNarration({ lessonTitle }: NarrationLabels): string {
  return `오늘의 음악 '${lessonTitle}' 어떠셨나요. 이제 감상해보세요`;
}
/** 음원 없이 낭독만 한 경우의 마무리 멘트 — 들려줄 음악이 없으니 '감상'으로 넘기지 않는다. */
function buildNarrationOnlyClosing({ lessonTitle }: NarrationLabels): string {
  return `'${lessonTitle}' 이야기였습니다. 내일 또 만나요`;
}
/**
 * TTS가 onDone/onError를 안 주는 환경(일부 웹 등)에서도 플로우가 반드시 진행되도록 하는 최대 대기.
 * story 문단 낭독은 실측 30초 안팎이 걸릴 수 있어 넉넉하게 잡는다 — 이보다 짧으면 실제 낭독이
 * 끝나기 전에 다음 단계(다음 멘트 전 음악 간격)로 넘어가버려서, 간격이 낭독 뒤가 아니라
 * 낭독 도중에 흘러가 버리고 다음 멘트가 이어 붙는 것처럼 들린다.
 */
const NARRATION_MAX_WAIT_MS = 60000;
/** 곡이 이보다 길면 이 지점에서 페이드아웃하며 멈춘다(예: 피아노 편곡 전곡처럼 지나치게 긴 녹음). */
const MAX_TRACK_SECONDS = 300;
/** 5분 컷 직전 페이드아웃에 걸리는 시간 */
const TRACK_FADE_OUT_MS = 5000;

/**
 * 라디오 DJ 플로우:
 * 진동 1초 → 음악 5초(50%) → 오프닝 멘트 → 음악 3초(50%→100% 램프) →
 * story 문단들(사이사이 음악 6초) → 음악 2초 → 마무리 멘트 → 나머지 곡 전체.
 * 음악은 진동이 끝난 뒤 한 번 시작되면 멈추지 않고 이어지며, 멘트는 배경에 깔린 음악 위로 낭독된다.
 * 다만 곡이 5분보다 길면 5분 지점에서 5초 페이드아웃 후 멈춘다(MAX_TRACK_SECONDS).
 * 정지·곡 전환·자연 종료·5분 컷은 어디서든 idle로 전이.
 *
 * 항목에 audio가 없으면(하루 서점 8권, 무료 회원, 음원 미준비) 음악 없이 낭독만 하는 플로우로 간다:
 * 진동 1초 → 오프닝 멘트 → story 문단들(사이 0.8초) → 마무리 멘트 → 종료.
 */
export type DjPhase = "idle" | "opening" | "narration" | "music";

export function useAudioPlayer() {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const loadedLessonIdRef = useRef<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<DjPhase>("idle");
  // 음원 없이 낭독만 하는 중인지 — 이때는 player가 놀고 있어서 status.playing으로 재생 여부를
  // 판정할 수 없다.
  const [isNarrationOnly, setIsNarrationOnly] = useState(false);
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
  /** 5분 컷 페이드아웃을 이미 시작했는지 — 재생 세션마다 초기화된다. */
  const trackCutoffTriggeredRef = useRef(false);
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

  /** text를 읽고 onDone/onError 또는 최대 대기 시간이 지나면 next로 진행한다. */
  const speakThenContinue = useCallback(
    (session: number, text: string, next: () => void) => {
      let advanced = false;
      const advance = () => {
        if (advanced || session !== sessionRef.current) return;
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
    },
    [],
  );

  /** ms만큼 기다린 뒤 next로 진행한다. 음악이 있으면 그동안 음악만 흐른다. */
  const waitThenContinue = useCallback(
    (session: number, ms: number, next: () => void) => {
      flowTimerRef.current = setTimeout(() => {
        if (session !== sessionRef.current) return;
        flowTimerRef.current = null;
        next();
      }, ms);
    },
    [],
  );

  const startDjFlow = useCallback(
    (lesson: DailyLesson, labels: NarrationLabels) => {
      cancelDjFlow();
      const session = sessionRef.current;
      const isCurrentSession = () => session === sessionRef.current;
      openingDurationRef.current = 0;
      openingStartedAtRef.current = Date.now();
      trackCutoffTriggeredRef.current = false;
      setIsNarrationOnly(false);
      setPhase("opening");

      // 8. 나머지 음악 전부 재생 — 이후로는 자연 종료까지 그대로 흘러간다.
      const restOfSong = () => {
        setPhase("music");
      };

      // 7. 마무리 멘트
      const closingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildClosingNarration(labels), restOfSong);
      };

      // 6. 음악 2초
      const musicGapBeforeClosing = () => {
        setPhase("music");
        waitThenContinue(session, CLOSING_GAP_MS, closingNarration);
      };

      // 5. story 문단들 — 문단 사이마다 음악 6초. 문단 수는 책마다 다르므로 끝까지 훑는다.
      const storyNarration = (index: number) => {
        const text = lesson.story[index];
        if (!text) {
          musicGapBeforeClosing();
          return;
        }
        setPhase("narration");
        speakThenContinue(session, text, () => {
          if (index + 1 >= lesson.story.length) {
            musicGapBeforeClosing();
            return;
          }
          setPhase("music");
          waitThenContinue(session, STORY_GAP_MS, () => storyNarration(index + 1));
        });
      };

      // 4. 음악 3초 — 볼륨을 50%에서 100%로 서서히 올린다.
      const volumeRampUp = () => {
        setPhase("music");
        fadeRef.current = fadeVolume(player, 1, VOLUME_RAMP_MS);
        fadeRef.current.done.then((completed) => {
          if (!completed || !isCurrentSession()) return;
          storyNarration(0);
        });
      };

      // 3. 오프닝 멘트
      const openingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildOpeningNarration(labels), volumeRampUp);
      };

      // 2. 음악 5초 (볼륨 50%) — 진동이 끝나면 음악이 시작된다.
      const preNarrationMusic = () => {
        openingDurationRef.current =
          (Date.now() - openingStartedAtRef.current) / 1000;
        player.volume = OPENING_MUSIC_VOLUME;
        player.play();
        setPhase("music");
        waitThenContinue(session, PRE_NARRATION_MUSIC_MS, openingNarration);
      };

      // 1. 진동
      Vibration.vibrate(OPENING_VIBRATION_MS);
      waitThenContinue(session, OPENING_VIBRATION_MS, preNarrationMusic);
    },
    [cancelDjFlow, player, speakThenContinue, waitThenContinue],
  );

  /**
   * 음원이 없는 항목: 진동 → 오프닝 멘트 → story 전체 → 마무리 멘트.
   * player는 아예 건드리지 않는다 — 로드할 음원이 없으므로 진행바도 의미가 없다.
   */
  const startNarrationOnlyFlow = useCallback(
    (lesson: DailyLesson, labels: NarrationLabels) => {
      cancelDjFlow();
      const session = sessionRef.current;
      setIsNarrationOnly(true);
      setPhase("opening");

      const finish = () => {
        setPhase("idle");
      };

      const closingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildNarrationOnlyClosing(labels), finish);
      };

      const storyNarration = (index: number) => {
        const text = lesson.story[index];
        if (!text) {
          closingNarration();
          return;
        }
        setPhase("narration");
        speakThenContinue(session, text, () => {
          if (index + 1 >= lesson.story.length) {
            closingNarration();
            return;
          }
          waitThenContinue(session, NARRATION_ONLY_GAP_MS, () =>
            storyNarration(index + 1),
          );
        });
      };

      const openingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildOpeningNarration(labels), () => storyNarration(0));
      };

      Vibration.vibrate(OPENING_VIBRATION_MS);
      waitThenContinue(session, OPENING_VIBRATION_MS, openingNarration);
    },
    [cancelDjFlow, speakThenContinue, waitThenContinue],
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

  // 곡이 5분보다 길면 5분 지점에서 5초에 걸쳐 페이드아웃하며 멈춘다.
  useEffect(() => {
    if (!status.isLoaded || !status.duration) return;
    if (status.duration <= MAX_TRACK_SECONDS) return;
    if (trackCutoffTriggeredRef.current) return;
    if (status.currentTime < MAX_TRACK_SECONDS - TRACK_FADE_OUT_MS / 1000) return;

    trackCutoffTriggeredRef.current = true;
    const session = sessionRef.current;
    fadeRef.current?.cancel();
    fadeRef.current = fadeVolume(player, 0, TRACK_FADE_OUT_MS);
    fadeRef.current.done.then(() => {
      if (session !== sessionRef.current) return;
      player.pause();
      player.seekTo(0);
      player.volume = 1;
      setPhase("idle");
    });
  }, [player, status.isLoaded, status.duration, status.currentTime]);

  /**
   * lesson.audio(Storage 경로 또는 완성된 URL)를 실제 재생 URL로 바꿔 플레이어에 로드한다.
   * Storage 경로 조회는 네트워크 요청이라 실패할 수 있다(파일 미업로드, 권한 규칙 미설정 등) —
   * 실패하면 호출부의 catch가 hasError로 잡는다.
   *
   * 음원이 없는 항목은 여기까지 오지 않는다 — 호출부가 먼저 낭독 전용 플로우로 보낸다.
   */
  const loadLessonSource = useCallback(
    async (lesson: DailyLesson) => {
      resolvingRef.current = true;
      setIsResolvingSource(true);
      try {
        const uri = await resolveLessonAudioUrl(lesson);
        if (!uri) {
          throw new Error(`음원이 없는 항목입니다: ${lesson.id}`);
        }
        player.replace({ uri, headers: MEDIA_HEADERS });
        loadedLessonIdRef.current = lesson.id;
      } finally {
        resolvingRef.current = false;
        setIsResolvingSource(false);
      }
    },
    [player],
  );

  /** 재생 ↔ 일시정지 토글. 처음 누르면 로드 후 DJ 플로우 시작. */
  const togglePlay = useCallback(
    async (lesson: DailyLesson, labels: NarrationLabels) => {
      setHasError(false);
      // URL 조회가 진행 중일 때 연타로 인한 중복 요청/이중 로드를 막는다.
      if (resolvingRef.current) return;

      // 음원이 없는 항목(하루 서점 8권, 무료 회원, 음원 미준비)은 낭독만 한다. 재개 지점이
      // 없으므로 토글은 '처음부터 시작' 또는 '중단' 둘 중 하나다.
      if (!lesson.audio) {
        if (phase === "idle") {
          startNarrationOnlyFlow(lesson, labels);
        } else {
          cancelDjFlow();
          setPhase("idle");
        }
        return;
      }

      try {
        // 새 항목이거나 직전 로드가 실패한 경우: 기존 플로우 취소 후 새로 시작.
        // 음악은 진동이 끝난 뒤 DJ 플로우가 직접 시작한다.
        if (loadedLessonIdRef.current !== lesson.id || status.error != null) {
          await loadLessonSource(lesson);
          startDjFlow(lesson, labels);
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
          startDjFlow(lesson, labels);
        } else {
          // 중간 재개: 나레이션은 다시 재생하지 않고 원래 볼륨의 음악만 잇는다.
          cancelDjFlow();
          player.volume = 1;
          player.play();
          setPhase("music");
        }
      } catch {
        setHasError(true);
        loadedLessonIdRef.current = null;
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
      startNarrationOnlyFlow,
      loadLessonSource,
    ],
  );

  /** 다시듣기 — 처음부터 오프닝(진동+멘트) 포함 전체 플로우를 다시 태운다. */
  const restart = useCallback(
    async (lesson: DailyLesson, labels: NarrationLabels) => {
      setHasError(false);
      if (resolvingRef.current) return;

      if (!lesson.audio) {
        startNarrationOnlyFlow(lesson, labels);
        return;
      }

      try {
        if (loadedLessonIdRef.current !== lesson.id || status.error != null) {
          await loadLessonSource(lesson);
        } else {
          player.pause();
          player.seekTo(0);
        }
        startDjFlow(lesson, labels);
      } catch {
        setHasError(true);
        loadedLessonIdRef.current = null;
        setPhase("idle");
      }
    },
    [player, status.error, startDjFlow, startNarrationOnlyFlow, loadLessonSource],
  );

  /**
   * 재생을 완전히 멈추고 idle로 되돌린다.
   *
   * cancelDjFlow는 진행 중인 연쇄만 무효화하고 phase는 그대로 두므로, 낭독 도중 화면이
   * 다른 항목으로 바뀌면 phase가 narration에 머물러 재생 버튼이 '일시정지'로 남는다.
   * 항목이 바뀔 때 호출해서 그 잔상을 걷어낸다.
   */
  const stop = useCallback(() => {
    cancelDjFlow();
    // 로드한 적이 없으면 player를 건드릴 이유가 없다(낭독 전용 항목이 그렇다).
    if (loadedLessonIdRef.current !== null) {
      player.pause();
      player.seekTo(0);
      player.volume = 1;
    }
    setIsNarrationOnly(false);
    setPhase("idle");
  }, [cancelDjFlow, player]);

  // 전체 재생시간 = 오프닝(진동+멘트) 실제 소요 시간 + 곡 실제 길이(5분 컷 적용).
  // status.duration은 곡 로드가 끝나기 전엔 0/undefined이므로 그동안은 기본값으로 대체한다.
  // openingDurationRef는 음악이 실제로 시작되는 순간 확정되고, 그 전까지는 0이다.
  const cappedSongSeconds = Math.min(
    status.duration || DEFAULT_DURATION_FALLBACK_SECONDS,
    MAX_TRACK_SECONDS,
  );
  const totalSeconds = openingDurationRef.current + cappedSongSeconds;
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
        loadedLessonIdRef.current !== null &&
        (!status.isLoaded || status.isBuffering)));

  return {
    // 오프닝 중에는 음악이 아직 재생 전이지만 사용자 입장에선 '재생 중'이다.
    // 낭독만 하는 항목은 player가 놀고 있으므로 플로우가 돌고 있는지로 판정한다.
    isPlaying: status.playing || phase === "opening" || (isNarrationOnly && phase !== "idle"),
    /** 음원 없이 낭독만 하는 중 — 진행바처럼 곡 길이에 기대는 UI는 숨겨야 한다. */
    isNarrationOnly,
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
    stop,
  };
}
