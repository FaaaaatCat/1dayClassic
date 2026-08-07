package expo.modules.alarmclock

import android.os.Bundle
import androidx.activity.ComponentActivity

/**
 * 알림의 '끄기' 액션이 거쳐 가는, 화면이 없는 액티비티.
 *
 * 알림 액션이 서비스를 직접 부르면 소리는 멈출 수 있어도 앱은 못 연다 — Android 10+는
 * 백그라운드에서의 액티비티 실행을 막는다. 알림 액션이 액티비티를 실행하는 것은 허용되므로,
 * 이 액티비티가 대신 소리를 끄고 오늘의 공부를 연 뒤 즉시 사라진다.
 *
 * 그래서 전체화면 알람의 끄기(AlarmActivity)와 헤드업 알림의 끄기가 같은 경험이 된다.
 */
class AlarmDismissActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    startService(AlarmRingingService.dismissIntent(this))
    startActivity(MainActivityIntent.today(this, lockFlow = AlarmFlow.isDeviceLocked(this)))
    finish()
  }
}
