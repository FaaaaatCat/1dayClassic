import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  addAlarmNotificationTapListener,
  cancelAlarmNotifications,
  getLaunchNotificationPayload,
  scheduleAlarmNotifications,
} from '@/lib/notifications';

export interface AlarmState {
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  enabled: boolean;
  /** index 0=일 ... 6=토 */
  repeatDays: boolean[];
  label: string;
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
  label: '알람',
};

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [alarm, setAlarm] = useState<AlarmState>(DEFAULT_ALARM);
  const scheduledIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await cancelAlarmNotifications(scheduledIdsRef.current);
      scheduledIdsRef.current = [];
      if (cancelled || !alarm.enabled) return;
      const ids = await scheduleAlarmNotifications(alarm);
      if (!cancelled) scheduledIdsRef.current = ids;
    })();
    return () => {
      cancelled = true;
    };
  }, [alarm]);

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
