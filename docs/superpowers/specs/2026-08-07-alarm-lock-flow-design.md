# 잠금화면 위 알람 컨텐츠 플로우 — 설계

날짜: 2026-08-07
상태: 브레인스토밍 대화 기반 사용자 승인 완료

## 목표

**알라미(Alarmy)와 동일한 잠금화면 경험.** 알람 화면에서 `공부하기`를 누르면, 잠금을 풀지 않은
상태에서도 오늘의 공부가 바로 표시된다.

알라미의 실제 동작을 재확인해 목표를 다음과 같이 확정한다.

- 잠금 상태에서 컨텐츠를 보는 동안 **뒤로가기는 동작하지 않는다**
- **홈 버튼**을 누르면 앱이 아니라 **잠금화면**으로 나간다
- `showWhenLocked`는 **알람 플로우 동안만** 켜지고, 플로우가 끝나면 꺼진다

마지막 항목이 핵심 제약이다. 항상 켜 두면 알람과 무관하게 앱을 열 때도 잠금화면 위에 뜨고,
폰을 주운 사람이 잠금 없이 앱 내용을 전부 볼 수 있게 된다.

이후 모든 판단은 이 UX를 기준으로 한다.

## 확정된 원인 (실측)

실기기(Galaxy SM-S942N, Android 16 / SDK 36, 보안 잠금 설정됨)에서 3회차 측정으로 확정했다.
판정 지표는 `adb shell dumpsys window`의 `mKeyguardOccluded` — `true`면 잠금화면이 가려진
상태(컨텐츠가 보임), `false`면 잠금화면이 앞이다.

| 회차 | 변경 | 알람 화면 | `공부하기` 직후 |
|---|---|---|---|
| 1 | 없음 (베이스라인) | `true` | **`false`** — 증상 재현 |
| 2 | `AlarmActivity.finish()` 제거만 | `true` | **`false`** — AlarmActivity(t920) **생존했는데도** 실패 |
| 3 | `MainActivity`에 `showWhenLocked`만 | `true` | **`true`** — 성공 (7초간 6회 샘플 전부) |

**원인은 `MainActivity`에 `android:showWhenLocked`가 없었던 것 하나다.**

2회차가 이를 못박는다. 키가드 가림 여부는 **최상단 태스크의 최상단 액티비티가 단독으로**
결정하며, 뒤 태스크에 `showWhenLocked` 창이 살아 있어도 판단에 관여하지 않는다.
`AlarmActivity`(t920)와 `MainActivity`(t921)는 서로 다른 태스크였다.

`finish()` 제거는 잠금화면 문제의 해법이 아니었다. 그것은 "뒤로가기로 알람 화면 복귀"를 위한
별개의 조각이었고, 목표가 개정되면서 **불필요해졌다**.

## 비목표 (이번 스코프 제외)

- 뒤로가기로 알람 화면에 돌아가기 — 알라미가 그렇게 동작하지 않는다
- 광고 화면(`/ad`)을 이 플로우에 포함하기 — 광고의 위치와 순서는 **퀴즈 이후로 변경 예정**인
  별건이다. 이번 플로우에서는 제외하되, 나중에 다른 지점에 꽂아도 설계가 무너지지 않게 둔다
- iOS — Android 전용
- 알람이 울리는 동안 컨텐츠를 강제하는 미션/퍼즐

