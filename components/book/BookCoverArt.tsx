import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import BookCover, { COVER_RATIO } from '@/components/book/BookCover';
import BookCover3D from '@/components/book/BookCover3D';
import { getBookCoverPlan } from '@/lib/cover';
import type { BookId, CoverDesign } from '@/types';

interface BookCoverArtProps {
  /** 학습 콘텐츠가 있는 책이면 그 id — 표지를 그릴 값을 여기서 찾는다. */
  bookId?: BookId | null;
  /** 출판사가 준 표지 주소. 있으면 그림이 이긴다. */
  coverImage?: string;
  /** 카탈로그에만 있는 책이 들고 있는 표지 값 — 그림이 없을 때 이것으로 그린다. */
  coverDesign?: CoverDesign;
  /** 표지 폭. 높이는 비율(1:1.45)이 정한다. */
  width: number;
  /**
   * 세워 그린다 — 26° 돌린 앞표지에 책등을 붙인다. 홈과 알람만 켠다.
   *
   * 그린 표지에만 쓴다. 표지가 그림일 때는 책등에 쓸 종이색도 잉크색도 없어 그늘만 남는데,
   * 그러면 책이 세워진 것이 아니라 왼쪽에 회색 띠가 붙은 것으로 보인다.
   */
  standing?: boolean;
  radius?: number;
  /** 그림자처럼 바깥에서 얹는 것. */
  style?: StyleProp<ViewStyle>;
}

/**
 * 책 표지 한 장 — 그림이 있으면 그림, 없으면 그린 표지.
 *
 * 어느 쪽을 그릴지 판단하는 자리가 화면마다 흩어져 있으면 홈과 서점이 다른 표지를 그리게
 * 된다. 그래서 판단은 lib/cover(getBookCoverPlan)가 한 곳에서 하고, 화면은 폭만 정한다.
 *
 * 높이를 받지 않는 것이 규칙이다. 표지는 어디서나 같은 비율이어야 열 권이 한 줄에
 * 나란히 서고, 실제 표지가 들어와도 같은 틀에 앉는다.
 */
export default function BookCoverArt({
  bookId,
  coverImage,
  coverDesign,
  width,
  standing = false,
  radius = 2,
  style,
}: BookCoverArtProps) {
  const plan = getBookCoverPlan(bookId, coverImage, coverDesign);
  const height = width * COVER_RATIO;

  if (plan.kind === 'design') {
    if (standing) {
      return <BookCover3D design={plan.design} width={width} radius={radius} style={style} />;
    }
    return <BookCover design={plan.design} width={width} radius={radius} style={style} />;
  }

  return (
    // 그림일 뿐이라 손가락을 받지 않는다 — 받으면 그 위 탭이 아래로 못 내려간다.
    <View
      pointerEvents="none"
      style={[{ width, height, borderRadius: radius }, styles.frame, style]}>
      {plan.kind === 'image' ? (
        <Image
          source={{ uri: plan.source }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
});
