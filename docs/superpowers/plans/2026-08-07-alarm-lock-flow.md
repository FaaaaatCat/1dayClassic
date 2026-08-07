# 잠금화면 위 알람 컨텐츠 플로우 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 알람 화면에서 `공부하기`를 누르면 잠금을 풀지 않고도 오늘의 공부가 보이고, 잠금 중에는 뒤로가기가 무효이며 홈 버튼은 잠금화면으로 나가게 한다.

**Architecture:** `showWhenLocked`를 매니페스트에 고정하지 않고, Expo 로컬 모듈이 꽂는 `ReactActivityLifecycleListener`가 `MainActivity` 생명주기에 올라타 알람 플로우 동안에만 런타임으로 켜고 끈다. 플로우 상태는 `AlarmFlow` 싱글턴 하나가 소유해 플래그와 상태가 어긋날 수 없게 한다.

**Tech Stack:** Kotlin, Expo Modules API (expo-modules-core `ReactActivityLifecycleListener` / `BasePackage`), React Native + expo-router, adb `dumpsys` 기반 실기기 검증

## Global Constraints

- **Android 전용.** iOS에서는 JS API가 no-op이다 (기존 `modules/alarm-clock/index.ts`의 `Platform.OS !== 'android'` 가드 유지)
- **새 npm/gradle 의존성 추가 금지.** 필요해지면 먼저 사용자에게 물을 것
- **`android/`와 `ios/`는 gitignore된 prebuild 생성물이다.** 이 폴더의 파일을 수정해 해결하지 말 것 — `expo prebuild`에 사라진다. 모든 네이티브 변경은 `modules/alarm-clock/` 안에서 한다
- **테스트 프레임워크가 없다.** jest도 테스트 파일도 없다. 검증은 (a) `npx tsc --noEmit` (b) gradle 빌드 성공 (c) 실기기 `dumpsys` 측정 세 가지다
- **빌드·설치 명령:** `android\gradlew.bat installDebug` (프로젝트 루트에서 `cd android` 후). `npx expo run:android`는 Metro를 재시작해 방해되므로 쓰지 말 것
- **dev build라 Metro가 떠 있어야 한다.** 꺼져 있으면 앱이 React 컨텍스트 없이 좀비로 뜬다. `npx expo start --dev-client --port 8081` + `adb reverse tcp:8081 tcp:8081`
- **알람을 adb로 강제 발화할 수 없다.** `AlarmReceiver`/`AlarmActivity`가 `exported="false"`다. 실기기 검증마다 앱 UI에서 알람을 2~3분 뒤로 맞추고 화면을 꺼야 한다
- **커밋은 master에 직접 한다.** 워크트리를 만들지 않는다
- **주석은 한국어로, 기존 파일들의 밀도와 톤을 따른다.** "왜 이렇게 했는가"를 적고 "무엇을 하는가"는 코드가 말하게 둔다

---

### Task 1: 검증 하네스

측정 없이는 이후 모든 태스크가 "된 것 같다"로 끝난다. 반복 가능한 측정 명령을 먼저 만든다.

**Files:**
- Create: `scripts/verify-alarm-lock.ps1`

**Interfaces:**
- Consumes: 없음
- Produces: `scripts/verify-alarm-lock.ps1` — `-Label <이름>` 인자를 받아 알람 화면을 기다렸다가 `공부하기`를 누르고, 전후의 `mKeyguardOccluded` / `topResumedActivity`를 `scripts/../.alarm-verify/<Label>.log`에 기록한다

- [ ] **Step 1: 스크립트 작성**

`scripts/verify-alarm-lock.ps1`:

