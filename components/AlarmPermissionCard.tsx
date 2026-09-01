import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Feedback, Ink, Surface, Type, trackBody } from '@/constants/theme';
import {
  getPermissionStatus,
  hasAllAlarmPermissions,
  requestAlarmPermission,
  type AlarmPermissionKind,
  type AlarmPermissionStatus,
} from '@/modules/alarm-clock';

interface PermissionRow {
  kind: AlarmPermissionKind;
  label: string;
  /** 없으면 무슨 일이 생기는지 — 사용자가 켜야 할 이유를 알 수 있어야 한다. */
  hint: string;
}

/**
 * 순서는 알람이 망가지는 정도를 따른다 — 위쪽이 없으면 알람 자체가 성립하지 않고,
 * 아래로 갈수록 "덜 깨어난다" 쪽이다.
 */
const ROWS: PermissionRow[] = [
  {
    kind: 'notifications',
    label: '알림',
    hint: '알람이 울리는 동안 앱이 살아 있으려면 필요합니다.',
  },
  {
    kind: 'exactAlarm',
    label: '정확한 알람',
    hint: '없으면 정한 시각에서 몇 분씩 밀릴 수 있습니다.',
  },
  {
    kind: 'fullScreenIntent',
    label: '전체 화면 알림',
    hint: '잠금화면 위에 알람 화면을 띄우는 데 필요합니다.',
  },
  {
    kind: 'overlay',
    label: '다른 앱 위에 표시',
    hint: '휴대폰을 쓰는 중에도 알람 화면으로 깨우는 데 필요합니다.',
  },
];

/**
 * 알람 권한 상태 박스.
 *
 * 앱 시작 시의 권한 요청은 처음 한 번뿐이므로(app/_layout.tsx), 그 뒤에 권한을 확인하고
 * 켜는 곳은 여기가 유일하다.
 *
 * 토글은 켜는 방향으로만 동작한다 — 앱이 권한을 회수할 수는 없어서, 이미 켜진 항목을
 * 누르면 시스템 설정 화면이 열려 사용자가 직접 끄게 된다.
 *
 * 권한 변경은 전부 앱 밖(시스템 팝업·설정 화면)에서 일어나므로 결과를 즉시 알 수 없다.
 * 그래서 앱이 다시 포그라운드로 돌아올 때마다 상태를 다시 읽는다.
 */
export default function AlarmPermissionCard() {
  const [status, setStatus] = useState<AlarmPermissionStatus | null>(null);

  const refresh = useCallback(() => {
    getPermissionStatus()
      .then(setStatus)
      .catch((error) => console.warn('[settings] 권한 상태 확인 실패:', error));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (!status) return null;

  const allGranted = hasAllAlarmPermissions(status);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>알람 권한</Text>

      {!allGranted && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            알람이 잘 울릴 수 있도록 모든 권한을 필수로 허용해주세요
          </Text>
        </View>
      )}

      <View style={styles.rows}>
        {ROWS.map((row, index) => {
          const granted = status[row.kind];
          const last = index === ROWS.length - 1;
          return (
            <ScaleButton
              key={row.kind}
              accessibilityLabel={`${row.label} 권한 ${granted ? '허용됨' : '허용하기'}`}
              style={[styles.row, last && styles.rowLast]}
              onPress={() => {
                requestAlarmPermission(row.kind).catch((error) =>
                  console.warn('[settings] 권한 요청 실패:', error),
                );
              }}
            >
              <View style={styles.rowInner}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowHint}>{row.hint}</Text>
                </View>
                {/* 홈의 알람 토글과 같은 모양 — 같은 뜻의 컨트롤은 같게 보여야 한다. */}
                <View style={[styles.toggle, granted && styles.toggleOn]}>
                  <View style={[styles.knob, granted && styles.knobOn]} />
                </View>
              </View>
            </ScaleButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 카드 얼굴(바탕·모서리·선·여백)은 설정 화면이 씌운다. 여기서는 안쪽만 그린다 —
   * 같은 카드가 두 군데에서 정의되면 한쪽만 고쳐져 서로 어긋난다.
   */
  card: {},
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  notice: {
    marginTop: 12,
    borderRadius: Corner.small,
    padding: 12,
    backgroundColor: Feedback.wrongSurface,
  },
  noticeText: {
    fontFamily: Type.uiMedium,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: trackBody(13),
    color: Feedback.wrong,
  },
  rows: {
    marginTop: 16,
  },
  /**
   * 항목 하나 — 상자가 아니라 목록의 한 줄이다.
   *
   * 넷을 각각 알약으로 감싸면 저마다 따로 누를 것처럼 보이고, 카드 안에 상자가 또
   * 들어앉아 겹이 하나 늘어난다. 모서리를 없애고 아랫선 하나로만 나눈다.
   */
  row: {
    alignItems: 'stretch',
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
    paddingVertical: 16,
  },
  /** 마지막 줄 — 카드의 아래 선과 겹치지 않게 제 선을 지운다. */
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 15,
    letterSpacing: trackBody(15),
    color: Ink.primary,
  },
  rowHint: {
    fontFamily: Type.ui,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: trackBody(12),
    color: Ink.body,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: Corner.pill,
    padding: 3,
    backgroundColor: Surface.plate,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Ink.strong,
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
