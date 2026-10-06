import { useLocalSearchParams, useRouter } from 'expo-router';

import CardDeckDetail from '@/components/lesson/CardDeckDetail';
import { getBookLesson } from '@/lib/books';

/**
 * 섞어쓰기 미리보기 — 설정에서 여는 데모.
 *
 * 카드 슬라이드를 뼈대로 두고, '보여 주는 장'만 그림전체배경의 옷을 빌려 입힌다.
 * - 표지 장: 사진을 카드 가득 깔고 흰 글을 얹는다.
 * - 구절 장(원문과 한글만 선 장): 삽화를 카드 가득 깔고 흰 글을 크게 얹는다.
 * - 해설 본문 장: 종이 카드 그대로. 긴 글은 밝은 종이에서 읽는다.
 *
 * 유튜브가 딸린 항목은 카드가 재생기만큼 짧아지므로 둘을 따로 열어 본다 — 클래식 첫 화
 * (유튜브 있음)와 라틴어 첫 화(없음). 닫으면 설정으로 돌아가고 진도를 건드리지 않는다.
 */
export default function MixedPreviewScreen() {
  const router = useRouter();
  const { music } = useLocalSearchParams<{ music?: string }>();
  const bookLesson =
    music === '1' ? getBookLesson('classic', 'classic_001') : getBookLesson('latin', 'latin_001');

  if (!bookLesson) return null;

  return (
    <CardDeckDetail
      bookLesson={bookLesson}
      onClose={() => router.replace('/settings')}
      trackProgress={false}
      mixed
    />
  );
}
