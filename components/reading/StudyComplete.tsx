import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import ScaleButton from '@/components/ScaleButton';
import { STREAK_DAYS } from '@/components/StudyReport';
import { Corner, Ink, Spark, Surface, Type, trackBody } from '@/constants/theme';
import type { CatalogBook } from '@/lib/catalog';

/** 연속 독서일이 0에서 올라가는 시간 — 끝에서 느려져 멎는다(StudyReport와 같은 맛). */
const COUNT_MS = 1100;
/** 숫자가 멎은 뒤 나머지가 하나씩 떠오르는 간격과 한 줄이 뜨는 시간. */
const STEP_MS = 160;
const SHOW_MS = 420;
/** 숫자 다음에 차례로 뜨는 것의 수 — 제목, '연속 독서중', 다음 책 카드, 아래 버튼. */
const STEPS = 4;
/** 마지막 것까지 다 뜨는 데 걸리는 시간. */
const REVEAL_TOTAL_MS = STEP_MS * (STEPS - 1) + SHOW_MS;

/**
 * 오늘의 독서 완료 — 퀴즈를 다 풀면 뜨는 검은 화면(피그마 '공부 리포트').
 *
 * 순서가 이 화면의 전부다. 처음엔 연속 독서일만 있고, 그 수가 0에서 올라가 멎은 다음에야
 * 제목·다음 책 카드·버튼이 위에서부터 차례로 떠오른다. 예전 리포트(StudyReport)와 같은 흐름이고,
 * 연속 일수도 그쪽의 자리 값(STREAK_DAYS)을 같이 쓴다 — 기록이 쌓이기 시작하면 함께 바꾼다.
 *
 * 다음 책 카드는 서점의 다른 책 하나를 보여 준다(부르는 쪽이 고른다). 카드의 소개는 그 책의
 * '책 소개' 첫 문단이다 — 책에 없는 문구를 지어 넣지 않는다.
 */
export default function StudyComplete({
  recommend,
  onPreviewBook,
  onHome,
  onNextLesson,
}: {
  /** 다음에 만나 볼 책. 없으면 카드를 그리지 않는다. */
  recommend?: CatalogBook;
  onPreviewBook: () => void;
  onHome: () => void;
  onNextLesson: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / COUNT_MS, 1);
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * STREAK_DAYS));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      // 숫자가 멎고 나서야 나머지가 차례로.
      reveal.set(withTiming(1, { duration: REVEAL_TOTAL_MS, easing: Easing.linear }));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reveal]);

  const titleStyle = useStep(reveal, 0);
  const labelStyle = useStep(reveal, 1);
  const cardStyle = useStep(reveal, 2);
  const buttonsStyle = useStep(reveal, 3);

  const intro = recommend?.sections.find((section) => section.title === '책 소개')?.paragraphs[0];

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        <Animated.Text style={[styles.title, titleStyle]}>오늘의 독서 완료!</Animated.Text>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBig}>
            {count}
            <Text style={styles.scoreUnit}>일</Text>
          </Text>
          <Animated.Text style={[styles.scoreLabel, labelStyle]}>연속 독서중</Animated.Text>
        </View>
      </View>

      {recommend ? (
        <Animated.View style={[styles.card, cardStyle]}>
          {/* 카드 뒤의 주황 빛 두 덩이 — 시안은 주황 원 둘 위에 배경 흐림(50)을 건 판이다.
              흐림을 걸 수단이 없어(새 라이브러리 없이) 원을 흐린 모양 그대로, 가운데가 짙고
              바깥으로 사라지는 빛으로 그린다. */}
          <View style={[styles.glow, styles.glowRight]} pointerEvents="none" />
          <View style={[styles.glow, styles.glowLeft]} pointerEvents="none" />
          <View style={styles.cardPane}>
            <Text style={styles.cardHeading}>다음에는 어떤 책을 만나볼까요?</Text>
            <View style={styles.cardRow}>
              <BookCoverArt
                bookId={recommend.bookId}
                coverImage={recommend.coverImage}
                coverDesign={recommend.coverDesign}
                width={80}
                radius={4}
                style={styles.cardCover}
              />
              <View style={styles.cardTexts}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{`『${recommend.title}』`}</Text>
                  {intro ? (
                    <Text style={styles.cardIntro} numberOfLines={2}>
                      {intro}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={styles.cardLink}
                  onPress={onPreviewBook}
                  accessibilityRole="button"
                  suppressHighlighting>
                  책 미리보기 →
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.buttons, buttonsStyle]}>
        <ScaleButton accessibilityLabel="완료하고 홈으로" style={styles.homeButton} onPress={onHome}>
          <Text style={styles.homeText}>완료하고 홈으로</Text>
        </ScaleButton>
        <Text
          style={styles.nextLink}
          onPress={onNextLesson}
          accessibilityRole="button"
          suppressHighlighting>
          다음 화 읽기
        </Text>
      </Animated.View>
    </View>
  );
}

