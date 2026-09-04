package expo.modules.alarmclock

import android.content.Context

/**
 * 알람 설정의 네이티브 측 단일 진실 공급원.
 *
 * JS가 죽어 있어도(앱 프로세스 종료, 재부팅) 네이티브 혼자 다음 알람을 재예약할 수 있어야
 * 하므로, JS의 AsyncStorage와 별개로 네이티브도 자체 사본을 들고 있는다.
 * JS가 scheduleAlarm()을 호출할 때마다 통째로 덮어쓴다.
 */
data class AlarmConfig(
  val enabled: Boolean,
  /** 0~23 */
  val hour: Int,
  /** 0~59 */
  val minute: Int,
  /** 길이 7, index 0=일요일 */
  val repeatDays: List<Boolean>
)

object AlarmPrefs {
  private const val PREFS_NAME = "alarm_clock_prefs"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_HOUR = "hour"
  private const val KEY_MINUTE = "minute"
  private const val KEY_REPEAT_DAYS = "repeat_days"

  private const val DAYS_IN_WEEK = 7
  private val NO_DAYS = List(DAYS_IN_WEEK) { false }

  fun save(context: Context, config: AlarmConfig) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, config.enabled)
      .putInt(KEY_HOUR, config.hour)
      .putInt(KEY_MINUTE, config.minute)
      .putString(KEY_REPEAT_DAYS, encodeRepeatDays(config.repeatDays))
      .apply()
  }

  fun load(context: Context): AlarmConfig {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return AlarmConfig(
      enabled = prefs.getBoolean(KEY_ENABLED, false),
      hour = prefs.getInt(KEY_HOUR, 7),
      minute = prefs.getInt(KEY_MINUTE, 0),
      repeatDays = decodeRepeatDays(prefs.getString(KEY_REPEAT_DAYS, "") ?: ""),
    )
  }

  /** [true, false, ...] → "10....." 형태의 7자리 문자열. */
  fun encodeRepeatDays(days: List<Boolean>): String =
    days.joinToString("") { if (it) "1" else "0" }

  /** 손상된 값이 들어와도 크래시하지 않고 "반복 없음"으로 안전하게 처리한다. */
  fun decodeRepeatDays(encoded: String): List<Boolean> {
    if (encoded.length != DAYS_IN_WEEK) return NO_DAYS
    return encoded.map { it == '1' }
  }
}
