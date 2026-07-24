import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { cancelAlarmNotifications, scheduleAlarmNotifications } from '@/lib/notifications';

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
