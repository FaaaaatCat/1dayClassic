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
    activity?.let {
      enterIfLockFlow(it, it.intent)
      showAlarmIfRinging(it)
    }
  }

  /** 아이콘으로 다시 열거나 최근 앱에서 돌아온 경우 — 이미 떠 있던 앱은 onCreate 없이 여기로 온다. */
  override fun onResume(activity: Activity?) {
    activity?.let { showAlarmIfRinging(it) }
  }

  /**
   * 알람이 울리는 동안 앱을 열면 홈이 아니라 알람 화면을 보여 준다.
   *
   * 알람 화면을 밀어 두고 앱을 열어도 끄기·스누즈를 누를 때까지는 알람 화면이 앞에 선다 —
   * 소리가 나는데 그걸 끌 자리가 안 보이면 안 되기 때문이다. AlarmActivity는 singleInstance라
   * 여러 번 불려도 하나뿐이다. 끄면 isRinging이 먼저 내려가므로 오늘의 공부는 그대로 열린다.
   */
  private fun showAlarmIfRinging(activity: Activity) {
    if (!AlarmRingingService.isRinging) return
    try {
      activity.startActivity(AlarmActivity.fireIntent(activity))
    } catch (e: Exception) {
      android.util.Log.w("AlarmFlowLifecycle", "알람 화면을 띄우지 못했습니다", e)
    }
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

  // onPause는 쓰지 않는다. expo의 ReactActivityDelegateWrapper가 onPause를
  // loadAppReady.await() 뒤로 미뤄 코루틴으로 전달하기 때문에, 시작 과정에서 생긴 pause가
  // onCreate의 start() '뒤에' 도착해 방금 켠 플래그를 즉시 꺼 버린다(실측으로 확인).
  // 화면 꺼짐도 플로우 종료가 아니다 — 플로우는 홈으로 나가거나 잠금을 풀 때만 끝난다.

  override fun onDestroy(activity: Activity?) {
    activity?.let { AlarmFlow.stop(it) }
    if (hostActivity === activity) hostActivity = null
  }

  /**
   * 잠금 중에는 뒤로가기를 삼킨다.
   *
   * **이것만으로는 막히지 않는다.** ReactActivityDelegateWrapper는 리스너 반환값과 무관하게
   * delegate.onBackPressed()를 호출하고, 그 경로가 invokeDefaultOnBackPressed()로 이어져
   * 액티비티를 끝낸다(실측 확인). 실제 차단은 LessonDetailShell의 RN BackHandler가 한다.
   * 여기서 true를 반환하는 것은 ReactActivity.onBackPressed의 super 호출을 막는 이중 방어다.
   */
  override fun onBackPressed(): Boolean = AlarmFlow.isActive

  private fun enterIfLockFlow(activity: Activity, intent: Intent?) {
    val lockFlow = intent?.getBooleanExtra(MainActivityIntent.EXTRA_LOCK_FLOW, false) ?: false
    if (lockFlow) AlarmFlow.start(activity)
  }
}
