import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import SplashQuestion from '@/components/splash/SplashQuestion';
import Toggle from '@/components/Toggle';
import { Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import {
  getPermissionStatus,
  requestAlarmPermission,
  type AlarmPermissionKind,
  type AlarmPermissionStatus,
} from '@/modules/alarm-clock';

interface PermissionRow {
  kind: AlarmPermissionKind;
  label: string;
  hint: string;
}

const ROWS: PermissionRow[] = [
  { kind: 'notifications', label: '알림', hint: '알림기능을 위해 필요해요' },
  { kind: 'exactAlarm', label: '정확한 알람', hint: '없으면 몇 분씩 밀릴 수 있습니다.' },
  { kind: 'fullScreenIntent', label: '전체 화면 알림', hint: '잠금화면 위에 알람을 띄워야 해요.' },
];

const ALL_ON: AlarmPermissionStatus = { notifications: true, exactAlarm: true, fullScreenIntent: true };

/**
 * 질문 6 — 알람에 꼭 필요한 권한 셋.
 *
 * 토글은 기기의 실제 상태를 그대로 보여 준다. 예전에는 셋 다 켜진 채로 시작하는 '부탁 목록'
 * 이었고, '다음'을 누르면 셋을 한꺼번에 요청했다. 그러다 보니 두 가지가 어긋났다.
 *  - 화면은 켜져 있는데 실제로는 꺼진 권한이 있었다. 전체 화면 알림은 Android 14부터
 *    스토어의 알람 앱이 아니면 처음부터 꺼져 있다 — 토글이 켜져 보인 것은 부탁일 뿐이었다.
 *  - 정확한 알람·전체 화면 알림은 팝업이 없고 설정 화면을 여는 것이 전부라, 한꺼번에 열리면
 *    설정 화면이 겹쳐 뜨고 그 사이 앱은 홈으로 넘어가 버렸다. 정확한 알람은 이 앱이 알람
 *    앱으로 신고해 둬서(USE_EXACT_ALARM) 늘 켜져 있는데도 그 설정 화면이 열려, 끌 수도 없는
 *    토글만 보였다.
 *
 * 그래서 이제는 꺼진 줄을 누를 때 그 권한 하나만 묻는다. 설정 화면에 다녀오면(앱이 다시
 * 앞으로 오면) 상태를 다시 읽어 토글을 고친다. '다음'은 묻지 않고 넘어간다 — 빠진 권한은
 * 마이페이지 > 권한 관리에서 언제든 켤 수 있다.
 *
 * 미리보기(askPermissions=false)에서는 기기에 묻지 않고 토글만 켜고 끈다.
 */
export default function SplashPermissions({
  onNext,
  onBack,
  askPermissions = true,
}: {
  onNext: () => void;
  onBack: () => void;
  askPermissions?: boolean;
}) {
  const [status, setStatus] = useState<AlarmPermissionStatus | null>(
    askPermissions ? null : ALL_ON,
  );

  const refresh = useCallback(() => {
    getPermissionStatus()
      .then(setStatus)
      .catch((error) => console.warn('[splash] 권한 상태 확인 실패:', error));
  }, []);

  useEffect(() => {
    if (!askPermissions) return;
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [askPermissions, refresh]);

  const press = (kind: AlarmPermissionKind) => {
    if (!askPermissions) {
      setStatus((prev) => (prev ? { ...prev, [kind]: !prev[kind] } : prev));
      return;
    }
    // 이미 켜진 권한은 앱이 끌 수 없다(끄는 것은 기기 설정의 몫) — 꺼진 것만 묻는다.
    if (status?.[kind]) return;
    requestAlarmPermission(kind)
      .then(refresh)
      .catch((error) => console.warn(`[splash] ${kind} 권한 요청 실패:`, error));
  };

  return (
    <SplashQuestion
      step={6}
      title="꼭 필요한 몇가지 권한을 승인해주세요"
      canGoNext
      onNext={onNext}
      onBack={onBack}
      padded={false}
      titleAlign="left">
      <View>
        {ROWS.map((row) => {
          const on = status?.[row.kind] ?? false;
          return (
            <Pressable
              key={row.kind}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${row.label} 권한${on ? ', 허용됨' : ', 눌러서 허용하기'}`}
              style={styles.row}
              onPress={() => press(row.kind)}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowHint}>{row.hint}</Text>
              </View>
              {/* 앱의 다른 토글과 같은 것(components/Toggle) — 누름은 줄 전체가 받는다. */}
              <Toggle value={on} />
            </Pressable>
          );
        })}
      </View>
    </SplashQuestion>
  );
}

const styles = StyleSheet.create({
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

});
