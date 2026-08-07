package expo.modules.alarmclock

import android.content.Context
import java.io.File

/**
 * 알람 화면이 쓰는 '지금 고른 책' 한 벌 — 이름과 이미지 두 장.
 *
 * 알람이 울릴 때 JS는 안 돌고 있으므로(앱 종료·재부팅 직후에도 울려야 한다) 필요한 것은
 * 미리 네이티브 쪽에 내려와 있어야 한다. 알람 설정(AlarmPrefs)과 분리해 둔 이유는 갱신
 * 시점이 다르기 때문이다 — 알람 설정은 알람을 편집할 때, 이 값들은 서점에서 책을 고를 때 바뀐다.
 *
 * 이미지는 경로를 저장하지 않고 **자리를 고정**한다. 책이 227권까지 늘어나도 알람에 필요한 건
 * 늘 한 벌뿐이라, JS가 고른 책의 이미지를 이 두 파일에 덮어써 주기만 하면 된다.
 */
object AlarmBook {
  private const val PREFS_NAME = "alarm_clock_prefs"
  private const val KEY_NAME = "book_name"
  private const val KEY_COVER_STYLE = "book_cover_style"
  private const val DIR = "alarm"

  /**
   * 알람 전용으로 합성한 목업 표지 — 그림자·원근이 들어 있어 디자인 크기(156×211dp) 그대로 놓는다.
   */
  const val COVER_MOCKUP = "mockup"

  /**
   * 알람용 표지가 없어 서점 표지를 그대로 빌려 쓴 경우 — 납작한 사각형이고 비율도 달라
   * 조금 작게(148×219dp) 놓는다. 그래야 잘리지 않고 목업 표지와 무게감이 비슷해진다.
   */
  const val COVER_FLAT = "flat"

  /** 책을 아직 못 받았을 때 쓰는 문구 — "…할 시간입니다"의 앞부분으로 붙는다. */
  private const val FALLBACK_NAME = "오늘의 공부"
  private const val STUDY = "공부"

  /** 예: "하루 클래식 공부". JS의 getBookName()이 주는 값을 그대로 쓴다. */
  fun name(context: Context): String {
    val stored = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_NAME, null)
    return if (stored.isNullOrBlank()) FALLBACK_NAME else stored
  }

  /**
   * "…할 시간입니다" 앞에 붙는 말.
   *
   * 책 제목 대부분이 "하루 클래식 공부"처럼 '공부'로 끝나서 그대로 붙이면 되지만,
   * "하루 영어 교양"처럼 아닌 책이 있어 그때만 '공부'를 덧붙인다.
   * ("하루 영어 교양할"이 아니라 "하루 영어 교양 공부할"이 되도록)
   */
  fun studyLabel(context: Context): String {
    val name = name(context)
    return if (name.endsWith(STUDY)) name else "$name $STUDY"
  }

  fun save(context: Context, name: String, coverStyle: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_NAME, name)
      .putString(KEY_COVER_STYLE, coverStyle)
      .apply()
  }

  // 확장자를 붙이지 않는다 — BitmapFactory는 내용을 보고 판단하므로 jpg든 webp든 상관없고,
  // 이름에 .jpg가 박혀 있으면 webp를 넣을 때 헷갈린다.

  /** 배경 사진. 없으면 화면은 밤색 단색으로 뜬다. */
  fun backgroundFile(context: Context): File = File(dir(context), "background")

  /** 책 표지. 없으면 그 자리는 비워 두고 나머지 배치는 그대로 유지한다. */
  fun coverFile(context: Context): File = File(dir(context), "cover")

  /** 표지를 어느 크기로 놓을지 — COVER_MOCKUP 또는 COVER_FLAT. */
  fun coverStyle(context: Context): String =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_COVER_STYLE, COVER_MOCKUP) ?: COVER_MOCKUP

  /** JS가 이미지를 써 넣을 폴더. 없으면 JS 쪽에서 만든다. */
  fun dir(context: Context): File = File(context.filesDir, DIR)
}