```powershell
<#
  잠금화면 위 알람 플로우 검증 하네스.

  알람은 adb로 강제 발화할 수 없다(AlarmReceiver가 exported="false"). 그래서 이 스크립트는
  "알람이 울릴 때까지 기다렸다가" 측정한다 — 실행해 두고 폰에서 알람을 2~3분 뒤로 맞춘 뒤
  화면을 끄면 된다.

  판정은 눈이 아니라 dumpsys 값으로 한다:
    mKeyguardOccluded=true  → 잠금화면이 가려짐(컨텐츠가 보임)
    mKeyguardOccluded=false → 잠금화면이 앞
#>
param(
  [Parameter(Mandatory = $true)][string]$Label,
  [int]$TimeoutMinutes = 12,
  # 탭 없이 알람 화면 상태만 보고 끝낼 때 사용(뒤로가기·홈 시나리오는 수동 조작이 필요하다).
  [switch]$NoTap
)

$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "adb를 찾을 수 없습니다: $adb" }

$outDir = Join-Path $PSScriptRoot '..\.alarm-verify'
New-Item -ItemType Directory -Force $outDir | Out-Null
$out = Join-Path $outDir ($Label + '.log')
Set-Content -Path $out -Value ("=== " + $Label + " @ " + (Get-Date) + " ===") -Encoding utf8

function Log($m) { Add-Content $out $m; Write-Host $m }

function Get-Top {
  $hit = (& $adb shell dumpsys activity activities) |
    Where-Object { $_ -like '*topResumedActivity=*' } | Select-Object -First 1
  if ($hit) { return ($hit -replace '\s+', ' ').Trim() }
  return '(none)'
}

function Get-Occluded {
  $hit = (& $adb shell dumpsys window) |
    Where-Object { $_ -like '*mKeyguardOccluded=*' } | Select-Object -First 1
  if ($hit) { return ($hit -replace '\s+', ' ').Trim() }
  return '(none)'
}

function Snap($name) {
  & $adb shell screencap -p /sdcard/cl.png | Out-Null
  & $adb pull /sdcard/cl.png (Join-Path $outDir ($Label + '-' + $name + '.png')) | Out-Null
  & $adb shell rm /sdcard/cl.png | Out-Null
}

# 알람 화면의 '공부하기'는 레이아웃상 두 버튼 중 위쪽이다.
function Get-StudyButtonPoint {
  & $adb shell uiautomator dump /sdcard/ui.xml | Out-Null
  $local = Join-Path $outDir ($Label + '-ui.xml')
  & $adb pull /sdcard/ui.xml $local | Out-Null
  & $adb shell rm /sdcard/ui.xml | Out-Null

  $xml = Get-Content $local -Raw -Encoding utf8
  $pattern = '<node[^>]*class="android\.widget\.Button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
  $btns = @()
  foreach ($m in [regex]::Matches($xml, $pattern)) {
    $btns += [pscustomobject]@{
      x1 = [int]$m.Groups[1].Value; y1 = [int]$m.Groups[2].Value
      x2 = [int]$m.Groups[3].Value; y2 = [int]$m.Groups[4].Value
    }
  }
  Log ("  buttons: " + $btns.Count)
  if ($btns.Count -lt 1) { throw '알람 화면에서 버튼을 찾지 못했습니다' }
  $t = $btns | Sort-Object y1 | Select-Object -First 1
  return @([int](($t.x1 + $t.x2) / 2), [int](($t.y1 + $t.y2) / 2))
}

Log '[대기] 폰에서 알람을 2~3분 뒤로 맞추고 화면을 끄십시오.'
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$found = $false
while ((Get-Date) -lt $deadline) {
  if ((Get-Top) -like '*AlarmActivity*') { $found = $true; break }
  Start-Sleep -Milliseconds 1000
}
if (-not $found) { Log '[TIMEOUT] 알람 화면이 뜨지 않았습니다'; exit 1 }

Log ('[A] 알람 화면 @ ' + (Get-Date).ToString('HH:mm:ss'))
Log ('  top      : ' + (Get-Top))
Log ('  keyguard : ' + (Get-Occluded))
Snap 'A'

if ($NoTap) { Log '[NoTap] 여기서 종료합니다'; exit 0 }

$pt = Get-StudyButtonPoint
Log ('[TAP] ' + $pt[0] + ',' + $pt[1])
& $adb shell input tap $pt[0] $pt[1] | Out-Null

for ($i = 1; $i -le 6; $i++) {
  Start-Sleep -Milliseconds 1200
  Log ('[B.' + $i + '] top      : ' + (Get-Top))
  Log ('       keyguard : ' + (Get-Occluded))
}
Snap 'B'
Log '[완료]'
```

- [ ] **Step 2: `.alarm-verify` 산출물을 git에서 제외**

`.gitignore` 맨 아래에 추가:

```
# 알람 잠금화면 검증 산출물(로그·스크린샷)
/.alarm-verify/
```

- [ ] **Step 3: 현재 빌드로 실행해 "실패하는 상태"를 확인**

