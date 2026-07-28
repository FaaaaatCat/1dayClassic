package expo.modules.alarmclock

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import java.util.Calendar

/**
 * 알람 발동 시각을 계산하고 AlarmManager에 예약한다.
 *
 * setAlarmClock()을 쓰는 이유: 구글이 알람 시계 앱을 위해 공식 지정한 API로, Doze 예외를 받고
 * 상태바에 알람 아이콘이 표시되며 제조사 배터리 관리자도 우선 인식한다.
 */
object AlarmScheduler {
  const val REQUEST_CODE_WEEKLY = 1
  const val REQUEST_CODE_SNOOZE = 2
  const val SNOOZE_MINUTES = 5

  private const val TAG = "AlarmScheduler"
  private const val DAYS_IN_WEEK = 7
  private const val MILLIS_PER_DAY = 24L * 60L * 60L * 1000L

  /**
   * 다음 발동 시각(epoch millis). 알람이 꺼져 있거나 반복 요일이 하나도 없으면 null.
   *
   * 계산 규칙은 JS의 lib/alarmTime.ts와 동일하다 — 오늘부터 7일을 훑어 켜져 있는 요일 중
   * 가장 가까운 미래 시각을 고르고, 차이가 0 이하면 다음 주로 넘긴다.
   */
  fun nextTriggerAtMillis(config: AlarmConfig, nowMillis: Long): Long? {
    if (!config.enabled) return null
    if (config.repeatDays.none { it }) return null

    val now = Calendar.getInstance().apply { timeInMillis = nowMillis }
    // Calendar.DAY_OF_WEEK: SUNDAY=1 … SATURDAY=7 → repeatDays index(0=일)로 변환
    val todayIndex = now.get(Calendar.DAY_OF_WEEK) - 1

    var best: Long? = null
    for (offset in 0 until DAYS_IN_WEEK) {
      val dayIndex = (todayIndex + offset) % DAYS_IN_WEEK
      if (!config.repeatDays[dayIndex]) continue

      val candidate = Calendar.getInstance().apply {
        timeInMillis = nowMillis
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, config.hour)
        set(Calendar.MINUTE, config.minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }.timeInMillis

      // 이미 지났거나 정확히 지금이면 다음 주 같은 요일로.
      val resolved = if (candidate <= nowMillis) candidate + DAYS_IN_WEEK * MILLIS_PER_DAY else candidate

      if (best == null || resolved < best!!) best = resolved
    }
    return best
  }

  /** AlarmPrefs에 저장된 설정 기준으로 다음 주간 알람을 예약한다. 조건이 안 맞으면 취소만 한다. */
  fun scheduleNextWeeklyAlarm(context: Context) {
    val config = AlarmPrefs.load(context)
    val triggerAt = nextTriggerAtMillis(config, System.currentTimeMillis())

    if (triggerAt == null) {
      cancel(context, REQUEST_CODE_WEEKLY)
      return
    }
    setAlarm(context, triggerAt, REQUEST_CODE_WEEKLY)
  }

  /** 5분 뒤 1회성 알람. 주간 예약과 별개의 requestCode를 써서 공존한다. */
  fun scheduleSnooze(context: Context) {
    val triggerAt = System.currentTimeMillis() + SNOOZE_MINUTES * 60L * 1000L
    setAlarm(context, triggerAt, REQUEST_CODE_SNOOZE)
  }

  fun cancelAll(context: Context) {
    cancel(context, REQUEST_CODE_WEEKLY)
    cancel(context, REQUEST_CODE_SNOOZE)
  }

  private fun setAlarm(context: Context, triggerAtMillis: Long, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = firePendingIntent(context, requestCode)

    if (canScheduleExact(alarmManager)) {
      // 알람 아이콘 탭 시 앱을 열도록 show 인텐트도 함께 넘긴다.
      val showIntent = PendingIntent.getActivity(
        context,
        requestCode,
        MainActivityIntent.create(context, autoplay = false),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      alarmManager.setAlarmClock(
        AlarmManager.AlarmClockInfo(triggerAtMillis, showIntent),
        operation
      )
    } else {
      // 정확한 알람 권한이 없을 때의 폴백 — 몇 분 오차가 생길 수 있으나 울리기는 한다.
      Log.w(TAG, "정확한 알람 권한 없음 — setAndAllowWhileIdle 로 폴백합니다")
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation)
    }
  }

  private fun cancel(context: Context, requestCode: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(firePendingIntent(context, requestCode))
  }

  private fun firePendingIntent(context: Context, requestCode: Int): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = AlarmReceiver.ACTION_FIRE
    }
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun canScheduleExact(alarmManager: AlarmManager): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
}
