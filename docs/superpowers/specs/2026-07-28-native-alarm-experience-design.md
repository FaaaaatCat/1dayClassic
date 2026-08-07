# 네이티브 알람 경험 — 설계

날짜: 2026-07-28
상태: 브레인스토밍 대화 기반 사용자 승인 완료

## 목표

**갤럭시 기본 시계 앱과 동일한 알람 경험.** 예약한 시간이 되면 화면이 꺼져 있어도 화면이 켜지고,
잠금화면 위에 전체화면 알람 UI가 뜨고, 소리가 계속 재생되며, 사용자가 직접 끄기/스누즈를 누를
때까지 유지된다.

기본 시계 앱과의 **유일한 차이점**: 알람을 끄면 알람만 종료되는 게 아니라 앱의 오늘의 공부
화면으로 이동한다.

이후 모든 설계·구현 판단은 이 UX를 기준으로 한다.

> **2026-08-07 갱신 — 이 문서에서 바뀐 것**
>
> 이 문서는 2026-07-28 시점의 설계다. 이후 두 가지가 달라졌고, 아래 본문은 그에 맞춰 고쳤다.
>
> 1. **버튼 이름이 '끄기'가 아니라 '공부하기'다.** 알람을 끄는 것보다 공부로 넘어가는 것이
>    이 앱의 목적이라 문구를 바꿨다. 동작은 같다 — 소리를 끄고 오늘의 공부로 이동한다.
> 2. **자동 재생을 하지 않는다.** 원래는 `?autoplay=` 파라미터로 오늘의 곡을 바로 재생할
>    계획이었으나 도입하지 않기로 했다. `LessonDetailShell`에 파라미터 처리 코드는 남아
>    있지만 넘기는 곳이 없다.
>
> 잠금화면 위 컨텐츠 플로우는 별도 문서를 따른다 —
> `2026-08-07-alarm-lock-flow-design.md`.

## 현재 상태와 문제

현재는 `expo-notifications`의 `scheduleNotificationAsync`(WEEKLY 트리거)로 일반 알림만 띄운다.
일반 알림은 화면을 켜지 못하고, 잠금화면 위에 전체화면 UI를 띄우지 못하며, 소리를 지속
재생하지도 않는다. **`expo-notifications`로는 목표를 달성할 수 없다** — Expo Modules API 기반의
Android 네이티브 구현이 필요하다.

## 기술 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 네이티브 코드 위치 | **Local Expo Module** (`modules/alarm-clock/`) | `android/` 폴더를 커밋하지 않는 현재 워크플로우 유지. autolinking으로 매니페스트까지 자동 병합되어 EAS 클라우드 빌드와 그대로 호환 |
| 알람 화면 | **순수 네이티브 (Kotlin + XML)** | 앱 프로세스가 종료된 상태에서 알람이 울려도 JS 번들 콜드스타트(1~3초+) 없이 즉시 표시 |
| 예약 API | **`AlarmManager.setAlarmClock()`** | 구글이 알람 시계 앱을 위해 공식 지정한 API. Doze 예외 + 상태바 알람 아이콘 + 제조사 배터리 관리자가 우선 인식 |
| 오디오 | **`AudioAttributes.USAGE_ALARM`** | ALARM 스트림으로 라우팅 → 별도 알람 볼륨으로 제어되고, 방해금지(Zen) 정책이 알람을 기본 허용 카테고리로 취급 |
| 스누즈 | **5분 고정** | 갤럭시 기본값과 유사. 설정 UI는 추후 필요 시 |
| `expo-notifications` | **제거** | 알람 예약/알림 탭 처리가 전부 네이티브로 대체됨. 다른 용도로 사용하는 곳 없음 |

## 비목표 (이번 스코프 제외)

