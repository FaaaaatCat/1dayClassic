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
