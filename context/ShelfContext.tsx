import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ShelfContextValue {
  /** 담은 순서(오래된 것 먼저) 그대로 — 화면에서 뒤집어 최신순으로 보여준다. */
  shelfIds: string[];
  isInShelf: (catalogId: string) => boolean;
  addToShelf: (catalogId: string) => void;
  removeFromShelf: (catalogId: string) => void;
}

const ShelfContext = createContext<ShelfContextValue | null>(null);

/** 담은 책 목록을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'book-shelf-v1';

/**
 * 내 서재 — 하루 서점에서 "담기"를 누른 책들이 모이는 곳.
 *
 * 키는 CatalogBook.id(노션 uuid)로 통일한다. 라우트 파라미터 id는 학습 가능한 9권일 때
 * BookId('classic' 등)이고 나머지는 catalog uuid라 서로 값이 다르므로, 서재는 항상
 * catalogBook.id만 쓴다(book/[id].tsx 주석 참고).
 */
export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const [shelfIds, setShelfIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setShelfIds(parsed.filter((id) => typeof id === 'string'));
        }
      } catch (error) {
        console.warn('[shelf] 저장된 서재 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shelfIds)).catch((error) => {
      console.warn('[shelf] 서재 저장 실패:', error);
    });
  }, [shelfIds, hydrated]);

  const isInShelf = useCallback(
    (catalogId: string) => shelfIds.includes(catalogId),
    [shelfIds],
  );

  const addToShelf = useCallback((catalogId: string) => {
    setShelfIds((prev) => (prev.includes(catalogId) ? prev : [...prev, catalogId]));
  }, []);

  const removeFromShelf = useCallback((catalogId: string) => {
    setShelfIds((prev) => prev.filter((id) => id !== catalogId));
  }, []);

  const value = useMemo<ShelfContextValue>(
    () => ({ shelfIds, isInShelf, addToShelf, removeFromShelf }),
    [shelfIds, isInShelf, addToShelf, removeFromShelf],
  );

  return <ShelfContext.Provider value={value}>{children}</ShelfContext.Provider>;
}

export function useShelf(): ShelfContextValue {
  const context = useContext(ShelfContext);
  if (!context) {
    throw new Error('useShelf must be used within a ShelfProvider');
  }
  return context;
}
