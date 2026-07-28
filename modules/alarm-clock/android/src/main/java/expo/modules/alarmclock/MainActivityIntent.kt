package expo.modules.alarmclock

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * RN 앱의 MainActivity를 여는 인텐트를 만든다.
 *
 * 암시적 딥링크(ACTION_VIEW + 스킴만)가 아니라 MainActivity를 명시적으로 지목해서,
 * 이미 떠 있는 인스턴스를 재사용하고 앱이 새 태스크로 중복 실행되지 않게 한다.
 */
object MainActivityIntent {
  private const val MAIN_ACTIVITY = "com.onedayalarm.app.MainActivity"

  fun create(context: Context, autoplay: Boolean): Intent {
    // autoplay 값은 매번 달라야 today.tsx가 반복 알람에서도 매번 재생을 트리거한다.
    val uri = if (autoplay) {
      Uri.parse("1dayclassic://today?autoplay=${System.currentTimeMillis()}")
    } else {
      Uri.parse("1dayclassic://today")
    }
    return Intent(Intent.ACTION_VIEW, uri).apply {
      setClassName(context.packageName, MAIN_ACTIVITY)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
  }
}
