package expo.modules.alarmclock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_FIRE = "com.onedayalarm.app.ALARM_FIRE"
  }

  override fun onReceive(context: Context, intent: Intent) {
    // Task 4에서 구현
  }
}
