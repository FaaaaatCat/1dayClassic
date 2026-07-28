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
}
