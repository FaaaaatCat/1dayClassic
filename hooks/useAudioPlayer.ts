import {
  setAudioModeAsync,
  useAudioPlayerStatus,
  useAudioPlayer as useExpoAudioPlayer,
} from "expo-audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

import { useBgm } from "@/context/BgmContext";
import { resolveMediaUrl } from "@/lib/firebase";
import { MEDIA_HEADERS } from "@/lib/lessons";
import { buildNarrationUnits } from "@/lib/narration";
import { fadeVolume, type FadeHandle } from "@/lib/fade";
import { koreanSpeech, pickKoreanVoice } from "@/lib/tts";
import type { DailyLesson } from "@/types";

/**
 * 배경음악 볼륨 — 낭독을 덮지 않도록 낮게 깐다. 배경음악은 주인공이 아니라 바닥이다.
 */
const BGM_VOLUME = 0.25;
/** 낭독이 시작되기 전, 배경음악만 흐르는 길이 */
const BGM_INTRO_MS = 3000;
/** 배경음악이 무음에서 BGM_VOLUME까지 올라오는 시간 */
const BGM_FADE_IN_MS = 2000;
/** 낭독이 끝난 뒤 배경음악이 사라지는 시간 */
const BGM_FADE_OUT_MS = 4000;
/** 문단 사이의 짧은 정적 */
const PARAGRAPH_GAP_MS = 800;
/**
 * TTS가 onDone/onError를 안 주는 환경(일부 웹 등)에서도 플로우가 반드시 진행되도록 하는 최대 대기.
 * story 문단 낭독은 실측 30초 안팎이 걸릴 수 있어 넉넉하게 잡는다.
 */
const NARRATION_MAX_WAIT_MS = 60000;

/**
 * 낭독 멘트에 들어가는 이름들. 항목 자체에서는 뽑을 수 없다 — 표제를 담은 필드가 책마다
 * 다르고(곡명/라틴어 원문/한자), 책 이름은 항목이 아니라 카탈로그가 갖고 있다.
 */
export interface NarrationLabels {
  /** 예: '하루 라틴어 공부' */
  bookName: string;
  /** 그 날의 표제 — 목차에 뜨는 것과 같은 값 */
  lessonTitle: string;
}

function buildOpeningNarration({ bookName }: NarrationLabels): string {
  return `${bookName}의 시간입니다.`;
}
function buildClosingNarration({ lessonTitle }: NarrationLabels): string {
  return `'${lessonTitle}' 이야기였습니다. 내일 또 만나요`;
}

export type DjPhase = "idle" | "opening" | "narration" | "music";

/**
 * 낭독 재생기.
 *
 * 흐름은 하나뿐이다: 배경음악을 깔고(고른 경우) 오프닝 멘트 → 본문 낭독 → 마무리 멘트 →
 * 배경음악 페이드아웃. 항목마다 음원을 두던 예전 방식(곡을 틀고 그 위에 멘트를 얹던 DJ 플로우)은
 * 없앴다 — 이제 들려줄 음악은 설정에서 고른 배경음악 한 곡뿐이고, 그것은 낭독의 배경이지
 * 감상 대상이 아니다. 그래서 낭독이 끝나면 음악도 함께 끝난다.
 *
 * 배경음악을 '없음'으로 두면 같은 흐름이 음악 없이 돈다.
 */
