import { Pressable, StyleSheet, Text, View } from 'react-native';

import BookCoverArt from '@/components/book/BookCoverArt';
import TagChip from '@/components/TagChip';
import { Ink, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import type { BookId, CoverDesign } from '@/types';

/** 격자 한 칸의 표지 폭 — 높이는 표지 비율이 정한다. */
const COVER_W = 108;

interface BookCardProps {
  title: string;
  author: string;
  /** 학습 콘텐츠가 있는 책이면 그 id — 표지를 그릴 값을 여기서 찾는다. */
  bookId: BookId | null;
  /** 학습 콘텐츠가 없는 책의 표지 주소. */
  coverImage?: string;
  /** 카탈로그에만 있는 책이 들고 있는 표지 값. */
  coverDesign?: CoverDesign;
  /** 이 책이 속한 시리즈들 — 파란 칩. */
  series: string[];
  /** 이 책의 분야들 — 베이지 칩. */
  fields: string[];
  /** 오늘의 책으로 고를 수 있는 책인지 — 모서리에 '읽기 가능' 탭을 단다. */
  readable: boolean;
  selected: boolean;
  onPress: () => void;
}

/**
 * 하루 서점 격자의 책 한 칸.
 *
 * 배경은 상태와 무관하게 흰색이다. 카드 위에 그리는 표시는 오른쪽 위의 '읽기 가능' 탭
 * 하나뿐이다 — 백 권 남짓한 서가에서 지금 열어 읽을 수 있는 열 권을 가려낸다. 선택 여부는
 * 값으로 들고 있지만(스크린리더가 읽는 상태 문구에 쓰인다) 그리지는 않는다.
 *
 * 예전에는 같은 자리에 'MVP' 대각선 띠를 둘렀다. 문구를 '읽기 가능'으로 바꾸면서 띠를 탭으로
 * 바꾼 것은 글자가 길어져서다 — 72px 모서리 안에서 대각선이 지나는 길이는 42px 남짓인데
 * '읽기 가능'은 11px로 45px을 넘어 양 끝이 잘린다. 띠를 키우면 표지를 덮는다. 가로 탭은
 * 카드 윗여백(32px) 안에 앉아 표지에 닿지 않는다.
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
  series,
  fields,
  readable,
  selected,
  onPress,
}: BookCardProps) {
  const state = selected ? '현재 선택중' : readable ? '읽기 가능' : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state ? `${title} 상세 보기, ${state}` : `${title} 상세 보기`}
      style={styles.card}
      onPress={onPress}>
      {readable && (
        <View style={styles.readableTab} pointerEvents="none">
          <Text style={styles.readableText}>읽기 가능</Text>
        </View>
      )}

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

      {(series.length > 0 || fields.length > 0) && (
        <View style={styles.chips}>
          {series.map((label) => (
            <TagChip key={`s-${label}`} label={label} variant="series" compact />
          ))}
          {fields.map((label) => (
            <TagChip key={`f-${label}`} label={label} variant="field" compact />
          ))}
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
    // 격자의 선은 검정을 뺀 가장 어두운 잉크다. 굵기는 머리카락 하나로 두어,
    // 진한 색인데도 선으로만 읽히고 면으로 보이지 않는다.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Ink.strong,
    backgroundColor: Surface.canvas,
  },
  /**
   * '읽기 가능' 탭 — 카드 오른쪽 위 모서리에 붙는다. 색·서체는 예전 MVP 띠와 같다.
   * 높이 21px(위아래 4 + 글줄 13)이라 카드 윗여백 32px 안에 들어가 표지에 닿지 않는다.
   */
  readableTab: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Ink.primary,
    zIndex: 1,
  },
  readableText: {
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
