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
   * 전면 광고 화면(app/ad.tsx)을 연다.
   *
   * **지금은 아무도 호출하지 않는다.** 알람을 끄면 광고를 거치지 않고 오늘의 공부로 바로
   * 가도록 바뀌었다 — 잠금화면 위에서 건너뛸 수 없는 광고를 보여 주는 것이 되기 때문이다.
   * 광고는 퀴즈를 푼 뒤로 자리를 옮길 예정이고, 그때 이 빌더를 그대로 쓴다.
   *
   * t 값은 매번 달라야 한다. 같은 URL로 다시 열면 expo-router가 이미 그 화면에 있다고 보고
   * 아무 일도 하지 않아, 반복 알람에서 두 번째부터 광고가 뜨지 않는다.
   */
  fun ad(context: Context): Intent =
    create(context, "1dayclassic://ad?t=${System.currentTimeMillis()}")

  /**
   * 그 앱의 첫 화면(런처가 여는 액티비티)을 지목한다.
   *
   * 이름을 박아 두지 않는 건 앱이 패키지 이름을 바꿔 가며 여러 벌로 빌드되기 때문이다 —
   * 데모 앱(com.onedayalarm.app.demo)은 MainActivity의 이름도 그만큼 달라진다. 박아 둔
   * 이름으로는 그 앱에서 알람의 '공부하기'가 아무것도 열지 못한다. 그래서 그 앱 스스로에게
   * 런처 액티비티를 물어 쓴다. 못 찾으면(있을 수 없는 경우) 패키지만 지목해 둔다.
   */
  private fun create(context: Context, uri: String): Intent {
    val launcher = context.packageManager.getLaunchIntentForPackage(context.packageName)?.component
    return Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
      if (launcher != null) component = launcher else setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
  }
}
