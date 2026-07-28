import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

import type { AlarmInput, AlarmPermissionStatus } from './src/AlarmClock.types';

export type { AlarmInput, AlarmPermissionStatus };

interface AlarmClockNativeModule {
  scheduleAlarm(input: AlarmInput): Promise<void>;
  cancelAlarm(): Promise<void>;
  getPermissionStatus(): Promise<AlarmPermissionStatus>;
  openAlarmPermissionSettings(): Promise<void>;
}

const ALL_GRANTED: AlarmPermissionStatus = {
  notifications: true,
  exactAlarm: true,
  fullScreenIntent: true,
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

/** 부족한 권한 중 우선순위가 높은 것의 설정 화면을 연다. */
export async function openAlarmPermissionSettings(): Promise<void> {
  await getNativeModule()?.openAlarmPermissionSettings();
}

export function hasAllAlarmPermissions(status: AlarmPermissionStatus): boolean {
  return status.notifications && status.exactAlarm && status.fullScreenIntent;
}

/**
 * 네이티브 모듈이 실제로 연결됐는지 확인한다. 알람이 안 울릴 때 원인이 "예약 실패"인지
 * "모듈 미연결"인지 구분하는 용도.
 */
export function isNativeAlarmAvailable(): boolean {
  return getNativeModule() !== null;
}
