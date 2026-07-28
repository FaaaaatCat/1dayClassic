import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addAlarmNotificationTapListener,
  cancelAllAlarmNotifications,
  getLaunchNotificationPayload,
  scheduleAlarmNotifications,
} from '@/lib/notifications';

/** 'custom'은 사용자가 지정한 사운드 파일 — 아직 파일이 없어 실제 예약 시에는 'default'로 대체된다. */
export type AlarmSound = 'default' | 'custom';

export interface AlarmState {
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  enabled: boolean;
  /** index 0=일 ... 6=토 */
  repeatDays: boolean[];
  sound: AlarmSound;
}

interface AlarmContextValue {
  alarm: AlarmState;
  /** 여러 필드를 한 번에 커밋 — 알람 편집 화면의 '저장'에서 사용 */
  updateAlarm: (patch: Partial<AlarmState>) => void;
  toggleEnabled: () => void;
}

const AlarmContext = createContext<AlarmContextValue | null>(null);

const DEFAULT_ALARM: AlarmState = {
  hour: 7,
  minute: 0,
  enabled: true,
  repeatDays: [false, true, true, true, true, true, false],
  sound: 'default',
};

/** 알람 설정을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'alarm-state-v1';

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [alarm, setAlarm] = useState<AlarmState>(DEFAULT_ALARM);
  /** 저장된 값을 불러오기 전까지는 DEFAULT_ALARM으로 예약/저장을 하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setAlarm(JSON.parse(raw) as AlarmState);
      } catch (error) {
        console.warn('[alarm] 저장된 알람 불러오기 실패:', error);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarm)).catch((error) => {
      console.warn('[alarm] 알람 저장 실패:', error);
    });
  }, [alarm, hydrated]);

  // 알람이 바뀔 때마다 이 앱이 예약한 모든 알림을 전부 지우고 다시 예약한다. id 목록을 메모리에
  // 들고 있다가 취소하는 방식은 앱 재시작으로 그 목록이 사라지면 이전 세션이 남긴 예약이
  // 그대로 방치되는 문제가 있었다 — 그래서 매번 "전체 취소 후 재예약"으로 통일한다.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      await cancelAllAlarmNotifications();
      if (cancelled || !alarm.enabled) return;
      await scheduleAlarmNotifications(alarm);
    })();
    return () => {
      cancelled = true;
    };
  }, [alarm, hydrated]);

  // 알람 알림을 탭해서 오늘의 클래식 상세로 진입 + 자동 재생. autoplay 값은 매번 새로운
  // 타임스탬프라 같은 trackId로 다시 탭해도(반복 알림) today.tsx에서 매번 새로 트리거된다.
  useEffect(() => {
    const openFromNotification = (trackId: string) => {
      router.push({
        pathname: '/today',
        params: { trackId, autoplay: String(Date.now()) },
      });
    };

    getLaunchNotificationPayload().then((payload) => {
      if (payload) openFromNotification(payload.trackId);
    });

    return addAlarmNotificationTapListener((payload) => {
      openFromNotification(payload.trackId);
    });
  }, [router]);

  const updateAlarm = useCallback((patch: Partial<AlarmState>) => {
    setAlarm((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setAlarm((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const value = useMemo<AlarmContextValue>(
    () => ({ alarm, updateAlarm, toggleEnabled }),
    [alarm, updateAlarm, toggleEnabled],
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm(): AlarmContextValue {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}
