import { Switch, View } from 'react-native';

import { Ink, Spark, Surface } from '@/constants/theme';

/**
 * 켜고 끄는 스위치 — 앱의 모든 토글이 이 하나를 쓴다(책 오픈 효과·알람·권한·설정).
 *
 * 켜면 주황(고른 줄의 주황 원과 같은 색), 끄면 판 위의 가는 선 색, 손잡이는 흰 종이색이다.
 * 처음엔 화면마다 뷰 두 개로 스위치를 따로 그려 색이 조금씩 달랐는데(끈 바탕이 Stone이거나
 * 손잡이가 검거나), 책 오픈 효과의 스위치로 하나로 맞췄다.
 *
 * onChange를 주지 않으면 보여 주기만 한다 — 줄 전체가 눌림을 받는 곳(권한 줄처럼)에서 스위치가
 * 손가락을 가로채지 않게 한다.
 */
export default function Toggle({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange?: (value: boolean) => void;
  accessibilityLabel?: string;
}) {
  const knob = (
    <Switch
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onChange}
      trackColor={{ true: Spark.ember, false: Ink.strong }}
      thumbColor={Surface.canvas}
      // react-native-web은 thumbColor 대신 activeThumbColor를 읽는다.
      {...({ activeThumbColor: Surface.canvas } as object)}
    />
  );
  if (onChange) return knob;
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
      {knob}
    </View>
  );
}
