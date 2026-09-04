import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chevron from '@/components/Chevron';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

/** 질문은 넷이다 — 위 진행 줄이 몇 번째인지 말한다. */
export const QUESTION_COUNT = 4;

/**
 * 머리띠 오른쪽에 비워 두는 폭 — 미리보기의 닫기 ✕(36)와 그 바깥 여백(16), 그리고 진행
 * 줄이 닿지 않을 만큼의 틈.
 */
const EXIT_SLOT = 60;

/** 상태바 아래로 머리띠가 갖는 높이. 공용 헤더(ScreenHeader)와 같은 값이다. */
const HEADER_H = 60;

/**
 * 본문의 좌우 여백. 안에 놓을 것의 폭을 직접 재야 하는 화면(줄에 몇 개씩 놓을지 정하는
 * 질문 1)이 같은 값을 쓰도록 내보낸다.
 */
export const BODY_GUTTER = Space[20];

/**
 * 질문 화면 넷이 함께 쓰는 껍데기.
 *
 * 위는 뒤로가기와 진행 줄, 가운데는 물음과 그 아래 고를 것들, 아래는 다음 버튼이다.
 * 넷이 같은 자리에 같은 크기로 서야 넘길 때 화면이 흔들리지 않는다.
 *
 * 다음 버튼은 고르기 전에는 회색(ash)이고 눌리지 않는다 — 시안 그대로다.
 */
export default function SplashQuestion({
  step,
  title,
  hint,
  canGoNext,
  onNext,
  onBack,
  children,
  /** 고를 것이 많아 넘칠 때만 스크롤한다. 적은 화면은 가운데에 모아 둔다. */
  scroll = true,
  /** 좌우 여백. 옆 것이 살짝 비쳐야 하는 가로 목록은 꺼서 화면 끝까지 쓴다. */
  padded = true,
  /** 물음을 놓는 자리. 고를 것이 줄로 늘어서는 화면은 왼쪽에 붙여 줄머리와 맞춘다. */
  titleAlign = 'center',
  overlay,
}: {
  /** 1부터 QUESTION_COUNT까지. */
  step: number;
  title: string;
  /**
   * 물음 아래 한 줄. 글월 안의 일부만 색을 달리하려면 <Text>를 섞어 넘긴다 —
   * 겉을 감싼 <Text>의 결을 물려받으므로 색만 덮어쓰면 된다.
   */
  hint?: React.ReactNode;
  canGoNext: boolean;
  onNext: () => void;
  onBack: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  titleAlign?: 'center' | 'left';
  /**
   * 화면 전체를 덮는 층 — 축하 포탄처럼 머리띠부터 버튼까지 가리지 않고 지나가야 하는 것.
   * children은 본문 안에 갇히므로 그런 것은 이쪽으로 넘긴다.
   */
  overlay?: React.ReactNode;
}) {
  const left = titleAlign === 'left';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/*
        상태바 높이는 머리띠가 직접 인다. height를 60으로 못 박고 paddingTop만 더하면
        상태바가 그 60 안을 파먹어 실제로 쓸 수 있는 띠가 20 남짓으로 줄고, 진행 줄이
        화면 꼭대기에 붙는다 — 공용 헤더(ScreenHeader)와 같은 셈법으로 맞춘다.
      */}
      <View style={[styles.header, { paddingTop: insets.top, height: HEADER_H + insets.top }]}>
        <ScaleButton accessibilityLabel="뒤로" style={styles.back} onPress={onBack}>
          <Chevron size={22} color={Ink.primary} />
        </ScaleButton>
        {/* 진행 줄 — 네 걸음 중 몇 번째인지. 차오른 만큼만 검다. */}
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={`${QUESTION_COUNT}단계 중 ${step}단계`}>
          <View style={[styles.trackFill, { flex: step }]} />
          <View style={{ flex: QUESTION_COUNT - step }} />
        </View>
      </View>

      <View style={[styles.titleBlock, left && styles.titleBlockLeft]}>
        <Text style={[styles.title, left && styles.titleLeft]}>{title}</Text>
        {hint ? <Text style={[styles.hint, left && styles.titleLeft]}>{hint}</Text> : null}
      </View>

      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, padded && styles.bodyPad]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, styles.bodyCentered, padded && styles.bodyPad]}>
          {children}
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: Space[8] + insets.bottom }]}>
        <ScaleButton
          accessibilityLabel="다음"
          disabled={!canGoNext}
          style={[styles.next, !canGoNext && styles.nextOff]}
          onPress={onNext}>
          <Text style={styles.nextText} numberOfLines={1}>
            다음
          </Text>
          <Ionicons name="chevron-forward" color={Ink.onDark} size={14} />
        </ScaleButton>
      </View>

      {overlay}
    </View>
  );
}

/**
 * 고르는 알약 하나 — 질문 1이 쓴다.
 *
 * 고르면 검게 채우고 글자를 밝힌다. 목차의 성적 칩과 같은 결이다 — 이 시스템에서 '골랐다'는
 * 색이 아니라 잉크로 말한다.
 */
export function SplashChip({
  label,
  selected,
  onPress,
  width,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 줄에 몇 개씩 놓을지 부르는 쪽이 정할 때 쓴다. 없으면 글자만큼만 넓어진다. */
  width?: number;
}) {
  return (
    <ScaleButton
      accessibilityLabel={`${label}${selected ? ', 선택됨' : ''}`}
      style={[styles.chip, width !== undefined && { width }, selected && styles.chipOn]}
      onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.card,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    paddingLeft: Space[28],
    // 오른쪽만 더 비운다 — 미리보기의 닫기 ✕가 이 자리에 떠 있어서, 여기까지 진행 줄을
    // 늘이면 그 아래로 깔린다. 미리보기를 걷어낼 때 Space[28]로 되돌리면 된다.
    paddingRight: EXIT_SLOT,
  },
  back: {
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
    marginLeft: -Space[8],
  },
  /** 진행 줄 — 네 칸을 flex로 나눠 걸음 수만큼 채운다. */
  track: {
    flex: 1,
    flexDirection: 'row',
    height: 4,
    borderRadius: 4,
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  trackFill: {
    backgroundColor: Ink.primary,
  },

  titleBlock: {
    alignItems: 'center',
    gap: Space[8],
    paddingHorizontal: Space[20],
    paddingVertical: Space[48],
  },
  titleBlockLeft: {
    alignItems: 'flex-start',
    paddingHorizontal: Space[28],
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.primary,
  },
  titleLeft: {
    textAlign: 'left',
  },
  hint: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.body,
  },

  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: Space[20],
  },
  bodyCentered: {
    justifyContent: 'center',
  },
  bodyPad: {
    paddingHorizontal: BODY_GUTTER,
  },

  footer: {
    padding: Space[8],
    backgroundColor: Surface.card,
  },
  next: {
    flexDirection: 'row',
    gap: 6,
    height: 48,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  /** 아직 못 고른 상태 — 눌리지 않는다는 게 색으로 보여야 한다. */
  nextOff: {
    backgroundColor: Ink.muted,
  },
  nextText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },

  chip: {
    height: 52,
    // 폭을 받아 쓸 때는 이 여백이 알약 크기가 아니라 글자가 쓸 수 있는 폭만 정한다.
    // 넉넉히 두면 좁은 기기에서 '문학·에세이'가 말줄임으로 잘리므로 적게 잡는다.
    paddingHorizontal: Space[12],
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  chipOn: {
    borderColor: Ink.primary,
    backgroundColor: Ink.primary,
  },
  chipText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.body,
  },
  chipTextOn: {
    color: Ink.onDark,
  },
});
