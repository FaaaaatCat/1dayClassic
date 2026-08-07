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
