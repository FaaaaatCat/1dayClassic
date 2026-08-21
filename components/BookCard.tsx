import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import TagChip from '@/components/TagChip';
import { Colors, Fonts, tracking } from '@/constants/theme';

/** 모서리에서 잘라 낼 정사각 영역 — 띠는 이 안에서만 보인다. */
const RIBBON_BOX = 72;
/** 대각선 띠의 길이 — 정사각 영역의 대각선(≈102)보다 길어야 양 끝이 카드 밖으로 잘려 나간다. */
const RIBBON_BAND_WIDTH = 110;

interface BookCardProps {
  title: string;
  author: string;
  cover: ImageSourcePropType;
  /** 이 책이 속한 시리즈들 — 파란 칩. */
  series: string[];
  /** 이 책의 분야들 — 베이지 칩. */
  fields: string[];
  purchased: boolean;
  /** MVP에서 제공하는 학습 콘텐츠면 구매 리본 대신 MVP 리본을 단다. */
  mvp: boolean;
  selected: boolean;
  onPress: () => void;
}

/**
 * 카드 오른쪽 위 모서리를 가로지르는 대각선 띠.
 * 정사각 영역으로 잘라 낸(overflow: hidden) 안에서 띠를 45° 눕혀, 양 끝이 영역 밖으로
 * 나가 잘리면서 모서리에 감긴 것처럼 보이게 한다.
 */
function CornerRibbon({ text }: { text: string }) {
  return (
    <View style={styles.ribbonCorner} pointerEvents="none">
      <View style={styles.ribbonBand}>
        <Text style={styles.ribbonText}>{text}</Text>
      </View>
    </View>
  );
}

/**
 * 하루 서점 격자의 책 한 칸.
 *
 * 배경은 상태와 무관하게 흰색이고, 눈에 보이는 표시는 MVP 콘텐츠에 다는 대각선 띠 하나뿐이다.
 * 구매·선택 여부는 값으로는 그대로 들고 있지만(스크린리더가 읽는 상태 문구에 쓰인다)
 * 카드 위에 따로 그리지는 않는다.
 *
 * 한 줄에 놓인 두 카드의 높이를 맞추려고 카드가 칸을 flex로 가득 채운다
 * (FlatList의 행은 기본이 alignItems: stretch라 짧은 쪽이 긴 쪽까지 늘어난다).
 */
export default function BookCard({
  title,
  author,
  cover,
  series,
  fields,
  purchased,
  mvp,
  selected,
  onPress,
}: BookCardProps) {
  const state = selected ? '현재 선택중' : mvp ? 'MVP' : purchased ? '구매함' : '미구매';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 상세 보기, ${state}`}
      style={styles.card}
      onPress={onPress}>
      {mvp && <CornerRibbon text="MVP" />}

      <Image source={cover} style={styles.cover} resizeMode="cover" />
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.white,
  },
  ribbonCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: RIBBON_BOX,
    height: RIBBON_BOX,
    overflow: 'hidden',
    zIndex: 1,
  },
  // top·left는 45° 회전의 중심이 모서리 대각선 위에 오도록 잡은 값이다 — 띠가 모서리를
  // 비스듬히 가로지르고 양 끝은 위 영역 밖으로 나가 잘린다.
  ribbonBand: {
    position: 'absolute',
    top: 4,
    left: 2,
    width: RIBBON_BAND_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: Colors.beige100,
    transform: [{ rotate: '45deg' }],
  },
  ribbonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: tracking(11),
    color: Colors.white,
  },
  cover: {
    width: 108,
    height: 160,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
    textAlign: 'center',
  },
  author: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
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
