import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { MY_PAGE } from '@/components/mypage/MyPageShell';
import { Corner, Feedback, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
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
];

/**
 * 알람 권한 상태 박스.
 *
 * 앱 시작 시의 권한 요청은 처음 한 번뿐이므로(app/_layout.tsx), 그 뒤에 권한을 확인하고
 * 켜는 곳은 여기가 유일하다 — 마이페이지의 권한 관리 화면이 이것을 띄운다.
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
      .catch((error) => console.warn('[permissions] 권한 상태 확인 실패:', error));
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
    <View>
      <Text style={styles.hint}>
        알람이 제때 울리려면 아래 네 가지가 모두 허용되어야 합니다. 줄을 누르면 시스템 설정이
        열립니다.
      </Text>

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
                  console.warn('[permissions] 권한 요청 실패:', error),
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
   * 좌우 여백은 마이페이지의 것을 그대로 쓴다.
   *
   * 예전에는 설정 화면의 카드 안에 들어가 그 카드의 여백을 얻어 썼는데, 마이페이지로
   * 옮기면서 카드가 없어져 줄들이 화면 끝에 붙어 버렸다. 이제 제 여백을 스스로 갖는다.
   */
  hint: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
    paddingHorizontal: MY_PAGE.gutter,
    paddingBottom: Space[16],
  },
  notice: {
    marginHorizontal: MY_PAGE.gutter,
    marginBottom: Space[8],
    borderRadius: Corner.small,
    padding: Space[12],
    backgroundColor: Feedback.wrongSurface,
  },
  noticeText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Feedback.wrong,
  },
  rows: {
    marginTop: Space[8],
  },
  /**
   * 항목 하나 — 상자가 아니라 목록의 한 줄이다.
   *
   * 넷을 각각 알약으로 감싸면 저마다 따로 누를 것처럼 보이고, 카드 안에 상자가 또
   * 들어앉아 겹이 하나 늘어난다. 모서리를 없애고 아랫선 하나로만 나눈다.
   */
  row: {
    alignItems: 'stretch',
    justifyContent: 'center',
    borderRadius: 0,
    minHeight: MY_PAGE.rowHeight,
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  /** 마지막 줄 — 목록이 끝나는 자리라 선을 긋지 않는다. */
  rowLast: {
    borderBottomWidth: 0,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
  },
  rowText: {
    flex: 1,
    gap: Space[4],
  },
  rowLabel: {
    fontFamily: Type.ui,
    ...TypeScale.body,
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
