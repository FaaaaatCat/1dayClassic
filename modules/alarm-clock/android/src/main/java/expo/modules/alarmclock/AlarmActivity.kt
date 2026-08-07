package expo.modules.alarmclock

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * 잠금화면 위에 뜨는 전체화면 알람 UI.
 *
 * launchMode="singleInstance": 이 액티비티는 앱의 정상 네비게이션 스택과 완전히 분리된
 * 자기만의 태스크에 홀로 존재한다. singleTask는 위에 다른 액티비티가 쌓일 수 있어
 * 이 격리를 보장하지 못한다.
 *
 * 미리보기 모드(previewIntent)로도 뜬다 — 설정의 '알람 테스트'가 책마다 화면이 어떻게
 * 보이는지 확인하려고 쓴다. 실제 알람과 **같은 레이아웃·같은 그리기 코드**를 타야 확인에
 * 의미가 있으므로 별도 화면을 만들지 않고 이 액티비티를 재사용한다.
 */
class AlarmActivity : ComponentActivity() {

  /** 미리보기에서 한 장씩 넘겨 볼 책. 실제 알람에서는 쓰지 않는다. */
  private class PreviewBook(
    val name: String,
    val coverStyle: String,
    val backgroundPath: String,
    val coverPath: String
  )

  private var previewBooks: List<PreviewBook> = emptyList()
  private var previewIndex = 0

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    previewBooks = readPreviewBooks(intent)
    val isPreview = previewBooks.isNotEmpty()

    // 미리보기는 앱 안에서 여는 화면이라 화면을 억지로 켜거나 잠금 위에 띄울 이유가 없다.
    if (!isPreview) showOverLockScreen()
    setContentView(R.layout.activity_alarm)