Metro가 떠 있고 `adb reverse`가 걸려 있어야 한다.

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label baseline
```

폰에서 알람을 2~3분 뒤로 맞추고 화면을 끈다.

Expected: `[A]`는 `mKeyguardOccluded=true`, `[B.1]`~`[B.6]`은 전부 **`mKeyguardOccluded=false`**.
이것이 고쳐야 할 증상이다. `[B]`가 이미 `true`라면 이전 검증용 변경이 남아 있는 것이니 찾아 되돌릴 것.

- [ ] **Step 4: 커밋**

```bash
git add scripts/verify-alarm-lock.ps1 .gitignore
git commit -m "chore(alarm): 잠금화면 위 알람 플로우 검증 하네스 추가"
```

---

### Task 2: 리스너 자동 등록 확인

이 계획 전체가 "`*Package.kt` 파일명 규약만으로 자동 등록된다"는 전제 위에 서 있다. 가장 값싼 방법으로 이 전제부터 확인한다. 여기서 틀리면 이후 태스크가 전부 헛돈다.

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockPackage.kt`
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt`

**Interfaces:**
- Consumes: Task 1의 하네스
- Produces: `AlarmFlowLifecycleListener` 클래스 (이 태스크에서는 로그만 남기는 껍데기). Task 4~6이 여기에 로직을 채운다

- [ ] **Step 1: Package 작성**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockPackage.kt`:

```kotlin
package expo.modules.alarmclock

import android.content.Context
import expo.modules.core.BasePackage
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * MainActivity의 생명주기에 알람 플로우 리스너를 꽂는다.
 *
 * MainActivity는 expo prebuild가 만드는 android/ 아래 생성 파일이라 직접 고칠 수 없다
 * (고쳐도 다음 prebuild에 사라진다). 이 Package는 파일명 규약(`*Package.kt`)만으로
 * ExpoModulesPackageList에 자동 등록되므로, git에 들어가는 이 모듈 안에서 후킹이 끝난다.
 */
class AlarmClockPackage : BasePackage() {
  override fun createReactActivityLifecycleListeners(
    activityContext: Context?
  ): List<ReactActivityLifecycleListener> = listOf(AlarmFlowLifecycleListener())
}
```

- [ ] **Step 2: 껍데기 리스너 작성**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt`:

```kotlin
package expo.modules.alarmclock

import android.app.Activity
import android.os.Bundle
import android.util.Log
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * 잠금화면 위 알람 컨텐츠 플로우를 MainActivity 생명주기에 얹는다.
 *
 * 콜백 인자는 Java 인터페이스에서 오는 플랫폼 타입이라 전부 nullable로 받는다.
 */
class AlarmFlowLifecycleListener : ReactActivityLifecycleListener {
  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    Log.i(TAG, "onCreate — 리스너가 살아있습니다")
  }

  companion object {
    const val TAG = "AlarmFlowListener"
  }
}
```

- [ ] **Step 3: 빌드**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: 생성된 목록에 등록됐는지 확인**

Run:
```bash
grep AlarmClockPackage node_modules/expo/android/build/generated/expo/src/main/java/expo/modules/ExpoModulesPackageList.kt
```
Expected: `expo.modules.alarmclock.AlarmClockPackage(),` 한 줄이 나온다.

**나오지 않으면 여기서 멈추고 보고할 것.** 규약 전제가 틀린 것이므로, 대안(Expo config plugin `withMainActivity`)으로 설계를 바꿔야 하고 그건 사용자 결정 사항이다.

- [ ] **Step 5: 런타임에 실제로 불리는지 확인**

Run:
```bash
adb shell am force-stop com.onedayalarm.app && adb shell monkey -p com.onedayalarm.app -c android.intent.category.LAUNCHER 1 && adb logcat -d -t 300 | grep AlarmFlowListener
```
Expected: `onCreate — 리스너가 살아있습니다`

- [ ] **Step 6: 커밋**

```bash
git add modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockPackage.kt modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt
git commit -m "feat(alarm): MainActivity 생명주기 리스너 등록"
```

---

### Task 3: 인텐트에 잠금 플로우 표시 붙이기

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/MainActivityIntent.kt`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `MainActivityIntent.EXTRA_LOCK_FLOW: String` — 인텐트 extra 키
  - `MainActivityIntent.today(context: Context, lockFlow: Boolean = false): Intent`

- [ ] **Step 1: `today()`에 캐시버스팅과 extra 추가**

`MainActivityIntent.kt`의 `today` 함수를 아래로 교체한다. `ad()`와 `create()`는 그대로 둔다.

