import type { AudioPlayer } from 'expo-audio';

export interface FadeHandle {
  /** 진행 중인 페이드를 즉시 중단한다. 볼륨은 중단 시점 값에 머문다. */
  cancel: () => void;
  /** 끝까지 완료되면 true, 취소되면 false */
  done: Promise<boolean>;
}

const STEP_MS = 50;

/**
 * player.volume을 durationMs에 걸쳐 target까지 선형 램프한다.
 * expo-audio에는 내장 페이드가 없어 JS 타이머로 구현한다 — 새 페이드를
 * 시작하기 전에 반드시 이전 핸들을 cancel()해야 볼륨 경합이 없다.
 */
export function fadeVolume(
  player: AudioPlayer,
  target: number,
  durationMs = 800
): FadeHandle {
  const from = player.volume;
  const steps = Math.max(1, Math.round(durationMs / STEP_MS));
  let step = 0;
  let cancelled = false;
  let finish: (completed: boolean) => void;
  const done = new Promise<boolean>((resolve) => {
    finish = resolve;
  });

  const id = setInterval(() => {
    step += 1;
    player.volume = from + ((target - from) * step) / steps;
    if (step >= steps) {
      clearInterval(id);
      player.volume = target;
      finish(true);
    }
  }, STEP_MS);

  return {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      clearInterval(id);
      finish(false);
    },
    done,
  };
}
