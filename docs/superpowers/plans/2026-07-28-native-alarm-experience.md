# 네이티브 알람 경험 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갤럭시 기본 시계 앱과 동일한 알람 경험 — 화면이 꺼져 있어도 화면을 켜고 잠금화면 위에 전체화면 알람 UI를 띄우며, 사용자가 끄기/스누즈를 누를 때까지 소리를 유지한다. '끄기'는 앱의 '오늘의 곡' 화면으로 이동해 자동 재생한다.

**Architecture:** `modules/alarm-clock/` Local Expo Module 안에 Android 네이티브 코드 전체를 담는다. `AlarmManager.setAlarmClock()`으로 예약하고, 발동 시 `AlarmReceiver`가 `AlarmRingingService`(Foreground Service)를 띄운다. 서비스는 `USAGE_ALARM` 오디오로 소리를 반복 재생하고 FullScreenIntent 알림을 게시한다 — OS가 잠금/화면꺼짐일 때만 `AlarmActivity`를 전체화면으로 실행하고, 기기 사용 중이면 헤드업 알림으로 격하시킨다.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Modules API (Kotlin), AndroidX Lifecycle, AsyncStorage

## Global Constraints

- **설계 문서:** `docs/superpowers/specs/2026-07-28-native-alarm-experience-design.md` — 충돌 시 스펙이 우선
- **Expo 버전:** SDK 57. 코드 작성 전 `https://docs.expo.dev/versions/v57.0.0/` 의 해당 버전 문서를 확인할 것 (`AGENTS.md` 지시사항)
- **색상:** `global.css` / `constants/theme.ts`에 등록된 지정 팔레트 색만 사용한다. 없는 색이 필요하면 사용자에게 확인
- **패키지 네임스페이스:** `expo.modules.alarmclock`
- **앱 패키지:** `com.onedayalarm.app`
- **딥링크 스킴:** `1dayclassic`
- **스누즈:** 5분 고정
- **알람 개수:** 1개 (현재와 동일)
- **플랫폼:** Android 전용. iOS에서는 JS API가 no-op
- **`BOOT_COMPLETED` 리시버는 절대 포그라운드 서비스를 시작하지 않는다** — Android 15부터 `mediaPlayback` 타입 FGS 시작이 금지됨. 재예약만 수행
- **`onBackPressed()` 오버라이드 금지** — Android 16(타겟 SDK 36)에서 호출되지 않음. `OnBackPressedCallback` 사용
- **`expo-notifications` 제거는 Task 9** — 네이티브 알람이 실기기에서 확인된 후에 수행

## 파일 구조

| 파일 | 책임 |
|---|---|
| `modules/alarm-clock/expo-module.config.json` | 모듈 등록 (autolinking) |
| `modules/alarm-clock/index.ts` | JS API 공개 표면 |
| `modules/alarm-clock/src/AlarmClock.types.ts` | JS 타입 정의 |
| `.../android/src/main/AndroidManifest.xml` | 권한 + 컴포넌트 선언 |
| `.../AlarmPrefs.kt` | SharedPreferences 저장소 (단일 진실 공급원) |
| `.../AlarmScheduler.kt` | 발동 시각 계산 + AlarmManager 예약/취소 |
| `.../AlarmReceiver.kt` | 알람 발동 / 부팅 복원 브로드캐스트 수신 |
| `.../AlarmRingingService.kt` | 소리 재생 + WakeLock + FSI 알림 |
| `.../AlarmActivity.kt` | 전체화면 알람 UI |
| `.../AlarmClockModule.kt` | Expo Modules API 진입점 |
| `context/AlarmContext.tsx` | 네이티브 API 호출로 교체 |
| `app/_layout.tsx` | 앱 시작 시 권한 확인 팝업 |

**의존 방향:** `AlarmClockModule` / `AlarmReceiver` → `AlarmScheduler` → `AlarmPrefs`. `AlarmRingingService` → `AlarmPrefs`(음원 선택). `AlarmActivity` → `AlarmRingingService`(인텐트만). 순환 의존 없음.

---

### Task 1: 로컬 Expo 모듈 스캐폴딩

**Files:**
- Create: `modules/alarm-clock/` (생성 도구가 만듦)
- Modify: `modules/alarm-clock/expo-module.config.json`
- Modify: `modules/alarm-clock/index.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `expo.modules.alarmclock` Kotlin 네임스페이스, `modules/alarm-clock/index.ts` 진입점

- [ ] **Step 1: 모듈 생성**

```bash
npx create-expo-module@latest --local
```

프롬프트 응답:
- name: `alarm-clock`
- package: `expo.modules.alarmclock`

- [ ] **Step 2: iOS 디렉터리 제거 (Android 전용)**

```bash
rm -rf modules/alarm-clock/ios
```

- [ ] **Step 3: `expo-module.config.json`에서 iOS 항목 제거**

`modules/alarm-clock/expo-module.config.json`:

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.alarmclock.AlarmClockModule"]
  }
}
```

- [ ] **Step 4: 생성된 샘플 코드 정리**

`modules/alarm-clock/index.ts`를 빈 상태로 비운다 (Task 8에서 실제 API를 채운다):

```ts
export {};
```

`create-expo-module`이 만든 샘플 파일들을 삭제한다 — 생성기 버전에 따라 이름이 다를 수 있으니
`modules/alarm-clock/src/` 와 `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/`
를 직접 확인하고, **`AlarmClockModule.kt` 하나만 남기고** View/Sample 관련 파일
(`*View.kt`, `*View.ts`, `*.web.ts` 등)을 모두 지운다.

```bash
ls modules/alarm-clock/src modules/alarm-clock/android/src/main/java/expo/modules/alarmclock
```

- [ ] **Step 5: 빌드가 통과하는지 확인**

```bash
npx expo prebuild --clean --platform android
```

Expected: 에러 없이 완료. `android/` 폴더가 생성되고 모듈이 autolink됨.

> `android/`는 생성물이므로 커밋하지 않는다. `.gitignore`에 이미 포함되어 있는지 확인하고, 없으면 추가한다.

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock .gitignore
git commit -m "feat(alarm): 로컬 Expo 모듈 alarm-clock 스캐폴딩"
```

---

### Task 2: AlarmPrefs — 알람 상태 저장소

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmPrefs.kt`
- Test: `modules/alarm-clock/android/src/test/java/expo/modules/alarmclock/AlarmPrefsTest.kt`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `data class AlarmConfig(val enabled: Boolean, val hour: Int, val minute: Int, val repeatDays: List<Boolean>, val sound: String)`
  - `object AlarmPrefs { fun save(context: Context, config: AlarmConfig); fun load(context: Context): AlarmConfig; fun encodeRepeatDays(days: List<Boolean>): String; fun decodeRepeatDays(encoded: String): List<Boolean> }`

