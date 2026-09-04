export interface AlarmInput {
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  /** 길이 7, index 0=일요일 */
  repeatDays: boolean[];
  sound: 'default' | 'custom';
  enabled: boolean;
}

/** 권한 한 종류를 가리키는 키 — AlarmPermissionStatus의 필드 이름과 같다. */
export type AlarmPermissionKind =
  | 'notifications'
  | 'exactAlarm'
  | 'fullScreenIntent';

export interface AlarmPermissionStatus {
  notifications: boolean;
  /** Android 12+ 에서만 의미가 있다. 그 이전 버전은 항상 true. */
  exactAlarm: boolean;
  /**
   * Android 14+ 에서만 의미가 있다. 그 이전 버전은 항상 true.
   *
   * 잠금·화면꺼짐일 때 알람 화면을 띄우는 유일한 길이다. 예전에는 '다른 앱 위에 표시'
   * (SYSTEM_ALERT_WINDOW)로 기기를 쓰는 중에도 전체화면을 덮었지만, 그 권한은 걷어냈다 —
   * 다른 앱을 쓰는 중이라면 헤드업 알림으로만 알린다.
   */
  fullScreenIntent: boolean;
}
