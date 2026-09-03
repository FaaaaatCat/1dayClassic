import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { BookId } from '@/types';

/** 문제 하나를 푼 기록. */
export interface QuizAnswer {
  /** 고른 보기 번호 — 1부터 4까지 */
  choice: 1 | 2 | 3 | 4;
  correct: boolean;
  /** ISO 8601. 며칠에 걸쳐 읽었는지와 마지막으로 읽은 날을 이 값으로 센다. */
  at: string;
}

/**
 * 한 항목의 퀴즈 기록 — 문제 하나당 답 하나씩 쌓인다.
 *
 * total을 함께 들고 있는 건 '다 풀었는가'를 판단할 분모가 필요해서다. 항목마다 문제 수가
 * 다르고, 나중에 문제가 늘면 예전에 다 푼 항목도 다시 덜 푼 것이 되는 편이 맞다 —
 * 그래서 답을 적을 때마다 그때의 문제 수로 갱신한다.
 */
export interface LessonQuizRecord {
  /** 책별 집계에 쓴다. 항목 id를 잘라 쓰지 않는 이유는 id 규칙이 바뀌면 깨지기 때문이다. */
  bookId: BookId;
  /** 그 항목의 문제 수. */
  total: number;
  /** 문제 번호(0부터) → 그 문제의 답. 중간을 건너뛸 수 있어 배열이 아니라 맵이다. */
  answers: Record<number, QuizAnswer>;
}

/** 답 하나를 적을 때 넘기는 값. */
export interface QuizAnswerInput {
  bookId: BookId;
  /** 그 항목의 문제 수. */
  total: number;
  /** 항목 안에서 몇 번째 문제인지 — 0부터. */
  index: number;
  choice: 1 | 2 | 3 | 4;
  correct: boolean;
}

/** 항목 id → 그 항목의 퀴즈 기록. 항목마다 따로 보관해야 다른 날 기록이 섞이지 않는다. */
type RecordsByLesson = Record<string, LessonQuizRecord>;

interface QuizContextValue {
  /** 그 항목의 퀴즈 기록 — 한 문제도 안 풀었으면 undefined. */
  quizOf: (lessonId: string) => LessonQuizRecord | undefined;
  /**
   * 그 항목을 읽었는지 — 문제를 '전부' 풀어야 읽은 것으로 친다.
   *
   * 하나만 풀고 나가도 읽음이 되면 완독바와 홈의 체크가 실제로 읽은 양보다 앞서 나간다.
   * 이 앱에서 한 장을 끝냈다는 유일한 기록이 퀴즈라, 그 기준을 느슨하게 두면 진도를
   * 말하는 모든 숫자가 같이 헐거워진다.
   */
  isDone: (lessonId: string) => boolean;
  /** 문제 하나를 푼 것을 적는다. 이미 적힌 문제는 덮어쓰지 않는다 — 보기는 한 번 고르면 잠긴다. */
  answer: (lessonId: string, input: QuizAnswerInput) => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

/**
 * 퀴즈 기록을 앱 재시작 후에도 유지하기 위한 AsyncStorage 키.
 *
 * v1('quiz-attempts-v1')은 항목당 답 하나만 담던 모양이라 문제 수를 알 수 없어, 옮겨오면
 * 한 문제만 푼 항목까지 '다 풀었다'가 된다. 옮기지 않고 새 키로 시작한다 — v1을 쓰던
 * 흐름은 설정의 원페이지 미리보기뿐이라 실제로 쌓인 기록도 없다.
 */
const STORAGE_KEY = 'quiz-answers-v2';

/**
 * 퀴즈 기록 보관소. NotesContext와 같은 구조를 따른다 —
 * 항목 전체를 담은 맵 하나로 저장해서 화면을 열 때마다 비동기 조회를 하지 않는다.
 *
 * 이 기록이 '읽었다'의 유일한 근거다. 홈의 체크·완독바, 마이페이지의 독서 기록·정답률이
 * 전부 여기를 읽는다.
 */
export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [recordsByLesson, setRecordsByLesson] = useState<RecordsByLesson>({});
  /** 저장된 값을 불러오기 전까지는 빈 상태를 덮어써 저장하지 않기 위한 플래그. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) setRecordsByLesson(JSON.parse(raw) as RecordsByLesson);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordsByLesson)).catch((error) => {
      console.warn('[quiz] 퀴즈 기록 저장 실패:', error);
    });
  }, [recordsByLesson, hydrated]);

  const answer = useCallback(
    (lessonId: string, { bookId, total, index, choice, correct }: QuizAnswerInput) => {
      setRecordsByLesson((prev) => {
        const before = prev[lessonId];
        // 이미 푼 문제는 그대로 둔다 — 보기는 한 번 고르면 잠기므로 두 번째 호출은 버그 신호다.
        if (before?.answers[index]) return prev;
        return {
          ...prev,
          [lessonId]: {
            bookId,
            total,
            answers: {
              ...before?.answers,
              [index]: { choice, correct, at: new Date().toISOString() },
            },
          },
        };
      });
    },
    [],
  );

  const value = useMemo<QuizContextValue>(
    () => ({
      quizOf: (lessonId) => recordsByLesson[lessonId],
      isDone: (lessonId) => {
        const record = recordsByLesson[lessonId];
        if (!record || record.total <= 0) return false;
        return Object.keys(record.answers).length >= record.total;
      },
      answer,
    }),
    [recordsByLesson, answer],
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