- 배터리 최적화 제외 요청(`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) 및 관련 UI
  — `setAlarmClock()`으로 최대한 안정화하고, 실제 문제가 확인되면 별도 기능으로 검토
- 알람 저장 시점마다 뜨는 권한 안내, 홈 화면 경고 배지, "정확도 제한됨" 토스트 문구
- 스누즈 시간 설정 UI
- 알람 여러 개 (현재와 동일하게 알람은 하나)
- iOS 네이티브 알람 — Android 전용. iOS에서는 JS API가 no-op

## 아키텍처

### 전체 흐름

```
[JS] AlarmContext에서 알람 변경
      │
      ▼ scheduleAlarm({hour, minute, repeatDays, sound})
[Native] AlarmPrefs에 저장 → AlarmScheduler가 다음 발동 시각 계산
      │                        → AlarmManager.setAlarmClock()
      ▼ (예약 시각 도달 — 앱 프로세스가 죽어 있어도 OS가 깨움)
[Native] AlarmReceiver
      │  1. 다음 주 알람 즉시 재예약 (반복 보장)
      │  2. AlarmRingingService 시작
      ▼
[Native] AlarmRingingService (Foreground, mediaPlayback)
      │  · WakeLock 획득
      │  · MediaPlayer 반복 재생 (USAGE_ALARM)
      │  · FSI 알림 게시 (ongoing, 끄기/스누즈 액션 포함)
      ▼ (OS가 판단)
   화면 꺼짐/잠금 ──→ AlarmActivity 전체화면
      │  [공부하기] → 서비스 종료 + MainActivity를 today로 실행
      │              (잠겨 있으면 잠금화면 위에 그대로 표시 — 별도 문서 참고)
      │  [스누즈]   → 서비스 종료 + 5분 뒤 1회성 알람 예약
      │
   기기 사용 중   ──→ 헤드업 알림 (현재 작업 방해하지 않음)
         [끄기]   → 서비스 종료 + MainActivity를 today로 실행
         [스누즈] → 서비스 종료 + 5분 뒤 1회성 알람 예약
```

두 경로 모두 앱의 오늘의 공부로 이동한다. 원래는 헤드업 알림의 [끄기]가 소리만 멈추고 앱을 열지
않기로 했으나(사용자가 다른 일을 하는 중이므로), 두 경로가 다르게 동작할 이유가 없다고 보아
같은 경로로 합쳤다(2026-08-07). `AlarmDismissActivity`가 그 역할을 한다.

### 전체화면 표시 조건 (중요)

**`setFullScreenIntent()`만 사용하고, 서비스에서 `startActivity()`를 직접 호출하지 않는다.**

`setFullScreenIntent()`는 기기가 잠겨 있거나 화면이 꺼져 있을 때만 액티비티를 실행하고,
사용자가 기기를 사용 중이면 OS가 헤드업 알림으로 격하시킨다. 이 동작이 목표 UX와 정확히 일치한다
— 사용자가 휴대폰을 쓰고 있을 때 현재 작업을 가로채지 않는다.

| 기기 상태 | 표시 방식 |
|---|---|
| 화면 꺼짐 / 잠금화면 | **전체화면 AlarmActivity** |
| 기기 사용 중 (우리 앱이든 다른 앱이든) | **헤드업 알림만** (끄기/스누즈 버튼 포함) |

두 경우 모두 **소리는 동일하게 재생되고, 사용자가 끄기/스누즈를 누를 때까지 지속된다.**

이 결정으로 Background Activity Launch(BAL) 정책 이슈가 원천적으로 발생하지 않는다. 참고로
공식 문서상 BAL 면제 조건에 "포그라운드 서비스 실행 중"은 **포함되지 않으므로**, 서비스에서
`startActivity()`를 호출하는 접근은 애초에 신뢰할 수 없다.

## 모듈 구조

```
modules/alarm-clock/
  expo-module.config.json
  index.ts                              JS API
  src/AlarmClock.types.ts
  android/
    build.gradle
    src/main/AndroidManifest.xml         권한 + 컴포넌트 (자동 병합)
    src/main/res/layout/activity_alarm.xml
    src/main/res/values/styles.xml       Theme.AlarmFullScreen
    src/main/res/raw/alarm_1.mp3         커스텀 알람음
    src/main/java/expo/modules/alarmclock/
      AlarmClockModule.kt                Expo Modules API 진입점
      AlarmPrefs.kt                      SharedPreferences 저장소
      AlarmScheduler.kt                  발동 시각 계산 + AlarmManager 예약/취소
      AlarmReceiver.kt                   알람 발동 / 부팅 복원
      AlarmRingingService.kt             Foreground Service
      AlarmActivity.kt                   전체화면 알람 UI
```

### AndroidManifest (모듈 내부, 앱 매니페스트에 자동 병합)

권한:

| 권한 | 용도 |
|---|---|
| `WAKE_LOCK` | 알람 울리는 동안 CPU 유지 |
| `RECEIVE_BOOT_COMPLETED` | 재부팅 후 알람 복원 |
| `USE_FULL_SCREEN_INTENT` | 잠금화면 위 전체화면 알람 |
| `SCHEDULE_EXACT_ALARM` | 정확한 시각 발동 (Android 12~13) |
| `USE_EXACT_ALARM` | 정확한 시각 발동 (Android 13+, 알람 앱은 자동 부여) |
| `FOREGROUND_SERVICE` | 이미 `app.json`에 선언됨 |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | 이미 `app.json`에 선언됨 |
| `POST_NOTIFICATIONS` | 알림 게시 (Android 13+). **`expo-notifications` 플러그인이 자동으로 넣어주던 권한이므로, 플러그인 제거와 함께 이 모듈에서 명시적으로 선언해야 한다** |

컴포넌트:

```xml
<activity
    android:name=".AlarmActivity"
    android:launchMode="singleInstance"
    android:excludeFromRecents="true"
    android:exported="false"
    android:enableOnBackInvokedCallback="false"
    android:taskAffinity=""
    android:theme="@style/Theme.AlarmFullScreen" />

<service
    android:name=".AlarmRingingService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="false" />

<receiver android:name=".AlarmReceiver" android:exported="false">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
        <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
    </intent-filter>
</receiver>
```

**`launchMode="singleInstance"` 선택 근거**: `singleTask`는 해당 액티비티가 태스크 루트가 되지만
그 위에 다른 액티비티가 쌓일 수 있다. `singleInstance`는 그 태스크에 오직 그 액티비티 하나만
존재하도록 구조적으로 보장한다. `AlarmActivity`는 통화 수신 화면처럼 앱의 정상 네비게이션 스택과
완전히 분리되어야 하므로 `singleInstance`가 맞다. Android 15/16에 `launchMode`를 제약하는
변경사항은 없다.

## 네이티브 컴포넌트

### AlarmPrefs

JS가 죽어 있어도 네이티브 혼자 반복·복원할 수 있게 하는 저장소 (`SharedPreferences`).

```
enabled: Boolean
hour: Int, minute: Int
repeatDays: String   // "0111110" 형태 7자리, index 0=일
sound: String        // "default" | "custom"
```

JS가 `scheduleAlarm()`을 호출할 때마다 통째로 덮어쓴다.

### AlarmScheduler

- `scheduleNextWeeklyAlarm()` — AlarmPrefs 기준으로 다음 발동 시각 계산 후
  `setAlarmClock()` 예약 (`requestCode = 1`). `enabled`가 false거나 반복 요일이 하나도 없으면
  예약하지 않는다. 요일 오프셋 계산 로직은 `lib/alarmTime.ts`와 동일한 규칙을 Kotlin으로 구현.
- `scheduleSnooze()` — 5분 뒤 1회성 알람 (`requestCode = 2`). 주간 예약과 독립적으로 공존.
- `cancelAll()` — 두 requestCode 모두 취소.
- 폴백: `canScheduleExactAlarms()`가 false면 `setAlarmClock()` 대신
  `setAndAllowWhileIdle()` 사용. 알람은 여전히 울리되 몇 분 오차가 생길 수 있다.

### AlarmReceiver

- **알람 발동 시**: 가장 먼저 `scheduleNextWeeklyAlarm()`을 호출해 다음 주 알람을 재보장한 뒤
  `startForegroundService(AlarmRingingService)`.
- **`BOOT_COMPLETED` / `MY_PACKAGE_REPLACED` 수신 시**: `scheduleNextWeeklyAlarm()`만 호출한다.

> **제약 준수**: Android 15부터 `BOOT_COMPLETED` 리시버는 `mediaPlayback` 타입 포그라운드
> 서비스를 시작할 수 없다. 부팅 경로에서는 **절대 서비스를 시작하지 않고** AlarmManager
> 재예약만 수행해야 한다. 이 경계를 반드시 지킬 것.

### AlarmRingingService

Activity 생명주기와 완전히 독립. **AlarmActivity가 사라져도 사용자가 끄기/스누즈를 누를
때까지 계속 유지된다.**

`onStartCommand`:
1. `WakeLock` 획득 (10분 타임아웃 안전장치)
2. `startForeground()` — FSI가 붙은 ongoing 알림 게시. 알림에 **끄기/스누즈 액션 버튼을 항상
   포함**해서 전체화면이 뜨지 않는 상황에서도 알람을 제어할 수 있게 한다.
3. `MediaPlayer` 반복 재생

```kotlin
val attrs = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()
mediaPlayer.setAudioAttributes(attrs)   // 레거시 setAudioStreamType 대신 이 방식
mediaPlayer.isLooping = true
```

음원: `sound == "custom"`이면 `R.raw.alarm_1`, 아니면
`RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)`.

알림 채널은 `IMPORTANCE_HIGH`로 만들되 **채널 자체의 소리는 `setSound(null, null)`로 끈다** —
소리는 오직 MediaPlayer(ALARM 스트림)로만 재생해서 이중 재생과 스트림 충돌을 막는다.

`ACTION_DISMISS` / `ACTION_SNOOZE` 수신 시: MediaPlayer 정지·해제, WakeLock 해제,
알림 제거, `stopSelf()`. 스누즈인 경우 `AlarmScheduler.scheduleSnooze()`를 추가 호출.

### AlarmActivity

```kotlin
setShowWhenLocked(true)   // 잠금화면 위에 표시
setTurnScreenOn(true)     // 꺼진 화면 켜기
```

뒤로가기로 닫히지 않게 한다. **`onBackPressed()` 오버라이드는 Android 16(타겟 SDK 36)에서
더 이상 호출되지 않으므로 사용하지 않는다:**

```kotlin
onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() { /* 알람 화면은 뒤로가기로 닫히지 않는다 */ }
})
```

매니페스트의 `android:enableOnBackInvokedCallback="false"`가 예측형 백 애니메이션(뒤 화면이
비쳐 보이는 미리보기)까지 차단한다.

테마 `@style/Theme.AlarmFullScreen`은 모듈의 `res/values/styles.xml`에 새로 정의한다
(액션바 없음, 배경 `--bg`, 전체화면).

레이아웃 (`activity_alarm.xml`) — 지정 팔레트(`global.css` / `constants/theme.ts`) 값만 사용:

```
        오전 7:00          시간 (큰 서체, --brown-100)
      하루 클래식 알람       제목 (--brown-50)

   [    공부하기    ]        주 버튼
   [ 5분 후 다시 알림 ]      보조 버튼
