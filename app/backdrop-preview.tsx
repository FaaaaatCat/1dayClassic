import { useLocalSearchParams, useRouter } from 'expo-router';

import BackdropDetail from '@/components/lesson/BackdropDetail';
import { getBookLesson } from '@/lib/books';

/**
 * 그림전체배경 미리보기 — 설정에서 여는 데모.
 *
 * 유튜브가 딸린 항목과 아닌 항목은 글자 크기와 아래 자리가 달라, 둘을 따로 열어 본다.
 * - 클래식 첫 화: 유튜브가 있다. 재생기가 아래 줄 아래에 붙고 글이 18px로 줄어든다.
 * - 라틴어 첫 화: 유튜브가 없다. 글이 22px이고, 그 항목에 골라 둔 사진이 배경이 된다.
 *
 * 다른 미리보기와 마찬가지로 닫으면 설정으로 돌아가고, 진도·책갈피를 건드리지 않는다.
 */
export default function BackdropPreviewScreen() {
  const router = useRouter();
  const { music } = useLocalSearchParams<{ music?: string }>();
  const bookLesson =
    music === '1' ? getBookLesson('classic', 'classic_001') : getBookLesson('latin', 'latin_001');

  if (!bookLesson) return null;

  return <BackdropDetail bookLesson={bookLesson} onClose={() => router.replace('/settings')} />;
}
