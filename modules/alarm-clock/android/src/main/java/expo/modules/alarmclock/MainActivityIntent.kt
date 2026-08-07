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

  /** 잠금화면 위 알람 플로우로 열렸음을 MainActivity에 알리는 표시. */
  const val EXTRA_LOCK_FLOW = "alarm_lock_flow"

  /**
   * 알람 아이콘·알림 본문 탭, 그리고 알람의 '공부하기' — 오늘의 공부 화면을 연다.
   *
   * t 값은 매번 달라야 한다. 같은 URL로 다시 열면 expo-router가 이미 그 화면에 있다고 보고
   * 아무 일도 하지 않아, 반복 알람에서 두 번째부터 화면이 바뀌지 않는다(ad()와 같은 이유).
   *
   * lockFlow는 기기가 실제로 잠겨 있을 때만 true여야 한다 — 사용 중 알람이 울려 헤드업으로
   * 격하된 경우엔 잠금이 없으므로 플로우 제약도 걸리면 안 된다.
   */
  fun today(context: Context, lockFlow: Boolean = false): Intent =
    create(context, "1dayclassic://today?t=${System.currentTimeMillis()}")
      .putExtra(EXTRA_LOCK_FLOW, lockFlow)

  /**
   * 알람 끄기 — 전면 광고 화면(app/ad.tsx)을 연다. 광고를 닫으면 그쪽에서 오늘의 공부로 넘어간다.
   *
   * t 값은 매번 달라야 한다. 같은 URL로 다시 열면 expo-router가 이미 그 화면에 있다고 보고
   * 아무 일도 하지 않아, 반복 알람에서 두 번째부터 광고가 뜨지 않는다.
   */
  fun ad(context: Context): Intent =
    create(context, "1dayclassic://ad?t=${System.currentTimeMillis()}")

  private fun create(context: Context, uri: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
      setClassName(context.packageName, MAIN_ACTIVITY)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
}