- [ ] **Step 1: 테스트 인프라 확인 및 추가**

`modules/alarm-clock/android/build.gradle`의 `dependencies` 블록에 추가:

```gradle
testImplementation 'junit:junit:4.13.2'
```

- [ ] **Step 2: 요일 인코딩 실패 테스트 작성**

`modules/alarm-clock/android/src/test/java/expo/modules/alarmclock/AlarmPrefsTest.kt`:

```kotlin
package expo.modules.alarmclock

import org.junit.Assert.assertEquals
import org.junit.Test

class AlarmPrefsTest {
  @Test
  fun `encodeRepeatDays 는 월~금을 0111110 으로 인코딩한다`() {
    val weekdays = listOf(false, true, true, true, true, true, false)
    assertEquals("0111110", AlarmPrefs.encodeRepeatDays(weekdays))
  }

  @Test
  fun `decodeRepeatDays 는 인코딩을 역변환한다`() {
    assertEquals(
      listOf(false, true, true, true, true, true, false),
      AlarmPrefs.decodeRepeatDays("0111110")
    )
  }

  @Test
  fun `decodeRepeatDays 는 길이가 7이 아니면 전부 false 를 반환한다`() {
    assertEquals(List(7) { false }, AlarmPrefs.decodeRepeatDays("011"))
    assertEquals(List(7) { false }, AlarmPrefs.decodeRepeatDays(""))
  }
}
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx expo prebuild --platform android && cd android && ./gradlew :alarm-clock:testDebugUnitTest --tests "expo.modules.alarmclock.AlarmPrefsTest"
```

Expected: FAIL — `Unresolved reference: AlarmPrefs`

- [ ] **Step 4: AlarmPrefs 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmPrefs.kt`:

```kotlin
package expo.modules.alarmclock

import android.content.Context

/**
 * 알람 설정의 네이티브 측 단일 진실 공급원.
 *
 * JS가 죽어 있어도(앱 프로세스 종료, 재부팅) 네이티브 혼자 다음 알람을 재예약할 수 있어야
 * 하므로, JS의 AsyncStorage와 별개로 네이티브도 자체 사본을 들고 있는다.
 * JS가 scheduleAlarm()을 호출할 때마다 통째로 덮어쓴다.
 */
data class AlarmConfig(
  val enabled: Boolean,
  /** 0~23 */
  val hour: Int,
  /** 0~59 */
  val minute: Int,
  /** 길이 7, index 0=일요일 */
  val repeatDays: List<Boolean>,
  /** "default" | "custom" */
  val sound: String
)

object AlarmPrefs {
  private const val PREFS_NAME = "alarm_clock_prefs"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_HOUR = "hour"
  private const val KEY_MINUTE = "minute"
  private const val KEY_REPEAT_DAYS = "repeat_days"
  private const val KEY_SOUND = "sound"

  private const val DAYS_IN_WEEK = 7
  private val NO_DAYS = List(DAYS_IN_WEEK) { false }

