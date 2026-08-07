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
