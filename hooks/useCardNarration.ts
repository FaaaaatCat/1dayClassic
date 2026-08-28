import { setAudioModeAsync, useAudioPlayer as useExpoAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useBgm } from '@/context/BgmContext';
import { fadeVolume, type FadeHandle } from '@/lib/fade';
import { resolveMediaUrl } from '@/lib/firebase';
import { MEDIA_HEADERS } from '@/lib/lessons';
import { koreanSpeech, pickKoreanVoice } from '@/lib/tts';

/** 배경음악 볼륨 — 낭독을 덮지 않도록 낮게 깐다. 음악은 주인공이 아니라 바닥이다. */
const BGM_VOLUME = 0.25;
/** 오프닝 — 낭독 없이 음악만 흐르며 올라오는 시간. */
const OPENING_MS = 5000;
/** 엔딩 — 낭독이 끝난 뒤 음악만 남아 사라지는 시간. */
const ENDING_MS = 5000;
/** 한 장을 다 읽고 다음 장으로 넘어가기 전의 정적. */
const PAGE_GAP_MS = 4000;
/**
 * TTS가 onDone/onError를 안 주는 환경에서도 흐름이 멈추지 않게 하는 최대 대기.
 * 한 덩이는 문장 하나라 이만큼 걸릴 일이 없다 — 순전히 안전장치다.
 */
const SPEAK_MAX_WAIT_MS = 30000;

export interface NarrationStep {
  /** 이 덩이를 읽는 동안 펼쳐 둘 카드 */
  page: number;
  /** 읽을 말. 한 카드가 여러 덩이를 가질 수 있다(표지의 책 이름과 회차처럼). */
  text: string;
  /**
   * 이 덩이가 카드에 그려진 글의 몇 번째 글자에서 시작하는지.
   *
   * TTS는 지금 읽는 단어의 자리를 '넘겨준 말 안에서의 위치'로 알려 준다. 우리는 문장씩
   * 끊어 넘기므로, 카드 위의 자리를 알려면 문장이 문단 어디서 시작했는지를 더해야 한다.
   * 없으면 하이라이트를 하지 않는다 — 표지처럼 읽는 말과 그린 글이 다른 장이 그렇다.
   */
  offset?: number;
}

/**
 * TTS가 단어를 시작할 때 넘겨주는 자리. expo-speech가 이 타입을 밖으로 내보내지 않아
 * 여기서 모양만 적어 둔다(build/Speech.types의 NativeBoundaryEvent와 같다).
 */
interface BoundaryEvent {
  charIndex: number;
  charLength: number;
}

/** 지금 읽고 있는 자리. 카드에 그려진 글에서의 글자 범위다. */
export interface SpokenRange {
  page: number;
  start: number;
  end: number;
}

/** 지금 무엇을 하고 있는지. 버튼 모양과 아이콘이 여기에 붙는다. */
export type NarrationPhase = 'idle' | 'opening' | 'reading' | 'ending';

/**
 * 카드를 넘겨 가며 읽어 주는 낭독기.
 *
 * 흐름은 하나뿐이다 — 음악만 흐르는 오프닝 → 카드별 낭독(장이 바뀌는 자리마다 정적) →
 * 음악만 남는 엔딩. 배경음악은 설정에서 고른 한 곡을 쓴다(BgmContext). '없음'을 골랐으면
 * 같은 흐름이 음악 없이 돈다.
 *
 * 낭독은 중간 재개가 없다. 문장 도중에서 이어 읽을 수 없어서, 재생 버튼은 '처음부터
 * 시작' 아니면 '중단' 둘 중 하나다 — 항목 상세의 낭독(useAudioPlayer)과 같은 규칙이다.
 *
 * 세션 토큰(sessionRef)으로 모든 비동기 연쇄를 끊는다. 타이머·페이드·TTS 콜백은 실행
 * 시점에 자기 세션이 아직 유효한지 확인하고 아니면 그 자리에서 죽는다.
 */
