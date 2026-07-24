import Constants from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';

import type { AlarmState } from '@/context/AlarmContext';
import { getTodayTrack } from '@/lib/data';

type NotificationsApi = typeof NotificationsModule;

const ALARM_CHANNEL_ID = 'alarm';

/**
 * Expo Go(storeClient)에서는 expo-notifications를 require만 해도 그 모듈이 내부적으로
 * 기기 푸시 토큰을 비동기로 자동 등록하려 시도하다 못 잡히는 예외를 던진다 — require를
 * try/catch로 감싸도 이 실패는 동기적으로 일어나지 않아 못 잡는다. 그래서 애초에 Expo Go일
 * 때는 require 자체를 하지 않는다. 개발 빌드(dev client)/프로덕션 빌드에서는 정상 동작한다.
 */
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' && Constants.expoGoConfig != null;

let notificationsApi: NotificationsApi | null | undefined; // undefined = 아직 시도 안 함

function getNotificationsApi(): NotificationsApi | null {
  if (notificationsApi !== undefined) return notificationsApi;

  if (isExpoGo) {
    console.warn('[alarm] Expo Go에서는 알림을 사용할 수 없습니다 — 실제 알림 없이 UI만 동작합니다.');
    notificationsApi = null;
    return notificationsApi;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsApi = require('expo-notifications') as NotificationsApi;
  } catch (error) {
    console.warn(
      '[alarm] expo-notifications를 사용할 수 없는 환경입니다 — 실제 알림 없이 UI만 동작합니다.',
      error,
    );
    notificationsApi = null;
  }
  return notificationsApi;
}

let handlerConfigured = false;
let channelConfigured = false;

/** 앱이 포그라운드에 있어도 알림 배너가 뜨도록 핸들러를 한 번만 등록한다. */
function ensureNotificationHandler(api: NotificationsApi) {
  if (handlerConfigured) return;
  handlerConfigured = true;
  api.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android에서 알람다운 고중요도(헤드업+소리+진동) 채널을 한 번만 만든다. */
async function ensureAlarmChannel(api: NotificationsApi) {
  if (channelConfigured) return;
  channelConfigured = true;
  await api.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: '알람',
    importance: api.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: api.AndroidNotificationVisibility.PUBLIC,
  });
}

/** 알림 권한을 확인하고, 없으면 요청한다. expo-notifications를 못 쓰는 환경이면 false. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const api = getNotificationsApi();
  if (!api) return false;

  try {
    ensureNotificationHandler(api);
    await ensureAlarmChannel(api);

    const current = await api.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await api.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return requested.granted;
  } catch (error) {
    console.warn('[alarm] 알림 권한 확인/요청 실패:', error);
    return false;
  }
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
  const api = getNotificationsApi();
  if (!api || ids.length === 0) return;
  await Promise.all(ids.map((id) => api.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * 커스텀 알람 사운드 파일명 — 아직 파이어베이스에 업로드되지 않아 비어 있다. 채워지면
 * alarm.sound === 'custom'일 때 이 값을 쓰도록 아래 scheduleAlarmNotifications만 고치면 된다.
 * (알림 사운드는 OS가 앱에 번들된 파일만 재생할 수 있어, 원격 URL을 그대로 쓸 수는 없다 —
 * 다운로드해 기기에 저장한 뒤 그 로컬 파일명을 등록하는 방식이 필요하다.)
 */
const CUSTOM_ALARM_SOUND_FILE: string | null = null;

function resolveAlarmSoundName(alarm: AlarmState): string {
  if (alarm.sound === 'custom' && CUSTOM_ALARM_SOUND_FILE) return CUSTOM_ALARM_SOUND_FILE;
  return 'default';
}

/**
 * 활성화된 요일마다 주간 반복 알림을 하나씩 예약한다 (expo-notifications는 트리거 하나당
 * 요일 하나만 지원). expo-notifications를 못 쓰는 환경이거나 권한이 없거나 반복 요일이
 * 하나도 없으면 빈 배열을 반환한다.
 */
export async function scheduleAlarmNotifications(alarm: AlarmState): Promise<string[]> {
  const api = getNotificationsApi();
  if (!api) return [];

  const granted = await ensureNotificationPermission();
  if (!granted) return [];

  // expo-notifications weekday: 1=일요일 ... 7=토요일 — repeatDays의 인덱스(0=일)와 +1 관계.
  const enabledWeekdays = alarm.repeatDays
    .map((on, index) => (on ? index + 1 : null))
    .filter((weekday): weekday is number => weekday !== null);

  if (enabledWeekdays.length === 0) return [];

  // '오늘의 곡'은 실제 날짜와 무관하게 항상 고정 트랙이라(getTodayTrack), 예약 시점에
  // 트랙 id를 넣어둬도 알림이 실제로 울리는 시점과 어긋날 일이 없다.
  const todayTrack = getTodayTrack();

  try {
    return await Promise.all(
      enabledWeekdays.map((weekday) =>
        api.scheduleNotificationAsync({
          content: {
            title: todayTrack.title,
            body: `${todayTrack.composer} · 지금 들어보세요`,
            sound: resolveAlarmSoundName(alarm),
            data: { trackId: todayTrack.id },
          },
          trigger: {
            type: api.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: alarm.hour,
            minute: alarm.minute,
            channelId: ALARM_CHANNEL_ID,
          },
        }),
      ),
    );
  } catch (error) {
    console.warn('[alarm] 알림 예약 실패:', error);
    return [];
  }
}

export interface AlarmNotificationPayload {
  trackId: string;
}

function extractPayload(
  response: NotificationModuleResponse | null | undefined,
): AlarmNotificationPayload | null {
  const trackId = response?.notification.request.content.data?.trackId;
  return typeof trackId === 'string' ? { trackId } : null;
}

type NotificationModuleResponse = NotificationsModule.NotificationResponse;

/**
 * 알림 탭으로 앱이 콜드 스타트(완전 종료 상태에서 실행)됐다면 그 알림의 데이터를 반환한다.
 * 그런 게 아니면(그냥 홈 화면 아이콘으로 열었다면) null.
 */
export async function getLaunchNotificationPayload(): Promise<AlarmNotificationPayload | null> {
  const api = getNotificationsApi();
  if (!api) return null;
  try {
    const response = await api.getLastNotificationResponseAsync();
    return extractPayload(response);
  } catch (error) {
    console.warn('[alarm] 콜드 스타트 알림 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 앱이 이미 떠 있는 동안 알림을 탭했을 때 호출된다. 구독 해제 함수를 반환한다.
 * expo-notifications를 못 쓰는 환경이면 아무것도 하지 않는 빈 해제 함수를 반환한다.
 */
export function addAlarmNotificationTapListener(
  onTap: (payload: AlarmNotificationPayload) => void,
): () => void {
  const api = getNotificationsApi();
  if (!api) return () => {};
  const subscription = api.addNotificationResponseReceivedListener((response) => {
    const payload = extractPayload(response);
    if (payload) onTap(payload);
  });
  return () => subscription.remove();
}
