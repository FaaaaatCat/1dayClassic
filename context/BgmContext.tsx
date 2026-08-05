import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_BGM_ID, findBgm, isBgmId, type BgmId, type BgmOption } from '@/lib/bgm';

interface BgmContextValue {
  /** 지금 고른 배경음악 */
  bgm: BgmOption;
  bgmId: BgmId;
  select: (id: BgmId) => void;
}

const BgmContext = createContext<BgmContextValue | null>(null);

const STORAGE_KEY = 'narration-bgm-v1';

/**
 * 낭독에 깔 배경음악 선택. QuizContext와 같은 구조를 따른다.
 *
 * 고른 값은 앱 전체에서 하나이고 모든 책의 낭독에 함께 쓰인다 — 항목마다 음원을 두던
 * 방식을 대신한다. 저장된 값이 없거나 알 수 없는 값이면 '고요한'으로 되돌린다.
 */
export function BgmProvider({ children }: { children: React.ReactNode }) {
  const [bgmId, setBgmId] = useState<BgmId>(DEFAULT_BGM_ID);
  /** 저장된 값을 불러오기 전까지는 기본값을 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && isBgmId(raw)) setBgmId(raw);
      } catch (error) {
        console.warn('[bgm] 저장된 배경음악 설정 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, bgmId).catch((error) => {
      console.warn('[bgm] 배경음악 설정 저장 실패:', error);
    });
  }, [bgmId, hydrated]);

  const value = useMemo<BgmContextValue>(
    () => ({ bgm: findBgm(bgmId), bgmId, select: setBgmId }),
    [bgmId],
  );

  return <BgmContext.Provider value={value}>{children}</BgmContext.Provider>;
}

export function useBgm(): BgmContextValue {
  const context = useContext(BgmContext);
  if (!context) {
    throw new Error('useBgm must be used within a BgmProvider');
  }
  return context;
}