  fun save(context: Context, config: AlarmConfig) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, config.enabled)
      .putInt(KEY_HOUR, config.hour)
      .putInt(KEY_MINUTE, config.minute)
      .putString(KEY_REPEAT_DAYS, encodeRepeatDays(config.repeatDays))
      .putString(KEY_SOUND, config.sound)
      .apply()
  }

  fun load(context: Context): AlarmConfig {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return AlarmConfig(
      enabled = prefs.getBoolean(KEY_ENABLED, false),
      hour = prefs.getInt(KEY_HOUR, 7),
      minute = prefs.getInt(KEY_MINUTE, 0),
      repeatDays = decodeRepeatDays(prefs.getString(KEY_REPEAT_DAYS, "") ?: ""),
      sound = prefs.getString(KEY_SOUND, "default") ?: "default"
    )
  }

  /** [true, false, ...] → "10....." 형태의 7자리 문자열. */
  fun encodeRepeatDays(days: List<Boolean>): String =
    days.joinToString("") { if (it) "1" else "0" }

  /** 손상된 값이 들어와도 크래시하지 않고 "반복 없음"으로 안전하게 처리한다. */
  fun decodeRepeatDays(encoded: String): List<Boolean> {
    if (encoded.length != DAYS_IN_WEEK) return NO_DAYS
    return encoded.map { it == '1' }
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd android && ./gradlew :alarm-clock:testDebugUnitTest --tests "expo.modules.alarmclock.AlarmPrefsTest"
```

Expected: PASS (3 tests)

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmPrefs 알람 상태 저장소 추가"
```

---

### Task 3: AlarmScheduler — 발동 시각 계산과 예약

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmScheduler.kt`
- Test: `modules/alarm-clock/android/src/test/java/expo/modules/alarmclock/AlarmSchedulerTest.kt`

**Interfaces:**
- Consumes: `AlarmConfig`, `AlarmPrefs` (Task 2)
- Produces:
  - `object AlarmScheduler { const val REQUEST_CODE_WEEKLY = 1; const val REQUEST_CODE_SNOOZE = 2; const val SNOOZE_MINUTES = 5; fun nextTriggerAtMillis(config: AlarmConfig, nowMillis: Long): Long?; fun scheduleNextWeeklyAlarm(context: Context); fun scheduleSnooze(context: Context); fun cancelAll(context: Context) }`

`nextTriggerAtMillis`는 순수 함수라 단위 테스트가 가능하다. 나머지는 `AlarmManager`에 의존하므로 실기기 검증(Task 10)에 맡긴다.

> **`lib/alarmTime.ts`와의 관계:** JS 쪽 계산은 저장 직후 "n시간 n분 후에 알람이 울려요" 토스트를
> 표시하기 위한 **표시 전용**이고, 실제 발동 시각을 결정하는 것은 여기 Kotlin 구현이다. 두 구현이
> 같은 규칙(오늘부터 7일 훑기, 0 이하면 다음 주)을 따르도록 유지하되, 별도의 JS 테스트
> 하네스는 만들지 않는다 — 어긋나도 토스트 문구만 부정확해지고 알람 자체는 정상 동작한다.

- [ ] **Step 1: 발동 시각 계산 실패 테스트 작성**

`modules/alarm-clock/android/src/test/java/expo/modules/alarmclock/AlarmSchedulerTest.kt`:

```kotlin
package expo.modules.alarmclock

import java.util.Calendar
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AlarmSchedulerTest {
  /** 테스트 기준 시각을 만든다. weekday는 Calendar 상수(SUNDAY=1 … SATURDAY=7). */
  private fun millisAt(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
    val cal = Calendar.getInstance(TimeZone.getDefault())
    cal.set(year, month - 1, day, hour, minute, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }

  private fun configOf(hour: Int, minute: Int, days: List<Boolean>, enabled: Boolean = true) =
    AlarmConfig(enabled = enabled, hour = hour, minute = minute, repeatDays = days, sound = "default")

  @Test
  fun `오늘 요일이 켜져 있고 시각이 아직 지나지 않았으면 오늘로 예약한다`() {
    // 2026-07-28은 화요일 → repeatDays index 2
    val now = millisAt(2026, 7, 28, 6, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 7, 28, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `오늘 요일이 켜져 있어도 시각이 지났으면 다음 주 같은 요일로 넘어간다`() {
    val now = millisAt(2026, 7, 28, 8, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 8, 4, 7, 0) // 다음 화요일

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `여러 요일 중 가장 가까운 발동 시각을 고른다`() {
    // 화요일 08:00 기준, 월~금 반복 → 수요일 07:00
    val now = millisAt(2026, 7, 28, 8, 0)
    val days = listOf(false, true, true, true, true, true, false)
    val expected = millisAt(2026, 7, 29, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `정확히 같은 시각이면 다음 주로 넘긴다`() {
    val now = millisAt(2026, 7, 28, 7, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 8, 4, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `반복 요일이 하나도 없으면 null 을 반환한다`() {
    val now = millisAt(2026, 7, 28, 6, 0)
    assertNull(AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, List(7) { false }), now))
  }

  @Test
  fun `enabled 가 false 면 null 을 반환한다`() {
    val now = millisAt(2026, 7, 28, 6, 0)
    val days = listOf(false, false, true, false, false, false, false)
    assertNull(AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days, enabled = false), now))
  }
}
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd android && ./gradlew :alarm-clock:testDebugUnitTest --tests "expo.modules.alarmclock.AlarmSchedulerTest"
```

Expected: FAIL — `Unresolved reference: AlarmScheduler`

- [ ] **Step 3: AlarmScheduler 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmScheduler.kt`:

```kotlin
package expo.modules.alarmclock

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

/**
 * 알람 발동 시각을 계산하고 AlarmManager에 예약한다.
 *
 * setAlarmClock()을 쓰는 이유: 구글이 알람 시계 앱을 위해 공식 지정한 API로, Doze 예외를 받고
 * 상태바에 알람 아이콘이 표시되며 제조사 배터리 관리자도 우선 인식한다.
 */
object AlarmScheduler {
  const val REQUEST_CODE_WEEKLY = 1
  const val REQUEST_CODE_SNOOZE = 2
  const val SNOOZE_MINUTES = 5

  private const val TAG = "AlarmScheduler"
  private const val DAYS_IN_WEEK = 7
  private const val MILLIS_PER_DAY = 24L * 60L * 60L * 1000L

  /**
   * 다음 발동 시각(epoch millis). 알람이 꺼져 있거나 반복 요일이 하나도 없으면 null.
   *
   * 계산 규칙은 JS의 lib/alarmTime.ts와 동일하다 — 오늘부터 7일을 훑어 켜져 있는 요일 중
   * 가장 가까운 미래 시각을 고르고, 차이가 0 이하면 다음 주로 넘긴다.
   */
  fun nextTriggerAtMillis(config: AlarmConfig, nowMillis: Long): Long? {
    if (!config.enabled) return null
    if (config.repeatDays.none { it }) return null

    val now = Calendar.getInstance().apply { timeInMillis = nowMillis }
    // Calendar.DAY_OF_WEEK: SUNDAY=1 … SATURDAY=7 → repeatDays index(0=일)로 변환
    val todayIndex = now.get(Calendar.DAY_OF_WEEK) - 1

    var best: Long? = null
    for (offset in 0 until DAYS_IN_WEEK) {
      val dayIndex = (todayIndex + offset) % DAYS_IN_WEEK
      if (!config.repeatDays[dayIndex]) continue

      val candidate = Calendar.getInstance().apply {
        timeInMillis = nowMillis
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, config.hour)
        set(Calendar.MINUTE, config.minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis

      // 이미 지났거나 정확히 지금이면 다음 주 같은 요일로.
      val resolved = if (candidate <= nowMillis) candidate + DAYS_IN_WEEK * MILLIS_PER_DAY else candidate

      if (best == null || resolved < best!!) best = resolved
    }
    return best
  }

  /** AlarmPrefs에 저장된 설정 기준으로 다음 주간 알람을 예약한다. 조건이 안 맞으면 취소만 한다. */
  fun scheduleNextWeeklyAlarm(context: Context) {
    val config = AlarmPrefs.load(context)
    val triggerAt = nextTriggerAtMillis(config, System.currentTimeMillis())

    if (triggerAt == null) {
      cancel(context, REQUEST_CODE_WEEKLY)
      return
    }
    setAlarm(context, triggerAt, REQUEST_CODE_WEEKLY)
  }

  /** 5분 뒤 1회성 알람. 주간 예약과 별개의 requestCode를 써서 공존한다. */
  fun scheduleSnooze(context: Context) {
    val triggerAt = System.currentTimeMillis() + SNOOZE_MINUTES * 60L * 1000L
    setAlarm(context, triggerAt, REQUEST_CODE_SNOOZE)
  }

  fun cancelAll(context: Context) {
    cancel(context, REQUEST_CODE_WEEKLY)
    cancel(context, REQUEST_CODE_SNOOZE)
  }

  private fun setAlarm(context: Context, triggerAtMillis: Long, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = firePendingIntent(context, requestCode)

    if (canScheduleExact(alarmManager)) {
      // 알람 아이콘 탭 시 앱을 열도록 show 인텐트도 함께 넘긴다.
      val showIntent = PendingIntent.getActivity(
        context,
        requestCode,
        MainActivityIntent.create(context, autoplay = false),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      alarmManager.setAlarmClock(
        AlarmManager.AlarmClockInfo(triggerAtMillis, showIntent),
        operation
      )
    } else {
      // 정확한 알람 권한이 없을 때의 폴백 — 몇 분 오차가 생길 수 있으나 울리기는 한다.
      Log.w(TAG, "정확한 알람 권한 없음 — setAndAllowWhileIdle 로 폴백합니다")
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation)
    }
  }

  private fun cancel(context: Context, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(firePendingIntent(context, requestCode))
  }

  private fun firePendingIntent(context: Context, requestCode: Int): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = AlarmReceiver.ACTION_FIRE
    }
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun canScheduleExact(alarmManager: AlarmManager): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
}
```

> 이 코드는 Task 4의 `AlarmReceiver`와 Task 6의 `MainActivityIntent`를 참조한다. 그 타입들이 아직 없으면 컴파일되지 않으므로, Step 4에서 최소 스텁을 먼저 만든다.

- [ ] **Step 4: 컴파일을 위한 최소 스텁 추가**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmReceiver.kt` (Task 4에서 완성):

```kotlin
package expo.modules.alarmclock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_FIRE = "com.onedayalarm.app.ALARM_FIRE"
  }

  override fun onReceive(context: Context, intent: Intent) {
    // Task 4에서 구현
  }
}
```

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/MainActivityIntent.kt`:

```kotlin
package expo.modules.alarmclock

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * RN 앱의 MainActivity를 여는 인텐트를 만든다.
 *
 * 암시적 딥링크(ACTION_VIEW + 스킴만)가 아니라 MainActivity를 명시적으로 지목해서,
 * 이미 떠 있는 인스턴스를 재사용하고 앱이 새 태스크로 중복 실행되지 않게 한다.
 */
object MainActivityIntent {
  private const val MAIN_ACTIVITY = "com.onedayalarm.app.MainActivity"

  fun create(context: Context, autoplay: Boolean): Intent {
    // autoplay 값은 매번 달라야 today.tsx가 반복 알람에서도 매번 재생을 트리거한다.
    val uri = if (autoplay) {
      Uri.parse("1dayclassic://today?autoplay=${System.currentTimeMillis()}")
    } else {
      Uri.parse("1dayclassic://today")
    }
    return Intent(Intent.ACTION_VIEW, uri).apply {
      setClassName(context.packageName, MAIN_ACTIVITY)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd android && ./gradlew :alarm-clock:testDebugUnitTest --tests "expo.modules.alarmclock.AlarmSchedulerTest"
```

Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmScheduler 발동 시각 계산 및 setAlarmClock 예약 추가"
```

---

### Task 4: AlarmReceiver — 발동 및 부팅 복원

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmReceiver.kt`
- Modify: `modules/alarm-clock/android/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `AlarmScheduler.scheduleNextWeeklyAlarm()` (Task 3), `AlarmRingingService.start()` (Task 5)
- Produces: `AlarmReceiver.ACTION_FIRE` 상수

- [ ] **Step 1: AlarmReceiver 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmReceiver.kt`:

```kotlin
package expo.modules.alarmclock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 알람 발동과 부팅 복원을 받는다.
 *
 * 중요: BOOT_COMPLETED 경로에서는 절대 포그라운드 서비스를 시작하지 않는다.
 * Android 15부터 BOOT_COMPLETED 리시버의 mediaPlayback 타입 FGS 시작이 금지되어 있다.
 * 부팅 시에는 AlarmManager 재예약만 수행한다.
 */
class AlarmReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_FIRE = "com.onedayalarm.app.ALARM_FIRE"
    private const val TAG = "AlarmReceiver"
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        Log.i(TAG, "부팅/업데이트 감지 — 알람을 재예약합니다")
        AlarmScheduler.scheduleNextWeeklyAlarm(context)
      }

      ACTION_FIRE -> {
        // 다음 주 알람을 "먼저" 재예약한다. 아래에서 예외가 나더라도 반복이 끊기지 않도록.
        AlarmScheduler.scheduleNextWeeklyAlarm(context)
        AlarmRingingService.start(context)
      }

      else -> Log.w(TAG, "알 수 없는 action: ${intent.action}")
    }
  }
}
```

- [ ] **Step 2: 매니페스트에 리시버 등록**

`modules/alarm-clock/android/src/main/AndroidManifest.xml` 전체를 다음으로 교체:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application>
        <receiver
            android:name=".AlarmReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
    </application>

</manifest>
```

> `POST_NOTIFICATIONS`는 지금까지 `expo-notifications` 플러그인이 자동으로 넣어주던 권한이다. Task 9에서 그 플러그인을 제거하므로 여기서 명시적으로 선언해야 한다.

- [ ] **Step 3: 컴파일 확인**

```bash
npx expo prebuild --platform android && cd android && ./gradlew :alarm-clock:compileDebugKotlin
```

Expected: `AlarmRingingService`가 아직 없어 FAIL. Task 5에서 해소된다. 그때까지 `AlarmRingingService.start(context)` 줄을 임시 주석 처리하고 컴파일이 통과하는지만 확인한 뒤, Task 5 완료 후 주석을 해제한다.

- [ ] **Step 4: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmReceiver 발동/부팅 복원 처리 추가"
```

---

### Task 5: AlarmRingingService — 소리와 FSI 알림

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmRingingService.kt`
- Create: `modules/alarm-clock/android/src/main/res/raw/alarm_1.mp3` (기존 `assets/music/alarm_1.mp3` 복사)
- Modify: `modules/alarm-clock/android/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `AlarmPrefs.load()` (Task 2), `AlarmScheduler.scheduleSnooze()` (Task 3), `MainActivityIntent.create()` (Task 3), `AlarmActivity` (Task 6)
- Produces:
  - `AlarmRingingService.start(context: Context)`
  - `AlarmRingingService.ACTION_DISMISS`, `ACTION_SNOOZE`
  - `AlarmRingingService.dismissIntent(context): Intent`, `snoozeIntent(context): Intent`

- [ ] **Step 1: 알람 음원을 모듈 리소스로 복사**

```bash
mkdir -p modules/alarm-clock/android/src/main/res/raw
cp assets/music/alarm_1.mp3 modules/alarm-clock/android/src/main/res/raw/alarm_1.mp3
```

> `res/raw` 파일명은 소문자·숫자·밑줄만 허용된다. `alarm_1.mp3`는 규칙에 맞다.

- [ ] **Step 2: AlarmRingingService 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmRingingService.kt`:

```kotlin
package expo.modules.alarmclock

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log

/**
 * 알람이 울리는 동안 살아 있는 포그라운드 서비스.
 *
 * AlarmActivity의 생명주기와 완전히 독립적이다 — 사용자가 알람 화면을 밀어 닫거나 화면이
 * 꺼져도, 끄기/스누즈를 누를 때까지 소리가 계속된다.
 */
class AlarmRingingService : Service() {

  companion object {
    const val ACTION_DISMISS = "com.onedayalarm.app.ALARM_DISMISS"
    const val ACTION_SNOOZE = "com.onedayalarm.app.ALARM_SNOOZE"

    private const val TAG = "AlarmRingingService"
    private const val CHANNEL_ID = "alarm-ringing"
    private const val NOTIFICATION_ID = 1001
    private const val WAKELOCK_TAG = "1dayclassic:alarm"
    /** 어떤 이유로든 서비스가 정상 종료되지 못했을 때 배터리를 계속 소모하지 않도록 하는 안전장치. */
    private const val WAKELOCK_TIMEOUT_MS = 10L * 60L * 1000L

    fun start(context: Context) {
      val intent = Intent(context, AlarmRingingService::class.java)
      context.startForegroundService(intent)
    }

    fun dismissIntent(context: Context): Intent =
      Intent(context, AlarmRingingService::class.java).apply { action = ACTION_DISMISS }

    fun snoozeIntent(context: Context): Intent =
      Intent(context, AlarmRingingService::class.java).apply { action = ACTION_SNOOZE }
  }

  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_DISMISS -> {
        stopEverything()
        return START_NOT_STICKY
      }
      ACTION_SNOOZE -> {
        AlarmScheduler.scheduleSnooze(this)
        stopEverything()
        return START_NOT_STICKY
      }
    }

    acquireWakeLock()
    startForeground(NOTIFICATION_ID, buildNotification())
    startAlarmSound()
    return START_STICKY
  }

  override fun onDestroy() {
    stopEverything()
    super.onDestroy()
  }

  private fun acquireWakeLock() {
    if (wakeLock != null) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG).apply {
      setReferenceCounted(false)
      acquire(WAKELOCK_TIMEOUT_MS)
    }
  }

  private fun startAlarmSound() {
    if (mediaPlayer != null) return

    val config = AlarmPrefs.load(this)
    val uri = if (config.sound == "custom") {
      android.net.Uri.parse("android.resource://$packageName/${R.raw.alarm_1}")
    } else {
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    }

    // USAGE_ALARM으로 지정하면 ALARM 스트림을 타게 되어, 별도 알람 볼륨으로 제어되고
    // 방해금지(Zen) 정책이 알람을 기본 허용 카테고리로 취급한다.
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    mediaPlayer = try {
      MediaPlayer().apply {
        setAudioAttributes(attributes)
        setDataSource(this@AlarmRingingService, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (e: Exception) {
      Log.e(TAG, "알람 음원 재생 실패", e)
      null
    }
  }

  private fun stopEverything() {
    mediaPlayer?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (e: IllegalStateException) {
        Log.w(TAG, "MediaPlayer 정지 실패", e)
      }
      it.release()
    }
    mediaPlayer = null

    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null

    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun buildNotification(): Notification {
    createChannel()

    val fullScreenIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(this, AlarmActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val dismissPending = PendingIntent.getService(
      this, 1, dismissIntent(this),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val snoozePending = PendingIntent.getService(
      this, 2, snoozeIntent(this),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("하루 클래식 알람")
      .setContentText("오늘의 곡을 들을 시간이에요")
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_MAX)
      .setOngoing(true)          // 스와이프로 지워지지 않는다
      .setAutoCancel(false)
      // 잠금/화면꺼짐일 때만 AlarmActivity가 전체화면으로 뜬다.
      // 사용자가 기기를 쓰고 있으면 OS가 헤드업 알림으로 격하시킨다 — 의도된 동작이다.
      .setFullScreenIntent(fullScreenIntent, true)
      // 전체화면이 안 뜨는 상황에서도 알람을 제어할 수 있도록 액션을 항상 넣는다.
      .addAction(0, "스누즈", snoozePending)
      .addAction(0, "끄기", dismissPending)
      .build()
  }

  private fun createChannel() {
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "알람",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "알람이 울릴 때 표시됩니다"
      // 소리는 MediaPlayer(ALARM 스트림)로만 재생한다. 채널 소리를 켜면 이중 재생된다.
      setSound(null, null)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 500, 500)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }
}
```

- [ ] **Step 3: 매니페스트에 서비스 등록**

`modules/alarm-clock/android/src/main/AndroidManifest.xml`의 `<application>` 안, `<receiver>` 앞에 추가:

```xml
        <service
            android:name=".AlarmRingingService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="false" />
```

- [ ] **Step 4: Task 4에서 주석 처리했던 호출 복구**

`AlarmReceiver.kt`의 `ACTION_FIRE` 분기에서 `AlarmRingingService.start(context)` 주석을 해제한다.

- [ ] **Step 5: 컴파일 확인**

```bash
npx expo prebuild --platform android && cd android && ./gradlew :alarm-clock:compileDebugKotlin
```

Expected: `AlarmActivity`가 아직 없어 FAIL. Task 6에서 해소된다.

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmRingingService 소리 재생 및 FSI 알림 추가"
```

---

### Task 6: AlarmActivity — 전체화면 알람 UI

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmActivity.kt`
- Create: `modules/alarm-clock/android/src/main/res/layout/activity_alarm.xml`
- Create: `modules/alarm-clock/android/src/main/res/values/styles.xml`
- Create: `modules/alarm-clock/android/src/main/res/values/colors.xml`
- Modify: `modules/alarm-clock/android/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `AlarmRingingService.dismissIntent()/snoozeIntent()` (Task 5), `MainActivityIntent.create()` (Task 3)
- Produces: `AlarmActivity` (Task 5의 FSI 타겟)

- [ ] **Step 0: androidx.activity 의존성 확인**

`ComponentActivity`와 `onBackPressedDispatcher`를 쓰려면 `androidx.activity`가 필요하다.
`modules/alarm-clock/android/build.gradle`의 `dependencies`에 없으면 추가:

```gradle
implementation 'androidx.activity:activity-ktx:1.9.3'
```

- [ ] **Step 1: 색상 리소스 정의**

`modules/alarm-clock/android/src/main/res/values/colors.xml` — 지정 팔레트(`constants/theme.ts`)의 값만 사용:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="alarm_bg">#FAF6EE</color>
    <color name="alarm_text_primary">#030303</color>
    <color name="alarm_text_secondary">#827F7A</color>
    <color name="alarm_accent">#8B6C42</color>
    <color name="alarm_on_accent">#FFFFFF</color>
    <color name="alarm_border">#E0DBD5</color>
</resources>
```

- [ ] **Step 2: 테마 정의**

`modules/alarm-clock/android/src/main/res/values/styles.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.AlarmFullScreen" parent="android:Theme.Material.NoActionBar.Fullscreen">
        <item name="android:windowBackground">@color/alarm_bg</item>
        <item name="android:statusBarColor">@color/alarm_bg</item>
        <item name="android:navigationBarColor">@color/alarm_bg</item>
        <item name="android:windowLightStatusBar">true</item>
    </style>
</resources>
```

- [ ] **Step 3: 레이아웃 작성**

`modules/alarm-clock/android/src/main/res/layout/activity_alarm.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="@color/alarm_bg"
    android:padding="32dp">

    <TextView
        android:id="@+id/alarm_time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textSize="64sp"
        android:textColor="@color/alarm_text_primary"
        android:textStyle="bold"
        tools:text="오전 7:00" />

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="12dp"
        android:text="하루 클래식 알람"
        android:textSize="18sp"
        android:textColor="@color/alarm_text_secondary" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="72dp"
        android:gravity="center">

        <Button
            android:id="@+id/button_snooze"
            android:layout_width="0dp"
            android:layout_weight="1"
            android:layout_height="64dp"
            android:layout_marginEnd="8dp"
            android:text="스누즈"
            android:textSize="18sp"
            android:textColor="@color/alarm_text_primary"
            android:background="@color/alarm_border" />

        <Button
            android:id="@+id/button_dismiss"
            android:layout_width="0dp"
            android:layout_weight="1"
            android:layout_height="64dp"
            android:layout_marginStart="8dp"
            android:text="끄기"
            android:textSize="18sp"
            android:textColor="@color/alarm_on_accent"
            android:background="@color/alarm_accent" />
    </LinearLayout>

</LinearLayout>
```

> 루트 태그에 `xmlns:tools="http://schemas.android.com/tools"` 를 추가해야 `tools:text`가 유효하다. 추가하거나 `tools:text` 줄을 삭제한다.

- [ ] **Step 4: AlarmActivity 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmActivity.kt`:

```kotlin
package expo.modules.alarmclock

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import java.util.Calendar

/**
 * 잠금화면 위에 뜨는 전체화면 알람 UI.
 *
 * launchMode="singleInstance": 이 액티비티는 앱의 정상 네비게이션 스택과 완전히 분리된
 * 자기만의 태스크에 홀로 존재한다. singleTask는 위에 다른 액티비티가 쌓일 수 있어
 * 이 격리를 보장하지 못한다.
 */
class AlarmActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    showOverLockScreen()
    setContentView(R.layout.activity_alarm)

    findViewById<TextView>(R.id.alarm_time).text = currentTimeLabel()

    findViewById<Button>(R.id.button_snooze).setOnClickListener {
      startService(AlarmRingingService.snoozeIntent(this))
      finish()
    }

    findViewById<Button>(R.id.button_dismiss).setOnClickListener {
      startService(AlarmRingingService.dismissIntent(this))
      // 갤럭시 기본 알람과의 유일한 차이 — 끄면 오늘의 곡으로 이동해 자동 재생한다.
      startActivity(MainActivityIntent.create(this, autoplay = true))
      finish()
    }

    // 알람 화면은 뒤로가기로 닫히지 않는다. Android 16에서는 onBackPressed()가 호출되지
    // 않으므로 반드시 이 방식을 써야 한다.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() = Unit
    })
  }

  /**
   * 잠금화면 위에 표시하고 꺼진 화면을 켠다.
   * setShowWhenLocked/setTurnScreenOn은 API 27+ 전용이라, 그 이전 버전은 윈도우 플래그로 처리한다.
   */
  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    // 잠금화면을 해제하지는 않는다 — 사용자가 직접 풀어야 앱 내용이 보인다.
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun currentTimeLabel(): String {
    val now = Calendar.getInstance()
    val hour24 = now.get(Calendar.HOUR_OF_DAY)
    val minute = now.get(Calendar.MINUTE)
    val meridiem = if (hour24 < 12) "오전" else "오후"
    val hour12 = if (hour24 % 12 == 0) 12 else hour24 % 12
    return String.format("%s %d:%02d", meridiem, hour12, minute)
  }
}
```

- [ ] **Step 5: 매니페스트에 액티비티 등록**

`modules/alarm-clock/android/src/main/AndroidManifest.xml`의 `<application>` 안에 추가:

```xml
        <activity
            android:name=".AlarmActivity"
            android:launchMode="singleInstance"
            android:excludeFromRecents="true"
            android:exported="false"
            android:enableOnBackInvokedCallback="false"
            android:taskAffinity=""
            android:theme="@style/Theme.AlarmFullScreen" />
```

- [ ] **Step 6: 전체 컴파일 확인**

```bash
npx expo prebuild --platform android && cd android && ./gradlew :alarm-clock:compileDebugKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 7: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmActivity 전체화면 알람 UI 추가"
```

---

### Task 7: AlarmClockModule — Expo Modules API 진입점

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockModule.kt`

**Interfaces:**
- Consumes: `AlarmPrefs` (Task 2), `AlarmScheduler` (Task 3)
- Produces: JS에서 호출 가능한 네이티브 함수 — `scheduleAlarm`, `cancelAlarm`, `getPermissionStatus`, `openAlarmPermissionSettings`

- [ ] **Step 1: AlarmClockModule 구현**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockModule.kt`:

```kotlin
package expo.modules.alarmclock

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmInput : Record {
  @Field val hour: Int = 7
  @Field val minute: Int = 0
  @Field val repeatDays: List<Boolean> = List(7) { false }
  @Field val sound: String = "default"
  @Field val enabled: Boolean = true
}

class AlarmClockModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AlarmClock")

    AsyncFunction("scheduleAlarm") { input: AlarmInput ->
      AlarmPrefs.save(
        context,
        AlarmConfig(
          enabled = input.enabled,
          hour = input.hour,
          minute = input.minute,
          repeatDays = input.repeatDays,
          sound = input.sound
        )
      )
      // 기존 스누즈 예약이 남아 있으면 새 설정과 충돌하므로 함께 정리한다.
      AlarmScheduler.cancelAll(context)
      AlarmScheduler.scheduleNextWeeklyAlarm(context)
    }

    AsyncFunction("cancelAlarm") {
      val current = AlarmPrefs.load(context)
      AlarmPrefs.save(context, current.copy(enabled = false))
      AlarmScheduler.cancelAll(context)
    }

    AsyncFunction("getPermissionStatus") {
      mapOf(
        "notifications" to hasNotificationPermission(),
        "exactAlarm" to hasExactAlarmPermission(),
        "fullScreenIntent" to hasFullScreenIntentPermission()
      )
    }

    AsyncFunction("openAlarmPermissionSettings") {
      val intent = when {
        !hasExactAlarmPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:${context.packageName}"))

        !hasFullScreenIntentPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(Uri.parse("package:${context.packageName}"))

        else ->
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:${context.packageName}"))
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  private fun hasNotificationPermission(): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.areNotificationsEnabled()
  }

  private fun hasExactAlarmPermission(): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return AlarmScheduler.canScheduleExact(alarmManager)
  }

  /** Android 14부터 사용자가 끄고 켤 수 있다. 그 이전 버전은 항상 허용. */
  private fun hasFullScreenIntentPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.canUseFullScreenIntent()
  }
}
```

- [ ] **Step 2: 컴파일 확인**

```bash
cd android && ./gradlew :alarm-clock:compileDebugKotlin
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 커밋**

```bash
git add modules/alarm-clock/android
git commit -m "feat(alarm): AlarmClockModule JS 브리지 추가"
```

---

### Task 8: JS API 및 AlarmContext 연결

**Files:**
- Modify: `modules/alarm-clock/index.ts`
- Create: `modules/alarm-clock/src/AlarmClock.types.ts`
- Modify: `context/AlarmContext.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `AlarmClockModule`의 네이티브 함수 (Task 7)
- Produces:
  - `scheduleAlarm(input: AlarmInput): Promise<void>`
  - `cancelAlarm(): Promise<void>`
  - `getPermissionStatus(): Promise<AlarmPermissionStatus>`
  - `openAlarmPermissionSettings(): Promise<void>`
  - `hasAllAlarmPermissions(status: AlarmPermissionStatus): boolean`

- [ ] **Step 1: 타입 정의**

`modules/alarm-clock/src/AlarmClock.types.ts`:

```ts
export interface AlarmInput {
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  /** 길이 7, index 0=일요일 */
  repeatDays: boolean[];
  sound: 'default' | 'custom';
  enabled: boolean;
}

export interface AlarmPermissionStatus {
  notifications: boolean;
  /** Android 12+ 에서만 의미가 있다. 그 이전 버전은 항상 true. */
  exactAlarm: boolean;
  /** Android 14+ 에서만 의미가 있다. 그 이전 버전은 항상 true. */
  fullScreenIntent: boolean;
}
```

- [ ] **Step 2: JS API 작성**

`modules/alarm-clock/index.ts`:

```ts
import { Platform, requireOptionalNativeModule } from 'expo-modules-core';

import type { AlarmInput, AlarmPermissionStatus } from './src/AlarmClock.types';

export type { AlarmInput, AlarmPermissionStatus };

/**
 * Android 전용 네이티브 알람 모듈. 다른 플랫폼이나 네이티브 모듈이 없는 환경(Expo Go)에서는
 * null이고, 아래 함수들은 전부 no-op으로 동작한다.
 */
const AlarmClock = Platform.OS === 'android' ? requireOptionalNativeModule('AlarmClock') : null;

const ALL_GRANTED: AlarmPermissionStatus = {
  notifications: true,
  exactAlarm: true,
  fullScreenIntent: true,
};

/** 알람을 예약한다. 기존 예약은 덮어쓴다. enabled=false면 취소만 수행한다. */
export async function scheduleAlarm(input: AlarmInput): Promise<void> {
  await AlarmClock?.scheduleAlarm(input);
}

/** 예약된 알람을 모두 취소한다. */
export async function cancelAlarm(): Promise<void> {
  await AlarmClock?.cancelAlarm();
}

/** 현재 권한 상태. 네이티브 모듈이 없으면 전부 허용된 것으로 간주한다. */
export async function getPermissionStatus(): Promise<AlarmPermissionStatus> {
  if (!AlarmClock) return ALL_GRANTED;
  return AlarmClock.getPermissionStatus();
}

/** 부족한 권한 중 우선순위가 높은 것의 설정 화면을 연다. */
export async function openAlarmPermissionSettings(): Promise<void> {
  await AlarmClock?.openAlarmPermissionSettings();
}

export function hasAllAlarmPermissions(status: AlarmPermissionStatus): boolean {
  return status.notifications && status.exactAlarm && status.fullScreenIntent;
}
```

- [ ] **Step 3: AlarmContext를 네이티브 API로 교체**

`context/AlarmContext.tsx`에서 `@/lib/notifications` import를 제거하고 다음으로 교체:

```ts
import { cancelAlarm, scheduleAlarm } from '@/modules/alarm-clock';
```

스케줄링 `useEffect`를 다음으로 교체:

```tsx
  // 알람이 바뀔 때마다 네이티브에 통째로 다시 예약한다. 네이티브가 SharedPreferences에
  // 사본을 들고 있어서, JS가 죽어도(앱 종료·재부팅) 스스로 반복·복원할 수 있다.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        if (alarm.enabled) {
          await scheduleAlarm({
            hour: alarm.hour,
            minute: alarm.minute,
            repeatDays: alarm.repeatDays,
            sound: alarm.sound,
            enabled: true,
          });
        } else {
          await cancelAlarm();
        }
      } catch (error) {
        console.warn('[alarm] 알람 예약 실패:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alarm, hydrated]);
```

알림 탭 리스너 `useEffect`(`getLaunchNotificationPayload` / `addAlarmNotificationTapListener`를 쓰는 블록) 전체를 삭제한다. 네이티브 `AlarmActivity`가 딥링크로 직접 처리하므로 불필요하다. `useRouter` import도 다른 곳에서 쓰지 않으면 함께 제거한다.

- [ ] **Step 4: 앱 시작 시 권한 확인 팝업 추가**

`app/_layout.tsx`에 추가:

```tsx
import { Alert } from 'react-native';
import { useEffect } from 'react';

import {
  getPermissionStatus,
  hasAllAlarmPermissions,
  openAlarmPermissionSettings,
} from '@/modules/alarm-clock';
```

`RootLayout` 컴포넌트 안, `if (!fontsLoaded) return null;` 위에 추가:

```tsx
  // 앱 시작 시 한 번만 확인한다. 권한이 모두 있으면 아무것도 표시하지 않는다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getPermissionStatus();
        if (cancelled || hasAllAlarmPermissions(status)) return;
        Alert.alert(
          '알람 권한 필요',
          '알람을 위해 필요한 권한을 허용해 주세요.',
          [
            { text: '나중에', style: 'cancel' },
            { text: '설정 열기', onPress: () => void openAlarmPermissionSettings() },
          ],
        );
      } catch (error) {
        console.warn('[alarm] 권한 상태 확인 실패:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit -p .
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock context/AlarmContext.tsx app/_layout.tsx
git commit -m "feat(alarm): JS API 추가 및 AlarmContext를 네이티브 알람으로 전환"
```

---

### Task 9: expo-notifications 제거

**Files:**
- Delete: `lib/notifications.ts`
- Modify: `package.json`
- Modify: `app.json`
- Delete: `assets/music/alarm_1.mp3` (Task 5에서 모듈 `res/raw`로 이동 완료)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

> **선행 조건:** Task 10의 실기기 검증이 통과한 뒤에 수행한다. 그 전에 제거하면 알람 기능이 아예 없는 구간이 생긴다.

- [ ] **Step 1: 남은 참조가 없는지 확인**

```bash
grep -rn "expo-notifications\|lib/notifications" --include="*.ts" --include="*.tsx" --include="*.json" . --exclude-dir=node_modules --exclude=package-lock.json
```

Expected: `package.json`과 `app.json`만 남아 있어야 한다. 다른 파일이 나오면 먼저 정리한다.

- [ ] **Step 2: 래퍼 파일 삭제**

```bash
rm lib/notifications.ts
```

- [ ] **Step 3: 패키지 제거**

```bash
npm uninstall expo-notifications
```

- [ ] **Step 4: app.json에서 플러그인 설정 제거**

`app.json`의 `plugins` 배열에서 다음 블록 전체를 삭제한다:

```json
      [
        "expo-notifications",
        {
          "color": "#2f95dc",
          "sounds": [
            "./assets/music/alarm_1.mp3"
          ]
        }
      ],
```

또한 `android.permissions`에서 `"android.permission.SCHEDULE_EXACT_ALARM"`을 제거한다 — 이 권한은 이제 모듈 매니페스트가 선언한다.

- [ ] **Step 5: 사용하지 않는 음원 삭제**

```bash
rm assets/music/alarm_1.mp3
```

> `assets/music/` 안의 다른 음원 파일은 곡 재생에 쓰이므로 건드리지 않는다. 디렉터리에 다른 파일이 있는지 먼저 확인할 것.

- [ ] **Step 6: 타입 체크 및 빌드 확인**

```bash
npx tsc --noEmit -p . && npx expo prebuild --clean --platform android
```

Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor(alarm): expo-notifications 제거 — 네이티브 알람으로 완전 대체"
```

---

### Task 10: 실기기 검증

**Files:** 없음 (검증만)

**Interfaces:**
- Consumes: Task 1~8의 전체 구현
- Produces: 검증 결과

네이티브 알람은 에뮬레이터와 실기기의 동작이 다르고(특히 Doze, 잠금화면, 제조사 커스터마이징) 자동화 테스트가 어렵다. Development Build를 실기기에 설치해 직접 확인한다.

- [ ] **Step 1: Development Build 설치**

```bash
npx expo prebuild --clean
npx expo run:android --device
```

- [ ] **Step 2: 권한 팝업 확인**

앱을 처음 실행했을 때:
- 권한이 부족하면 "알람을 위해 필요한 권한을 허용해 주세요." 팝업이 뜬다
- [설정 열기]를 누르면 해당 권한의 시스템 설정 화면으로 이동한다
- 권한을 모두 허용한 뒤 앱을 재시작하면 **팝업이 뜨지 않는다**

- [ ] **Step 3: 잠금화면 전체화면 알람 확인 (핵심 시나리오)**

1. 현재 시각 기준 2분 뒤로 알람 설정, 오늘 요일 켜기
2. 화면 끄기
3. 알람 시각 대기

확인:
- 화면이 자동으로 켜진다
- 잠금화면 위에 전체화면 알람 UI가 뜬다
- 알람 소리가 반복 재생된다
- 뒤로가기 제스처로 화면이 닫히지 않는다

- [ ] **Step 4: 기기 사용 중일 때 헤드업 알림 확인**

1. 2분 뒤로 알람 설정
2. 화면을 켜둔 채 앱을 사용하거나 다른 앱을 사용
3. 알람 시각 대기

확인:
- **전체화면이 뜨지 않고 헤드업 알림만** 표시된다 (의도된 동작)
- 알림에 [스누즈] [끄기] 버튼이 있다
- 소리는 동일하게 재생된다

- [ ] **Step 5: 서비스 지속성 확인**

알람이 울리는 중:
1. 전체화면 알람 화면을 최근 앱에서 밀어 닫거나 홈 버튼을 누른다

확인: **소리가 계속 재생된다.** 알림도 상단에 남아 있다.

- [ ] **Step 6: 끄기 동작 확인**

[끄기]를 누른다.

확인:
- 소리가 즉시 멈춘다
- 알림이 사라진다
- 앱의 '오늘의 곡' 화면이 열리고 곡이 자동 재생된다
- 앱이 중복 실행되지 않는다 (최근 앱에 하나만)

- [ ] **Step 7: 스누즈 동작 확인**

1. 알람을 다시 울리게 한 뒤 [스누즈]를 누른다

확인:
- 소리가 멈추고 화면이 닫힌다
- 앱이 열리지 않는다
- **5분 뒤 다시 울린다**

- [ ] **Step 8: 프로세스 종료 후 동작 확인**

1. 2분 뒤로 알람 설정
2. 최근 앱에서 앱을 스와이프해 종료
3. 대기

확인: 알람이 정상적으로 울린다.

- [ ] **Step 9: 재부팅 복원 확인**

1. 10분 뒤로 알람 설정
2. 기기 재부팅
3. 대기

확인: 알람이 정상적으로 울린다.

- [ ] **Step 10: 알람 설정 영속화 확인**

1. 알람을 오전 7시가 아닌 다른 시각으로 변경 후 저장
2. 앱을 완전히 종료 후 재실행

확인: 변경한 시각이 그대로 표시된다 (디폴트로 돌아가지 않는다).

- [ ] **Step 11: 검증 결과 기록**

실패한 항목이 있으면 원인을 조사해 수정하고 재검증한다. 모두 통과하면 Task 9(expo-notifications 제거)를 진행한다.

---

## 참고 문서

- 설계 스펙: `docs/superpowers/specs/2026-07-28-native-alarm-experience-design.md`
- Expo Modules API: https://docs.expo.dev/modules/module-api/
- 로컬 모듈 생성: https://docs.expo.dev/modules/get-started/
- Android 14 FSI 권한 변경: https://developer.android.com/about/versions/14/behavior-changes-14
- Android 15 FGS 제약: https://developer.android.com/about/versions/15/behavior-changes-15
- 백그라운드 액티비티 실행 제약: https://developer.android.com/guide/components/activities/background-starts
