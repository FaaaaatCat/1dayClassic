import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * 마이페이지 묶음(스택) 안에서 뒤로 — 한 장을 걷는다. 걷을 것이 없으면 fallback으로 간다.
 *
 * 걷을 것이 없는 경우는 묶음 바깥에서 곧장 깊은 화면으로 들어왔을 때다(홈의 리포트 버튼이 서재 책
 * 상세를 여는 것처럼). 그때는 스택에 그 화면 한 장뿐이라 back()이 갈 곳이 없다.
 */
export function useStackBack(fallback: string): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  }, [router, fallback]);
}
