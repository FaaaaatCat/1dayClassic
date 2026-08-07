# 잠금화면 위 알람 컨텐츠 플로우 — 검증 결과

측정일: 2026-08-07
기기: Samsung SM-S942N, Android 16 (SDK 36), 보안 잠금(지문+PIN) 설정됨
빌드: dev build (`gradlew installDebug`), Metro 연결 상태

판정 지표는 `adb shell dumpsys window`의 `mKeyguardOccluded`다.
`true`면 잠금화면이 가려진 상태(컨텐츠가 보임), `false`면 잠금화면이 앞이다.

## 결과

| # | 시나리오 | 기대 | 실측 | 판정 |
|---|---|---|---|---|
| 1 | 잠금 중 `공부하기` | `Occluded=true` | `true`, top=`MainActivity` t967 | ✅ |
| 2 | 위 상태에서 뒤로가기 3회 | `true` 유지 | 3회 모두 `true`, top 불변 | ✅ |
| 3 | 위 상태에서 홈 버튼 | `false` | `false` | ✅ |
| 4 | 잠긴 채 런처에서 앱 실행 | `false` | `false`, 플로우 미진입 | ✅ |
| 5 | 잠금 해제 시 제약 해제 | 제약 해제 | 리시버 등록만 확인 | ⚠️ 아래 참고 |
| 6 | 잠금 없을 때 알람 끄기 | 제약 없음 | 닫기(X) 보임, 뒤로가기 정상 | ✅ |
| 7 | 반복 알람 2회차 | 1회차와 동일 | `true`, `onNewIntent` 경로 확인 | ✅ |

시나리오 1·2·3은 **실제 알람**으로, 4·6·7은 adb로 잠금 플로우를 직접 재현해
측정했다(`am start ... --ez alarm_lock_flow true`). 1·2·3도 adb 재현으로 먼저
통과한 뒤 실제 알람으로 재확인했다.

## 시나리오 5에 대하여

`ACTION_USER_PRESENT` 리시버는 **손으로 발생시킬 수 없다.** 플로우 중에는 이 앱이
잠금화면을 가리고 있어서, 화면을 껐다 켜도 잠금화면과 지문 프롬프트가 보이지 않는다
(실측 확인 — 화면을 켜면 앱이 바로 다시 올라온다). 잠금을 풀려면 먼저 홈으로 나가야
하고, 그러면 `onUserLeaveHint`가 이미 플로우를 끝낸 뒤다.

확인한 것: 플로우 활성 중 `dumpsys activity broadcasts`에
`com.onedayalarm.app ... Action: "android.intent.action.USER_PRESENT"`가 등록된다.

지우면 안 되는 이유: Smart Lock(신뢰할 수 있는 장소·기기)이 켜져 있으면 사용자가 아무
조작을 안 해도 키가드가 스스로 풀린다. 그때 이 리시버가 없으면 잠금이 풀렸는데도
뒤로가기가 막히고 닫기 버튼도 없는 상태에 갇힌다.

## 계획과 달라진 점

**1. `onPause`를 안전망으로 쓰면 안 된다 — 제거했다.**

계획서는 `onPause`를 "어떤 경로로 벗어나든 플래그가 남지 않게" 하는 안전망으로 넣었다.
실제로는 이것이 기능을 깨뜨리고 있었다. expo의 `ReactActivityDelegateWrapper`는
`onPause`를 `loadAppReady.await()` 뒤로 미뤄 코루틴으로 전달한다. 그래서 시작 과정에서
생긴 pause가 `onCreate`의 `start()` **뒤에** 도착해 방금 켠 `showWhenLocked`를 즉시 껐다.

```
enterIfLockFlow lockFlow=true
onPause (active=true)      <- 여기서 꺼짐
```

제거 후 진입이 정상 동작한다. 화면 꺼짐도 플로우 종료가 아니다 — 사용자가 정한 스펙
("플로우가 종료될 때만 해제")과도 이쪽이 맞다.

**2. `onBackPressed`만으로는 못 막는다 — RN `BackHandler` 폴백을 썼다.**

계획서가 "검증되지 않은 지점"으로 표시한 부분이다. 결과는 예상대로였다.
`ReactActivityDelegateWrapper.onBackPressed`는 리스너 반환값과 무관하게
`delegate.onBackPressed()`를 호출하고, 그 경로가 `invokeDefaultOnBackPressed()`로
이어져 액티비티를 끝낸다. 실측에서 리스너는 `true`를 반환했는데도 `onDestroy`가 찍혔다.

`LessonDetailShell`의 RN `BackHandler`가 실제 차단을 한다. 네이티브 `onBackPressed`는
`ReactActivity.onBackPressed`의 `super` 호출을 막는 이중 방어로만 남겼다.

**3. JS 변경 범위가 계획보다 작았다.**

탭바는 손댈 필요가 없었다 — `AppTabBar`의 `HIDDEN_ROUTES`에 `today`가 이미 있어
이 화면에서는 원래 그려지지 않는다. `today`를 벗어나는 길은 `LessonDetailShell`의
닫기(X) 하나뿐이었고, 그것만 감추면 이탈 경로가 없어졌다.

## 확인된 동작 특성 (버그 아님)

- 컨텐츠를 보다가 전원 버튼으로 화면을 꺼도 플로우가 유지된다. 나중에 화면을 켜면
  잠금 없이 오늘의 공부가 그대로 보이고, 홈 버튼을 누르기 전까지 계속된다.
  사용자가 "유지"로 결정한 동작이다.
- 플로우 중에는 잠금을 풀 방법이 없다. 나가려면 홈 버튼뿐이고, 나가면 잠금화면이 뜬다.

## 검증 절차 재현

```bash
# 실제 알람 경로
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label check
```
실행 후 폰에서 알람을 2~3분 뒤로 맞추고 화면을 끈다. 알람은 adb로 강제 발화할 수 없다
(`AlarmReceiver`가 `exported="false"`).

```bash
# 알람 없이 잠금 플로우만 재현 (반복 검증에 훨씬 빠르다)
adb shell am start -a android.intent.action.VIEW \
  -d "1dayclassic://today?t=1" --ez alarm_lock_flow true \
  -n com.onedayalarm.app/.MainActivity
```

공공장소에서 검증할 때 알람음은
`adb shell cmd media_session volume --stream 4 --set 1`로 최소화할 수 있다
(0은 불가, 범위 `[1..15]`). 진동은 알림 채널 설정이라 볼륨과 별개로 남는다.
