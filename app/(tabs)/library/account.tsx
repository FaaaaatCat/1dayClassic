import { StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Feedback, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 계정 관리 — 로그아웃과 회원탈퇴.
 *
 * 아직 계정이라는 것이 없어서 두 버튼 모두 아무 일도 하지 않는다. 화면을 먼저 세워 두는 건
 * 로그인을 붙일 때 이 자리가 어디인지 정해 두기 위해서다.
 *
 * 회원탈퇴를 아래에, 그것도 붉게 두는 건 되돌릴 수 없는 행동이라서다 — 로그아웃과 나란히
 * 같은 얼굴로 두면 잘못 누른다.
 */
export default function AccountScreen() {
  return (
    <MyPageShell title="계정 관리">
      <Text style={styles.note}>아직 로그인 기능이 없어 두 버튼은 동작하지 않습니다.</Text>

      <View style={styles.buttons}>
        <ScaleButton accessibilityLabel="로그아웃" style={styles.logout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </ScaleButton>

        <ScaleButton accessibilityLabel="회원탈퇴" style={styles.leave}>
          <Text style={styles.leaveText}>회원탈퇴</Text>
        </ScaleButton>
      </View>
    </MyPageShell>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
    paddingHorizontal: MY_PAGE.gutter,
    paddingBottom: Space[24],
  },
  buttons: {
    gap: Space[12],
    paddingHorizontal: MY_PAGE.gutter,
  },
  /** 로그아웃 — 되돌릴 수 있는 행동이라 외곽선만. */
  logout: {
    height: 52,
    borderRadius: Corner.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  logoutText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.primary,
  },
  /** 회원탈퇴 — 되돌릴 수 없어 색으로 경고한다(퀴즈 오답과 같은 붉은색을 나눠 쓴다). */
  leave: {
    height: 52,
    borderRadius: Corner.pill,
  },
  leaveText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Feedback.wrong,
  },
});
