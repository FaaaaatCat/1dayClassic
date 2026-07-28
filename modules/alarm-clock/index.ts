import { Platform, requireOptionalNativeModule } from 'expo-modules-core';

import type { AlarmInput, AlarmPermissionStatus } from './src/AlarmClock.types';

export type { AlarmInput, AlarmPermissionStatus };

/**
 * Android 전용 네이티브 알람 모듈. 다른 플랫폼이거나 네이티브 모듈이 없는 환경(Expo Go)에서는
 * null이고, 아래 함수들은 전부 no-op으로 동작한다.
 */
const AlarmClock = Platform.OS === 'android' ? requireOptionalNativeModule('AlarmClock') : null;

const ALL_GRANTED: AlarmPermissionStatus = {
  notifications: true,
  exactAlarm: true,
  fullScreenIntent: true,
};

/** 알람을 예약한다. 기존 예약은 덮어쓴다. enabled=false면 취소만 수행한다. */
export async function scheduleAlarm(input: AlarmInput): Promise<void> {
  await AlarmClock?.scheduleAlarm(input);
}

/** 예약된 알람을 모두 취소한다. */
export async function cancelAlarm(): Promise<void> {
  await AlarmClock?.cancelAlarm();
}

/** 현재 권한 상태. 네이티브 모듈이 없으면 전부 허용된 것으로 간주한다. */
export async function getPermissionStatus(): Promise<AlarmPermissionStatus> {
  if (!AlarmClock) return ALL_GRANTED;
  return AlarmClock.getPermissionStatus();
}

/** 부족한 권한 중 우선순위가 높은 것의 설정 화면을 연다. */
export async function openAlarmPermissionSettings(): Promise<void> {
  await AlarmClock?.openAlarmPermissionSettings();
}

export function hasAllAlarmPermissions(status: AlarmPermissionStatus): boolean {
  return status.notifications && status.exactAlarm && status.fullScreenIntent;
}
