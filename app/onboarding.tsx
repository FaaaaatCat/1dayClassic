import { useRouter } from 'expo-router';

import SplashFlow, { type SplashAnswers } from '@/components/splash/SplashFlow';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { markOnboarded, markPermissionPrompted } from '@/lib/onboarding';
import { requestAlarmPermission } from '@/modules/alarm-clock';

/**
 * 알람이 울릴 요일.
 *
 * 온보딩은 요일을 묻지 않는다 — 물음이 "매일 알림을 드릴까요?"라서 답은 매일이다.
 * 평일만 받고 싶은 사람은 알람 편집 화면에서 바꾼다.
 */
const EVERY_DAY = [true, true, true, true, true, true, true];

/**
 * 첫 실행 — 앱을 깔고 처음 켰을 때 한 번 지나는 길.
 *
 * 묻는 일은 SplashFlow가 하고, 이 화면은 받아 낸 답을 제자리에 놓는 일만 한다.
 * 같은 흐름을 설정의 미리보기도 쓰는데(app/splash-preview.tsx) 그쪽은 아무것도 놓지 않는다 —
 * 저장을 화면이 아니라 이 자리에 둔 이유다.
 *
 * 로그인은 지나간다. MVP에는 결제도 서버도 없어 계정으로 지킬 것이 없고, 지킬 것이 생기기
 * 전에 만든 로그인은 화면만 있고 값은 없다. 만들어 둔 로그인 시트는 미리보기에서만 뜬다.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { selectBook } = useBookSelection();
  const { updateAlarm } = useAlarm();

  /**
   * 다 물어본 뒤.
   *
   * 순서가 있다. 권한을 먼저 묻고 그다음에 알람을 건다 — 알람을 거는 것은 결국 시스템에
   * 부탁하는 일이라, 부탁할 자격을 먼저 얻어 두는 편이 맞다. 거절해도 그냥 진행한다.
   * 권한은 값이 아니라 부탁이고, 없다고 앱을 못 쓰게 할 일은 아니다.
   */
  const handleFinish = async ({ bookId, alarm, permissions }: SplashAnswers) => {
    for (const kind of permissions) {
      try {
        await requestAlarmPermission(kind);
      } catch (error) {
        console.warn(`[onboarding] ${kind} 권한 요청 실패:`, error);
      }
    }

    selectBook(bookId);
    updateAlarm({ ...alarm, repeatDays: EVERY_DAY });
    // 여기서 권한을 이미 물었으니, 앱을 켤 때 뜨던 권한 안내는 다시 할 말이 없다.
    await Promise.all([markOnboarded(), markPermissionPrompted()]);

    // 홈에 닿으면 환영 창이 올라온다 — 그 신호를 파라미터 하나로 넘긴다.
    router.replace({ pathname: '/', params: { welcome: '1' } });
  };

  return (
    <SplashFlow
      onFinish={(answers) => {
        handleFinish(answers).catch((error) => {
          console.warn('[onboarding] 마무리 실패:', error);
        });
      }}
    />
  );
}
