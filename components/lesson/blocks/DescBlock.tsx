import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 잘린 뒤를 어떻게 마무리할지 고르는 두 가지 디자인.
 *
 * - `fade`     본문이 배경색 그라데이션에 서서히 묻힌다. 뒤에 ShopBlock이 따로 붙는다.
 * - `ellipsis` 말줄임표로 끊고 '계속 읽어보세요' 버튼과 안내 문구가 바로 이어진다.
 *              이 경우 ShopBlock은 필요 없다(조합 파일에서 함께 꺼진다).
 *
 * 둘 다 남겨 두는 이유는 어느 쪽이 나은지 실제 화면으로 비교하기 위해서다.
 */
export type DescVariant = 'fade' | 'ellipsis';

interface Props {
  paragraphs: string[];
  variant?: DescVariant;
}

/** 무료 사용자에게 보여 주는 비율 — 본문 전체 길이 중 앞에서부터 이만큼만 보인다. */
const VISIBLE_RATIO = 0.8;
/** fade에서 아래로 갈수록 배경색에 묻히게 하는 덮개의 높이 */
const FADE_HEIGHT = 160;

/**
 * 본문 전체 길이의 앞 80%만 남긴다. 문단 경계와 무관하게 글자 수로 자르므로
 * 마지막 문단은 문장 도중에 끊긴다.
 *
 * 화면에 그려진 뒤 높이를 재서 자르는 방법(onLayout)을 쓰지 않는다 —
 * react-native-web에서 onLayout이 발화하지 않아 웹에서는 잘리지 않았다.
 * 글자 수로 자르면 웹과 앱이 똑같이 동작하고, 그릴 때 이미 잘려 있어
 * 두 번 렌더할 일도 없다.
 */
function clipToRatio(paragraphs: string[], ratio: number): string[] {
  const total = paragraphs.reduce((sum, p) => sum + p.length, 0);
  const limit = Math.round(total * ratio);

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

export default function DescBlock({ paragraphs, variant = 'fade' }: Props) {
  const visible = clipToRatio(paragraphs, VISIBLE_RATIO);
  const isClipped = visible.join('').length < paragraphs.join('').length;

  if (variant === 'ellipsis') {
    // 잘린 마지막 문단 끝에 말줄임표를 붙여 "여기서 끊겼다"를 글자로 알린다.
    const shown = isClipped
      ? visible.map((p, i) => (i === visible.length - 1 ? `${p.trimEnd()}...` : p))
      : visible;

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
              // 목적지 미정 — 다음 작업
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

  return (
    <View style={blockStyles.block}>
      <View style={styles.clip}>
        <View style={styles.content}>
          {visible.map((paragraph, i) => (
            <Text key={i} style={blockStyles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>

        {isClipped && (
          // 'transparent'는 iOS에서 검게 번지는 일이 있어 배경색의 알파 0으로 시작한다.
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(250, 246, 238, 0)', Colors.bg]}
            style={styles.fade}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  content: {
    gap: 24,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },

  // ellipsis 전용 — 말줄임표 뒤에 바로 이어지는 안내
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
