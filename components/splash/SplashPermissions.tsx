import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import SplashQuestion from '@/components/splash/SplashQuestion';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

interface PermissionRow {
  key: string;
  label: string;
  /** 없으면 무슨 일이 생기는지 — 켜야 할 이유를 한 줄로. */
  hint: string;
}

/**
 * 물어볼 셋. 마이페이지의 권한 관리와 같은 항목이다(components/AlarmPermissionCard).
 * 순서도 같다 — 위쪽이 없으면 알람 자체가 성립하지 않고, 아래로 갈수록 덜 깨어난다.
 */
const ROWS: PermissionRow[] = [
  { key: 'notifications', label: '알림', hint: '알림기능을 위해 필요해요' },
  { key: 'exactAlarm', label: '정확한 알람', hint: '없으면 몇 분씩 밀릴 수 있습니다.' },
  { key: 'fullScreenIntent', label: '전체 화면 알림', hint: '잠금화면 위에 알람을 띄워야 해요.' },
];

/**
 * 질문 4 — 권한.
 *
 * 여기서 실제로 권한을 묻지는 않는다. 시스템 팝업이 뜨면 미리보기를 벗어나 버리고, 한 번
 * 거절하면 되돌리기도 번거롭다 — 이 화면은 스위치가 어떻게 보이는지만 확인하는 자리다.
 * 진짜로 묻는 곳은 마이페이지의 권한 관리다.
 *
 * 그래서 다음 버튼은 처음부터 눌린다. 권한은 고르는 것이 아니라 부탁하는 것이라, 안 켜도
 * 앞으로는 갈 수 있어야 한다.
 */
export default function SplashPermissions({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [granted, setGranted] = useState<string[]>(['notifications']);

  const toggle = (key: string) =>
    setGranted((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <SplashQuestion
      step={4}
      title="꼭 필요한 몇가지 권한을 승인해주세요"
      canGoNext
      onNext={onNext}
      onBack={onBack}
      padded={false}
      titleAlign="left">
      <View>
        {ROWS.map((row) => {
          const on = granted.includes(row.key);
          return (
            <Pressable
              key={row.key}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${row.label} 권한`}
              style={styles.row}
              onPress={() => toggle(row.key)}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowHint}>{row.hint}</Text>
              </View>
              {/* 홈·알람의 토글과 같은 모양 — 같은 뜻의 것은 같게 보여야 한다. */}
              <View style={[styles.toggle, on && styles.toggleOn]}>
                <View style={[styles.knob, on && styles.knobOn]} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </SplashQuestion>
  );
}

const styles = StyleSheet.create({
  /**
   * 줄 — 카드에 담지 않고 화면 폭을 다 쓰는 목록이다. 나누는 것은 아래 선 하나뿐이라
   * 셋이 하나의 목록으로 읽힌다.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space[16],
    paddingHorizontal: Space[28],
    paddingVertical: Space[20],
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  rowText: {
    flex: 1,
    gap: Space[4],
  },
  rowLabel: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  rowHint: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },

  toggle: {
    width: 44,
    height: 24,
    borderRadius: Corner.pill,
    padding: 3,
    backgroundColor: Surface.plate,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toggleOn: {
    backgroundColor: Spark.ember,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  knobOn: {
    transform: [{ translateX: 20 }],
  },
});
