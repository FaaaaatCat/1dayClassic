import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BookId } from '@/types';

/** 책 → 그 책에서 마지막으로 연 항목 id. */
type CursorByBook = Record<string, string>;

interface ReadingCursorContextValue {
  /** 그 책에서 마지막으로 연 항목 — 한 번도 안 열었으면 undefined. */
  cursorOf: (bookId: BookId) => string | undefined;
  /** 항목을 열었다고 적는다. */
  markOpened: (bookId: BookId, lessonId: string) => void;
}

const ReadingCursorContext = createContext<ReadingCursorContextValue | null>(null);

const STORAGE_KEY = 'reading-cursor-v1';

/**
 * 마지막으로 연 항목 보관소.
 *
 * 홈의 읽기 버튼이 어디를 열지 정하는 값이다 — 마지막으로 연 것의 다음 화를 연다
 * (lib/progress의 getReadPlan).
 *
 * 퀴즈 기록으로는 이 물음에 답할 수 없다. 다 푼 뒤 다시 읽을 때는 isDone이 전부 true라
 * 앞뒤를 가릴 수 없고, 다시 읽는다고 해서 퀴즈 기록이 새로 쌓이지도 않는다(보기는 한 번
 * 고르면 잠긴다).
 *
 * 그래서 이 값은 '읽었다'가 아니라 '열었다'를 적는다. 읽는 곳은 읽기 버튼 한 자리뿐이고,
 * 진도·완독률·정답률은 여전히 퀴즈 기록만 본다 — 둘은 서로 다른 물음이다.
 */
export function ReadingCursorProvider({ children }: { children: React.ReactNode }) {
  const [cursors, setCursors] = useState<CursorByBook>({});
  /** 저장된 값을 불러오기 전까지는 빈 상태를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setCursors(JSON.parse(raw) as CursorByBook);
      } catch (error) {
        console.warn('[cursor] 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cursors)).catch((error) => {
      console.warn('[cursor] 저장 실패:', error);
    });
  }, [cursors, hydrated]);

  const markOpened = useCallback((bookId: BookId, lessonId: string) => {
    setCursors((prev) => (prev[bookId] === lessonId ? prev : { ...prev, [bookId]: lessonId }));
  }, []);

  const value = useMemo<ReadingCursorContextValue>(
    () => ({ cursorOf: (bookId) => cursors[bookId], markOpened }),
    [cursors, markOpened],
  );

  return (
    <ReadingCursorContext.Provider value={value}>{children}</ReadingCursorContext.Provider>
  );
}

export function useReadingCursor(): ReadingCursorContextValue {
  const value = useContext(ReadingCursorContext);
  if (!value) {
    throw new Error('useReadingCursor는 ReadingCursorProvider 안에서만 쓸 수 있습니다.');
  }
  return value;
}