```kotlin
  /** 잠금화면 위 알람 플로우로 열렸음을 MainActivity에 알리는 표시. */
  const val EXTRA_LOCK_FLOW = "alarm_lock_flow"

  /**
   * 알람 아이콘·알림 본문 탭, 그리고 알람의 '공부하기' — 오늘의 공부 화면을 연다.
   *
   * t 값은 매번 달라야 한다. 같은 URL로 다시 열면 expo-router가 이미 그 화면에 있다고 보고
   * 아무 일도 하지 않아, 반복 알람에서 두 번째부터 화면이 바뀌지 않는다(ad()와 같은 이유).
   *
   * lockFlow는 기기가 실제로 잠겨 있을 때만 true여야 한다 — 사용 중 알람이 울려 헤드업으로
   * 격하된 경우엔 잠금이 없으므로 플로우 제약도 걸리면 안 된다.
   */
  fun today(context: Context, lockFlow: Boolean = false): Intent =
    create(context, "1dayclassic://today?t=${System.currentTimeMillis()}")
      .putExtra(EXTRA_LOCK_FLOW, lockFlow)
```

- [ ] **Step 2: 빌드로 컴파일 확인**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`. `today(context)`를 인자 하나로 부르던 [AlarmScheduler.kt:109](../../../modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmScheduler.kt)는 기본값 덕에 그대로 컴파일된다.

- [ ] **Step 3: 커밋**

```bash
git add modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/MainActivityIntent.kt
git commit -m "feat(alarm): today 인텐트에 캐시버스팅과 잠금 플로우 표시 추가"
```

---

### Task 4: showWhenLocked 런타임 토글

이 태스크가 끝나면 **원래 증상이 사라진다** — 잠금 위에 오늘의 공부가 뜬다.

**Files:**
- Create: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlow.kt`
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt`
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmActivity.kt:80-85`
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmDismissActivity.kt:17-22`

**Interfaces:**
- Consumes: `MainActivityIntent.EXTRA_LOCK_FLOW`, `MainActivityIntent.today(context, lockFlow)` (Task 3)
- Produces:
  - `AlarmFlow.isActive: Boolean` (읽기 전용)
  - `AlarmFlow.isDeviceLocked(context: Context): Boolean`
  - `AlarmFlow.start(activity: Activity)` / `AlarmFlow.stop(activity: Activity)`
  - `AlarmFlow.observe(callback: ((Boolean) -> Unit)?)` — Task 7이 쓴다

- [ ] **Step 1: `AlarmFlow` 작성**

`modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlow.kt`:

```kotlin
package expo.modules.alarmclock

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.os.Build
import android.view.WindowManager

/**
 * 잠금화면 위 알람 컨텐츠 플로우의 상태를 소유한다.
 *
 * showWhenLocked 플래그와 "지금 알람 플로우인가"는 절대 어긋나면 안 된다. 어긋나는 순간
 * 알람과 무관하게 앱을 열어도 잠금화면 위에 노출되고, 폰을 주운 사람이 잠금 없이 앱을
 * 다 볼 수 있게 된다. 그래서 둘을 항상 이 한 곳에서 함께 바꾼다.
 */
object AlarmFlow {

  @Volatile
  var isActive: Boolean = false
    private set

  private var listener: ((Boolean) -> Unit)? = null

  /** JS가 플로우 변화를 구독한다. 콜백은 하나만 유지한다(구독자는 앱 하나뿐이다). */
  fun observe(callback: ((Boolean) -> Unit)?) {
    listener = callback
  }

  fun isDeviceLocked(context: Context): Boolean {
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    return keyguard.isKeyguardLocked
  }

  fun start(activity: Activity) {
    applyShowWhenLocked(activity, true)
    if (isActive) return
    isActive = true
    listener?.invoke(true)
  }

  fun stop(activity: Activity) {
    applyShowWhenLocked(activity, false)
    if (!isActive) return
    isActive = false
    listener?.invoke(false)
  }

  /** setShowWhenLocked는 API 27+ 전용이라 그 이전은 윈도우 플래그로 처리한다(AlarmActivity와 같은 규칙). */
  private fun applyShowWhenLocked(activity: Activity, enabled: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(enabled)
      return
    }
    @Suppress("DEPRECATION")
    if (enabled) {
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
    } else {
      activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
    }
  }
}
```

- [ ] **Step 2: 리스너에 진입·해제 배선**

`AlarmFlowLifecycleListener.kt` 전체를 아래로 교체:

```kotlin
package expo.modules.alarmclock

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * 잠금화면 위 알람 컨텐츠 플로우를 MainActivity 생명주기에 얹는다.
 *
 * 플래그를 켜는 일은 반드시 onCreate/onNewIntent에서 해야 한다 — 화면이 그려지기 전이라야
 * 키가드가 번쩍이지 않는다. JS가 마운트된 뒤 비동기로 켜면 이미 늦다.
 *
 * MainActivity는 singleTask라 이미 떠 있으면 onCreate가 아니라 onNewIntent로 온다. 둘 다 받는다.
 *
 * 콜백 인자는 Java 인터페이스에서 오는 플랫폼 타입이라 전부 nullable로 받는다.
 */