    showClock()
    if (isPreview) setUpPreview() else setUpAlarm()
  }

  private fun showClock() {
    val now = Calendar.getInstance()
    findViewById<TextView>(R.id.alarm_time).text = TIME_FORMAT.format(now.time)
    findViewById<TextView>(R.id.alarm_date).text = DATE_FORMAT.format(now.time)
  }

  // ---- 실제 알람 -------------------------------------------------------------

  private fun setUpAlarm() {
    showBook(
      name = AlarmBook.studyLabel(this),
      coverStyle = AlarmBook.coverStyle(this),
      background = AlarmBook.backgroundFile(this),
      cover = AlarmBook.coverFile(this)
    )

    findViewById<Button>(R.id.button_snooze).setOnClickListener {
      startService(AlarmRingingService.snoozeIntent(this))
      finish()
    }

    findViewById<Button>(R.id.button_dismiss).setOnClickListener {
      startService(AlarmRingingService.dismissIntent(this))
      // 갤럭시 기본 알람과의 유일한 차이 — 끄면 오늘의 공부로 이동한다.
      // 잠겨 있으면 잠금 위에 그대로 띄운다(알라미와 같은 경험).
      startActivity(MainActivityIntent.today(this, lockFlow = AlarmFlow.isDeviceLocked(this)))
      finish()
    }

    // 알람 화면은 뒤로가기로 닫히지 않는다. Android 16에서는 onBackPressed()가 호출되지
    // 않으므로 반드시 이 방식을 써야 한다.
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() = Unit
    })
  }

  // ---- 미리보기 --------------------------------------------------------------

  private fun setUpPreview() {
    findViewById<View>(R.id.preview_bar).visibility = View.VISIBLE
    findViewById<View>(R.id.preview_close).setOnClickListener { finish() }

    // 버튼은 디자인의 일부라 그대로 두되 눌리지는 않게 한다. 클릭을 안 받아야 그 위를
    // 터치해도 뒤의 루트로 전달되어 '다음 책'으로 넘어간다.
    listOf(R.id.button_dismiss, R.id.button_snooze).forEach { id ->
      findViewById<Button>(id).apply {
        isClickable = false
        isFocusable = false
      }
    }

    findViewById<View>(R.id.alarm_root).setOnClickListener {
      previewIndex = (previewIndex + 1) % previewBooks.size
      showPreviewBook()
    }

    showPreviewBook()
  }

  private fun showPreviewBook() {
    val book = previewBooks[previewIndex]
    showBook(
      name = studyLabel(book.name),
      coverStyle = book.coverStyle,
      background = File(book.backgroundPath),
      cover = File(book.coverPath)
    )
  }

  /** AlarmBook.studyLabel과 같은 규칙 — 미리보기는 저장된 값이 아니라 넘겨받은 이름을 쓴다. */
  private fun studyLabel(name: String): String =
    if (name.endsWith(STUDY)) name else "$name $STUDY"

  // ---- 공통 그리기 -----------------------------------------------------------

  /**
   * 책 한 권을 화면에 얹는다. 이미지가 없어도 화면은 성립한다 — 배경은 밤색 단색, 표지는
   * 빈 자리로 남고 나머지 배치는 그대로다. 알람은 무슨 일이 있어도 떠야 한다.
   */
  private fun showBook(name: String, coverStyle: String, background: File, cover: File) {
    findViewById<TextView>(R.id.alarm_message).text = getString(R.string.alarm_message, name)

    setImageFromFile(R.id.alarm_background, background)
    applyCoverSize(findViewById(R.id.alarm_book), coverStyle)
    setImageFromFile(R.id.alarm_book, cover)
  }

  /**
   * 표지 자리의 크기는 표지 종류를 따라간다 — 알람용 목업은 디자인 크기 그대로,
   * 서점에서 빌려 온 납작한 표지는 비율이 달라 조금 작게 놓는다. AlarmBook 상수 주석 참고.
   */
  private fun applyCoverSize(view: ImageView, style: String) {
    val widthDp = if (style == AlarmBook.COVER_FLAT) FLAT_COVER_WIDTH_DP else MOCKUP_COVER_WIDTH_DP
    val heightDp = if (style == AlarmBook.COVER_FLAT) FLAT_COVER_HEIGHT_DP else MOCKUP_COVER_HEIGHT_DP
    view.layoutParams = view.layoutParams.apply {
      width = dp(widthDp)
      height = dp(heightDp)
    }
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  /** 파일이 없거나 읽히지 않으면 앞 책의 그림이 남지 않도록 비운다 — 미리보기에서 특히 중요하다. */
  private fun setImageFromFile(viewId: Int, file: File) {
    // decodeFile은 손상된 파일에 null을 돌려준다(예외가 아니다).
    val bitmap = if (file.exists()) BitmapFactory.decodeFile(file.absolutePath) else null
    findViewById<ImageView>(viewId).setImageBitmap(bitmap)
  }

  /**
   * 잠금화면 위에 표시하고 꺼진 화면을 켠다.
   * setShowWhenLocked/setTurnScreenOn은 API 27+ 전용이라, 그 이전 버전은 윈도우 플래그로 처리한다.
   */
  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    // 잠금화면을 해제하지는 않는다 — 사용자가 직접 풀어야 앱 내용이 보인다.
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  private fun readPreviewBooks(intent: Intent?): List<PreviewBook> {
    val names = intent?.getStringArrayListExtra(EXTRA_NAMES) ?: return emptyList()
    val coverStyles = intent.getStringArrayListExtra(EXTRA_COVER_STYLES) ?: return emptyList()
    val backgrounds = intent.getStringArrayListExtra(EXTRA_BACKGROUNDS) ?: return emptyList()
    val covers = intent.getStringArrayListExtra(EXTRA_COVERS) ?: return emptyList()

    return names.mapIndexed { index, name ->
      PreviewBook(
        name = name,
        coverStyle = coverStyles.getOrElse(index) { AlarmBook.COVER_MOCKUP },
        backgroundPath = backgrounds.getOrElse(index) { "" },
        coverPath = covers.getOrElse(index) { "" }
      )
    }
  }

  companion object {
    private const val EXTRA_NAMES = "preview_names"
    private const val EXTRA_COVER_STYLES = "preview_cover_styles"
    private const val EXTRA_BACKGROUNDS = "preview_backgrounds"
    private const val EXTRA_COVERS = "preview_covers"

    private const val STUDY = "공부"

    /** 디자인이 24시간제("07:30")다 — 앱 본문의 오전/오후 표기와는 일부러 다르게 간다. */
    private val TIME_FORMAT = SimpleDateFormat("HH:mm", Locale.KOREAN)
    private val DATE_FORMAT = SimpleDateFormat("M월 d일 EEEE", Locale.KOREAN)

    // 디자인이 3배 아트보드(469×632px) 기준이라 3으로 나눈 값이다.
    private const val MOCKUP_COVER_WIDTH_DP = 156
    private const val MOCKUP_COVER_HEIGHT_DP = 211
    private const val FLAT_COVER_WIDTH_DP = 148
    private const val FLAT_COVER_HEIGHT_DP = 219

    /**
     * 알람이 울릴 때 이 화면을 띄우는 인텐트.
     *
     * AlarmReceiver가 이걸로 직접 실행한다 — setFullScreenIntent만으로는 기기를 쓰는 중일 때
     * OS가 헤드업 알림으로 격하시켜 전체화면이 뜨지 않기 때문이다. 알라미처럼 항상 전체화면이
     * 뜨게 하려면 직접 실행해야 한다.
     */
    fun fireIntent(context: Context): Intent =
      Intent(context, AlarmActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

    /**
     * 디자인 확인용 — 넘겨받은 책들을 한 장씩 넘겨 보는 모드로 연다.
     * 경로는 file:// URI로 받아 실제 경로로 바꿔 둔다(BitmapFactory는 URI를 못 읽는다).
     */
    fun previewIntent(
      context: Context,
      names: List<String>,
      coverStyles: List<String>,
      backgroundUris: List<String>,
      coverUris: List<String>
    ): Intent = Intent(context, AlarmActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      putStringArrayListExtra(EXTRA_NAMES, ArrayList(names))
      putStringArrayListExtra(EXTRA_COVER_STYLES, ArrayList(coverStyles))
      putStringArrayListExtra(EXTRA_BACKGROUNDS, ArrayList(backgroundUris.map(::toPath)))
      putStringArrayListExtra(EXTRA_COVERS, ArrayList(coverUris.map(::toPath)))
    }

    private fun toPath(uri: String): String = Uri.parse(uri).path ?: uri
  }
}