## 기술 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| `showWhenLocked` 적용 지점 | **런타임 토글** (`Activity.setShowWhenLocked`) | 매니페스트 고정은 알람과 무관한 실행에서도 잠금 위 노출 → 프라이버시 결함 |
| `MainActivity` 후킹 방법 | **`ReactActivityLifecycleListener`** (로컬 모듈) | `android/`는 gitignore된 prebuild 생성물. config plugin이나 생성 파일 수정 없이 git 추적 코드 안에서 끝난다 |
| 리스너 등록 | **`AlarmClockPackage.kt` 파일명 규약** | `expo-web-browser`/`expo-status-bar`/`expo-linking` 모두 `expo-module.config.json`에 선언 없이 `*Package.kt`만으로 `ExpoModulesPackageList.packagesList`에 자동 등록됨을 확인 |
| 플래그를 켜는 시점 | **`onCreate` / `onNewIntent`** | 화면이 그려지기 전이라 키가드가 번쩍이지 않는다. `MainActivity`가 `singleTask`라 재사용 시 `onCreate`가 아니라 `onNewIntent`로 오므로 둘 다 받아야 한다 |
| 뒤로가기 차단 | **리스너 `onBackPressed()` → `true`** | 네이티브에서 소비. JS가 느리거나 죽어도 뚫리지 않는다 |
| 홈 버튼 → 잠금화면 | **별도 구현 없음** | 잠긴 기기에서 런처가 앞으로 나오면 런처에 `showWhenLocked`가 없어 키가드가 자동 복귀 |
| 플로우 진입 조건 | **`KeyguardManager.isKeyguardLocked`가 참일 때만** | 사용 중 알람이 울려 헤드업으로 격하된 경우엔 잠금이 없으므로 제약도 걸리면 안 된다 |
| `AlarmActivity.finish()` | **원래대로 유지** | 알람 화면으로 돌아갈 일이 없어졌다 |

## 아키텍처

### 상태

두 개다.

| 상태 | 의미 |
|---|---|
| `IDLE` | 평소 앱 |
| `LOCK_FLOW` | 잠금 위에서 컨텐츠를 보는 중 |

### 전이

```
[알람 발화] AlarmActivity (showWhenLocked, 기존 그대로)
      │
      │ '공부하기' 탭
      │   · AlarmRingingService에 dismiss (소리 즉시 정지 — 기존 동작 유지)
      │   · isKeyguardLocked 이면 EXTRA_LOCK_FLOW 를 붙여 MainActivity 실행
      │   · finish()  (기존 그대로)
      ▼
[MainActivity] AlarmFlowLifecycleListener.onCreate / onNewIntent
      │   · EXTRA_LOCK_FLOW 있으면 → setShowWhenLocked(true), AlarmFlow = LOCK_FLOW
      ▼
[/today] 잠금 위에 표시. 탭바 숨김, 뒤로가기 차단
      │
      ├─ 뒤로가기 → onBackPressed()가 true 반환 → 아무 일도 없음
      │
      ├─ 홈 버튼 → onUserLeaveHint → setShowWhenLocked(false), AlarmFlow = IDLE
      │              → 런처가 앞으로 → 키가드 자동 복귀
      │
      └─ 잠금 해제(ACTION_USER_PRESENT) → setShowWhenLocked(false), AlarmFlow = IDLE
                     → 탭바 복귀, 뒤로가기 정상 동작 (평소 앱이 된다)
```

