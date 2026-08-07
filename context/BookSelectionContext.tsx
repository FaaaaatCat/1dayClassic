import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { syncAlarmBook } from '@/lib/alarmBook';
import { BOOK_IDS } from '@/lib/books';
import type { BookId } from '@/types';

interface BookSelectionContextValue {
  /** 홈과 알람 자동재생이 따르는 책. */
  selectedBookId: BookId;
  selectBook: (bookId: BookId) => void;
}

const BookSelectionContext = createContext<BookSelectionContextValue | null>(null);

const DEFAULT_BOOK_ID: BookId = 'classic';

/** 선택한 책을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'selected-book-v1';

function isBookId(value: string): value is BookId {
  return (BOOK_IDS as string[]).includes(value);
}

/**
 * 하루 서점에서 고른 책 — 홈 화면의 '오늘의 공부'·'내일은?'과, 알람이 울렸을 때 자동재생되는
 * 항목이 전부 이 값을 따른다(today.tsx의 bookId 기본값이 여기서 온다. 알람의 딥링크는
 * bookId를 안 실어 보내므로, 그 기본값이 곧 알람이 여는 책이다).
 */
export function BookSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedBookId, setSelectedBookId] = useState<BookId>(DEFAULT_BOOK_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw && isBookId(raw)) setSelectedBookId(raw);
      } catch (error) {
        console.warn('[bookSelection] 저장된 선택 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, selectedBookId).catch((error) => {
      console.warn('[bookSelection] 선택 저장 실패:', error);
    });
    // 잠금화면 알람은 JS 없이 뜨므로 고른 책을 미리 네이티브에 내려보낸다.
    // 매 실행마다 다시 보내는 건 의도한 것이다 — 파일 두 장 복사는 싸고, 앱을 업데이트해서
    // 이미지가 바뀌었을 때 "이미 보냈다"고 건너뛰면 옛 이미지가 그대로 남는다.
    syncAlarmBook(selectedBookId).catch((error) => {
      console.warn('[bookSelection] 알람 책 동기화 실패:', error);
    });
  }, [selectedBookId, hydrated]);

  const selectBook = useCallback((bookId: BookId) => {
    setSelectedBookId(bookId);
  }, []);

  const value = useMemo<BookSelectionContextValue>(
    () => ({ selectedBookId, selectBook }),
    [selectedBookId, selectBook],
  );

  return <BookSelectionContext.Provider value={value}>{children}</BookSelectionContext.Provider>;
}

export function useBookSelection(): BookSelectionContextValue {
  const context = useContext(BookSelectionContext);
  if (!context) {
    throw new Error('useBookSelection must be used within a BookSelectionProvider');
  }
  return context;
}
