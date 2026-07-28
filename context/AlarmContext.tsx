import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { cancelAlarm, scheduleAlarm } from '@/modules/alarm-clock';

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

  // 알람이 바뀔 때마다 네이티브에 통째로 다시 예약한다. 네이티브가 SharedPreferences에
  // 사본을 들고 있어서, JS가 죽어도(앱 종료·재부팅) 스스로 반복·복원할 수 있다.
  // 알람이 울린 뒤 '오늘의 곡'으로 이동하는 것도 네이티브가 딥링크로 직접 처리한다.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        if (alarm.enabled) {
          await scheduleAlarm({
            hour: alarm.hour,
            minute: alarm.minute,
            repeatDays: alarm.repeatDays,
            sound: alarm.sound,
            enabled: true,
          });
        } else {
          await cancelAlarm();
        }
      } catch (error) {
        console.warn('[alarm] 알람 예약 실패:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alarm, hydrated]);

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
