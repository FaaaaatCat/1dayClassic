import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BookId } from '@/types';

/** 꽂아 둔 책갈피 하나. */
export interface Bookmark {
  /** 책별로 세려면 필요하다 — 항목 id를 잘라 쓰지 않는 이유는 QuizContext와 같다. */
  bookId: BookId;
  /** 그 항목의 몇 번째 장인지. 같은 항목 안에서도 장마다 따로 꽂는다. */
  page: number;
  /** ISO 8601. 최근에 꽂은 순으로 보여 줄 때 쓴다. */
  at: string;
}

/** "항목id:장번호" → 책갈피. 장마다 따로 꽂으므로 키에 장 번호가 들어간다. */
type BookmarksByKey = Record<string, Bookmark>;

interface BookmarkContextValue {
  /** 이 장에 책갈피가 꽂혀 있는가. */
  isMarked: (lessonId: string, page: number) => boolean;
  /** 꽂거나 뺀다. 꽂았으면 true를 돌려준다 — 부르는 쪽이 토스트 문구를 고르는 데 쓴다. */
  toggle: (lessonId: string, page: number, bookId: BookId) => boolean;
  /** 그 책에 꽂아 둔 책갈피 수. */
  countOf: (bookId: BookId) => number;
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

const STORAGE_KEY = 'bookmarks-v1';

const keyOf = (lessonId: string, page: number) => `${lessonId}:${page}`;

/**
 * 책갈피 보관소. NotesContext·QuizContext와 같은 구조다 — 전체를 담은 맵 하나로 저장해서
 * 화면을 열 때마다 비동기 조회를 하지 않는다.
 *
 * 예전에는 뷰어 안의 useState 하나로만 들고 있어서 화면을 나가면 사라졌다. 책갈피는
 * '읽던 자리를 접어 두는 일'이라 앱을 껐다 켜도 남아 있어야 하고, 마이페이지가 그 수를
 * 세어 보여 준다.
 */
export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [marks, setMarks] = useState<BookmarksByKey>({});
  /** 저장된 값을 불러오기 전까지는 빈 상태를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setMarks(JSON.parse(raw) as BookmarksByKey);
      } catch (error) {
        console.warn('[bookmark] 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marks)).catch((error) => {
      console.warn('[bookmark] 저장 실패:', error);
    });
  }, [marks, hydrated]);

  const toggle = useCallback((lessonId: string, page: number, bookId: BookId) => {
    const key = keyOf(lessonId, page);
    let saved = false;
    setMarks((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { bookId, page, at: new Date().toISOString() };
        saved = true;
      }
      return next;
    });
    // setMarks의 갱신 함수는 곧바로 불리므로 이 값을 그대로 돌려줄 수 있다.
    return saved;
  }, []);

  const value = useMemo<BookmarkContextValue>(
    () => ({
      isMarked: (lessonId, page) => marks[keyOf(lessonId, page)] !== undefined,
      toggle,
      countOf: (bookId) =>
        Object.values(marks).filter((mark) => mark.bookId === bookId).length,
    }),
    [marks, toggle],
  );

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmarks(): BookmarkContextValue {
  const value = useContext(BookmarkContext);
  if (!value) throw new Error('useBookmarks는 BookmarkProvider 안에서만 쓸 수 있습니다.');
  return value;
}
