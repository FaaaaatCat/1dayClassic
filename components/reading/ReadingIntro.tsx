import { Image, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { CoverHeading } from '@/components/lesson/CardDeckDetail';
import LessonCoverImage from '@/components/LessonCoverImage';
import { Ink } from '@/constants/theme';
import { getBookName, type BookLesson } from '@/lib/books';
import { getCardCover } from '@/lib/card-pages';
import { getCoverPlan } from '@/lib/cover';

/** 골라 둔 사진이 없는 항목에 까는 그림 — 카드 덱의 섞어쓰기 표지와 같은 것. */
const FALLBACK_COVER = require('@/assets/images/preview/backdrop-piano.jpg');

/**
 * 첫페이지장 — 책이 열리고 빛이 걷힌 뒤 처음 보이는 한 장(피그마 '읽기 — 표지 장').
 *
 * 화면 가득 그 화의 사진을 깔고 검정 50%를 덮은 뒤, 가운데에 출판사 마크·책 이름·표제·부제를
 * 얹는다. 글 묶음은 카드 덱의 표지 장과 같은 것(CoverHeading)이라 두 곳이 어긋나지 않는다.
 *
 * 글은 reveal(0~4)이 차례로 띄운다 — 처음엔 사진만 보이고, 부르는 쪽이 reveal을 올리면 마크부터
 * 한 줄씩 떠오른다. 사진을 못 고른 항목은 대신할 그림을 깐다. 이 장은 '배경 이미지가 보이는'
 * 장이라 종이색만 깔고 끝낼 수 없다.
 */
export default function ReadingIntro({
  bookLesson,
  reveal,
}: {
  bookLesson: BookLesson;
  reveal: SharedValue<number>;
}) {
  const cover = getCardCover(bookLesson, getBookName(bookLesson.book));
  const plan = getCoverPlan(bookLesson.lesson, bookLesson.book);
  const photo = plan.kind === 'image' || plan.kind === 'unsplash';

  return (
    <View style={styles.screen}>
      {photo ? (
        <LessonCoverImage
          lesson={bookLesson.lesson}
          bookId={bookLesson.book}
          style={StyleSheet.absoluteFill}
          creditPlacement="bottomCenter"
        />
      ) : (
        <Image
          source={FALLBACK_COVER}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      <View style={styles.scrim} pointerEvents="none" />

      <View style={styles.body} pointerEvents="none">
        {/* 시안의 마크 자리는 72에 마크 36 — 카드 덱이 재생기 딸린 항목에 쓰는 작은 쪽과 같다. */}
        <CoverHeading cover={cover} onDark hasMusic reveal={reveal} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /** 사진 위 어둠 — 시안은 50%다(카드 덱 표지 장의 30%보다 짙다. 화면 가득이라 글이 더 묻힌다). */
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
});