class AlarmFlowLifecycleListener : ReactActivityLifecycleListener {

  private var hostActivity: Activity? = null

  override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
    hostActivity = activity
    activity?.let { enterIfLockFlow(it, it.intent) }
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    hostActivity?.let { enterIfLockFlow(it, intent) }
    // 이 인텐트를 소비하지 않는다 — expo-router가 딥링크로 라우팅해야 한다.
    return false
  }

  /** 홈·최근앱으로 나가는 순간. 잠긴 기기라면 런처가 앞으로 나오면서 키가드가 알아서 복귀한다. */
  override fun onUserLeaveHint(activity: Activity?) {
    activity?.let { AlarmFlow.stop(it) }
  }

  /** 안전망 — 화면 꺼짐 등 어떤 경로로 벗어나든 플래그가 남지 않게 한다. */
  override fun onPause(activity: Activity?) {
    activity?.let { AlarmFlow.stop(it) }
  }

  override fun onDestroy(activity: Activity?) {
    activity?.let { AlarmFlow.stop(it) }
    if (hostActivity === activity) hostActivity = null
  }

  private fun enterIfLockFlow(activity: Activity, intent: Intent?) {
    val lockFlow = intent?.getBooleanExtra(MainActivityIntent.EXTRA_LOCK_FLOW, false) ?: false
    if (lockFlow) AlarmFlow.start(activity)
  }
}
```

- [ ] **Step 3: 알람 화면의 `공부하기` 배선**

`AlarmActivity.kt`의 `button_dismiss` 클릭 리스너를 아래로 교체:

```kotlin
    findViewById<Button>(R.id.button_dismiss).setOnClickListener {
      startService(AlarmRingingService.dismissIntent(this))
      // 갤럭시 기본 알람과의 유일한 차이 — 끄면 오늘의 공부로 이동한다.
      // 잠겨 있으면 잠금 위에 그대로 띄운다(알라미와 같은 경험).
      startActivity(MainActivityIntent.today(this, lockFlow = AlarmFlow.isDeviceLocked(this)))
      finish()
    }
```

- [ ] **Step 4: 알림의 `끄기`도 같은 경로로**

`AlarmDismissActivity.kt`의 `onCreate` 본문을 아래로 교체:

```kotlin
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startService(AlarmRingingService.dismissIntent(this))
    startActivity(MainActivityIntent.today(this, lockFlow = AlarmFlow.isDeviceLocked(this)))
    finish()
  }
```

- [ ] **Step 5: 빌드·설치**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 시나리오 1 측정 — 잠금 위에 컨텐츠가 뜨는가**

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label task4-lockflow
```
폰에서 알람을 2~3분 뒤로 맞추고 화면을 끈다.

Expected: `[A]` `mKeyguardOccluded=true`, **`[B.1]`~`[B.6]` 전부 `mKeyguardOccluded=true`**, top은 `MainActivity`. 스크린샷 `-B.png`에 오늘의 공부가 보인다.

- [ ] **Step 7: 시나리오 4 측정 — 프라이버시 회귀 검사**

알람과 무관하게 앱을 열었을 때 잠금 위에 뜨면 **안 된다.**

Run:
```bash
adb shell input keyevent 26 && adb shell am start -n com.onedayalarm.app/.MainActivity && adb shell dumpsys window | grep mKeyguardOccluded
```
(첫 `keyevent 26`으로 화면을 끄고 잠근다)

Expected: `mKeyguardOccluded=false`. **`true`가 나오면 플래그가 새고 있는 것이므로 여기서 멈추고 원인을 찾을 것.**

- [ ] **Step 8: 커밋**

```bash
git add modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/
git commit -m "feat(alarm): 알람 플로우 동안만 잠금화면 위에 컨텐츠 표시"
```

---

### Task 5: 뒤로가기 차단

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt`

**Interfaces:**
- Consumes: `AlarmFlow.isActive` (Task 4)
- Produces: 없음 (동작 변경만)

- [ ] **Step 1: `onBackPressed` 추가**

`AlarmFlowLifecycleListener.kt`의 `onDestroy` 바로 아래에 추가:

```kotlin
  /**
   * 잠금 중에는 뒤로가기를 삼킨다 — 알라미와 같다. 네이티브에서 막아야 JS가 느리거나
   * 죽어 있어도 뚫리지 않는다.
   */
  override fun onBackPressed(): Boolean = AlarmFlow.isActive
