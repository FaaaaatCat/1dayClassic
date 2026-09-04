import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Confetti from '@/components/splash/Confetti';
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
 * 셋 다 켜진 채로 시작한다. 알람 앱에서 이 셋은 고르는 것이 아니라 다 있어야 하는 것이고,
 * 켜 두면 그냥 넘겨도 알람이 제대로 울리는 자리에 가 닿는다. 다음 버튼도 처음부터 눌린다.
 *
 * 여기서 실제로 권한을 묻지는 않는다. 시스템 팝업이 뜨면 미리보기를 벗어나 버리고, 한 번
 * 거절하면 되돌리기도 번거롭다 — 이 화면은 스위치가 어떻게 보이는지만 확인하는 자리다.
 * 진짜로 묻는 곳은 지금은 마이페이지의 권한 관리뿐이다(components/AlarmPermissionCard).
 *
 * 이 흐름을 앱에 실제로 붙일 때 할 일은 아래 TODO에 적어 두었다.
 */
export default function SplashPermissions({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  /**
   * 처음에는 셋 다 켜져 있다.
   *
   * TODO(실제 연결): 이 값은 화면이 정할 것이 아니라 기기에 물어서 받아야 한다.
   * modules/alarm-clock의 getPermissionStatus()로 지금 상태를 읽어 채우고, 줄을 누르면
   * requestAlarmPermission(kind)로 시스템 팝업을 띄운다. 권한 변경은 전부 앱 밖에서
   * 일어나므로 AppState가 'active'로 돌아올 때마다 다시 읽어야 한다 —
   * components/AlarmPermissionCard.tsx가 그 셋을 이미 다 하고 있으니 그대로 따르면 된다.
   * 켜진 채로 들어와서 끄는 방향은 앱이 할 수 없다(시스템 설정에서만 끈다).
   */
  const [granted, setGranted] = useState<string[]>(() => ROWS.map((row) => row.key));

  /**
   * 마지막 물음을 넘길 때 축하 포탄이 터진다.
   *
   * 여기가 준비의 끝이라 한 번 터뜨리고 홈으로 간다 — 다 끝났다는 말을 글이 아니라 눈으로
   * 한다. 포탄이 다 가라앉으면 스스로 다음으로 넘어간다.
   */
  const [celebrating, setCelebrating] = useState(false);

  const toggle = (key: string) =>
    setGranted((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <SplashQuestion
      step={4}
      title="꼭 필요한 몇가지 권한을 승인해주세요"
      canGoNext
      // 터지는 동안 또 눌러도 다시 터지지는 않는다. 버튼 색은 그대로 둔다 —
      // 축하하는 참에 버튼이 회색이 되면 뭔가 잘못된 것처럼 보인다.
      onNext={() => setCelebrating(true)}
      onBack={onBack}
      padded={false}
      titleAlign="left"
      overlay={celebrating ? <Confetti onDone={onNext} /> : null}>
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
