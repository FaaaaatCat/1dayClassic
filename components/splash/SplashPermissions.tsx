import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import SplashQuestion from '@/components/splash/SplashQuestion';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import type { AlarmPermissionKind } from '@/modules/alarm-clock';

interface PermissionRow {
  kind: AlarmPermissionKind;
  label: string;
  /** 없으면 무슨 일이 생기는지 — 켜야 할 이유를 한 줄로. */
  hint: string;
}

/**
 * 물어볼 셋. 마이페이지의 권한 관리와 같은 항목이다(components/AlarmPermissionCard).
 * 순서도 같다 — 위쪽이 없으면 알람 자체가 성립하지 않고, 아래로 갈수록 덜 깨어난다.
 */
const ROWS: PermissionRow[] = [
  { kind: 'notifications', label: '알림', hint: '알림기능을 위해 필요해요' },
  { kind: 'exactAlarm', label: '정확한 알람', hint: '없으면 몇 분씩 밀릴 수 있습니다.' },
  { kind: 'fullScreenIntent', label: '전체 화면 알림', hint: '잠금화면 위에 알람을 띄워야 해요.' },
];

/**
 * 질문 4 — 권한.
 *
 * 셋 다 켜진 채로 시작한다. 알람 앱에서 이 셋은 고르는 것이 아니라 다 있어야 하는 것이고,
 * 켜 두면 그냥 넘겨도 알람이 제대로 울리는 자리에 가 닿는다. 다음 버튼도 처음부터 눌린다.
 *
 * 이 화면은 시스템 팝업을 직접 띄우지 않는다. 켜 달라고 한 것들을 다음 버튼과 함께
 * 위로 올려 줄 뿐이고, 실제로 묻는 일은 부르는 쪽이 맡는다 — 그래야 진짜 온보딩은 묻고
 * 미리보기는 묻지 않을 수 있다(app/onboarding.tsx와 app/splash-preview.tsx).
 */
export default function SplashPermissions({
  onNext,
  onBack,
}: {
  /** 켜 달라고 한 권한들을 함께 올린다. 부르는 쪽이 이것으로 시스템에 묻는다. */
  onNext: (kinds: AlarmPermissionKind[]) => void;
  onBack: () => void;
}) {
  /**
   * 처음에는 셋 다 켜져 있다.
   *
   * 여기 담긴 것은 기기의 실제 권한 상태가 아니라 '켜 달라고 한 것'이다. 첫 실행에는
   * 아직 아무 권한도 없고, 묻는 일은 다음 버튼을 누른 뒤에 한꺼번에 일어난다.
   */
  const [granted, setGranted] = useState<AlarmPermissionKind[]>(() => ROWS.map((row) => row.kind));

  const toggle = (kind: AlarmPermissionKind) =>
    setGranted((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));

  return (
    <SplashQuestion
      step={4}
      title="꼭 필요한 몇가지 권한을 승인해주세요"
      canGoNext
      onNext={() => onNext(granted)}
      onBack={onBack}
      padded={false}
      titleAlign="left">
      <View>
        {ROWS.map((row) => {
          const on = granted.includes(row.kind);
          return (
            <Pressable
              key={row.kind}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${row.label} 권한`}
              style={styles.row}
              onPress={() => toggle(row.kind)}>
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
