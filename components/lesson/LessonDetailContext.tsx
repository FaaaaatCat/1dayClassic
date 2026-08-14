import { createContext, useContext } from 'react';

import type { BookLesson } from '@/lib/books';

interface LessonDetailValue {
  bookLesson: BookLesson;
  bookName: string;
  /** 오디오 팝업을 열고 재생을 시작한다 */
  openAudio: () => void;
}

/**
 * 상세 화면이 열려 있는 동안만 사는 수명 상태 + 화면 동작.
 *
 * `context/`가 아니라 여기 두는 이유: 기존 `context/*`는 앱 전체에 하나 떠 있는 싱글턴이지만
 * 이건 상세 화면이 열려 있는 동안만 산다.
 */
export const LessonDetailContext = createContext<LessonDetailValue | null>(null);

export function useLessonDetail(): LessonDetailValue {
  const value = useContext(LessonDetailContext);
  if (!value) throw new Error('useLessonDetail은 LessonDetailShell 안에서만 쓸 수 있습니다');
  return value;
}
