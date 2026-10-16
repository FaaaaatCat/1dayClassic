import Stack from 'expo-router/js-stack';

import { StatusBarTint } from '@/components/StatusBarTint';
import { Ink } from '@/constants/theme';
import { SLIDE_EASING, SLIDE_MS } from '@/lib/slideTransition';

/**
 * 마이페이지 묶음 — 마이페이지와 그 안의 화면들(읽을 예정인 책·완독한 책·설정들·서재 책 상세·
 * 틀린 문제·책갈피·노트·계정)을 담는 스택.
 *
 * 처음엔 이 화면들이 모두 홈과 같은 탭(Tabs)의 형제였다. 탭에는 '앞으로·뒤로'가 없어서 들어오는
 * 방향을 등록 순서로 흉내 냈는데, 탭은 포커스 왼쪽의 화면을 떼어 내지 않고 붙여 둬서 예전에 열었던
 * 2depth 화면이 다른 2depth 화면으로 넘어가는 순간 제자리에 나타나 지금 화면을 덮었다. 상세에서
 * 책갈피로 갈 때는 등록 순서가 거꾸로라 상세가 오른쪽으로 밀려 나갔다.
 *
 * 스택은 쌓는 것이 곧 앞으로이고 걷는 것이 곧 뒤로다 — 새 화면은 언제나 지금 화면 위를 오른쪽에서
 * 덮으며 들어오고, 뒤로 가면 맨 위 한 장만 걷힌다. 그 밑의 다른 화면이 끼어들 일이 없다.
 *
 * ── 왜 JS 스택인가 ──
 *
 * 처음엔 네이티브 스택(expo-router의 Stack)의 slide_from_right를 썼는데, 안드로이드에서 그 전환은
 * 새 화면이 들어오는 동안 지금 화면도 왼쪽으로 밀어낸다(react-native-screens의 rns_slide_out_to_left)
 * — 덮는 것이 아니라 미는 것이었다. 네이티브 스택은 떠나는 화면을 가만히 두는 전환이 없어서, 전환을
 * 자바스크립트로 그리는 스택(expo-router/js-stack, expo-router에 들어 있다)으로 바꿨다. 이제 홈 위의
 * 화면들·서점 안의 페이지들과 같은 전환(lib/slideTransition)을 쓴다.
 *
 * 홈에서 이 묶음으로 들어오는 것은 여전히 탭이 맡는다(app/(tabs)/_layout의 library). 묶음을
 * 떠나면 맨 아래(마이페이지)까지 걷어 두어(popToTopOnBlur), 다시 들어오면 마이페이지부터 보인다.
 */
/**
 * 묶음 밖에서 곧장 깊은 화면으로 들어와도(홈의 리포트 버튼 → 서재 책 상세) 그 밑에 마이페이지를
 * 깔아 둔다. 없으면 상세 한 장뿐인 스택이 되어, 묶음을 떠날 때 그 상세까지만 걷히고 다음에 사람
 * 버튼을 누르면 마이페이지가 아니라 지난 상세가 먼저 보인다.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function LibraryLayout() {
  return (
    <>
      {/*
        상태바는 묶음이 한 번만 검게 칠한다. 처음엔 화면마다 제 상태바를 칠했는데, 뒤로 갈 때
        걷히는 화면이 먼저 기본(흰색)으로 되돌리고 그다음에야 밑의 화면이 다시 검게 칠해서,
        그 사이 상태바 자리에 흰 띠가 번쩍였다. 묶음이 칠하면 안에서 오가는 동안엔 손댈 일이 없고,
        묶음을 떠날 때 한 번만 되돌린다. 묶음 안의 화면은 모두 다크다.
      */}
      <StatusBarTint />
      <Stack
        screenOptions={{
          headerShown: false,
          transitionSpec: { open: SLIDE, close: SLIDE },
          // 새 화면만 제 폭만큼 오른쪽에서 들어온다. 덮이는 화면은 움직이지 않는다(next를 쓰지 않는다).
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
          // 홈 위의 전환처럼 그림자도, 덮이는 화면을 어둡게 하는 막도 없다.
          cardShadowEnabled: false,
          cardOverlayEnabled: false,
          // 덮인 화면을 떼어 내지 않는다. 떼어 두면 뒤로 갈 때 그 화면을 다시 붙이는 한 프레임 동안
          // 밑의 탭 바닥(흰색)이 비쳐, 걷히는 화면 왼쪽에 흰 띠가 번쩍였다. 묶음의 화면은 몇 장
          // 되지 않아 붙여 둬도 부담이 없다.
          detachPreviousScreen: false,
          // 화면 바탕 — 이 묶음은 모두 다크라 밝은 바탕이 번쩍이지 않게.
          cardStyle: { backgroundColor: Ink.primary },
        }}
      />
    </>
  );
}

const SLIDE = { animation: 'timing', config: { duration: SLIDE_MS, easing: SLIDE_EASING } } as const;