```

버튼 동작 — 액티비티는 서비스에 인텐트만 보내고 자신은 `finish()`:

- **5분 후 다시 알림** → 서비스에 `ACTION_SNOOZE` 전달 → `finish()`
- **공부하기** → 서비스에 `ACTION_DISMISS` 전달 → `MainActivity` 실행 → `finish()`

`MainActivity` 실행은 **암시적 딥링크가 아니라 명시적 컴포넌트 인텐트**로 기존 인스턴스를
재사용한다:

```kotlin
Intent(this, MainActivity::class.java).apply {
    action = Intent.ACTION_VIEW
    data = Uri.parse("1dayclassic://today?t=${System.currentTimeMillis()}")
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
}
```

expo-router가 이 딥링크를 받아 `/today` 화면으로 이동한다. `t` 값은 매번 달라야 한다 — 같은
URL로 다시 열면 expo-router가 이미 그 화면에 있다고 보고 아무 일도 하지 않아, 반복 알람에서
두 번째부터 화면이 바뀌지 않는다.

**자동 재생은 하지 않는다.** 원래는 `?autoplay=`로 오늘의 곡을 바로 재생할 계획이었으나
도입하지 않기로 했다(2026-08-07). `LessonDetailShell`에 파라미터 처리 코드는 남아 있지만
넘기는 곳이 없다.

## JS API

`modules/alarm-clock/index.ts`:

```ts
export interface AlarmInput {
  hour: number;              // 0~23
  minute: number;            // 0~59
  repeatDays: boolean[];     // 길이 7, index 0=일
  sound: 'default' | 'custom';
}

