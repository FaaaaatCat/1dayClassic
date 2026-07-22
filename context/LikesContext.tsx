import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Track } from '@/types';
import { getTracks } from '@/lib/data';

interface LikesContextValue {
  likedTracks: Track[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string) => void;
}

const LikesContext = createContext<LikesContextValue | null>(null);

/** 데모용 시드 — 보관함에 미리 담겨 있는 곡들 */
const SEED_LIKED_IDS = ['classic_3_humoreske', 'classic_6_sextet'];

export function LikesProvider({ children }: { children: React.ReactNode }) {
  const [likedIds, setLikedIds] = useState<string[]>(SEED_LIKED_IDS);

  const toggleLike = useCallback((trackId: string) => {
    setLikedIds((ids) =>
      ids.includes(trackId) ? ids.filter((id) => id !== trackId) : [...ids, trackId]
    );
  }, []);

  const value = useMemo<LikesContextValue>(() => {
    const tracks = getTracks();
    return {
      likedTracks: likedIds
        .map((id) => tracks.find((t) => t.id === id))
        .filter((t): t is Track => t !== undefined),
      isLiked: (trackId) => likedIds.includes(trackId),
      toggleLike,
    };
  }, [likedIds, toggleLike]);

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}

export function useLikes(): LikesContextValue {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error('useLikes must be used within a LikesProvider');
  }
  return context;
}
