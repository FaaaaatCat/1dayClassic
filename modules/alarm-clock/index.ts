import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type {
  AlarmInput,
  AlarmPermissionKind,
  AlarmPermissionStatus,
} from './src/AlarmClock.types';

export type { AlarmInput, AlarmPermissionKind, AlarmPermissionStatus };

/**
 * 표지를 어느 크기로 놓을지.
 * - `mockup` — 알람 전용 합성 표지(그림자·원근 포함). 190×256dp 그대로.
 * - `flat` — 서점 표지를 빌려 쓴 경우. 비율이 달라 148×219dp로 작게.
 */
export type AlarmCoverStyle = 'mockup' | 'flat';

/** 알람 화면이 쓸 책 이미지를 복사해 넣을 자리 — 경로는 네이티브가 정한다. */
export interface AlarmImageTargets {
  /** background/cover를 담을 폴더. 아직 없을 수 있어 쓰기 전에 만들어야 한다. */
  directory: string;
  background: string;
  cover: string;
}

/** 디자인 확인용 미리보기에 넘길 책 한 권. 이미지는 파일로 깔아 두고 경로만 넘긴다. */
export interface AlarmPreviewBook {
  name: string;
  coverStyle: AlarmCoverStyle;
  backgroundUri: string;
  coverUri: string;
}

interface AlarmClockNativeModule {
  scheduleAlarm(input: AlarmInput): Promise<void>;
  cancelAlarm(): Promise<void>;
  getPermissionStatus(): Promise<AlarmPermissionStatus>;
  openAlarmPermissionSettings(): Promise<void>;
  requestPermission(kind: AlarmPermissionKind): Promise<void>;
  setAlarmBook(name: string, coverStyle: AlarmCoverStyle): Promise<void>;
  getAlarmImageTargets(): Promise<AlarmImageTargets>;
  previewAlarm(books: AlarmPreviewBook[]): Promise<void>;
  isAlarmLockFlow(): Promise<boolean>;
  addListener(
    event: 'onAlarmLockFlowChanged',
    listener: (payload: { active: boolean }) => void,
  ): { remove(): void };
}

const ALL_GRANTED: AlarmPermissionStatus = {
  notifications: true,
  exactAlarm: true,
  fullScreenIntent: true,
  overlay: true,
};

let resolved: AlarmClockNativeModule | null = null;
let warned = false;

/**
 * 네이티브 모듈을 "호출 시점에" 해석한다.
 *
 * 모듈 스코프에서 한 번만 해석하면, 이 파일이 expo-router 루트(_layout.tsx)를 통해 아주
 * 이른 시점에 import될 때 Expo 모듈 레지스트리가 아직 준비되지 않았을 경우 null이 영구
 * 캐싱되어 모든 알람 호출이 조용히 무시된다. 성공한 결과만 캐싱하고 실패는 재시도한다.
 */
function getNativeModule(): AlarmClockNativeModule | null {
  if (resolved) return resolved;
  if (Platform.OS !== 'android') return null;

  const nativeModule = requireOptionalNativeModule<AlarmClockNativeModule>('AlarmClock');
  if (nativeModule) {
    resolved = nativeModule;
    return resolved;
  }

  // 침묵하는 실패는 원인 추적을 매우 어렵게 만든다 — 한 번은 반드시 알린다.
  if (!warned) {
    warned = true;
    console.warn(
      '[alarm] 네이티브 모듈 AlarmClock을 찾을 수 없습니다 — 알람이 예약되지 않습니다. ' +
        'Expo Go에서는 정상이지만, 개발/프로덕션 빌드라면 네이티브 모듈 링크를 확인하세요.',
    );
  }
  return null;
}

/** 알람을 예약한다. 기존 예약은 덮어쓴다. */
export async function scheduleAlarm(input: AlarmInput): Promise<void> {
  await getNativeModule()?.scheduleAlarm(input);
}

/** 예약된 알람을 모두 취소한다. */
export async function cancelAlarm(): Promise<void> {
  await getNativeModule()?.cancelAlarm();
}

/** 현재 권한 상태. 네이티브 모듈이 없으면 전부 허용된 것으로 간주한다. */
export async function getPermissionStatus(): Promise<AlarmPermissionStatus> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return ALL_GRANTED;
  return nativeModule.getPermissionStatus();
}

/** 알람 화면이 쓸 책 이름("하루 클래식 공부")과 표지 종류를 네이티브에 저장한다. */
export async function setAlarmBook(name: string, coverStyle: AlarmCoverStyle): Promise<void> {
  await getNativeModule()?.setAlarmBook(name, coverStyle);
}

/** 책 이미지를 복사해 넣을 자리. 네이티브 모듈이 없으면 null — 그 경우 동기화를 건너뛴다. */
export async function getAlarmImageTargets(): Promise<AlarmImageTargets | null> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return null;
  return nativeModule.getAlarmImageTargets();
}

/** 디자인 확인용 — 실제 알람 화면을 넘겨 보는 모드로 띄운다. 소리·진동·버튼 동작은 없다. */
export async function previewAlarm(books: AlarmPreviewBook[]): Promise<void> {
  await getNativeModule()?.previewAlarm(books);
}

/** 부족한 권한 중 우선순위가 높은 것의 설정 화면을 연다. */
export async function openAlarmPermissionSettings(): Promise<void> {
  await getNativeModule()?.openAlarmPermissionSettings();
}

/**
 * 권한 하나를 요청한다.
 *
 * 알림만 시스템 팝업이 뜨고(Android 13+ 런타임 권한), 나머지 셋은 Android가 요청 API를
 * 제공하지 않아 해당 권한의 시스템 설정 화면이 열린다. 어느 쪽이든 결과는 즉시 알 수 없으므로,
 * 호출한 쪽은 앱이 다시 포그라운드로 돌아올 때 getPermissionStatus로 다시 읽어야 한다.
 */
export async function requestAlarmPermission(kind: AlarmPermissionKind): Promise<void> {
  await getNativeModule()?.requestPermission(kind);
}

export function hasAllAlarmPermissions(status: AlarmPermissionStatus): boolean {
  return (
    status.notifications && status.exactAlarm && status.fullScreenIntent && status.overlay
  );
}

/**
 * 네이티브 모듈이 실제로 연결됐는지 확인한다. 알람이 안 울릴 때 원인이 "예약 실패"인지
 * "모듈 미연결"인지 구분하는 용도.
 */
export function isNativeAlarmAvailable(): boolean {
  return getNativeModule() !== null;
}

/**
 * 지금 잠금화면 위 알람 플로우인지 구독한다.
 *
 * 잠금 중에는 오늘의 공부에서 나갈 길이 없어야 하므로, 이 값이 참이면 화면을 벗어나는
 * 컨트롤을 감춘다. 네이티브 모듈이 없으면(iOS·Expo Go) 항상 false다.
 */
export function useAlarmLockFlow(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const nativeModule = getNativeModule();
    if (!nativeModule) return;

    let cancelled = false;
    // 이미 플로우 중일 때 마운트될 수 있다 — 이벤트만 기다리면 그 경우를 놓친다.
    nativeModule
      .isAlarmLockFlow()
      .then((value) => {
        if (!cancelled) setActive(value);
      })
      .catch(() => undefined);

    const subscription = nativeModule.addListener('onAlarmLockFlowChanged', (payload) => {
      setActive(payload.active);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return active;
}
