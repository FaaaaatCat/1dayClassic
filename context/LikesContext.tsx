import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

/**
 * 담은 항목은 id만 들고 있다가 읽을 때 9권에서 되찾는다.
 * 항목 id에는 책 접두사가 붙어 있어(latin_1_…) 책끼리 겹치지 않으므로 id 하나로 충분하다.
 */
export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [likedIds, setLikedIds] = useState<string[]>(SEED_LIKED_IDS);

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
