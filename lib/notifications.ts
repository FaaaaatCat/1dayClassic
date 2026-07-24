import * as Notifications from 'expo-notifications';

import type { AlarmState } from '@/context/AlarmContext';

const ALARM_CHANNEL_ID = 'alarm';

let handlerConfigured = false;
let channelConfigured = false;

/** 앱이 포그라운드에 있어도 알림 배너가 뜨도록 핸들러를 한 번만 등록한다. */
function ensureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android에서 알람다운 고중요도(헤드업+소리+진동) 채널을 한 번만 만든다. */
async function ensureAlarmChannel() {
  if (channelConfigured) return;
  channelConfigured = true;
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: '알람',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** 알림 권한을 확인하고, 없으면 요청한다. */
export async function ensureNotificationPermission(): Promise<boolean> {
  ensureNotificationHandler();
  await ensureAlarmChannel();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

export interface AlarmCountdown {
  /** "3시간 22분 후 " 같은 굵게 표시할 부분 — 꺼져 있으면 빈 문자열 */
  prefix: string;
  /** "알람이 울립니다" / "알람이 꺼져 있습니다" */
  suffix: string;
}

/**
 * 다음 알람까지 남은 시간을 계산한다. 실제 현재 시각(Date)을 기준으로 하며,
 * 앱이 고정해둔 '오늘' 날짜(TODAY_MONTH/TODAY_DAY)와는 무관하다.
 */
export function getAlarmCountdown(alarm: AlarmState): AlarmCountdown {
  if (!alarm.enabled || !alarm.repeatDays.some(Boolean)) {
    return { prefix: '', suffix: '알람이 꺼져 있습니다' };
  }

  const now = new Date();
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);

    const weekday = candidate.getDay(); // 0=일 ... 6=토, repeatDays와 인덱스가 같다.
    if (!alarm.repeatDays[weekday] || candidate.getTime() <= now.getTime()) continue;

    const diffMinutes = Math.round((candidate.getTime() - now.getTime()) / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const prefix = hours > 0 ? `${hours}시간 ${minutes}분 후 ` : `${minutes}분 후 `;
    return { prefix, suffix: '알람이 울립니다' };
  }

  return { prefix: '', suffix: '알람이 꺼져 있습니다' };
}

export async function cancelAlarmNotifications(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

/**
 * 활성화된 요일마다 주간 반복 알림을 하나씩 예약한다 (expo-notifications는 트리거 하나당
 * 요일 하나만 지원). 권한이 없거나 반복 요일이 하나도 없으면 빈 배열을 반환한다.
 */
export async function scheduleAlarmNotifications(alarm: AlarmState): Promise<string[]> {
  const granted = await ensureNotificationPermission();
  if (!granted) return [];

  // expo-notifications weekday: 1=일요일 ... 7=토요일 — repeatDays의 인덱스(0=일)와 +1 관계.
  const enabledWeekdays = alarm.repeatDays
    .map((on, index) => (on ? index + 1 : null))
    .filter((weekday): weekday is number => weekday !== null);

  if (enabledWeekdays.length === 0) return [];

  return Promise.all(
    enabledWeekdays.map((weekday) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: alarm.label || '알람',
          body: '설정한 시간이 되었습니다.',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: alarm.hour,
          minute: alarm.minute,
          channelId: ALARM_CHANNEL_ID,
        },
      }),
    ),
  );
}
