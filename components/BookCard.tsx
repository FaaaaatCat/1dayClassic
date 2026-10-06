import { Pressable, StyleSheet, Text, View } from 'react-native';

import BookCoverArt from '@/components/book/BookCoverArt';
import TagChip from '@/components/TagChip';
import { Ink, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import type { BookId, CoverDesign } from '@/types';

/** 격자 한 칸의 표지 폭 — 높이는 표지 비율이 정한다. */
const COVER_W = 108;
/** '내 서재' 리본의 크기. */
const RIBBON_W = 81.77;
const RIBBON_H = 21;

interface BookCardProps {
  title: string;
  author: string;
  /** 학습 콘텐츠가 있는 책이면 그 id — 표지를 그릴 값을 여기서 찾는다. */
  bookId: BookId | null;
  /** 학습 콘텐츠가 없는 책의 표지 주소. */
  coverImage?: string;
  /** 카탈로그에만 있는 책이 들고 있는 표지 값. */
  coverDesign?: CoverDesign;
  /** 이 책의 분야들 — 칩으로 단다. */
  fields: string[];
  /** 오늘의 책으로 고를 수 있는 책인지 — 칩 줄 맨 앞에 검은 '읽기 가능' 칩을 단다. */
  readable: boolean;
  /** 서재의 '읽을 예정인 책'에 담긴 책인지 — 오른쪽 위에 '내 서재' 리본을 건다. */
  inShelf: boolean;
  selected: boolean;
  onPress: () => void;
}

/**
 * 하루 서점 격자의 책 한 칸.
 *
 * 배경은 상태와 무관하게 흰색이다. 책의 상태는 두 가지만 그린다.
 * - 읽기 가능: 칩 줄 맨 앞의 검은 칩. 백 권 남짓한 서가에서 지금 열어 읽을 수 있는 책을
 *   가려낸다. 분야 칩과 같은 줄에 서되 색으로 갈린다.
 * - 내 서재: 오른쪽 위 모서리의 45° 리본. 서재의 '읽을 예정인 책'에 담은 책이다.
 * 선택 여부는 값으로 들고 있지만(스크린리더가 읽는 상태 문구에 쓰인다) 그리지는 않는다.
 *
 * 한 줄에 놓인 두 카드의 높이를 맞추려고 카드가 칸을 flex로 가득 채운다
 * (FlatList의 행은 기본이 alignItems: stretch라 짧은 쪽이 긴 쪽까지 늘어난다).
 */
export default function BookCard({
  title,
  author,
  bookId,
  coverImage,
  coverDesign,
  fields,
  readable,
  inShelf,
  selected,
  onPress,
}: BookCardProps) {
  const state = [selected ? '현재 선택중' : readable ? '읽기 가능' : '', inShelf ? '내 서재에 담김' : '']
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state ? `${title} 상세 보기, ${state}` : `${title} 상세 보기`}
      style={styles.card}
      onPress={onPress}>

      <BookCoverArt
        bookId={bookId}
        coverImage={coverImage}
        coverDesign={coverDesign}
        width={COVER_W}
      />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {author}
      </Text>

      {(readable || fields.length > 0) && (
        <View style={styles.chips}>
          {readable && <TagChip label="읽기 가능" compact strong />}
          {fields.map((label) => (
            <TagChip key={label} label={label} compact />
          ))}
        </View>
      )}

      {inShelf && (
        <View style={styles.ribbon} pointerEvents="none">
          <Text style={styles.ribbonText}>내 서재</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 32,
    // 격자의 선은 아주 옅게 — 표면 가운데 가장 깊은 plate를 머리카락 굵기로 둔다.
    // 칸을 나누는 기척만 남기고 표지가 먼저 보이게.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
    overflow: 'hidden',
  },
  /**
   * '내 서재' 리본 — 오른쪽 위 모서리에 45°로 건다. 양 끝은 카드가 잘라 낸다(overflow).
   *
   * 자리는 피그마 값이다: 리본(81.77×21)의 한가운데가 카드 오른쪽 끝에서 21.1, 위에서
   * 18.4인 곳에 온다. 오른쪽 끝을 기준으로 잡아 카드 폭이 기기마다 달라도 같은 자리에 걸린다.
   */
  ribbon: {
    position: 'absolute',
    top: 18.4 - RIBBON_H / 2,
    right: 21.1 - RIBBON_W / 2,
    width: RIBBON_W,
    height: RIBBON_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.muted,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontFamily: Type.uiMedium,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: trackBody(11),
    color: Ink.onDark,
  },
  title: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    letterSpacing: trackBody(16),
    color: Ink.primary,
    textAlign: 'center',
  },
  author: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: -8,
  },
});
