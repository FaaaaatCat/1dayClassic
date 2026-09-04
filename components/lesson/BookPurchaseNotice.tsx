import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { formatPrice, type CatalogBook } from '@/lib/catalog';
import { fieldsOf, seriesOf } from '@/lib/tags';

/** 배경에 깔리는 표지를 흐리게 하는 정도 — 무엇이 깔렸는지만 알아볼 만큼. */
const BACKDROP_BLUR = 24;

/**
 * 책 구매 안내.
 *
 * 무료로 열린 마지막 화를 끝내고 '다음 화 읽기'를 눌렀을 때 뜬다. 이 앱이 파는 물건은
 * 책 한 권이고 이 화면이 그 말을 하는 유일한 자리라, 작은 팝업이 아니라 화면을 통째로
 * 쓴다 — 뒤가 비쳐 보이면 방금까지 읽던 것이 계속 눈에 걸려 여기 적힌 것을 읽지 않는다.
 *
 * Modal이 아니라 화면을 덮는 층인 것은 이 안내가 뜨는 자리(카드 덱, 퀴즈 엔딩 화면)가
 * 이미 Modal 안이기 때문이다. 여기서 Modal을 한 겹 더 쓰면 안드로이드에서 네이티브 창이
 * 겹쳐 쌓인다.
 *
 * 꾸밈은 전부 그 책에서 나온 것만 쓴다 — 흐리게 깐 표지, 그 위에 세운 표지, 분야 칩,
 * 쪽수, 정가. 평점이나 순위 같은 것은 우리가 가진 값이 아니므로 지어내지 않는다.
 */
export default function BookPurchaseNotice({
  book,
  freeCount,
  lockedCount,
  onBuy,
  onClose,
}: {
  book?: CatalogBook;
  /** 무료로 열어 둔 화 수 — '5편을 모두 읽으셨어요'의 그 수다. */
  freeCount: number;
  /** 잠긴 화 수 — 0이면 그 줄을 아예 그리지 않는다. */
  lockedCount: number;
  /** 값 버튼 — 그 책의 서점 상세로 보낸다. */
  onBuy: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const tags = book?.tags ?? [];
  const chips = [...seriesOf(tags, book?.title ?? ''), ...fieldsOf(tags)].slice(0, 3);

  return (
    <View style={styles.screen}>
      {/* 배경 — 같은 표지를 흐리게 깔고, 아래로 갈수록 검게 덮어 글자가 설 자리를 만든다. */}
      {book?.coverImage ? (
        <Image
          source={{ uri: book.coverImage }}
          style={styles.backdrop}
          resizeMode="cover"
          blurRadius={BACKDROP_BLUR}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.backdropDim} pointerEvents="none" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)', '#000000']}
        locations={[0, 0.55, 1]}
        style={styles.backdropFade}
        pointerEvents="none"
      />

      <ScaleButton
        accessibilityLabel="닫기"
        style={[styles.close, { top: insets.top + Space[8] }]}
        onPress={onClose}>
        <Ionicons name="close-outline" color={Ink.onDark} size={24} />
      </ScaleButton>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          { paddingTop: insets.top + Space[56], paddingBottom: Space[24] },
        ]}>
        {book?.coverImage ? (
          <Image
            source={{ uri: book.coverImage }}
            style={styles.cover}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        {/* 지금 무슨 일이 일어났는지 한 줄 — 잠긴 이유를 먼저 말하고 권한다. */}
        <View style={styles.badge}>
          <Ionicons name="lock-closed" color={Spark.ember} size={12} />
          <Text style={styles.badgeText}>{`무료로 열린 ${freeCount}편을 모두 읽으셨어요`}</Text>
        </View>

        <Text style={styles.headline}>{'뒷 내용이 더 궁금하시다면\n이 책을 만나 보세요'}</Text>

        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={2}>
            {`『${book?.title ?? ''}』`}
          </Text>
          {book?.author ? (
            <Text style={styles.author} numberOfLines={2}>
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

        {lockedCount > 0 ? (
          <Text style={styles.locked}>{`이 책에는 아직 잠긴 ${lockedCount}편이 남아 있어요`}</Text>
        ) : null}
      </ScrollView>

      {/* 값 버튼은 스크롤을 따라오지 않는다 — 이 화면이 하러 온 일이라 늘 손 닿는 곳에 있다. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Space[16] }]}>
        <ScaleButton
          accessibilityLabel={`${book?.title ?? '이 책'} 구매하기`}
          style={styles.buyButton}
          onPress={onBuy}>
          <Text style={styles.buyText}>
            {book?.price ? `${formatPrice(book.price)} · 책 구매하기` : '책 보러 가기'}
          </Text>
        </ScaleButton>

        <Pressable accessibilityRole="button" style={styles.later} onPress={onClose}>
          <Text style={styles.laterText}>다음에 볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 화면을 통째로 덮는 층.
   *
   * z를 크게 박아 두는 건 카드 덱 위에 얹힐 때를 위해서다. 덱은 장마다 zIndex를 갖고
   * 있고(위 크롬까지 100번대를 쓴다), 리액트 네이티브는 형제 사이에서 그리는 순서보다
   * zIndex를 먼저 본다 — 나중에 그렸다고 위에 오지 않는다. 안드로이드는 elevation도
   * 함께 봐서 둘 다 준다.
   */
  screen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    elevation: 24,
    backgroundColor: Ink.primary,
  },
  /** 흐리게 깐 표지 — 위쪽만 덮는다. 아래는 그라데이션이 받아 검정으로 이어진다. */
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  backdropDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(3,3,3,0.55)',
  },
  backdropFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  close: {
    position: 'absolute',
    right: Space[12],
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: Corner.pill,
  },

  body: {
    alignItems: 'center',
    gap: Space[16],
    paddingHorizontal: Space[24],
  },
  /** 세워 둔 표지 — 이 화면의 주인공이라 크게 두고 그림자를 깐다. */
  cover: {
    width: 180,
    height: 266,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  /** 왜 잠겼는지 알리는 작은 알약 — 주황 자물쇠 하나로 말한다. */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    paddingHorizontal: Space[12],
    paddingVertical: Space[8],
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  badgeText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Surface.plate,
  },
  /** 권하는 말 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  headline: {
    fontFamily: Type.readingBold,
    ...TypeScale.headingSm,
    lineHeight: 34,
    textAlign: 'center',
    color: Ink.onDark,
  },
  titles: {
    alignItems: 'center',
    gap: Space[4],
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.onDark,
  },
  author: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.muted,
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
    borderRadius: Corner.input,
    backgroundColor: Ink.strong,
  },
  chipText: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Surface.plate,
  },
  locked: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.muted,
  },

  footer: {
    gap: Space[8],
    paddingHorizontal: Space[24],
    paddingTop: Space[12],
  },
  /** 값 버튼 — 이 화면이 하러 온 일 하나라 크고 주황이다. */
  buyButton: {
    height: 60,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  buyText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodyLg,
    color: Ink.onDark,
  },
  later: {
    alignItems: 'center',
    paddingVertical: Space[12],
  },
  laterText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
});
