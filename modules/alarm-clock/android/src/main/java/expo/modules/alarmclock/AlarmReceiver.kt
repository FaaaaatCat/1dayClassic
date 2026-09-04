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

      /*
       * 알람 화면은 여기서 직접 띄우지 않는다.
       *
       * 예전에는 startActivity로 AlarmActivity를 직접 실행했다 — 기기를 쓰는 중에도
       * 전체화면으로 덮기 위해서였고, 그러려면 '다른 앱 위에 표시'(SYSTEM_ALERT_WINDOW)
       * 권한이 있어야 했다. 없으면 Android가 백그라운드 액티비티 실행을 막는다(BAL_BLOCK).
       *
       * 그 권한을 걷어냈다. 다른 앱을 쓰는 중이라면 전체화면으로 덮지 않기로 했기 때문이다.
       * 이제 화면을 띄우는 일은 알림의 setFullScreenIntent 하나가 맡는다 —
       * 잠금·화면꺼짐이면 전체화면으로 뜨고, 기기를 쓰는 중이면 헤드업 알림으로 뜬다
       * (AlarmRingingService의 buildNotification 참고). 소리는 어느 쪽이든 서비스가 낸다.
       */
      ACTION_FIRE -> {
        // 다음 주 알람을 "먼저" 재예약한다. 아래에서 예외가 나더라도 반복이 끊기지 않도록.
        AlarmScheduler.scheduleNextWeeklyAlarm(context)
        AlarmRingingService.start(context)
      }

      else -> Log.w(TAG, "알 수 없는 action: ${intent.action}")
    }
  }
}