/** 흐림 50을 건 반지름 r의 주황 원 — 상자(반지름 r+50) 가운데에서 바깥으로 사라진다. */
function glowGradient(r: number) {
  const edge = Math.round((r / (r + 50)) * 100);
  const core = Math.round(((r - 50) / (r + 50)) * 100);
  return `radial-gradient(circle closest-side, ${Spark.ember} ${core}%, rgba(255,71,4,0.5) ${edge}%, rgba(255,71,4,0) 100%)`;
}

/** order번째 것이 제 차례(order × STEP_MS)부터 SHOW_MS 동안 떠오른다 — 살짝 아래에서. */
function useStep(reveal: SharedValue<number>, order: number) {
  return useAnimatedStyle(() => {
    const elapsed = reveal.value * REVEAL_TOTAL_MS;
    const start = order * STEP_MS;
    const t = interpolate(elapsed, [start, start + SHOW_MS], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: (1 - t) * 12 }] };
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 32,
    paddingHorizontal: 20,
    backgroundColor: Ink.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 40,
  },
  /** 시안은 행간 24지만 안드로이드는 글자보다 작은 행간에서 획이 잘려 32로 둔다. */
  title: {
    fontFamily: Type.readingBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: Ink.onDark,
  },
  scoreBlock: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  /** 큰 숫자에는 흰 빛을 흘려 둔다 — 검은 바탕에서 이것만 떠 보여야 한다. */
  scoreBig: {
    fontFamily: Type.uiMedium,
    fontSize: 96,
    lineHeight: 112,
    color: Ink.onDark,
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  scoreUnit: {
    fontFamily: Type.uiMedium,
    fontSize: 36,
    color: Ink.onDark,
  },
  scoreLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    lineHeight: 25,
    color: Ink.onDark,
  },
  /** 다음 책 카드 — 높이 198, 넘치는 빛은 모서리에서 잘린다. */
  card: {
    height: 198,
    borderRadius: 20,
    overflow: 'hidden',
  },
  /**
   * 흐린 주황 원. 원래 원(지름 d)에 흐림 50을 건 모양이라, 상자를 사방 50씩 키우고 원의
   * 가장자리(상자 반지름의 r/(r+50) 자리)에서 반쯤 사라지게 칠한다.
   */
  glow: {
    position: 'absolute',
  },
  /** 오른쪽 아래 — 시안의 지름 214 원(오른쪽 변에서 47 밖, 위에서 82). */
  glowRight: {
    width: 314,
    height: 314,
    right: -97,
    top: 32,
    experimental_backgroundImage: glowGradient(107),
  },
  /** 왼쪽 위 — 시안의 지름 157 원(왼쪽 변에서 10 밖, 위에서 48.5 밖). */
  glowLeft: {
    width: 257,
    height: 257,
    left: -60,
    top: -98.5,
    experimental_backgroundImage: glowGradient(78.5),
  },
  /** 빛 위에 덮는 판 — graphite 80%. 시안의 흰 테두리는 빼기로 했다. */
  cardPane: {
    flex: 1,
    gap: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(68,64,59,0.8)',
  },
  /** 표지에 지는 그림자(시안의 Elevation 1). */
  cardCover: {
    boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)',
  },
  cardHeading: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 26,
    color: Ink.onDark,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardTexts: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTop: {
    gap: 2,
  },
  cardTitle: {
    fontFamily: Type.readingBold,
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: Ink.onDark,
  },
  cardIntro: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    lineHeight: 22,
    color: Surface.plate,
  },
  cardLink: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    lineHeight: 25,
    color: Spark.ember,
  },
  buttons: {
    alignItems: 'center',
    gap: 16,
  },
  homeButton: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Corner.pill,
    backgroundColor: Ink.onDark,
  },
  homeText: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  nextLink: {
    paddingVertical: 8,
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.muted,
  },
});