export function useCardNarration({
  steps,
  onPage,
  onFinish,
}: {
  steps: NarrationStep[];
  /** 이 장을 펼쳐 달라는 신호. 낭독이 카드를 끌고 간다. */
  onPage: (page: number) => void;
  /** 끝까지 다 읽고 음악까지 걷힌 뒤. 도중에 멈춘 경우에는 부르지 않는다. */
  onFinish?: () => void;
}) {
  const player = useExpoAudioPlayer(undefined, { updateInterval: 250 });
  const { bgm } = useBgm();
  const [phase, setPhase] = useState<NarrationPhase>('idle');
  /** 지금 읽고 있는 글자 자리 — 단어가 넘어갈 때마다 바뀐다. */
  const [spoken, setSpoken] = useState<SpokenRange | null>(null);

  const sessionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<FadeHandle | null>(null);
  const voiceRef = useRef<string | undefined>(undefined);
  /** 이미 올려 둔 배경음악의 Storage 경로 — 같은 곡이면 다시 받지 않는다. */
  const loadedSourceRef = useRef<string | null>(null);
  /** URL 조회 중 연타를 막는 재진입 가드. */
  const resolvingRef = useRef(false);

  // 화면이 매 렌더 새로 만들어 넘기는 콜백들 — 흐름이 붙들지 않도록 ref에 담아 둔다.
  const onPageRef = useRef(onPage);
  onPageRef.current = onPage;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    pickKoreanVoice().then((voice) => {
      voiceRef.current = voice;
    });
  }, []);

  /** 진행 중인 흐름(타이머·페이드·TTS)을 전부 무효화한다. 음악은 건드리지 않는다. */
  const cancelFlow = useCallback(() => {
    sessionRef.current += 1;
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    fadeRef.current?.cancel();
    fadeRef.current = null;
    Speech.stop();
  }, []);

  const stopBgm = useCallback(() => {
    if (loadedSourceRef.current === null) return;
    player.pause();
    player.seekTo(0);
    player.volume = BGM_VOLUME;
  }, [player]);

  /** 고른 배경음악을 플레이어에 올린다. '없음'이면 올릴 것이 없다(false). */
  const loadBgm = useCallback(async () => {
    const source = bgm.source;
    if (!source) return false;
    if (loadedSourceRef.current === source) return true;

    resolvingRef.current = true;
    try {
      const uri = await resolveMediaUrl(source);
      if (!uri) throw new Error(`배경음악을 찾을 수 없습니다: ${source}`);
      player.replace({ uri, headers: MEDIA_HEADERS });
      // 낭독이 곡보다 길 수 있으므로 반복 재생한다.
      player.loop = true;
      loadedSourceRef.current = source;
      return true;
    } finally {
      resolvingRef.current = false;
    }
  }, [bgm.source, player]);

  const speakThen = useCallback((session: number, step: NarrationStep, next: () => void) => {
    let advanced = false;
    const advance = () => {
      if (advanced || session !== sessionRef.current) return;
      advanced = true;
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      next();
    };

    Speech.speak(step.text, {
      ...koreanSpeech(voiceRef.current),
      // 지금 읽는 단어의 자리. 안드로이드는 UtteranceProgressListener.onRangeStart,
      // iOS는 willSpeakRangeOfSpeechString이 넘겨준다.
      onBoundary: (event: BoundaryEvent) => {
        if (session !== sessionRef.current) return;
        const base = step.offset;
        if (base == null) return;
        const { charIndex, charLength } = event;
        if (typeof charIndex !== 'number') return;
        const start = base + charIndex;
        const end = start + (charLength || 0);
        setSpoken((prev) =>
          prev && prev.page === step.page && prev.start === start && prev.end === end
            ? prev
            : { page: step.page, start, end },
        );
      },
      onDone: advance,
      onError: advance,
    });
    timerRef.current = setTimeout(advance, SPEAK_MAX_WAIT_MS);
  }, []);

  const waitThen = useCallback((session: number, ms: number, next: () => void) => {
    timerRef.current = setTimeout(() => {
      if (session !== sessionRef.current) return;
      timerRef.current = null;
      next();
    }, ms);
  }, []);

  const startFlow = useCallback(
    (withBgm: boolean) => {
      cancelFlow();
      const session = sessionRef.current;

      // 3. 엔딩 — 낭독 없이 음악만 남아 사라진다.
      const ending = () => {
        setSpoken(null);
        if (!withBgm) {
          setPhase('idle');
          onFinishRef.current?.();
          return;
        }
        setPhase('ending');
        fadeRef.current = fadeVolume(player, 0, ENDING_MS);
        fadeRef.current.done.then((completed) => {
          if (!completed || session !== sessionRef.current) return;
          stopBgm();
          setPhase('idle');
          onFinishRef.current?.();
        });
      };

      // 2. 낭독 — 장이 바뀌는 자리에서만 쉰다. 한 장 안의 덩이들은 이어 읽는다.
      const read = (index: number) => {
        const step = steps[index];
        if (!step) {
          ending();
          return;
        }
        const previous = steps[index - 1];
        const turned = !previous || previous.page !== step.page;

        const go = () => {
          if (session !== sessionRef.current) return;
          if (turned) onPageRef.current(step.page);
          setPhase('reading');
          speakThen(session, step, () => read(index + 1));
        };

        if (previous && turned) waitThen(session, PAGE_GAP_MS, go);
        else go();
      };

      // 1. 오프닝 — 낭독 없이 음악만 올라온다. 음악이 없으면 기다릴 것도 없다.
      if (!withBgm) {
        read(0);
        return;
      }
      setPhase('opening');
      player.volume = 0;
      player.play();
      fadeRef.current = fadeVolume(player, BGM_VOLUME, OPENING_MS);
      waitThen(session, OPENING_MS, () => read(0));
    },
    [cancelFlow, player, speakThen, steps, stopBgm, waitThen],
  );

  const stop = useCallback(() => {
    cancelFlow();
    stopBgm();
    setSpoken(null);
    setPhase('idle');
  }, [cancelFlow, stopBgm]);

  /** 처음부터 시작한다. 이미 돌고 있으면 끊고 다시 건다. */
  const restart = useCallback(async () => {
    if (resolvingRef.current) return;
    cancelFlow();
    stopBgm();
    setSpoken(null);
    try {
      startFlow(await loadBgm());
    } catch {
      // 배경음악을 못 받아도 낭독은 들려준다 — 음악은 배경일 뿐이다.
      loadedSourceRef.current = null;
      startFlow(false);
    }
  }, [cancelFlow, loadBgm, startFlow, stopBgm]);

  /** 재생 ↔ 정지. 낭독은 중간 재개가 없어 '처음부터' 아니면 '중단'이다. */
  const toggle = useCallback(() => {
    if (phase !== 'idle') {
      stop();
      return;
    }
    restart();
  }, [phase, restart, stop]);

  // 화면을 떠나면 낭독도 음악도 남기지 않는다.
  useEffect(
    () => () => {
      cancelFlow();
      stopBgm();
    },
    [cancelFlow, stopBgm],
  );

  return { phase, playing: phase !== 'idle', spoken, toggle, restart, stop };
}
