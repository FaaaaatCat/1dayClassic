import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';
import type { CatalogBook } from '@/lib/catalog';
import { getCoverDesign } from '@/lib/coverDesign';
import { fieldsOf } from '@/lib/tags';
import type { BookId } from '@/types';

/** 세우는 표지의 폭 — 높이는 표지 비율이 정한다(피그마 시안 120×174). */
const COVER_W = 120;
/** 표지가 다 떠오르는 때(지연 250 + 500)와, 그 뒤 버튼이 오르기 전에 쉬는 시간 — 독서 완료와 같은 0.8초. */
const COVER_SHOWN_MS = 750;
const BUTTON_PAUSE_MS = 800;
const BUTTON_DELAY_MS = COVER_SHOWN_MS + BUTTON_PAUSE_MS;

/**
 * 광고_다음책 — 오늘 독서를 마치면 다음에 만나 볼 책 한 권을 권한다(피그마 '광고_다음책').
 *
 * 바탕은 그 책 표지의 두 색(잉크 → 종이)으로 내린 그라데이션에 검정 50%를 덮은 것이다. 클래식이면
 * 위 #D9DEEC에서 아래 #141A2B로 내려간다. 처음엔 그 책 첫 화의 첫표지 사진을 깔았는데, 사진을
 * 받아 오느라 화면이 뜬 뒤에도 한참 비어 있어서 바로 그려지는 색으로 바꿨다. 그 위에 표지,
 * 『제목』, 지은이, 분야·쪽수 칩. 버튼은 표지가 다 뜨고 0.8초 쉰 뒤에 오른다(그전엔 눌리지 않는다).
 *
 * 제목 아래 한 줄은 그 책의 홍보 문구(CatalogBook.promo)다. 문구가 없는 책은 그 줄을 그리지 않는다.
 */
export default function NextBookAd({
  book,
  onAccept,
  onDecline,
}: {
  /** 권할 책 — 학습 콘텐츠가 있는 책(bookId가 있다)만 온다. */
  book: CatalogBook & { bookId: BookId };
  /** '내일은 이 책으로 읽을래요'. */
  onAccept: () => void;
  /** '아니오, 괜찮아요'. */
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();
  const chips = fieldsOf(book.tags).slice(0, 3);
  /** 표지의 두 색 — 위는 잉크, 아래는 종이. 카탈로그에 표지 값이 있으면 그것, 없으면 그 책의 것. */
  const design = book.coverDesign ?? getCoverDesign(book.bookId);
  /** 버튼이 눌리는가 — 아직 보이지 않는 버튼이 손가락을 받으면 안 된다. */
  const [buttonsLive, setButtonsLive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setButtonsLive(true), BUTTON_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[design.ink, design.paper]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.dim} pointerEvents="none" />

      <View
        style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.body}>
          <View style={styles.heading}>
            <Text style={styles.headline}>다음에 이 책을 만나볼까요?</Text>
            {book.promo ? <Text style={styles.sub}>{book.promo}</Text> : null}
          </View>

          <Animated.View entering={FadeInDown.delay(250).duration(500).easing(Easing.out(Easing.cubic))}>
            <BookCoverArt
              bookId={book.bookId}
              coverImage={book.coverImage}
              coverDesign={book.coverDesign}
              width={COVER_W}
              radius={4}
              style={styles.cover}
            />
          </Animated.View>

          <View style={styles.info}>
            <View style={styles.titles}>
              <Text style={styles.title} numberOfLines={2}>{`『${book.title}』`}</Text>
              <Text style={styles.author} numberOfLines={1}>
                {book.author}
              </Text>
            </View>
            {(chips.length > 0 || book.pages) && (
              <View style={styles.meta}>
                {chips.map((label) => (
                  <View key={label} style={styles.chip}>
                    <Text style={styles.chipText}>{label}</Text>
                  </View>
                ))}
                {book.pages ? (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{book.pages}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(BUTTON_DELAY_MS).duration(400)}
          style={styles.buttons}>
          {/*
            보이기 전엔 버튼마다 disabled로 막는다. 처음엔 감싸는 뷰의 pointerEvents를 'none' → 'auto'로
            바꿨는데, 들어오는 애니메이션(entering)이 걸린 뷰에서는 그 값이 바뀌어도 손가락이 계속 막혀
            버튼이 끝내 눌리지 않았다.
          */}
          <ScaleButton
            accessibilityLabel="내일은 이 책으로 읽을래요"
            disabled={!buttonsLive}
            style={styles.accept}
            onPress={onAccept}>
            <Text style={styles.acceptText}>내일은 이 책으로 읽을래요</Text>
          </ScaleButton>
          <ScaleButton
            accessibilityLabel="아니오, 괜찮아요"
            disabled={!buttonsLive}
            style={styles.decline}
            onPress={onDecline}>
            <Text style={styles.declineText}>아니오, 괜찮아요</Text>
          </ScaleButton>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  heading: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  /** 권하는 말 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  headline: {
    fontFamily: Type.readingBold,
    fontSize: 22,
    lineHeight: 34,
    letterSpacing: -0.44,
    textAlign: 'center',
    color: Ink.onDark,
  },
  sub: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Ink.muted,
  },
  /** 표지 — 시안의 Elevation 3 그림자. */
  cover: {
    boxShadow: '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)',
  },
  info: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 16,
  },
  titles: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: Ink.onDark,
  },
  author: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: trackBody(13),
    textAlign: 'center',
    color: Ink.onDark,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Ink.strong,
  },
  chipText: {
    fontFamily: Type.ui,
    fontSize: 11,
    lineHeight: 17,
    color: Ink.onDark,
  },
  buttons: {
    gap: 16,
  },
  accept: {
    height: 56,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  acceptText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  /** 거절 — 테두리만 있는 버튼(Stone 테). */
  decline: {
    height: 56,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
  },
  declineText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.onDark,
  },
});
