import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

interface Props {
  paragraphs: string[];
  /**
   * 구매했으면 본문을 전부 보여 주고 '계속 읽어보세요' 버튼과 안내 문구를 감춘다.
   * 구매 여부를 어디서 가져오는지는 이 블록이 알 필요가 없다 — 조합 파일이 넘겨 준다.
   */
  purchased?: boolean;
}

/** 구매 전에 보여 주는 기본 비율 */
const VISIBLE_RATIO = 0.4;
/** 40%가 이보다 짧으면 이만큼까지 늘려 보여 준다 — 너무 조금 보여 주면 읽을 맛이 없다. */
const MIN_VISIBLE_CHARS = 400;
/** 원문이 짧은(≤ MIN_VISIBLE_CHARS) 글에 쓰는 비율. 이때는 최소 글자 수를 적용하지 않는다. */
const SHORT_CONTENT_RATIO = 0.5;

/**
 * 구매 전에 보여 줄 글자 수.
 *
 * - 원문이 400자를 넘으면 40%를 쓰되, 그게 400자보다 짧으면 400자로 늘린다.
 * - 원문이 400자 이하면 최소 글자 수를 적용하지 않고 절반만 보여 준다
 *   (400자를 적용하면 사실상 전문이 되어 버린다).
 */
function visibleCharCount(total: number): number {
  if (total <= MIN_VISIBLE_CHARS) return Math.round(total * SHORT_CONTENT_RATIO);
  return Math.max(Math.round(total * VISIBLE_RATIO), MIN_VISIBLE_CHARS);
}

/**
 * 앞에서부터 정해진 글자 수만 남긴다. 문단 경계와 무관하게 자르므로 마지막 문단은
 * 문장 도중에 끊기고, 그 자리에 말줄임표를 붙인다.
 *
 * 화면에 그려진 뒤 높이를 재서 자르는 방법(onLayout)을 쓰지 않는다 —
 * react-native-web에서 onLayout이 발화하지 않아 웹에서는 잘리지 않았다.
 * 글자 수로 자르면 웹과 앱이 똑같이 동작하고, 그릴 때 이미 잘려 있어
 * 두 번 렌더할 일도 없다.
 */
function clipParagraphs(paragraphs: string[]): string[] {
  const total = paragraphs.reduce((sum, p) => sum + p.length, 0);
  const limit = visibleCharCount(total);

  const kept: string[] = [];
  let used = 0;
  for (const paragraph of paragraphs) {
    if (used >= limit) break;
    const room = limit - used;
    kept.push(room >= paragraph.length ? paragraph : paragraph.slice(0, room));
    used += paragraph.length;
  }
  return kept;
}

export default function DescBlock({ paragraphs, purchased = false }: Props) {
  const clipped = purchased ? paragraphs : clipParagraphs(paragraphs);
  // 구매했더라도 원문이 짧아 잘릴 게 없으면 안내를 띄우지 않는다.
  const isClipped = clipped.join('').length < paragraphs.join('').length;

  // 잘린 마지막 문단 끝에 말줄임표를 붙여 "여기서 끊겼다"를 글자로 알린다.
  const shown = isClipped
    ? clipped.map((p, i) => (i === clipped.length - 1 ? `${p.trimEnd()}...` : p))
    : clipped;

  return (
    <View style={blockStyles.block}>
      <View style={styles.content}>
        {shown.map((paragraph, i) => (
          <Text key={i} style={blockStyles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>

      {isClipped && (
        <View style={styles.more}>
          <ScaleButton
            accessibilityLabel="계속 읽어보세요"
            style={styles.moreButton}
            // 구매 기능 미정 — 붙으면 여기서 결제를 열고, 끝나면 purchased가 true가 된다.
            onPress={() => {}}
          >
            <Text style={styles.moreButtonText}>계속 읽어보세요</Text>
          </ScaleButton>

          <Text style={styles.moreNotice}>책을 구매하시면 전체 내용을 읽으실 수 있습니다.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
  },
  more: {
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 24,
  },
  moreButton: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: Colors.blue100,
  },
  moreButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.white,
  },
  moreNotice: {
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
});
