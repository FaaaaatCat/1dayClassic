import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { findLesson, type BookLesson } from '@/lib/books';

interface LikesContextValue {
  /** 담은 항목들 — 어느 책의 것이든 담은 순서대로. */
  likedLessons: BookLesson[];
  isLiked: (lessonId: string) => boolean;
  toggleLike: (lessonId: string) => void;
}

const LikesContext = createContext<LikesContextValue | null>(null);

/** 데모용 시드 — 보관함에 미리 담겨 있는 항목들 */
const SEED_LIKED_IDS = ['classic_2_symphony', 'classic_3_humoreske'];

/** 담은 항목을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'liked-lessons-v1';

/**
 * 담은 항목은 id만 들고 있다가 읽을 때 9권에서 되찾는다.
 * 항목 id에는 책 접두사가 붙어 있어(latin_1_…) 책끼리 겹치지 않으므로 id 하나로 충분하다.
 *
 * 저장된 값이 아예 없을 때만 시드를 얹는다 — 저장된 값이 있으면 빈 목록이어도 그대로 쓴다.
 * 그래야 사용자가 시드를 다 빼낸 뒤 재시작해도 되살아나지 않는다.
 */
export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [likedIds, setLikedIds] = useState<string[]>(SEED_LIKED_IDS);
  /** 저장된 값을 불러오기 전까지는 시드를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setLikedIds(JSON.parse(raw) as string[]);
      } catch (error) {
        console.warn('[likes] 저장된 보관함 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(likedIds)).catch((error) => {
      console.warn('[likes] 보관함 저장 실패:', error);
    });
  }, [likedIds, hydrated]);

  const toggleLike = useCallback((lessonId: string) => {
    setLikedIds((ids) =>
      ids.includes(lessonId) ? ids.filter((id) => id !== lessonId) : [...ids, lessonId]
    );
  }, []);

  const value = useMemo<LikesContextValue>(
    () => ({
      likedLessons: likedIds
        .map((id) => findLesson(id))
        .filter((found): found is BookLesson => found !== undefined),
      isLiked: (lessonId) => likedIds.includes(lessonId),
      toggleLike,
    }),
    [likedIds, toggleLike]
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}

export function useLikes(): LikesContextValue {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}
