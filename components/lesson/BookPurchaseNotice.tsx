import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, trackBody } from '@/constants/theme';
import { formatPrice, type CatalogBook } from '@/lib/catalog';
import { fieldsOf } from '@/lib/tags';

/** 시트 안에 세우는 표지의 폭 — 높이는 표지 비율이 정한다(피그마 시안 120×174). */
const COVER_W = 120;

/**
 * 책 구매 안내 — 아래에서 올라오는 시트(피그마 '구매안내팝업').
 *
 * 무료로 열린 마지막 화를 끝내고 '다음 화 읽기'를 눌렀을 때 뜬다(다음 화가 열려 있으면 곧장
 * 그 화가 열린다).
 *
 * 처음엔 화면을 통째로 덮었고, 그다음 가운데 뜨는 카드였다가, 시안대로 뒤를 반쯤 어둡게 덮고
 * 아래에서 흰 시트가 올라오는 모양이 됐다. 뒤의 독서 완료가 비쳐 보여 '읽기를 마친 자리에서
 * 이어지는 권유'로 읽힌다. 어두운 덮개나 ✕, 기기의 뒤로가기로 닫힌다.
 *
 * Modal이 아니라 화면을 덮는 층인 것은 이 안내가 뜨는 자리가 이미 Modal 안일 수 있기
 * 때문이다. 여기서 Modal을 한 겹 더 쓰면 안드로이드에서 네이티브 창이 겹쳐 쌓인다.
 *
 * 꾸밈은 전부 그 책에서 나온 것만 쓴다 — 표지, 분야 칩, 쪽수, 정가. 평점이나 순위 같은 것은
 * 우리가 가진 값이 아니므로 지어내지 않는다. freeCount는 시안에서 빠져 지금은 그리지 않는다.
 */
export default function BookPurchaseNotice({
  book,
  lockedCount,
  onBuy,
  onClose,
}: {
  book?: CatalogBook;
  /** 무료로 열어 둔 화 수. 시안에서 빠져 지금은 그리지 않는다(부르는 쪽 호환을 위해 남김). */
  freeCount?: number;
  /** 잠긴 화 수 — 0이면 그 줄을 아예 그리지 않는다. */
  lockedCount: number;
  /** 값 버튼 — 그 책의 서점 상세로 보낸다. */
  onBuy: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const chips = fieldsOf(book?.tags ?? []).slice(0, 3);

  return (
    <View style={styles.layer}>
      {/* 뒤를 덮는 어둠(50%) — 누르면 닫힌다. */}
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="구매 안내 닫기"
          style={styles.dim}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
        style={[styles.sheet, { paddingBottom: insets.bottom + Space[20] }]}>
        <View style={styles.closeRow}>
          <ScaleButton accessibilityLabel="닫기" style={styles.close} onPress={onClose}>
            <Ionicons name="close-outline" color={Ink.primary} size={24} />
          </ScaleButton>
        </View>

        <View style={styles.body}>
          <View style={styles.heading}>
            <Text style={styles.headline}>뒷 내용이 궁금하신가요?</Text>
            {lockedCount > 0 ? (
              <Text style={styles.locked}>{`이 책에는 아직 잠긴 ${lockedCount}편이 남아 있어요`}</Text>
            ) : null}
          </View>

          <BookCoverArt
            bookId={book?.bookId}
            coverImage={book?.coverImage}
            coverDesign={book?.coverDesign}
            width={COVER_W}
            radius={4}
            style={styles.cover}
          />

          <View style={styles.info}>
            <View style={styles.titles}>
              <Text style={styles.title} numberOfLines={2}>
                {`『${book?.title ?? ''}』`}
              </Text>
              {book?.author ? (
                <Text style={styles.author} numberOfLines={1}>
                  {book.author}
                </Text>
              ) : null}
            </View>

            {(chips.length > 0 || book?.pages) && (
              <View style={styles.meta}>
                {chips.map((label) => (
                  <View key={label} style={styles.chip}>
                    <Text style={styles.chipText}>{label}</Text>
                  </View>
                ))}
                {book?.pages ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{book.pages}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>

        <ScaleButton
          accessibilityLabel={`${book?.title ?? '이 책'} 구매하기`}
          style={styles.buyButton}
          onPress={onBuy}>
          <Text style={styles.buyText}>
            {book?.price ? `${formatPrice(book.price)} · 책 구매하기` : '책 보러 가기'}
          </Text>
        </ScaleButton>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 화면을 통째로 덮는 층 — 덮개와 시트를 담는다.
   *
   * z를 크게 박아 두는 건 다른 화면 위에 얹힐 때를 위해서다. 리액트 네이티브는 형제 사이에서
   * 그리는 순서보다 zIndex를 먼저 본다 — 나중에 그렸다고 위에 오지 않는다. 안드로이드는
   * elevation도 함께 봐서 둘 다 준다.
   */
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 24,
    justifyContent: 'flex-end',
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  /** 아래에서 올라오는 흰 시트 — 위 모서리만 둥글다. */
  sheet: {
    alignItems: 'center',
    paddingTop: Space[20],
    paddingHorizontal: Space[20],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Surface.canvas,
  },
  closeRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: Corner.pill,
  },
  body: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 28,
    paddingBottom: Space[32],
  },
  heading: {
    alignSelf: 'stretch',
    gap: Space[4],
  },
  /** 권하는 말 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  headline: {
    fontFamily: Type.readingBold,
    fontSize: 22,
    lineHeight: 35.2,
    letterSpacing: -0.44,
    textAlign: 'center',
    color: Ink.primary,
  },
  locked: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: trackBody(13),
    textAlign: 'center',
    color: Ink.body,
  },
  /** 표지 — 시안의 Elevation 3 그림자. */
  cover: {
    boxShadow: '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)',
  },
  info: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Space[16],
  },
  titles: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Space[4],
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Ink.primary,
  },
  author: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: trackBody(13),
    textAlign: 'center',
    color: Ink.body,
  },
  /** 분야와 쪽수 — 그 책이 실제로 들고 있는 값만 칩으로 세운다. */
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space[4],
  },
  chip: {
    paddingHorizontal: Space[8],
    paddingVertical: Space[4],
    borderRadius: 4,
    backgroundColor: Surface.plate,
  },
  chipText: {
    fontFamily: Type.ui,
    fontSize: 11,
    lineHeight: 17,
    color: Ink.primary,
  },
  /** 값 버튼 — 이 시트가 하러 온 일 하나라 크고 주황이다. */
  buyButton: {
    alignSelf: 'stretch',
    height: 60,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  buyText: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 25,
    color: Ink.onDark,
  },
});
