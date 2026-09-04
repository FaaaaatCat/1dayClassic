import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createContext, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chevron from '@/components/Chevron';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 화면 맨 위 한 줄 — 이 앱의 모든 헤더가 이것 하나다.
 *
 *     ‹        제목        기능
 *
 * 자리가 셋으로 고정된다. 왼쪽은 언제나 돌아가는 길이고, 제목은 언제나 화면 정가운데,
 * 오른쪽은 그 화면에서 할 수 있는 일 하나다. 셋 중 없는 것이 있어도 자리는 남겨 둔다 —
 * 그래야 화면을 옮겨 다녀도 제목과 화살표가 같은 곳에 있다.
 *
 * 예전에는 화면마다 헤더를 따로 그렸고, 그래서 높이(56·60·가변)와 좌우 여백(8·12·20),
 * 제목의 크기와 정렬이 저마다 달랐다. 화면을 옮길 때마다 제목이 조금씩 움직였다.
 *
 * ── 세이프에어리어는 이 컴포넌트가 맡는다 ─────────────────────────────────
 * 상태바 높이를 여기서 대므로, 부르는 화면은 paddingTop: insets.top을 주지 않는다.
 * 둘 다 대면 제목만 그만큼 내려앉는다(실제로 목차에서 그랬다). 검은 헤더가 상태바 뒤까지
 * 이어져야 하는 것도 이 때문에 여기가 맡는 편이 맞다.
 */
export default function ScreenHeader({
  title,
  back,
  action,
  tone = 'light',
}: {
  title: string;
  /**
   * 돌아갈 곳. 경로를 주면 그리로 replace하고, 함수를 주면 그것을 부른다.
   * 없으면 화살표를 그리지 않는다(자리는 그대로 비워 둔다).
   *
   * router.back()이 기본이 아닌 건 이 앱의 화면들이 대개 Tabs의 형제라서다 — 형제로
   * 옮기는 것은 스택에 쌓이지 않아, back()은 그 앞에 남아 있던 것으로 튄다.
   */
  back?: string | (() => void);
  /** 오른쪽 자리 — HeaderIconButton이나 HeaderTextButton 하나. */
  action?: React.ReactNode;
  /** 바탕과 글자색. dark는 검은 띠가 본문으로 이어지는 화면(리포트)이 쓴다. */
  tone?: HeaderTone;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { background, ink } = TONE[tone];

  const goBack =
    typeof back === 'function' ? back : back ? () => router.replace(back as never) : undefined;

  return (
    <HeaderToneContext.Provider value={tone}>
      <View
        style={[
          styles.header,
          { backgroundColor: background, paddingTop: insets.top, height: HEADER_H + insets.top },
        ]}>
        {goBack ? (
          <ScaleButton accessibilityLabel="뒤로" style={styles.slot} onPress={goBack}>
            {/* Ionicons의 꺾쇠는 이 화면들의 다른 아이콘보다 1.5배 두껍다 — 직접 그린다
                (Chevron 주석 참고). */}
            <Chevron size={24} color={ink} />
          </ScaleButton>
        ) : (
          <View style={styles.slot} />
        )}

        {/*
          제목은 흐름에서 빼내 줄 전체에 겹쳐 둔다. 좌우에 놓이는 것의 폭이 화면마다
          달라도(화살표 하나 vs '미리보기' 한 덩이) 제목은 화면 정가운데여야 하기
          때문이다. 손가락은 밑의 두 버튼이 받도록 pointerEvents를 끈다.
        */}
        <View style={styles.titleSlot} pointerEvents="none">
          <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.actionSlot}>{action}</View>
      </View>
    </HeaderToneContext.Provider>
  );
}

/** 헤더 한 줄의 높이(상태바 제외). 헤더 아래에 무언가를 겹쳐 놓을 화면이 쓴다. */
export const HEADER_H = 60;

/** 바탕에 따라 글자와 아이콘 색이 갈린다. */
export type HeaderTone = 'light' | 'paper' | 'dark';

const TONE: Record<HeaderTone, { background: string; ink: string }> = {
  /** 보통 화면 — 종이색 바탕. */
  light: { background: Surface.canvas, ink: Ink.primary },
  /** 본문이 한 단 올라온 바탕인 화면(서점의 책 정보). */
  paper: { background: Surface.card, ink: Ink.primary },
  /** 검은 띠가 본문으로 이어지는 화면(서재의 리포트). */
  dark: { background: Ink.primary, ink: Ink.onDark },
};

/**
 * 오른쪽 자리에 놓이는 것이 제 색을 알아내는 통로.
 *
 * 부르는 쪽이 tone을 두 번 적지 않게 하려고 둔다 — 헤더가 이미 아는 것을 버튼에까지
 * 다시 넘기게 하면, 한쪽만 고쳐 놓고 색이 어긋나는 일이 생긴다.
 */
const HeaderToneContext = createContext<HeaderTone>('light');

/** 헤더 오른쪽의 아이콘 하나 — 검색·더보기처럼 그림 하나로 말이 되는 일. */
export function HeaderIconButton({
  name,
  label,
  onPress,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  /** 화면 낭독기가 읽을 이름. */
  label: string;
  onPress: () => void;
}) {
  const { ink } = TONE[useContext(HeaderToneContext)];
  return (
    <ScaleButton accessibilityLabel={label} style={styles.slot} onPress={onPress}>
      <Ionicons name={name} color={ink} size={22} />
    </ScaleButton>
  );
}

/** 헤더 오른쪽의 글자 하나 — 저장·미리보기처럼 그림으로 줄일 수 없는 일. */
export function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { ink } = TONE[useContext(HeaderToneContext)];
  return (
    <ScaleButton accessibilityLabel={label} style={styles.textAction} onPress={onPress}>
      <Text style={[styles.textActionLabel, { color: ink }]}>{label}</Text>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space[12],
  },
  /**
   * 좌우에 놓이는 것이 서는 자리 — 40px이다.
   *
   * 글리프는 24px이지만 손가락이 받을 자리는 40px이어야 한다. 좌우 여백 12에 안쪽
   * 여백 8이 더해져, 화살표 자체는 화면 가장자리에서 20 떨어진다 — 본문의 좌우 여백
   * (Space[20])과 같은 선이다.
   */
  slot: {
    minWidth: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Corner.pill,
  },
  /** 오른쪽 — 비어 있어도 자리는 남는다. 그래야 제목이 가운데에서 흔들리지 않는다. */
  actionSlot: {
    minWidth: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  titleSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HEADER_H,
    alignItems: "center",
    justifyContent: "center",
    // 제목이 길어도 좌우 버튼 밑으로 들어가지 않게 미리 물러서 둔다.
    paddingHorizontal: Space[56],
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodyLg,
    textAlign: "center",
  },
  textAction: {
    height: 40,
    paddingHorizontal: Space[8],
    borderRadius: Corner.pill,
  },
  textActionLabel: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
  },
});
