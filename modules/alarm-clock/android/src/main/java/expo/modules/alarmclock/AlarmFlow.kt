package expo.modules.alarmclock

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import android.view.WindowManager

/**
 * 잠금화면 위 알람 컨텐츠 플로우의 상태를 소유한다.
 *
 * showWhenLocked 플래그와 "지금 알람 플로우인가"는 절대 어긋나면 안 된다. 어긋나는 순간
 * 알람과 무관하게 앱을 열어도 잠금화면 위에 노출되고, 폰을 주운 사람이 잠금 없이 앱을
 * 다 볼 수 있게 된다. 그래서 둘을 항상 이 한 곳에서 함께 바꾼다.
 */
object AlarmFlow {

  private const val TAG = "AlarmFlow"

  @Volatile
  var isActive: Boolean = false
    private set

  private var listener: ((Boolean) -> Unit)? = null

  private var unlockReceiver: BroadcastReceiver? = null

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
    registerUnlockReceiver(activity)
    listener?.invoke(true)
    Log.i(TAG, "잠금 플로우 시작 — showWhenLocked 켬")
  }

  fun stop(activity: Activity) {
    applyShowWhenLocked(activity, false)
    if (!isActive) return
    isActive = false
    unregisterUnlockReceiver(activity)
    listener?.invoke(false)
    Log.i(TAG, "잠금 플로우 종료 — showWhenLocked 끔")
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

  /**
   * 잠금이 풀리면 플로우를 끝낸다 — 사용자가 잠금을 풀었는데도 앱이 갇혀 있으면 안 된다.
   * 상시 등록하지 않고 플로우 동안에만 등록한다.
   *
   * **손으로는 이 경로를 탈 수 없다.** 플로우 중에는 이 앱이 잠금화면을 가리고 있어서
   * 화면을 껐다 켜도 잠금화면·지문 프롬프트가 보이지 않는다(실측 확인). 잠금을 풀려면
   * 먼저 홈으로 나가야 하고, 그러면 onUserLeaveHint가 이미 플로우를 끝낸다.
   *
   * 그래도 지우면 안 된다. Smart Lock(신뢰할 수 있는 장소·기기)이 켜져 있으면 사용자가
   * 아무 조작을 안 해도 키가드가 스스로 풀리는데, 그때 이게 없으면 잠금이 풀렸는데도
   * 뒤로가기가 막히고 닫기 버튼도 없는 상태에 갇힌다.
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
}
