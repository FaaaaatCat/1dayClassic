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