```

- [ ] **Step 2: 빌드·설치**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: 시나리오 2 측정 — 뒤로가기가 무효인가**

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label task5-back
```
알람이 울리고 스크립트가 `공부하기`를 눌러 컨텐츠가 뜬 뒤, 이어서:

```bash
adb shell input keyevent 4 && adb shell dumpsys window | grep mKeyguardOccluded && adb shell dumpsys activity activities | grep topResumedActivity
```

Expected: `mKeyguardOccluded=true` 유지, top은 여전히 `MainActivity`. 화면이 바뀌지 않는다.

- [ ] **Step 4: `onBackPressed`가 안 불릴 때의 폴백**

Step 3에서 뒤로가기로 화면이 빠져나갔다면 Android 16이 `onBackPressed`를 타지 않는 것이다. 그 경우에만 JS 폴백을 추가한다 — **Step 3이 통과했다면 이 스텝은 건너뛴다.**

`components/lesson/LessonDetailShell.tsx` 상단 import에 추가:

```tsx
import { BackHandler } from 'react-native';
```

그리고 컴포넌트 본문에 추가(`useAlarmLockFlow`는 Task 7에서 만든다 — 이 폴백이 필요하면 Task 7을 먼저 수행할 것):

```tsx
  // 잠금 중에는 뒤로가기를 삼킨다. 네이티브 onBackPressed가 이 기기에서 호출되지 않아 필요하다.
  useEffect(() => {
    if (!lockFlow) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [lockFlow]);
```

- [ ] **Step 5: 커밋**

```bash
git add modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlowLifecycleListener.kt
git commit -m "feat(alarm): 잠금 플로우 중 뒤로가기 차단"
```

---

### Task 6: 잠금 해제 시 플로우 종료

잠금을 풀었으면 제약을 풀고 평소 앱이 되어야 한다.

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlow.kt`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (`start`/`stop` 시그니처 변화 없음)

- [ ] **Step 1: `AlarmFlow`에 USER_PRESENT 구독 추가**

`AlarmFlow.kt`의 import에 추가:

```kotlin
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
```

`listener` 필드 아래에 추가:

```kotlin
  private var unlockReceiver: BroadcastReceiver? = null
```

`start`와 `stop`을 아래로 교체:

```kotlin
  fun start(activity: Activity) {
    applyShowWhenLocked(activity, true)
    if (isActive) return
    isActive = true
    registerUnlockReceiver(activity)
    listener?.invoke(true)
  }

  fun stop(activity: Activity) {
    applyShowWhenLocked(activity, false)
    if (!isActive) return
    isActive = false
    unregisterUnlockReceiver(activity)
    listener?.invoke(false)
  }
```

파일 끝의 `applyShowWhenLocked` 아래에 추가:

```kotlin
  /**
   * 잠금이 풀리면 플로우를 끝낸다 — 사용자가 잠금을 풀었는데도 앱이 갇혀 있으면 안 된다.
   * 상시 등록하지 않고 플로우 동안에만 등록한다.
   */
  private fun registerUnlockReceiver(activity: Activity) {
    if (unlockReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context?, intent: Intent?) {
        stop(activity)
      }
    }
    unlockReceiver = receiver

    val filter = IntentFilter(Intent.ACTION_USER_PRESENT)
    // API 33+는 등록 시 노출 여부를 명시해야 한다. 시스템 브로드캐스트라 NOT_EXPORTED로 충분하다.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      activity.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      activity.registerReceiver(receiver, filter)
    }
  }

  private fun unregisterUnlockReceiver(activity: Activity) {
    val receiver = unlockReceiver ?: return
    unlockReceiver = null
    // 액티비티가 이미 정리된 뒤면 등록이 남아 있지 않아 예외가 난다 — 무시해도 되는 상황이다.
    runCatching { activity.unregisterReceiver(receiver) }
  }
```

- [ ] **Step 2: 빌드·설치**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: 시나리오 5 측정 — 잠금 해제 후 평소 앱이 되는가**

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label task6-unlock
```
컨텐츠가 뜬 뒤 **폰에서 직접 잠금을 해제**하고:

```bash
adb shell dumpsys window | grep mKeyguardOccluded && adb logcat -d -t 200 | grep AlarmFlow
```

Expected: 잠금 해제 후 화면에 닫기(X) 버튼이 다시 보이고(Task 7 이후), 뒤로가기가 정상 동작한다.

