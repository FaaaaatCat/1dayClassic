import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { BODY_METRICS, type BodyFontSize, type BodyMetrics } from '@/lib/card-pages';

/** 책 배경. */
export type ReaderBackground = 'light' | 'dark';
/**
 * 장 넘김 효과. scroll은 장을 넘기지 않고 글 전체를 세로로 쭉 내려 읽는다.
 *
 * 오늘의 공부가 '책 펼침' 흐름(components/reading/ReadingFlow)으로 바뀌면서 본문은 늘 스크롤
 * 보기다 — 책 보기 설정에서 '책 넘김 효과'·'카드로 보기'를 걷어냈다. 타입은 남겨 둔다. 예전에
 * 저장된 값(bookmark·none)은 불러올 때 scroll로 바뀐다(parse).
 */
export type ReaderPageTurn = 'bookmark' | 'none' | 'scroll';

/** 낭독 목소리. */
export type ReaderVoice = 'female' | 'male';
/** 자동읽기 — 켜면 오늘의 공부를 열자마자 낭독이 시작된다. */
export type ReaderAutoRead = 'on' | 'off';
/**
 * 책 오픈 효과 — 켜면 홈의 읽기 버튼을 눌렀을 때 책이 펼쳐지는 장면(BookOpening)을 지나 첫표지가
 * 나온다. 끄면 곧장 첫표지가 나온다. 홈의 읽기 버튼에만 걸린다 — 다음 화 읽기나 알람으로 들어올
 * 때는 켜 두어도 나오지 않는다.
 */
export type ReaderBookOpen = 'on' | 'off';

export interface ReaderSettings {
  background: ReaderBackground;
  turn: ReaderPageTurn;
  fontSize: BodyFontSize;
  voice: ReaderVoice;
  autoRead: ReaderAutoRead;
  bookOpen: ReaderBookOpen;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  background: 'light',
  turn: 'scroll',
  fontSize: 'medium',
  voice: 'female',
  autoRead: 'off',
  bookOpen: 'on',
};

interface ReaderSettingsContextValue {
  settings: ReaderSettings;
  /** 설정 하나를 바꾼다. */
  update: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  /** 고른 글자 크기의 본문 값 — 읽기 화면이 그리고, 장을 나누는 데 쓴다. */
  body: BodyMetrics;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(null);

const STORAGE_KEY = 'reader-settings-v1';

/** 저장된 값에서 아는 값만 골라 담는다 — 모르는 값이 섞여 있으면 그 칸만 기본값으로. */
function parse(raw: string | null): ReaderSettings {
  if (!raw) return DEFAULT_READER_SETTINGS;
  const saved = JSON.parse(raw) as Partial<Record<keyof ReaderSettings, unknown>>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  return {
    background: pick(saved.background, ['light', 'dark'], DEFAULT_READER_SETTINGS.background),
    // 본문은 이제 늘 스크롤 보기다(ReaderPageTurn 주석) — 예전 값은 무엇이든 scroll로.
    turn: 'scroll',
    fontSize: pick(saved.fontSize, ['small', 'medium', 'large'], DEFAULT_READER_SETTINGS.fontSize),
    voice: pick(saved.voice, ['female', 'male'], DEFAULT_READER_SETTINGS.voice),
    autoRead: pick(saved.autoRead, ['on', 'off'], DEFAULT_READER_SETTINGS.autoRead),
    bookOpen: pick(saved.bookOpen, ['on', 'off'], DEFAULT_READER_SETTINGS.bookOpen),
  };
}

/**
 * 읽기 화면 설정(책 배경·넘기기·글자 크기)과 낭독 설정(목소리·자동읽기). BgmContext와 같은
 * 구조를 따른다.
 *
 * 한 덩이로 저장한다 — 늘 함께 읽히고, 따로 두면 키만 늘어난다.
 * 셋 다 읽기 화면(CardDeckDetail)에 반영된다. 배경과 넘기기는 실제로 읽는 화면에만 걸고,
 * 미리보기들은 제 모양을 그대로 보여 준다.
 */
export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  /** 저장된 값을 불러오기 전까지는 기본값을 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) setSettings(parse(raw));
      } catch (error) {
        console.warn('[reader-settings] 저장된 읽기 설정 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch((error) => {
      console.warn('[reader-settings] 읽기 설정 저장 실패:', error);
    });
  }, [settings, hydrated]);

  const update = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const value = useMemo<ReaderSettingsContextValue>(
    () => ({ settings, update, body: BODY_METRICS[settings.fontSize] }),
    [settings, update],
  );

  return <ReaderSettingsContext.Provider value={value}>{children}</ReaderSettingsContext.Provider>;
}

export function useReaderSettings(): ReaderSettingsContextValue {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error('useReaderSettings must be used within a ReaderSettingsProvider');
  }
  return context;
}
