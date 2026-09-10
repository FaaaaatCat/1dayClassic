package expo.modules.alarmclock

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * 알람 화면의 세워 둔 책 — 앞표지를 26° 돌리고 그 왼쪽에 책등을 세운다.
 *
 * 앱(components/book/BookCover3D)과 **같은 기하**를 쓴다. 각도가 26°로 고정이라 3D 엔진이
 * 필요 없고, 그 각도에서 그렇게 보이는 네 꼭짓점을 셈해 setPolyToPoly로 앞표지를 밀어 넣는다.
 * 안드로이드의 rotationY와 Camera를 쓰지 않는 것은, 카메라 거리의 단위가 dp가 아니라
 * 원근 값(850)을 앱과 똑같이 맞추기 어렵기 때문이다. 꼭짓점을 직접 셈하면 어긋날 자리가 없다.
 *
 * ── 앱 표지와 다른 점 ──
 *
 * 앱은 짜임이 여섯(띠·라벨·괘선·세로쓰기·색면·여백)이지만 여기서는 하나만 그린다. 알람에
 * 놓이는 표지는 140dp 남짓이라 짜임의 차이가 드러나지 않는 반면, 여섯 벌을 코틀린으로
 * 옮겨 두면 앱을 고칠 때마다 두 곳이 어긋난다. 같아야 하는 것은 짜임이 아니라 **어느 책인지
 * 알아볼 수 있는가**이므로 종이색·잉크색·제목·출판사 마크를 맞추고 배치는 하나로 둔다.
 *
 * 서체도 다르다. 앱은 을유1945를 번들해 쓰지만 그 파일은 JS 쪽 에셋이라 알람이 울리는
 * 시점에 꺼내 쓸 수 없다. 시스템 명조(Typeface.SERIF)로 그린다.
 */