- [ ] **Step 4: 커밋**

```bash
git add modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmFlow.kt
git commit -m "feat(alarm): 잠금 해제 시 알람 플로우 종료"
```

---

### Task 7: JS에 잠금 플로우 노출 + 이탈 경로 차단

**Files:**
- Modify: `modules/alarm-clock/android/src/main/java/expo/modules/alarmclock/AlarmClockModule.kt`
- Modify: `modules/alarm-clock/index.ts`
- Modify: `components/lesson/LessonDetailShell.tsx`

**Interfaces:**
- Consumes: `AlarmFlow.isActive`, `AlarmFlow.observe` (Task 4)
- Produces: `useAlarmLockFlow(): boolean` — `modules/alarm-clock`에서 export하는 React 훅

- [ ] **Step 1: 네이티브 모듈에 API·이벤트 추가**

`AlarmClockModule.kt`의 `ModuleDefinition` 안, `Name("AlarmClock")` 바로 아래에 추가:

```kotlin
    Events("onAlarmLockFlowChanged")

    /** 지금 잠금화면 위 알람 플로우인가. */
    AsyncFunction("isAlarmLockFlow") { AlarmFlow.isActive }

    OnStartObserving {
      AlarmFlow.observe { active ->
        sendEvent("onAlarmLockFlowChanged", mapOf("active" to active))
      }
    }

    OnStopObserving { AlarmFlow.observe(null) }
```

- [ ] **Step 2: JS 래퍼와 훅 추가**

`modules/alarm-clock/index.ts` 상단 import를 아래로 교체:

```ts
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
```

`AlarmClockNativeModule` 인터페이스에 두 줄 추가:

```ts
  isAlarmLockFlow(): Promise<boolean>;
  addListener(
    event: 'onAlarmLockFlowChanged',
    listener: (payload: { active: boolean }) => void,
  ): { remove(): void };
```

파일 맨 아래에 추가:

```ts
/**
 * 지금 잠금화면 위 알람 플로우인지 구독한다.
 *
 * 잠금 중에는 오늘의 공부에서 나갈 길이 없어야 하므로, 이 값이 참이면 화면을 벗어나는
 * 컨트롤을 감춘다. 네이티브 모듈이 없으면(iOS·Expo Go) 항상 false다.
 */
export function useAlarmLockFlow(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const nativeModule = getNativeModule();
    if (!nativeModule) return;

    let cancelled = false;
    // 이미 플로우 중일 때 마운트될 수 있다 — 이벤트만 기다리면 그 경우를 놓친다.
    nativeModule
      .isAlarmLockFlow()
      .then((value) => {
        if (!cancelled) setActive(value);
      })
      .catch(() => undefined);

    const subscription = nativeModule.addListener('onAlarmLockFlowChanged', (payload) => {
      setActive(payload.active);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return active;
}
```

- [ ] **Step 3: 닫기 버튼 숨기기**

`components/lesson/LessonDetailShell.tsx` import에 추가:

```tsx
import { useAlarmLockFlow } from '@/modules/alarm-clock';
```

컴포넌트 본문 위쪽(`insets` 선언 근처)에 추가:

```tsx
  // 잠금 위 알람 플로우에서는 이 화면을 벗어날 길이 없어야 한다 — 닫기가 유일한 출구라 감춘다.
  const lockFlow = useAlarmLockFlow();
```

`LessonDetailShell.tsx:88-105`의 닫기 블록(주석 포함)을 아래로 통째 교체한다:

```tsx
        {/* 닫기 — 헤더가 없어져서 이 화면을 벗어나는 유일한 길.
            ScaleButton은 Pressable로 감싼 뒤 내부 Animated.View에만 style을 넣는 구조라,
            position:absolute를 ScaleButton에 직접 주면 크기가 0인 바깥 Pressable을 기준으로
            계산돼 엉뚱한 자리(눌리지 않는 버튼)가 된다. 그래서 위치는 이 wrapper가 잡고
            ScaleButton은 크기만 갖는다(AudioListenSheet의 닫기 버튼과 같은 패턴).

            잠금 위 알람 플로우에서는 이 버튼을 아예 그리지 않는다 — 유일한 출구를 막아야
            잠금 상태에서 오늘의 공부를 벗어날 수 없다. */}
        {!lockFlow && (
          <View style={[styles.closeButtonWrap, { top: insets.top + 12 }]}>
            <ScaleButton
              accessibilityLabel="닫기"
              style={styles.closeButton}
              onPress={() => router.replace('/')}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={Colors.brown50}
                size={18}
              />
            </ScaleButton>
          </View>
        )}
```

