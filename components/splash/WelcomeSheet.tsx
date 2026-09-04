import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import Confetti from '@/components/splash/Confetti';
import { Corner, Ink, Space, Spark, Type, TypeScale } from '@/constants/theme';

/** 창이 차지하는 화면 높이의 몫. 위로는 뒤 화면이 보일 만큼 남긴다. */
const SHEET_RATIO = 0.57;
/** 창이 올라오는 데 걸리는 시간. */
const RISE_MS = 420;
/**
 * 검정 위에 얹는 흰빛의 세기.
 *
 * 감상노트 창과 같은 값이다(components/lesson/NoteSheet). 뒤가 검은 화면이라 창도 검게
 * 두되, 완전히 같은 검정이면 어디까지가 창인지 보이지 않아 흰빛을 10%만 얹어 띄운다.
 */
const TINT = 0.1;
/** 무료로 열어 두는 화 수. */
const FREE_LESSONS = 10;

/**
 * 다 마치고 홈에 닿았을 때 올라오는 환영 창.
 *
 * 첫 실행의 마지막 장면이다. 뒤에 홈이 그대로 있고 그 위로 창만 올라온다 — 화면을 갈아
 * 끼우지 않는 것은, 여기가 새 화면이 아니라 '홈에 도착했다'는 말이기 때문이다.
 *
 * 창이 다 올라온 뒤에 축하 포탄이 터진다. 올라오는 중에 터뜨리면 창이 조각을 쓸고
 * 지나가서, 축하하는 그림이 아니라 어수선한 그림이 된다.
 *
 * 읽기 화면이 검으므로 이 창도 검다 — 감상노트 창과 같은 결이다.
 */
export default function WelcomeSheet({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [celebrating, setCelebrating] = useState(false);

  // 창이 다 올라온 뒤에 터뜨린다.
  useEffect(() => {
    const timer = setTimeout(() => setCelebrating(true), RISE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.layer}>
      {/* 창이 올라오는 동안 뒤가 가라앉는다. */}
      <Animated.View entering={FadeIn.duration(RISE_MS)} style={styles.dim} pointerEvents="none" />

      <Animated.View
        entering={SlideInDown.duration(RISE_MS)}
        style={[styles.sheet, { paddingBottom: Space[8] + insets.bottom }]}>
        {/* 검정 위에 깔리는 흰빛 — 창이 바탕에서 한 겹 떠 보이게 한다. */}
        <View style={styles.tint} pointerEvents="none" />

        {/* 창을 쥐는 자리. 실제로 끌지는 않지만, 이것이 있어야 아래에서 올라온 창으로 읽힌다. */}
        <View style={styles.grip} />

        <View style={styles.body}>
          {/* 창이 다 올라온 뒤에 안엣것이 차례로 올라온다 — 선물을 여는 차례다. */}
          <Animated.Text entering={FadeInDown.delay(RISE_MS).duration(320)} style={styles.eyebrow}>
            준비가 끝났어요
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(RISE_MS + 90).duration(320)}
            style={styles.badge}>
            <Text style={styles.badgeCount}>{FREE_LESSONS}</Text>
            <Text style={styles.badgeUnit}>화</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(RISE_MS + 180).duration(320)}>
            <Text style={styles.line}>회원님께는</Text>
            <Text style={styles.line}>
              <Text style={styles.lineMark}>{FREE_LESSONS}화 무료보기</Text>를 제공합니다
            </Text>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(RISE_MS + 270).duration(320)}
            style={styles.note}>
            내일 아침, 알람이 첫 화를 열어 드릴게요.
          </Animated.Text>
        </View>

        <ScaleButton accessibilityLabel="지금 바로 확인하기" style={styles.cta} onPress={onDone}>
          <Text style={styles.ctaText} numberOfLines={1}>
            지금 바로 확인하기
          </Text>
        </ScaleButton>
      </Animated.View>

      {celebrating ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** 뒤 화면 위에 통째로 얹히는 층. */
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  /** 아래에서 올라오는 창 — 위 두 귀만 둥글다. 아래는 화면 끝에 닿아 둥글릴 것이 없다. */
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: `${SHEET_RATIO * 100}%`,
    paddingHorizontal: Space[8],
    borderTopLeftRadius: Corner.card,
    borderTopRightRadius: Corner.card,
    backgroundColor: Ink.primary,
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Ink.onDark,
    opacity: TINT,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: Space[12],
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[16],
    paddingHorizontal: Space[20],
  },
  eyebrow: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Spark.ember,
  },
  /**
   * 선물 배지 — 숫자를 크게 두고 단위를 그 옆에 낮게 붙인다.
   *
   * 이 창에서 눈이 가장 먼저 닿아야 하는 것이 '몇 화'라서, 글월보다 위에 크게 둔다.
   */
  badge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    width: 96,
    height: 96,
    justifyContent: 'center',
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  badgeCount: {
    fontFamily: Type.displayLight,
    fontSize: 44,
    lineHeight: 52,
    color: Ink.onDark,
  },
  badgeUnit: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    lineHeight: 34,
    color: Ink.onDark,
  },

  line: {
    fontFamily: Type.uiMedium,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.onDark,
  },
  /** 글월 안에서 이 대목만 주황으로 — 무엇을 받았는지 한눈에 걸리게 한다. */
  lineMark: {
    color: Spark.ember,
  },
  note: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.muted,
  },

  cta: {
    height: 48,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  ctaText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.onDark,
  },
});
