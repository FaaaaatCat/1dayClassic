package expo.modules.alarmclock

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import java.util.Calendar

/**
 * 잠금화면 위에 뜨는 전체화면 알람 UI.
 *
 * launchMode="singleInstance": 이 액티비티는 앱의 정상 네비게이션 스택과 완전히 분리된
 * 자기만의 태스크에 홀로 존재한다. singleTask는 위에 다른 액티비티가 쌓일 수 있어
 * 이 격리를 보장하지 못한다.
 */
class AlarmActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    showOverLockScreen()
    setContentView(R.layout.activity_alarm)

    findViewById<TextView>(R.id.alarm_time).text = currentTimeLabel()

    findViewById<Button>(R.id.button_snooze).setOnClickListener {
      startService(AlarmRingingService.snoozeIntent(this))
      finish()
    }

    findViewById<Button>(R.id.button_dismiss).setOnClickListener {
      startService(AlarmRingingService.dismissIntent(this))
      // 갤럭시 기본 알람과의 유일한 차이 — 끄면 오늘의 곡으로 이동해 자동 재생한다.
      startActivity(MainActivityIntent.create(this, autoplay = true))
      finish()
    }

    // 알람 화면은 뒤로가기로 닫히지 않는다. Android 16에서는 onBackPressed()가 호출되지
    // 않으므로 반드시 이 방식을 써야 한다.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() = Unit
    })
  }

  /**
   * 잠금화면 위에 표시하고 꺼진 화면을 켠다.
   * setShowWhenLocked/setTurnScreenOn은 API 27+ 전용이라, 그 이전 버전은 윈도우 플래그로 처리한다.
   */
  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    // 잠금화면을 해제하지는 않는다 — 사용자가 직접 풀어야 앱 내용이 보인다.
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun currentTimeLabel(): String {
    val now = Calendar.getInstance()
    val hour24 = now.get(Calendar.HOUR_OF_DAY)
    val minute = now.get(Calendar.MINUTE)
    val meridiem = if (hour24 < 12) "오전" else "오후"
    val hour12 = if (hour24 % 12 == 0) 12 else hour24 % 12
    return String.format("%s %d:%02d", meridiem, hour12, minute)
  }
}
