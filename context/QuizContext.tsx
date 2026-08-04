import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BookId } from '@/types';

/** 퀴즈를 한 번 푼 기록. 항목 하나당 하나. */
export interface QuizAttempt {
  /** 책별 정답률 집계에 쓴다. 항목 id를 잘라 쓰지 않는 이유는 id 규칙이 바뀌면 깨지기 때문이다. */
  bookId: BookId;
  /** 고른 보기 번호 — 1부터 4까지 */
  choice: 1 | 2 | 3 | 4;
  correct: boolean;
  /** ISO 8601. 기간별 집계에 쓴다. 지나간 시각은 나중에 되살릴 수 없어 지금부터 남긴다. */
  at: string;
}

/** 항목 id → 그 항목의 퀴즈 시도 기록. 항목마다 따로 보관해야 다른 날 기록이 섞이지 않는다. */
type AttemptsByLesson = Record<string, QuizAttempt>;

interface QuizContextValue {
  /** 그 항목의 시도 기록 — 없으면 undefined. */
  attemptOf: (lessonId: string) => QuizAttempt | undefined;
  /** 이미 기록이 있으면 덮어쓰지 않는다 — 보기는 한 번 고르면 잠기므로 두 번째 호출은 버그 신호다. */
  record: (lessonId: string, attempt: QuizAttempt) => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

/** 퀴즈 시도 기록을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키. */
const STORAGE_KEY = 'quiz-attempts-v1';

/**
 * 퀴즈 시도 기록 보관소. NotesContext와 같은 구조를 따른다 —
 * 항목 전체를 담은 맵 하나로 저장해서 화면을 열 때마다 비동기 조회를 하지 않는다.
 *
 * 이 기록은 나중에 만들 통계 탭(책별 북마크 수·퀴즈 정답률)이 읽어 갈 재료다.
 * 통계 화면은 이번 범위가 아니다.
 */
export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [attemptsByLesson, setAttemptsByLesson] = useState<AttemptsByLesson>({});
  /** 저장된 값을 불러오기 전까지는 빈 상태를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setAttemptsByLesson(JSON.parse(raw) as AttemptsByLesson);
      } catch (error) {
        console.warn('[quiz] 저장된 퀴즈 기록 불러오기 실패:', error);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attemptsByLesson)).catch((error) => {
      console.warn('[quiz] 퀴즈 기록 저장 실패:', error);
    });
  }, [attemptsByLesson, hydrated]);

  const record = useCallback((lessonId: string, attempt: QuizAttempt) => {
    setAttemptsByLesson((prev) => {
      if (prev[lessonId]) return prev; // 이미 기록이 있으면 무시 — 보기는 한 번 고르면 잠긴다.
      return { ...prev, [lessonId]: attempt };
    });
  }, []);

  const value = useMemo<QuizContextValue>(
    () => ({
      attemptOf: (lessonId) => attemptsByLesson[lessonId],
      record,
    }),
    [attemptsByLesson, record],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}