- [ ] **Step 4: 타입 검사**

Run:
```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 5: 빌드·설치**

Run:
```bash
cd android && ./gradlew.bat installDebug --console=plain
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 시나리오 1 재측정 — 닫기 버튼이 사라졌는가**

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label task7-noexit
```
Expected: `[B]` 스크린샷에 우측 상단 닫기(X)가 **없다**. `mKeyguardOccluded=true` 유지.

잠금을 풀면 닫기(X)가 **다시 나타난다**(Task 6의 해제가 이벤트로 JS까지 도달하는지 확인).

- [ ] **Step 7: 커밋**

```bash
git add modules/alarm-clock/ components/lesson/LessonDetailShell.tsx
git commit -m "feat(alarm): 잠금 플로우 중 오늘의 공부 이탈 경로 차단"
```

---

### Task 8: 전체 회귀

스펙의 7개 시나리오를 한 번에 통과시킨다. 개별 태스크에서 이미 본 것도 **최종 빌드로 다시** 확인한다 — 뒤 태스크가 앞 태스크를 깨뜨렸을 수 있다.

**Files:**
- Create: `docs/superpowers/plans/2026-08-07-alarm-lock-flow-verification.md` (측정 결과 기록)

**Interfaces:**
- Consumes: Task 1~7 전부
- Produces: 검증 기록 문서

- [ ] **Step 1: 시나리오 1·2 — 잠금 위 표시와 뒤로가기 차단**

Run:
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-alarm-lock.ps1 -Label final-1-2
```
컨텐츠가 뜬 뒤:
```bash
adb shell input keyevent 4 && adb shell dumpsys window | grep mKeyguardOccluded
```
Expected: `[B]` 전부 `true`, 뒤로가기 후에도 `true`

- [ ] **Step 2: 시나리오 3 — 홈 버튼**

Run:
```bash
adb shell input keyevent 3 && adb shell dumpsys window | grep mKeyguardOccluded
```
Expected: `mKeyguardOccluded=false` (잠금화면)

- [ ] **Step 3: 시나리오 4 — 프라이버시 회귀**

Run:
```bash
adb shell am start -n com.onedayalarm.app/.MainActivity && adb shell dumpsys window | grep mKeyguardOccluded
```
Expected: `mKeyguardOccluded=false`. **여기가 통과하지 않으면 완료가 아니다.**

- [ ] **Step 4: 시나리오 5 — 잠금 해제 후 평소 앱**

알람을 다시 울려 컨텐츠까지 간 뒤 폰에서 잠금 해제.
Expected: 닫기(X) 복귀, 뒤로가기 정상 동작

- [ ] **Step 5: 시나리오 6 — 잠금이 없을 때**

폰 잠금을 푼 상태로 두고 알람을 울린다(헤드업 알림으로 격하됨). 알림의 `끄기`를 누른다.
Expected: 오늘의 공부로 이동. 닫기(X) 보임, 뒤로가기 정상. 제약이 걸리지 않는다.

- [ ] **Step 6: 시나리오 7 — 반복 알람 2회차**

같은 날 알람을 두 번 울린다(1회차 후 알람을 다시 2분 뒤로 재설정).
Expected: 2회차에도 1회차와 동일하게 오늘의 공부가 뜬다. 화면이 안 바뀌면 `t` 파라미터(Task 3)가 빠진 것이다.

- [ ] **Step 7: 결과 기록**

`docs/superpowers/plans/2026-08-07-alarm-lock-flow-verification.md`에 7개 시나리오의 실제 `mKeyguardOccluded` 값과 `topResumedActivity`를 표로 적는다. 기기 모델·Android 버전·측정 일시를 함께 남긴다.

- [ ] **Step 8: 커밋**

```bash
git add docs/superpowers/plans/2026-08-07-alarm-lock-flow-verification.md
git commit -m "docs(alarm): 잠금화면 플로우 검증 결과 기록"
```

---

## 사람이 반드시 개입해야 하는 지점

이 계획은 완전 자동화되지 않는다. 아래는 실기기 조작이 필요하다.

- **알람 발화** — 매 측정마다 앱에서 알람을 2~3분 뒤로 맞추고 화면 끄기
- **잠금 해제** — 시나리오 5
- **공공장소 배려** — `adb shell cmd media_session volume --stream 4 --set 1`로 알람음 최소화 가능(0 불가, 범위 `[1..15]`). 진동은 알림 채널 설정이라 별개로 남는다. 끝나면 원래 값으로 되돌릴 것
