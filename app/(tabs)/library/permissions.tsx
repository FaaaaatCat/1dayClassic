import { StyleSheet, Text } from 'react-native';

import AlarmPermissionCard from '@/components/AlarmPermissionCard';
import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { Ink, Space, Type, TypeScale } from '@/constants/theme';
import { isNativeAlarmAvailable } from '@/modules/alarm-clock';

/**
 * 권한 관리 — 설정 화면에 있던 권한 카드를 그대로 옮겼다.
 *
 * 네이티브 모듈이 없으면(Expo Go) 물어볼 대상이 없어 안내만 남긴다.
 */
export default function PermissionsScreen() {
  return (
    <MyPageShell title="권한 관리">
      {isNativeAlarmAvailable() ? (
        <AlarmPermissionCard />
      ) : (
        <Text style={styles.note}>이 기기에서는 알람 권한을 확인할 수 없습니다.</Text>
      )}
    </MyPageShell>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.muted,
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[40],
    textAlign: 'center',
  },
});
