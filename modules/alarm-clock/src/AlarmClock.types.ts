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

export interface AlarmPermissionStatus {
  notifications: boolean;
  /** Android 12+ 에서만 의미가 있다. 그 이전 버전은 항상 true. */
  exactAlarm: boolean;
  /** Android 14+ 에서만 의미가 있다. 그 이전 버전은 항상 true. */
  fullScreenIntent: boolean;
  /**
   * '다른 앱 위에 표시'(SYSTEM_ALERT_WINDOW).
   *
   * 이게 없으면 기기를 쓰는 중에 알람이 울릴 때 전체화면이 뜨지 않고 헤드업 알림으로
   * 격하된다 — Android가 백그라운드 액티비티 실행을 막기 때문이다(BAL_BLOCK).
   * 알라미가 이 권한을 요구하는 이유가 이것이다.
   *
   * 알람이 아예 안 울리는 것은 아니므로 다른 권한보다는 덜 치명적이다.
   */
  overlay: boolean;
}
