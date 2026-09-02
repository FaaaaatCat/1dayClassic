import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { Ink, Surface } from '@/constants/theme';

/** 상태바 자리에 깔 색과, 그 위에 얹히는 시계·배터리의 밝기. */
export interface StatusTint {
  color: string;
  /** 'dark'는 검은 글자(밝은 띠 위), 'light'는 흰 글자(어두운 띠 위). */
  icons: 'dark' | 'light';
}

/** 아무 말이 없는 화면이 쓰는 값 — 이 앱의 기본은 밝은 종이다. */
const DEFAULT: StatusTint = { color: Surface.canvas, icons: 'dark' };

/** 어두운 화면(오늘의 공부 뷰어·인스타 미리보기·리포트)이 쓰는 값. */
export const DARK_TINT: StatusTint = { color: Surface.viewer, icons: 'light' };

const TintContext = createContext<{
  tint: StatusTint;
  setTint: (next: StatusTint) => void;
}>({ tint: DEFAULT, setTint: () => {} });

export function useStatusTint(): StatusTint {
  return useContext(TintContext).tint;
}

/**
 * 상태바 색을 들고 있는 자리.
 *
 * 화면마다 다르게 두는 건, 띠가 페이지와 같은 색이라야 상태바가 화면 속으로 사라지기
 * 때문이다. 하나로 고정하면 흰 화면 위에 회색 띠 한 줄이 남는다.
 */
export function StatusTintProvider({ children }: { children: React.ReactNode }) {
  const [tint, setTint] = useState<StatusTint>(DEFAULT);
  const value = useMemo(() => ({ tint, setTint }), [tint]);
  return <TintContext.Provider value={value}>{children}</TintContext.Provider>;
}

/**
 * 이 화면이 쓸 상태바 색을 알린다. 기본과 다른 화면만 그리면 된다.
 *
 * 마운트가 아니라 '보이는 동안'을 기준으로 삼는다. 화면을 옮길 때는 새 화면이 먼저 뜨고
 * 옛 화면이 나중에 사라지는데, 마운트를 기준으로 하면 옛 화면이 사라지면서 새 화면이
 * 정해 둔 색을 기본값으로 되돌려 버린다.
 */
export function StatusBarTint({ tint = DARK_TINT }: { tint?: StatusTint }) {
  const { setTint } = useContext(TintContext);

  useFocusEffect(
    useCallback(() => {
      setTint(tint);
      return () => setTint(DEFAULT);
    }, [setTint, tint.color, tint.icons]),
  );

  return null;
}

/** 어두운 띠 위에서 잘 보이는 글자색 — 화면들이 함께 쓰라고 여기 둔다. */
export const TINT_ON_DARK = Ink.onDark;
