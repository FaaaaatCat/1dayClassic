import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BookId } from '@/types';

/** 한 책에 쌓이는 읽기 기록. */
interface BookCursor {
  /** 마지막으로 끝낸 항목 — 홈의 읽기 버튼이 그 다음 화를 연다. */
  last: string;
  /** 끝낸 항목 전부 — 목차가 어느 줄을 다 읽었다고 그릴지 여기서 본다. */
  done: string[];
}

/** 책 → 그 책의 읽기 기록. */
type CursorByBook = Record<string, BookCursor>;

interface ReadingCursorContextValue {
  /** 그 책에서 마지막으로 끝낸 항목 — 한 화도 못 끝냈으면 undefined. */
  cursorOf: (bookId: BookId) => string | undefined;
  /** 그 항목을 끝냈는지. 목차의 다 읽은 줄이 이 값을 본다. */
  isCompleted: (bookId: BookId, lessonId: string) => boolean;
  /** 항목을 끝냈다고 적는다. 무엇이 '끝'인지는 CardDeckDetail이 정한다. */
  markCompleted: (bookId: BookId, lessonId: string) => void;
}

const ReadingCursorContext = createContext<ReadingCursorContextValue | null>(null);

/**
 * 키를 그대로 두는 이유.
 *
 * v1은 책 → 마지막으로 '연' 항목 id 하나(문자열)였다. 지금은 뜻이 '끝냈다'로 바뀌었고
 * 모양도 { last, done }으로 늘었지만, 옛 값을 버리지 않고 아래 parse가 옮겨 온다 —
 * 끝낸 것으로 읽어도 읽기 버튼이 가리키는 자리는 예전과 같아서, 쌓인 진도를 버리면서까지
 * 새 키로 갈아탈 이유가 없다.
 */
const STORAGE_KEY = 'reading-cursor-v1';

/**
 * 저장된 값을 지금 모양으로 세운다.
 *
 * 값이 문자열이면 v1이다 — 마지막으로 연 화 하나뿐이라, 그것을 끝낸 것으로 옮긴다.
 * 그 앞의 화들까지 끝냈다고 단정하지는 않는다. 목차의 다 읽은 표시는 퀴즈 기록이 함께
 * 받쳐 주므로(app/(tabs)/toc.tsx의 completed 주석 참고) 빈자리가 생겨도 크게 어긋나지 않는다.
 */
function parseStored(raw: string): CursorByBook {
  const parsed = JSON.parse(raw) as Record<string, string | BookCursor>;
  const out: CursorByBook = {};
  for (const [bookId, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      out[bookId] = { last: value, done: [value] };
    } else if (value && typeof value.last === 'string') {
      out[bookId] = { last: value.last, done: Array.isArray(value.done) ? value.done : [] };
    }
  }
  return out;
}

/**
 * 끝낸 항목 보관소.
 *
 * 홈의 읽기 버튼이 어디를 열지 정하는 값이다 — 마지막으로 끝낸 것의 다음 화를 연다
 * (lib/progress의 getReadPlan). 끝내지 못하고 나온 화는 여기 적히지 않으므로, 다시
 * 들어오면 그 화가 다시 열린다.
 *
 * 퀴즈 기록만으로는 이 물음에 답할 수 없다. 다 푼 뒤 다시 읽을 때는 isDone이 전부 true라
 * 앞뒤를 가릴 수 없고, 다시 읽는다고 해서 퀴즈 기록이 새로 쌓이지도 않는다(보기는 한 번
 * 고르면 잠긴다). 그래서 퀴즈를 안 푼 채 마지막 장까지 본 경우도 여기서는 끝으로 친다 —
 * 진도·완독률·정답률은 여전히 퀴즈 기록만 본다. 둘은 서로 다른 물음이다.
 *
 * last와 done을 함께 드는 건 둘이 서로 다른 물음에 답하기 때문이다. last는 '다음에 어디를
 * 여나'(하나뿐이고, 다시 읽으면 뒤로도 간다), done은 '어디를 끝냈나'(쌓이기만 한다).
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
        if (!cancelled && raw) setCursors(parseStored(raw));
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

  const markCompleted = useCallback((bookId: BookId, lessonId: string) => {
    setCursors((prev) => {
      const before = prev[bookId];
      // 이미 마지막이자 끝낸 것으로 적혀 있으면 그대로 둔다 — 상태를 새로 만들면 저장이
      // 또 돌고, 이 값을 보는 화면들이 까닭 없이 다시 그려진다.
      if (before?.last === lessonId && before.done.includes(lessonId)) return prev;
      const done = before?.done.includes(lessonId)
        ? before.done
        : [...(before?.done ?? []), lessonId];
      return { ...prev, [bookId]: { last: lessonId, done } };
    });
  }, []);

  const value = useMemo<ReadingCursorContextValue>(
    () => ({
      cursorOf: (bookId) => cursors[bookId]?.last,
      isCompleted: (bookId, lessonId) => !!cursors[bookId]?.done.includes(lessonId),
      markCompleted,
    }),
    [cursors, markCompleted],
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
