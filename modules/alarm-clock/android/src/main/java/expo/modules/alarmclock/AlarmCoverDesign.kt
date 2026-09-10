package expo.modules.alarmclock

import android.graphics.Color

/**
 * 알람 화면이 그리는 표지 한 벌 — 종이색·잉크색·제목·저자·출판사 마크·패턴.
 *
 * 예전에는 표지가 이미지 파일이었다. JS가 목업 그림을 파일로 깔아 두면 알람은 그걸 띄우기만
 * 했는데, 표지를 코드로 그리기 시작하면서 깔아 둘 그림이 없어졌다. 그렇다고 알람이 울릴 때
 * JS를 깨워 그려 달라 할 수도 없다 — 앱이 죽어 있어도, 재부팅 직후에도 알람은 떠야 한다.
 *
 * 그래서 그림 대신 **그리는 데 필요한 값**을 미리 내려받아 둔다. 값은 문자열 한 줄로 묶어
 * SharedPreferences에 넣는다. 항목마다 키를 두면 늘 때마다 양쪽을 고쳐야 하는데, 이 값들은
 * 늘 한 벌로 함께 바뀌므로 한 줄로 다루는 편이 어긋날 자리가 없다.
 */
data class AlarmCoverDesign(
  val paper: Int,
  val ink: Int,
  val title: String,
  val author: String,
  val imprint: String,
  val mark: String,
  val dark: Boolean,
  val pattern: List<String>
) {

  fun pack(): String = listOf(
    hex(paper),
    hex(ink),
    title,
    author,
    imprint,
    mark,
    if (dark) "1" else "0",
    pattern.joinToString(ITEM)
  ).joinToString(UNIT)

  companion object {
    /** 항목 사이 — 제목이나 저자에 들어갈 일이 없는 제어문자를 쓴다. */
    private val UNIT = 31.toChar().toString()

    /** 패턴 낱개 사이. */
    private val ITEM = 30.toChar().toString()

    const val MARK_UNDERLINE = "underline"
    const val MARK_LOWLINE = "lowline"
    const val MARK_QUADRANT = "quadrant"
    const val MARK_HALFMOON = "halfmoon"

    /**
     * 아직 책을 못 받았을 때 그리는 표지.
     *
     * 빈 자리로 두지 않는 것은, 알람 화면의 구도가 표지 자리를 비워 두면 무너지기 때문이다.
     * 색은 어느 출판사 것도 아닌 중립적인 미색으로 둔다.
     */
    val FALLBACK = AlarmCoverDesign(
      paper = Color.parseColor("#EDE7D8"),
      ink = Color.parseColor("#26221C"),
      title = "오늘의 책",
      author = "",
      imprint = "",
      mark = MARK_UNDERLINE,
      dark = false,
      pattern = emptyList()
    )

    fun of(
      paper: String,
      ink: String,
      title: String,
      author: String,
      imprint: String,
      mark: String,
      dark: Boolean,
      pattern: List<String>
    ): AlarmCoverDesign = AlarmCoverDesign(
      paper = color(paper, FALLBACK.paper),
      ink = color(ink, FALLBACK.ink),
      title = title,
      author = author,
      imprint = imprint,
      mark = mark,
      dark = dark,
      pattern = pattern
    )

    /** 묶어 둔 한 줄을 되돌린다. 모양이 어긋나면 null — 부르는 쪽이 기본 표지로 넘어간다. */
    fun parse(packed: String?): AlarmCoverDesign? {
      if (packed.isNullOrBlank()) return null
      val parts = packed.split(UNIT)
      if (parts.size < 8) return null
      return AlarmCoverDesign(
        paper = color(parts[0], FALLBACK.paper),
        ink = color(parts[1], FALLBACK.ink),
        title = parts[2],
        author = parts[3],
        imprint = parts[4],
        mark = parts[5],
        dark = parts[6] == "1",
        pattern = if (parts[7].isEmpty()) emptyList() else parts[7].split(ITEM)
      )
    }

    /** 색 문자열이 깨져 있어도 알람은 떠야 한다 — 못 읽으면 기본색으로 간다. */
    private fun color(value: String, fallback: Int): Int = try {
      Color.parseColor(value)
    } catch (error: IllegalArgumentException) {
      fallback
    }

    private fun hex(color: Int): String = String.format("#%06X", 0xFFFFFF and color)
  }
}
