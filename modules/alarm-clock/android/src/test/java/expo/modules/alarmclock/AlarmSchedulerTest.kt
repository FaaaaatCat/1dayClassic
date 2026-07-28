package expo.modules.alarmclock

import java.util.Calendar
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AlarmSchedulerTest {
  /** 테스트 기준 시각을 만든다. weekday는 Calendar 상수(SUNDAY=1 … SATURDAY=7). */
  private fun millisAt(year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
    val cal = Calendar.getInstance(TimeZone.getDefault())
    cal.set(year, month - 1, day, hour, minute, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }

  private fun configOf(hour: Int, minute: Int, days: List<Boolean>, enabled: Boolean = true) =
    AlarmConfig(enabled = enabled, hour = hour, minute = minute, repeatDays = days, sound = "default")

  @Test
  fun `오늘 요일이 켜져 있고 시각이 아직 지나지 않았으면 오늘로 예약한다`() {
    // 2026-07-28은 화요일 → repeatDays index 2
    val now = millisAt(2026, 7, 28, 6, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 7, 28, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `오늘 요일이 켜져 있어도 시각이 지났으면 다음 주 같은 요일로 넘어간다`() {
    val now = millisAt(2026, 7, 28, 8, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 8, 4, 7, 0) // 다음 화요일

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `여러 요일 중 가장 가까운 발동 시각을 고른다`() {
    // 화요일 08:00 기준, 월~금 반복 → 수요일 07:00
    val now = millisAt(2026, 7, 28, 8, 0)
    val days = listOf(false, true, true, true, true, true, false)
    val expected = millisAt(2026, 7, 29, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `정확히 같은 시각이면 다음 주로 넘긴다`() {
    val now = millisAt(2026, 7, 28, 7, 0)
    val days = listOf(false, false, true, false, false, false, false)
    val expected = millisAt(2026, 8, 4, 7, 0)

    assertEquals(expected, AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now))
  }

  @Test
  fun `반복 요일이 하나도 없으면 null 을 반환한다`() {
    val now = millisAt(2026, 7, 28, 6, 0)
    assertNull(AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, List(7) { false }), now))
  }

  @Test
  fun `enabled 가 false 면 null 을 반환한다`() {
    val now = millisAt(2026, 7, 28, 6, 0)
    val days = listOf(false, false, true, false, false, false, false)
    assertNull(AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days, enabled = false), now))
  }

  /** America/New_York 기준으로 지정한 벽시계 시각의 epoch millis를 만든다. 기본 타임존에 의존하지 않는다. */
  private fun millisAtNy(tz: TimeZone, year: Int, month: Int, day: Int, hour: Int, minute: Int): Long {
    val cal = Calendar.getInstance(tz)
    cal.set(year, month - 1, day, hour, minute, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
  }

  @Test
  fun `이미 지난 시각을 다음 주로 넘길 때 DST 전환을 건너도 벽시계 시각을 유지한다`() {
    val originalDefault = TimeZone.getDefault()
    val ny = TimeZone.getTimeZone("America/New_York")
    try {
      // AlarmScheduler는 Calendar.getInstance()(기본 타임존)를 쓰므로, 테스트 동안 JVM 기본 타임존을
      // America/New_York으로 고정해야 결정적으로 DST 경계를 넘는 상황을 재현할 수 있다.
      TimeZone.setDefault(ny)

      // 2026-03-08은 미국 동부 서머타임 시작일(현지시각 오전 2시 → 3시로 전환).
      // now = 2026-03-01(일) 08:00 EST, 알람은 07:00 → 오늘은 이미 지나 다음 주 일요일(2026-03-08)로 넘어간다.
      // 그 한 주 사이에 DST 전환이 끼어 있어, raw 밀리초(7*24h)를 더하면 08:00으로 밀리지만
      // Calendar.add(DAY_OF_YEAR, 7)로 다시 계산하면 벽시계 07:00을 그대로 유지한다.
      val now = millisAtNy(ny, 2026, 3, 1, 8, 0)
      val days = listOf(true, false, false, false, false, false, false) // 일요일만
      val expected = millisAtNy(ny, 2026, 3, 8, 7, 0)

      val actual = AlarmScheduler.nextTriggerAtMillis(configOf(7, 0, days), now)
      assertEquals(expected, actual)

      val resultCal = Calendar.getInstance(ny).apply { timeInMillis = actual!! }
      assertEquals(7, resultCal.get(Calendar.HOUR_OF_DAY))
      assertEquals(0, resultCal.get(Calendar.MINUTE))
    } finally {
      TimeZone.setDefault(originalDefault)
    }
  }
}
