import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { formatPrice, type CatalogBook } from '@/lib/catalog';

/**
 * 책 구매 안내.
 *
 * 무료로 열린 마지막 화를 끝내고 '다음 화 읽기'를 눌렀을 때 뜬다 — 다음 화가 잠겨 있어
 * 열어 줄 수 없으니, 대신 그 뒤가 어디에 있는지 말해 주는 자리다.
 *
 * Modal이 아니라 화면을 덮는 층이다. 이 안내가 뜨는 자리(퀴즈 엔딩 화면)가 이미 Modal
 * 안이라, 여기서 Modal을 한 겹 더 쓰면 안드로이드에서 네이티브 창이 겹쳐 쌓인다.
 * 부모의 Modal 안에 얹으면 그 문제가 아예 생기지 않는다.
 */
export default function BookPurchaseNotice({
  book,
  onBuy,
  onClose,
}: {
  book?: CatalogBook;
  /** 값 버튼 — 지금은 그 책의 서점 상세로 보낸다. */
  onBuy: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.overlay}>
      {/* 바깥을 눌러도 닫힌다. */}
      <Pressable accessibilityLabel="닫기" style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* 안내 위를 눌렀을 때 닫히지 않도록 눌림을 여기서 멈춘다. */}
      <Pressable style={styles.dialog} onPress={() => {}}>
        <Text style={styles.lead}>
          {`뒷 내용이 더 궁금하시다면\n『${book?.title ?? ''}』 을 구매해보세요.`}
        </Text>

        {book?.coverImage ? (
          <Image
            source={{ uri: book.coverImage }}
            style={styles.cover}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <ScaleButton
          accessibilityLabel={`${book?.title ?? '이 책'} 구매하기`}
          style={styles.buyButton}
          onPress={onBuy}>
          <Text style={styles.buyText}>{formatPrice(book?.price ?? null) || '구매하러 가기'}</Text>
        </ScaleButton>

        <Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>다음에 볼게요</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space[24],
    backgroundColor: 'rgba(3,3,3,0.7)',
  },
  dialog: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Space[16],
    paddingHorizontal: Space[24],
    paddingVertical: Space[32],
    borderRadius: Corner.card,
    backgroundColor: Surface.canvas,
  },
  lead: {
    fontFamily: Type.ui,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: Ink.primary,
  },
  /** 표지 — 높이를 정해 두고 그 안에서 비율을 지킨다(resizeMode contain). */
  cover: {
    width: '100%',
    height: 200,
  },
  buyButton: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: Corner.input,
    backgroundColor: Ink.primary,
  },
  buyText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
  closeButton: {
    paddingVertical: Space[4],
  },
  closeText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
});
