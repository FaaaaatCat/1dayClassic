import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import TagChip from '@/components/TagChip';
import { Colors, Fonts, tracking } from '@/constants/theme';

/** 리본 너비 — 세로로 두 글자가 들어갈 만큼만. */
const RIBBON_WIDTH = 24;
/** 리본 끝 V자 홈의 깊이. */
const RIBBON_NOTCH = 7;

interface BookCardProps {
  title: string;
  author: string;
  cover: ImageSourcePropType;
  /** 이 책이 속한 시리즈들 — 파란 칩. */
  series: string[];
  /** 이 책의 분야들 — 베이지 칩. */
  fields: string[];
  purchased: boolean;
  selected: boolean;
  onPress: () => void;
}

/** 카드 오른쪽 위에 매달리는 리본. 끝이 V자로 파여 있다. */
function Ribbon({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.ribbon}>
      <View style={[styles.ribbonBody, { backgroundColor: color }]}>
        {[...text].map((char, index) => (
          <Text key={index} style={styles.ribbonText}>
            {char}
          </Text>
        ))}
      </View>
      {/* 좌우 삼각형만 리본색으로 칠하고 가운데를 투명하게 둬서 V자 홈을 만든다. */}
      <View
        style={[styles.ribbonNotch, { borderLeftColor: color, borderRightColor: color }]}
      />
    </View>
  );
}

/**
 * 하루 서점 격자의 책 한 칸.
 *
 * 배경은 상태와 무관하게 흰색이고, 상태는 오른쪽 위 리본으로만 말한다 —
 * 고른 책은 남색 '선택', 산 책은 갈색 '구매'. 둘 다면 선택이 왼쪽에 온다.
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
  selected,
  onPress,
}: BookCardProps) {
  const state = selected ? '현재 선택중' : purchased ? '구매함' : '미구매';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 상세 보기, ${state}`}
      style={styles.card}
      onPress={onPress}>
      <View style={styles.ribbons}>
        {selected && <Ribbon text="선택" color={Colors.blue100} />}
        {purchased && <Ribbon text="구매" color={Colors.beige100} />}
      </View>

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
  ribbons: {
    position: 'absolute',
    top: 0,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    zIndex: 1,
  },
  ribbon: {
    alignItems: 'center',
  },
  ribbonBody: {
    width: RIBBON_WIDTH,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  ribbonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    // 두 글자가 바짝 붙어 보이도록 글자 크기보다 살짝 큰 정도로만 준다.
    lineHeight: 12,
    color: Colors.white,
  },
  ribbonNotch: {
    width: 0,
    height: 0,
    borderLeftWidth: RIBBON_WIDTH / 2,
    borderRightWidth: RIBBON_WIDTH / 2,
    borderBottomWidth: RIBBON_NOTCH,
    borderBottomColor: 'transparent',
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
