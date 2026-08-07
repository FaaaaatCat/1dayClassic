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
        showAlarmScreen(context)
      }

      else -> Log.w(TAG, "알 수 없는 action: ${intent.action}")
    }
  }

  /**
   * 알람 화면을 직접 띄운다 — 기기를 쓰는 중이어도 전체화면으로 뜨게 하기 위해서다.
   *
   * setFullScreenIntent만으로는 부족하다. 그건 기기가 잠겨 있거나 화면이 꺼져 있을 때만
   * 액티비티를 실행하고, 사용자가 기기를 쓰고 있으면 OS가 헤드업 알림으로 격하시킨다.
   * 알라미처럼 "언제나 전체화면"이 되려면 직접 실행해야 한다.
   *
   * **'다른 앱 위에 표시'(SYSTEM_ALERT_WINDOW) 권한이 있어야 성공한다.** 없으면 Android가
   * 백그라운드 액티비티 실행을 막는다:
   *
   *   Background activity launch blocked! ... callingUidProcState: FOREGROUND_SERVICE
   *   START ... AlarmActivity ... (BAL_BLOCK) result code=102
   *
   * setAlarmClock()이 주는 임시 허용목록(ALARM_MANAGER_ALARM_CLOCK)은 포그라운드 서비스
   * 시작만 허용하고 액티비티 실행은 허용하지 않는다 — 실측으로 확인했다. 오버레이 권한이
   * 있으면 BAL_ALLOW_NON_APP_VISIBLE_WINDOW로 통과한다. 알라미가 이 권한을 요구하는
   * 이유가 이것이다.
   *
   * setFullScreenIntent도 그대로 둔다 — 잠금 상태에서는 그쪽이 공식 경로라 권한이 없어도
   * 전체화면이 뜬다. AlarmActivity가 singleInstance라 둘 다 발동해도 인스턴스는 하나다.
   */
  private fun showAlarmScreen(context: Context) {
    try {
      context.startActivity(AlarmActivity.fireIntent(context))
    } catch (e: Exception) {
      // 실행이 막혀도 알람 자체는 울려야 한다 — 소리는 이미 서비스가 내고 있고,
      // 잠금 상태라면 전체화면 인텐트가 화면을 대신 띄운다.
      Log.w(TAG, "알람 화면 직접 실행 실패 — 전체화면 인텐트에 맡깁니다", e)
    }
  }
}