export interface AlarmPermissionStatus {
  notifications: boolean;    // POST_NOTIFICATIONS (13+)
  exactAlarm: boolean;       // canScheduleExactAlarms() (12+)
  fullScreenIntent: boolean; // canUseFullScreenIntent() (14+)
}

/** 알람 예약. 기존 예약은 덮어쓴다. enabled=false면 취소만 수행. */
scheduleAlarm(input: AlarmInput): Promise<void>;

/** 예약된 알람 전체 취소. */
cancelAlarm(): Promise<void>;

/** 현재 권한 상태 조회. 해당 버전에 없는 권한은 true로 반환. */
getPermissionStatus(): Promise<AlarmPermissionStatus>;

/** 부족한 권한의 설정 화면으로 이동. */
openAlarmPermissionSettings(): Promise<void>;
```

Android 외 플랫폼에서는 전부 no-op (`getPermissionStatus`는 모두 `true` 반환).

## 권한 UX

**앱 실행 시 한 번만 확인한다.** 알람 저장 시점의 안내, 홈 화면 배지, 토스트 문구 변경은 없다.

1. 앱 시작 시 `getPermissionStatus()` 호출
2. **모두 허용되어 있으면 아무것도 표시하지 않는다**
3. 하나라도 없으면 팝업 1회 표시:

   > **알람을 위해 필요한 권한을 허용해 주세요.**
   > [설정 열기] [나중에]

4. [설정 열기] → `openAlarmPermissionSettings()`가 부족한 권한 중 우선순위가 높은 것의
   설정 화면으로 이동

권한별 설정 화면 진입점:

| 권한 | 확인 API | 설정 화면 인텐트 |
|---|---|---|
| 정확한 알람 | `AlarmManager.canScheduleExactAlarms()` | `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` |
| 전체화면 인텐트 | `NotificationManager.canUseFullScreenIntent()` | `ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT` |
| 알림 | 런타임 권한 요청 | 표준 권한 다이얼로그 |

> Android 14부터 `USE_FULL_SCREEN_INTENT`는 설치 시 자동 부여되지 않으며 사용자가 켜고 끌 수
> 있다. Play 스토어는 알람/통화 앱이 아닌 앱의 기본 권한을 회수한다.

## 권한이 없을 때의 동작 (Graceful degradation)

알람은 **어떤 권한이 빠져도 최대한 울린다.**

| 없는 권한 | 결과 |
|---|---|
| 정확한 알람 | `setAndAllowWhileIdle()` 폴백 — 몇 분 오차 가능하나 울림 |
| 전체화면 인텐트 | 전체화면 대신 헤드업 알림 — 소리 정상, 알림의 끄기/스누즈 버튼으로 제어 |
| 알림 | 소리는 재생되나 알림/전체화면 없음 (제어는 앱을 열어야 함) |

## 프로세스 종료·배터리 최적화에서의 동작

| 상황 | 알람 동작 |
|---|---|
| 최근 앱에서 스와이프로 종료 | **정상** — AlarmManager 예약은 프로세스와 무관. FGS도 태스크 제거와 독립 |
| 시스템이 메모리 부족으로 프로세스 정리 | **정상** — OS가 예약 시각에 리시버를 통해 프로세스를 새로 깨움 |
| 재부팅 / 앱 업데이트 | **정상** — `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`로 복원 |
| 설정에서 "강제 종료" | **울리지 않음** — 플랫폼 차원 제약. 강제 종료는 앱의 예약 알람을 전부 취소하고 앱을 정지 상태로 만든다. 갤럭시 기본 시계 앱도 동일 |
| 제조사 배터리 관리자 (One UI 등) | `setAlarmClock()`이 최선의 방어. 이번 스코프에서는 추가 대응 없음 |

## 기존 코드 변경

**제거:**
- `lib/notifications.ts` 전체
- `expo-notifications` 패키지 및 `app.json`의 expo-notifications 플러그인 설정
- `AlarmContext`의 알림 탭 리스너 `useEffect` (네이티브 딥링크로 대체됨)

**수정:**
- `AlarmContext`의 스케줄링 `useEffect` — `cancelAllAlarmNotifications()` /
  `scheduleAlarmNotifications()` 호출을 `scheduleAlarm()` / `cancelAlarm()`으로 교체
- `app.json` — `SCHEDULE_EXACT_ALARM`은 모듈 매니페스트로 이동하므로 앱 매니페스트에서 정리
- `assets/music/alarm_1.mp3` → 모듈의 `res/raw/`로 이동

**유지 (변경 없음):**
- AsyncStorage 기반 알람 영속화 (`STORAGE_KEY = 'alarm-state-v1'`)
- 알람 저장 시 "n시간 n분 후에 알람이 울려요" 토스트 (`lib/alarmTime.ts`, `ToastContext`)
- `today.tsx`의 `trackId` / `autoplay` 파라미터 처리

## 검증

네이티브 알람은 자동화 테스트가 어렵고 실기기 확인이 필수다. Development Build를 설치한 실기기에서:

1. 1~2분 뒤로 알람 설정 → 화면 끄기 → 전체화면 알람이 뜨고 화면이 켜지는지
2. 같은 조건에서 앱을 사용 중일 때 → 헤드업 알림만 뜨고 전체화면은 안 뜨는지
3. 알람이 울리는 중 화면을 밀어 닫아도 소리가 계속되는지
4. 공부하기 → 오늘의 공부 화면으로 이동하는지 (자동 재생은 하지 않는다)
5. 스누즈 → 5분 뒤 다시 울리는지
6. 최근 앱에서 앱을 종료한 뒤 알람이 울리는지
7. 재부팅 후 알람이 복원되는지
8. 반복 요일 알람이 다음 주에도 울리는지 (기기 시간 변경으로 확인)

`lib/alarmTime.ts`의 요일 오프셋 계산과 Kotlin `AlarmScheduler`의 계산이 동일한 결과를 내는지는
단위 테스트 가능 — 동일한 입력 케이스 표를 양쪽에 두고 검증한다.

## 빌드

네이티브 모듈이 추가되므로 Development Build 재생성이 필수다. Expo Go에서는 동작하지 않는다.

```
npx expo prebuild --clean
npx expo run:android
```
