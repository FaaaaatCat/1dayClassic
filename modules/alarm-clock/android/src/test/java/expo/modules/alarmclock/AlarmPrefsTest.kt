package expo.modules.alarmclock

import org.junit.Assert.assertEquals
import org.junit.Test

class AlarmPrefsTest {
  @Test
  fun `encodeRepeatDays 는 월~금을 0111110 으로 인코딩한다`() {
    val weekdays = listOf(false, true, true, true, true, true, false)
    assertEquals("0111110", AlarmPrefs.encodeRepeatDays(weekdays))
  }

  @Test
  fun `decodeRepeatDays 는 인코딩을 역변환한다`() {
    assertEquals(
      listOf(false, true, true, true, true, true, false),
      AlarmPrefs.decodeRepeatDays("0111110")
    )
  }

  @Test
  fun `decodeRepeatDays 는 길이가 7이 아니면 전부 false 를 반환한다`() {
    assertEquals(List(7) { false }, AlarmPrefs.decodeRepeatDays("011"))
    assertEquals(List(7) { false }, AlarmPrefs.decodeRepeatDays(""))
  }
}