### 새 파일 (로컬 모듈)

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/`

| 파일 | 역할 |
|---|---|
| `AlarmFlow.kt` | 플로우 상태의 **단일 소유자**. 네이티브·JS 양쪽이 여기에만 묻는다. 활성/해제와 `setShowWhenLocked` 호출을 함께 처리해 두 값이 어긋날 수 없게 한다 |
| `AlarmClockPackage.kt` | `BasePackage` 구현. `createReactActivityLifecycleListeners`로 아래 리스너를 꽂는다 |
| `AlarmFlowLifecycleListener.kt` | `MainActivity` 생명주기에 올라타는 실제 로직 |

### 리스너가 받는 콜백

| 콜백 | 하는 일 |
|---|---|
| `onCreate(activity, _)` | 인텐트에 `EXTRA_LOCK_FLOW` 있으면 플로우 시작 |
| `onNewIntent(intent)` | 같음. `singleTask` 재사용 경로 |
| `onBackPressed()` | `LOCK_FLOW`면 `true` 반환(소비), 아니면 `false` |
| `onUserLeaveHint(activity)` | 홈/최근앱으로 나감 → 플로우 종료 |
| `onPause` / `onDestroy` | 안전망. 어떤 경로로 벗어나든 플래그가 남지 않게 |

### 잠금 해제 감지

`ACTION_USER_PRESENT` 브로드캐스트를 `LOCK_FLOW` 동안에만 등록하고, 받으면 즉시 해제한다.
플로우가 끝나면 해제 등록도 푼다 — 상시 등록하지 않는다.

### 기존 파일 변경

| 파일 | 변경 |
|---|---|
| `AlarmActivity.kt` | `공부하기` → `MainActivityIntent.ad(...)` 대신 `today(...)`, 잠금 상태면 `EXTRA_LOCK_FLOW` 부착. `finish()`는 그대로 |
| `AlarmDismissActivity.kt` | 알림의 `끄기`도 같은 경로를 타야 한다 — 동일 변경 |
| `MainActivityIntent.kt` | `today()`에 캐시버스팅 `t` 파라미터 추가(반복 알람에서 두 번째부터 화면이 안 바뀌는 문제 — `ad()`가 같은 이유로 이미 쓰고 있다), `lockFlow` 인자 추가 |
| `AlarmClockModule.kt` | `isAlarmLockFlow()` 노출 + `onAlarmLockFlowChanged` 이벤트 |
| `modules/alarm-clock/index.ts` | 위 API의 JS 래퍼. 기존 `requireOptionalNativeModule` 지연 해석 패턴 유지 |
| `app/(tabs)/_layout.tsx` | `LOCK_FLOW`면 탭바 숨김 |
| `app/(tabs)/today.tsx` | `LOCK_FLOW`면 다른 화면으로 나가는 경로 차단 |

`app/ad.tsx`는 **건드리지 않는다.** 이 플로우에서 빠질 뿐 화면 자체는 남아 있고, 퀴즈 이후로
옮길 때 그대로 쓴다.

## 검증되지 않은 지점

**`onBackPressed()`가 Android 16에서 호출되는가.** [AlarmActivity.kt:87](../../../modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmActivity.kt) 주석이
"Android 16에서는 `onBackPressed()`가 호출되지 않는다"고 적고 있다. 앱은
`enableOnBackInvokedCallback="false"`(app.json의 `predictiveBackGestureEnabled: false`)라
레거시 경로일 것으로 보지만 **측정으로 확인한다.**

호출되지 않으면 **RN `BackHandler` 폴백**으로 간다. `app/ad.tsx`에 이미 같은 패턴이 있다.
네이티브 차단이 더 튼튼하므로 우선순위는 네이티브다.

## 검증 계획

원인 규명 때와 같은 방식 — `dumpsys`로 측정한다. 인상이 아니라 값으로 판정한다.

측정 지표
- `adb shell dumpsys window` → `mKeyguardOccluded`
- `adb shell dumpsys activity activities` → `topResumedActivity`, 태스크 목록

시나리오

| # | 상황 | 기대 |
|---|---|---|
| 1 | 잠금 상태 알람 → `공부하기` | `Occluded=true`, `/today` 표시 |
| 2 | 위 상태에서 뒤로가기 | 아무 변화 없음. `Occluded=true` 유지 |
| 3 | 위 상태에서 홈 버튼 | `Occluded=false`, 잠금화면 |
| 4 | 3 이후 앱을 런처에서 실행 | `Occluded=false` — **잠금 위에 뜨면 안 된다** |
| 5 | 1 이후 잠금 해제 | 탭바 복귀, 뒤로가기 정상 |
| 6 | 잠금 없이 알람(헤드업) → `끄기` | 제약 없음. 평소 앱 |
| 7 | 반복 알람 2회차 | 1과 동일. `t` 파라미터가 없으면 여기서 깨진다 |

시나리오 4가 프라이버시 회귀 검사다. **이것이 통과하지 않으면 완료가 아니다.**

## 실험 중 발견된 운영 사항

- 이 앱은 dev build라 **Metro가 떠 있어야** 한다. 꺼져 있으면 앱 프로세스가 React 컨텍스트
  없이 좀비로 뜬다(`Tried to access onNewIntent while context is not ready`). USB 연결 시
  `adb reverse tcp:8081 tcp:8081` 필요
- `AlarmReceiver`와 `AlarmActivity`가 `exported="false"`라 **adb 셸에서 알람을 강제 발화할 수
  없다.** 검증 때마다 앱 UI로 알람을 맞춰야 한다
- 알람음은 `STREAM_ALARM`(스트림 4). 공공장소 검증 시
  `adb shell cmd media_session volume --stream 4 --set 1`로 최소화 가능(0은 불가, 범위 `[1..15]`).
  진동은 알림 채널 설정이라 볼륨과 별개로 남는다