class AlarmCoverView @JvmOverloads constructor(
  context: Context,
  attrs: AttributeSet? = null,
  defStyle: Int = 0
) : View(context, attrs, defStyle) {

  var design: AlarmCoverDesign? = null
    set(value) {
      field = value
      invalidate()
    }

  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply { typeface = SERIF_BOLD }
  private val faint = Paint(Paint.ANTI_ALIAS_FLAG).apply { typeface = SERIF }
  private val matrix = Matrix()
  private val source = FloatArray(8)
  private val target = FloatArray(8)

  override fun onDraw(canvas: Canvas) {
    val cover = design ?: return
    if (width <= 0 || height <= 0) return

    /**
     * 앞표지 폭을 자리에 맞춘다.
     *
     * 세워 두면 폭은 조금 줄고(0.98배) 높이는 늘어난다(1.51배) — 접힘선 쪽이 눈에 가까워
     * 커지기 때문이다. 둘 다 자리 안에 들어가는 쪽으로 잡는다.
     */
    val faceW = min(width / STAGE_W_RATIO, height / STAGE_H_RATIO)
    val faceH = faceW * RATIO
    val half = faceW / 2f
    val thickness = faceW * THICKNESS

    // 26° 돌렸을 때 세 모서리의 깊이(z). 클수록 눈에 가깝다.
    val zFold = SIN * half
    val zBack = zFold - COS * thickness

    val foldX = scaleAt(zFold) * -(COS * half)
    val rightX = scaleAt(-zFold) * (COS * half)
    val backX = scaleAt(zBack) * -(COS * half + SIN * thickness)

    val spineW = foldX - backX
    val stageW = rightX - backX
    val foldHalfH = faceH / 2f * scaleAt(zFold)
    val rightHalfH = faceH / 2f * scaleAt(-zFold)
    val stageH = foldHalfH * 2f

    // 무대를 자리 한가운데에 놓는다.
    val originX = (width - stageW) / 2f
    val originY = (height - stageH) / 2f

    canvas.save()
    canvas.translate(originX, originY)

    drawSpine(canvas, cover, spineW, stageH, faceW)

    /**
     * 앞표지 — 평평한 네모를 네 꼭짓점에 맞춰 밀어 넣는다.
     *
     * 접힘선 쪽이 오른쪽보다 높은 사다리꼴이 된다. setPolyToPoly는 네 점을 받으면 원근
     * 변환까지 만들어 주므로, 그 안에서는 평면 좌표로 그리기만 하면 된다.
     */
    source[0] = 0f; source[1] = 0f
    source[2] = faceW; source[3] = 0f
    source[4] = faceW; source[5] = faceH
    source[6] = 0f; source[7] = faceH

    target[0] = spineW; target[1] = 0f
    target[2] = stageW; target[3] = foldHalfH - rightHalfH
    target[4] = stageW; target[5] = foldHalfH + rightHalfH
    target[6] = spineW; target[7] = stageH

    matrix.setPolyToPoly(source, 0, target, 0, 4)
    canvas.save()
    canvas.concat(matrix)
    drawFace(canvas, cover, faceW, faceH)
    canvas.restore()

    canvas.restore()
  }

  /**
   * 책등 — 앞표지와 같은 종이색에 rgba(0,0,0,.2) 그늘 한 겹.
   *
   * 색을 따로 정하지 않는다. 같은 색에 그늘만 지면 접힘선이 저절로 생기고, 어두운 표지는
   * 이 그늘 덕분에 오히려 낫다 — 밤 사진 위에서 경계가 살아난다.
   */
  private fun drawSpine(
    canvas: Canvas,
    cover: AlarmCoverDesign,
    spineW: Float,
    spineH: Float,
    faceW: Float
  ) {
    fill.color = cover.paper
    canvas.drawRect(0f, 0f, spineW, spineH, fill)
    fill.color = SHADE
    canvas.drawRect(0f, 0f, spineW, spineH, fill)
    if (cover.dark) {
      strokeEdge(canvas, RectF(0f, 0f, spineW, spineH))
    }

    if (spineW < SPINE_TEXT_MIN * density()) return

    val size = spineW * 0.72f
    text.color = cover.ink
    text.textSize = size
    text.textAlign = Paint.Align.CENTER

    val padding = faceW * 0.05f
    var y = padding + size
    for (letter in cover.title.replace(WHITESPACE, "")) {
      if (y > spineH - padding - spineW) break
      canvas.drawText(letter.toString(), spineW / 2f, y, text)
      y += size * 1.16f
    }

    drawMark(canvas, cover, spineW / 2f - spineW * 0.3f, spineH - padding - spineW * 0.6f, spineW * 0.6f)
  }

  /** 앞표지 — 종이 · 패턴 한 띠 · 제목 · 저자와 마크. */
  private fun drawFace(canvas: Canvas, cover: AlarmCoverDesign, w: Float, h: Float) {
    fill.color = cover.paper
    canvas.drawRect(0f, 0f, w, h, fill)
    if (cover.dark) strokeEdge(canvas, RectF(0f, 0f, w, h))

    val inset = w * INSET
    val usable = w - inset * 2f
    val footerTop = h - h * FOOTER_ZONE

    val bandBottom = drawPattern(canvas, cover, inset, usable, w, h)
    drawTitle(canvas, cover, inset, usable, w, bandBottom, footerTop)
    drawFooter(canvas, cover, inset, w, h)
  }

  /**
   * 패턴 한 띠 — 목차에서 뽑은 글자를 위쪽에 깐다.
   *
   * 이게 표지에 밀도를 준다. 22%로 두는 건 읽히자고 놓은 글이 아니기 때문이다.
   * 띠 밖으로 넘칠 글자는 아예 그리지 않는다 — 잘라 낼 방법이 없는 자리다.
   */
  private fun drawPattern(
    canvas: Canvas,
    cover: AlarmCoverDesign,
    inset: Float,
    usable: Float,
    w: Float,
    h: Float
  ): Float {
    if (cover.pattern.isEmpty()) return inset

    val size = w * PATTERN_SIZE
    val columnGap = w * 0.05f
    val rowGap = w * 0.042f
    val bandH = h * 0.22f

    faint.color = cover.ink
    faint.alpha = PATTERN_ALPHA
    faint.textSize = size
    faint.textAlign = Paint.Align.LEFT

    var x = inset
    var y = inset + size
    var index = 0
    while (y <= inset + bandH) {
      val item = cover.pattern[index % cover.pattern.size]
      val itemW = faint.measureText(item)
      if (x + itemW > inset + usable) {
        x = inset
        y += size * 1.2f + rowGap
        continue
      }
      canvas.drawText(item, x, y, faint)
      x += itemW + columnGap
      index += 1
      // 목차가 짧아도 되풀이해 채우되, 한 띠를 다 돈 뒤에는 멈춘다.
      if (index > cover.pattern.size * 8) break
    }
    faint.alpha = 255
    return y + rowGap
  }

  /** 제목 — 띠 아래와 저자 줄 위 사이에서 가운데. 자리에 들어가는 가장 큰 크기로. */
  private fun drawTitle(
    canvas: Canvas,
    cover: AlarmCoverDesign,
    inset: Float,
    usable: Float,
    w: Float,
    top: Float,
    bottom: Float
  ) {
    val room = bottom - top - w * 0.08f
    if (room <= 0f) return

    text.color = cover.ink
    text.textAlign = Paint.Align.LEFT
    // 자간을 먼저 걸어 둔다 — 재는 것과 그리는 것이 같은 조건이어야 줄 수가 어긋나지 않는다.
    text.letterSpacing = TITLE_TRACKING
    val size = fitTitle(cover.title, usable, room)
    text.textSize = size

    val lines = wrap(cover.title, usable).lines
    val leading = size * TITLE_LEADING
    var y = top + (room - lines.size * leading) / 2f + size

    for (line in lines) {
      canvas.drawText(line, inset, y, text)
      y += leading
    }
    text.letterSpacing = 0f
  }

  /** 저자와 출판사 마크. 마크는 빼지 않는다 — 이 하나가 그림을 책으로 만든다. */
  private fun drawFooter(canvas: Canvas, cover: AlarmCoverDesign, inset: Float, w: Float, h: Float) {
    faint.color = cover.ink
    faint.alpha = FOOTER_ALPHA
    faint.textAlign = Paint.Align.LEFT

    val markSize = w * 0.075f
    var y = h - inset

    if (cover.imprint.isNotEmpty()) {
      faint.textSize = w * 0.05f
      canvas.drawText(cover.imprint, inset + markSize + w * 0.035f, y, faint)
      drawMark(canvas, cover, inset, y - markSize, markSize)
      y -= markSize + w * 0.05f
    }

    if (cover.author.isNotEmpty()) {
      faint.textSize = w * 0.058f
      canvas.drawText(cover.author, inset, y, faint)
    }
    faint.alpha = 255
  }

  /** 출판사 마크 넷 — 앱의 components/book/CoverMark와 같은 도형이다. */
  private fun drawMark(canvas: Canvas, cover: AlarmCoverDesign, x: Float, y: Float, size: Float) {
    fill.color = cover.ink
    val rule = maxOf(1f, size * 0.09f)

    when (cover.mark) {
      AlarmCoverDesign.MARK_LOWLINE -> {
        val dot = size * 0.24f
        canvas.drawCircle(x + size / 2f, y + size - dot - size * 0.14f, dot / 2f, fill)
        canvas.drawRect(x, y + size - rule, x + size, y + size, fill)
      }
      AlarmCoverDesign.MARK_QUADRANT -> {
        val border = maxOf(1f, size * 0.07f)
        fill.style = Paint.Style.STROKE
        fill.strokeWidth = border
        canvas.drawRect(x + border / 2f, y + border / 2f, x + size - border / 2f, y + size - border / 2f, fill)
        fill.style = Paint.Style.FILL
        canvas.drawRect(x + border, y + border, x + size / 2f, y + size / 2f, fill)
      }
      AlarmCoverDesign.MARK_HALFMOON -> {
        canvas.drawArc(RectF(x, y + size / 2f, x + size, y + size * 1.5f), 180f, 180f, true, fill)
      }
      else -> {
        // underline — 두 줄, 그리고 그 사이.
        val gap = size * 0.26f
        val middle = y + size / 2f
        canvas.drawRect(x, middle - gap / 2f - rule, x + size, middle - gap / 2f, fill)
        canvas.drawRect(x, middle + gap / 2f, x + size, middle + gap / 2f + rule, fill)
      }
    }
  }

  /** 어두운 표지가 밤 사진 위에서 사라지지 않게 세워 두는 한 겹. */
  private fun strokeEdge(canvas: Canvas, rect: RectF) {
    fill.style = Paint.Style.STROKE
    fill.strokeWidth = 1f * density()
    fill.color = DARK_EDGE
    canvas.drawRect(rect, fill)
    fill.style = Paint.Style.FILL
  }

  /**
   * 자리에 들어가는 가장 큰 제목 크기.
   *
   * 앱은 전각·반각으로 폭을 어림하지만 여기서는 Paint가 실제로 재 준다 — 그래서 여유 폭을
   * 둘 필요가 없다. 낱말 가운데서 끊기지 않는 크기를 먼저 찾고, 그런 크기가 없을 때만
   * 가장 큰 값으로 돌아가는 것은 앱과 같다.
   */
  private fun fitTitle(title: String, maxWidth: Float, maxHeight: Float): Float {
    var fallback = 0f
    var size = maxWidth / 2f
    val floorSize = maxWidth / 12f

    while (size > floorSize) {
      text.textSize = size
      val wrapped = wrap(title, maxWidth)
      if (wrapped.lines.size * size * TITLE_LEADING <= maxHeight) {
        if (wrapped.clean) return size
        if (fallback == 0f) fallback = size
      }
      size -= 0.5f
    }
    return if (fallback > 0f) fallback else floorSize
  }

  /**
   * 지금 크기(text.textSize)로 이 폭에 어떻게 흐르는지.
   *
   * 한글·한자는 낱말 안에서도 끊기므로 글자 단위로 흘린다. clean은 넘어간 자리가 전부
   * 띄어쓰기였는지다 — 흘리면서 그 자리에서 판단해야 한다. 다 흘린 뒤에 되짚으면 줄 끝
   * 공백이 이미 잘려 나가 어디서 끊겼는지 알 수 없다.
   */
  private class Wrapped(val lines: List<String>, val clean: Boolean)

  private fun wrap(title: String, maxWidth: Float): Wrapped {
    val lines = mutableListOf<String>()
    val line = StringBuilder()
    var clean = true

    for ((index, ch) in title.withIndex()) {
      if (line.isNotEmpty() && text.measureText(line.toString() + ch) > maxWidth) {
        val atSpace = ch.isWhitespace() || title[index - 1].isWhitespace()
        if (!atSpace) clean = false
        lines.add(line.toString().trimEnd())
        line.setLength(0)
        if (ch.isWhitespace()) continue
      }
      line.append(ch)
    }
    if (line.isNotEmpty()) lines.add(line.toString().trimEnd())
    return Wrapped(if (lines.isEmpty()) listOf(title) else lines, clean)
  }

  private fun density(): Float = resources.displayMetrics.density

  private companion object {
    /** 신국판 152×225의 비율. 앱과 같은 값이다. */
    const val RATIO = 1.45f

    const val INSET = 0.09f
    const val FOOTER_ZONE = 0.2f
    const val PATTERN_SIZE = 0.062f
    const val THICKNESS = 0.22f
    const val PERSPECTIVE = 850f
    const val TITLE_LEADING = 1.15f
    const val TITLE_TRACKING = 0.02f

    /** 이보다 좁은 책등에는 글자를 넣지 않는다(dp). 획이 뭉쳐 얼룩으로만 보인다. */
    const val SPINE_TEXT_MIN = 8f

    const val PATTERN_ALPHA = 56 // 22%
    const val FOOTER_ALPHA = 173 // 68%

    val SHADE: Int = Color.argb(51, 0, 0, 0) // rgba(0,0,0,.2)
    val DARK_EDGE: Int = Color.argb(41, 255, 255, 255) // rgba(255,255,255,.16)

    val SERIF: Typeface = Typeface.SERIF
    val SERIF_BOLD: Typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)

    val WHITESPACE = Regex("\\s+")

    val RADIANS = Math.toRadians(26.0)
    val COS = cos(RADIANS).toFloat()
    val SIN = sin(RADIANS).toFloat()

    /** 세워 두면 폭은 이만큼으로 줄고 높이는 이만큼 늘어난다 — 위 기하에서 나온 값이다. */
    const val STAGE_W_RATIO = 0.9796f
    const val STAGE_H_RATIO = 1.5124f

    fun scaleAt(z: Float): Float = PERSPECTIVE / (PERSPECTIVE - z)
  }
}
