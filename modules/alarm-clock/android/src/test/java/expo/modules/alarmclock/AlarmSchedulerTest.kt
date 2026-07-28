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
}