export function useAudioPlayer() {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const { bgm } = useBgm();
  const [hasError, setHasError] = useState(false);
  const [phase, setPhase] = useState<DjPhase>("idle");
  /** 이미 로드해 둔 배경음악의 Storage 경로 — 같은 곡이면 다시 받지 않는다. */
  const loadedBgmSourceRef = useRef<string | null>(null);
  // Firebase Storage 경로를 다운로드 URL로 바꾸는 동안(네트워크 조회) true.
  // ref는 같은 클릭 핸들러 안에서도 즉시 읽히는 재진입 가드용, state는 UI(로딩 표시)용.
  const resolvingRef = useRef(false);
  const [isResolvingSource, setIsResolvingSource] = useState(false);

  // 세션 토큰 — 재생 시작/정지 때마다 증가한다. 타이머·페이드·TTS 콜백 등 모든 비동기 연쇄는
  // 실행 시점에 자기 세션이 아직 유효한지 확인하고 아니면 죽는다.
  const sessionRef = useRef(0);
  /** 흐름의 각 단계 사이 대기(setTimeout) — 한 번에 하나만 걸려 있다. */
  const flowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<FadeHandle | null>(null);
  /** 시스템 TTS 엔진에서 고른 최적 한국어 목소리 identifier */
  const voiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
    });

    pickKoreanVoice().then((voice) => {
      voiceRef.current = voice;
    });
  }, []);

  /** 진행 중인 흐름(타이머·페이드·TTS)을 전부 무효화한다. 음악은 건드리지 않는다. */
  const cancelFlow = useCallback(() => {
    sessionRef.current += 1;
    if (flowTimerRef.current != null) {
      clearTimeout(flowTimerRef.current);
      flowTimerRef.current = null;
    }
    fadeRef.current?.cancel();
    fadeRef.current = null;
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
        ...koreanSpeech(voiceRef.current),
        onDone: advance,
        onError: advance,
      });
      // 멘트가 끝나지 않는 환경(일부 웹 등)에서도 플로우가 반드시 진행되도록 하는 안전장치.
      flowTimerRef.current = setTimeout(advance, NARRATION_MAX_WAIT_MS);
    },
    [],
  );

  /** ms만큼 기다린 뒤 next로 진행한다. 그동안 배경음악만 흐른다. */
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

  /** 배경음악을 멈추고 처음으로 되감는다. */
  const stopBgm = useCallback(() => {
    if (loadedBgmSourceRef.current === null) return;
    player.pause();
    player.seekTo(0);
    player.volume = BGM_VOLUME;
  }, [player]);

  /**
   * 고른 배경음악을 플레이어에 올린다. 같은 곡이 이미 올라가 있으면 아무것도 하지 않는다.
   * '없음'이면 올릴 것이 없다. Storage 조회는 네트워크라 실패할 수 있고, 호출부가 잡는다.
   */
  const loadBgm = useCallback(async () => {
    const source = bgm.source;
    if (!source) return false;
    if (loadedBgmSourceRef.current === source) return true;

    resolvingRef.current = true;
    setIsResolvingSource(true);
    try {
      const uri = await resolveMediaUrl(source);
      if (!uri) throw new Error(`배경음악을 찾을 수 없습니다: ${source}`);
      player.replace({ uri, headers: MEDIA_HEADERS });
      // 낭독이 음악보다 길 수 있으므로 반복 재생한다.
      player.loop = true;
      loadedBgmSourceRef.current = source;
      return true;
    } finally {
      resolvingRef.current = false;
      setIsResolvingSource(false);
    }
  }, [bgm.source, player]);

  /**
   * 낭독 흐름 전체. 배경음악이 있으면 먼저 깔고 시작한다.
   * (예전에 있던 시작 진동은 없앴다.)
   */
  const startFlow = useCallback(
    (lesson: DailyLesson, labels: NarrationLabels, withBgm: boolean) => {
      cancelFlow();
      const session = sessionRef.current;
      const units = buildNarrationUnits(lesson.story, PARAGRAPH_GAP_MS);

      // 4. 마무리 — 배경음악을 서서히 걷어내고 끝낸다.
      const finish = () => {
        if (!withBgm) {
          setPhase("idle");
          return;
        }
        setPhase("music");
        fadeRef.current = fadeVolume(player, 0, BGM_FADE_OUT_MS);
        fadeRef.current.done.then(() => {
          if (session !== sessionRef.current) return;
          stopBgm();
          setPhase("idle");
        });
      };

      // 3. 마무리 멘트
      const closingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildClosingNarration(labels), finish);
      };

      // 2. 본문 — 문장 단위로 읽고 문단 끝에서만 쉰다.
      const narrate = (index: number) => {
        const unit = units[index];
        if (!unit) {
          closingNarration();
          return;
        }
        setPhase("narration");
        speakThenContinue(session, unit.text, () => {
          if (index + 1 >= units.length) {
            closingNarration();
            return;
          }
          if (unit.gapAfterMs > 0) {
            waitThenContinue(session, unit.gapAfterMs, () => narrate(index + 1));
            return;
          }
          narrate(index + 1);
        });
      };

      // 1. 오프닝 멘트
      const openingNarration = () => {
        setPhase("narration");
        speakThenContinue(session, buildOpeningNarration(labels), () => narrate(0));
      };

      if (!withBgm) {
        setPhase("opening");
        openingNarration();
        return;
      }

      // 배경음악을 무음에서 띄우고, 잠시 음악만 흐른 뒤 멘트를 시작한다.
      setPhase("opening");
      player.volume = 0;
      player.play();
      fadeRef.current = fadeVolume(player, BGM_VOLUME, BGM_FADE_IN_MS);
      waitThenContinue(session, BGM_INTRO_MS, openingNarration);
    },
    [cancelFlow, player, speakThenContinue, stopBgm, waitThenContinue],
  );

  // 언마운트 시 TTS와 타이머 정리
  useEffect(() => cancelFlow, [cancelFlow]);

  /**
   * 재생 ↔ 정지 토글.
   *
   * 낭독은 중간 재개가 없다(문장 도중에서 이어 읽을 수 없다). 그래서 토글은
   * '처음부터 시작' 또는 '중단' 둘 중 하나다.
   */
  const togglePlay = useCallback(
    async (lesson: DailyLesson, labels: NarrationLabels) => {
      setHasError(false);
      // URL 조회가 진행 중일 때 연타로 인한 중복 요청을 막는다.
      if (resolvingRef.current) return;

      if (phase !== "idle") {
        cancelFlow();
        stopBgm();
        setPhase("idle");
        return;
      }

      try {
        const withBgm = await loadBgm();
        startFlow(lesson, labels, withBgm);
      } catch {
        // 배경음악을 못 받아도 낭독은 들려준다 — 음악은 배경일 뿐이다.
        setHasError(true);
        loadedBgmSourceRef.current = null;
        startFlow(lesson, labels, false);
      }
    },
    [phase, cancelFlow, loadBgm, startFlow, stopBgm],
  );

  /** 다시듣기 — 어디에 있든 처음부터 다시 시작한다. */
  const restart = useCallback(
    async (lesson: DailyLesson, labels: NarrationLabels) => {
      setHasError(false);
      if (resolvingRef.current) return;

      cancelFlow();
      stopBgm();

      try {
        const withBgm = await loadBgm();
        startFlow(lesson, labels, withBgm);
      } catch {
        setHasError(true);
        loadedBgmSourceRef.current = null;
        startFlow(lesson, labels, false);
      }
    },
    [cancelFlow, loadBgm, startFlow, stopBgm],
  );

  /** 재생을 완전히 멈추고 idle로 되돌린다. 항목이 바뀔 때 호출한다. */
  const stop = useCallback(() => {
    cancelFlow();
    stopBgm();
    setPhase("idle");
  }, [cancelFlow, stopBgm]);

  const loadFailed = hasError || status.error != null;

  return {
    // 낭독 중에는 player가 놀고 있을 수 있으므로(배경음악 없음) 흐름이 도는지로 판정한다.
    isPlaying: phase !== "idle",
    isLoading: !loadFailed && isResolvingSource,
    hasError: loadFailed,
    /** 현재 단계 — UI에서 나레이션 중임을 표시할 때 사용 */
    phase,
    isNarrating: phase === "narration",
    togglePlay,
    restart,
    stop,
  };
}
