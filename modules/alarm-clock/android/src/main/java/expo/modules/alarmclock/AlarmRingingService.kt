package expo.modules.alarmclock

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder

/**
 * Task 5 자리표시자.
 *
 * 알람이 울릴 때 전체 화면 알림 + 소리 재생을 담당할 포그라운드 서비스.
 * Task 4는 AlarmReceiver가 컴파일되도록 최소 골격만 제공하고, Task 5에서
 * 실제 알림/재생 로직으로 교체한다.
 */
class AlarmRingingService : Service() {
  companion object {
    fun start(context: Context) {
      val intent = Intent(context, AlarmRingingService::class.java)
      context.startForegroundService(intent)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
