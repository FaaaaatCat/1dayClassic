package expo.modules.alarmclock

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmInput : Record {
  @Field val hour: Int = 7
  @Field val minute: Int = 0
  @Field val repeatDays: List<Boolean> = List(7) { false }
  @Field val sound: String = "default"
  @Field val enabled: Boolean = true
}

/** 디자인 확인용 미리보기에 넘길 책 한 권. 이미지는 JS가 미리 파일로 깔아 두고 경로만 넘긴다. */
class AlarmPreviewBook : Record {
  @Field val name: String = ""
  @Field val coverStyle: String = "mockup"
  @Field val backgroundUri: String = ""
  @Field val coverUri: String = ""
}

class AlarmClockModule : Module() {
  private companion object {
    const val TAG = "AlarmClock"
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AlarmClock")

    Events("onAlarmLockFlowChanged")

    /** 지금 잠금화면 위 알람 플로우인가. */
    AsyncFunction("isAlarmLockFlow") { AlarmFlow.isActive }

    OnStartObserving {
      AlarmFlow.observe { active ->
        sendEvent("onAlarmLockFlowChanged", mapOf("active" to active))
      }
    }

    OnStopObserving { AlarmFlow.observe(null) }

    AsyncFunction("scheduleAlarm") { input: AlarmInput ->
      AlarmPrefs.save(
        context,
        AlarmConfig(
          enabled = input.enabled,
          hour = input.hour,
          minute = input.minute,
          repeatDays = input.repeatDays,
          sound = input.sound
        )
      )
      // 기존 스누즈 예약이 남아 있으면 새 설정과 충돌하므로 함께 정리한다.
      AlarmScheduler.cancelAll(context)
      AlarmScheduler.scheduleNextWeeklyAlarm(context)
    }

    /**
     * 알람 화면이 보여 줄 책 이름과 표지 종류. 서점에서 책을 고를 때마다 JS가 밀어 준다 —
     * 알람이 울릴 때는 JS가 안 돌고 있어서 그때 물어볼 수 없다.
     * coverStyle은 AlarmBook.COVER_MOCKUP / COVER_FLAT 중 하나다.
     */
    AsyncFunction("setAlarmBook") { name: String, coverStyle: String ->
      AlarmBook.save(context, name, coverStyle)
    }

    /**
     * JS가 책 이미지를 복사해 넣을 자리. 경로를 JS가 조립하지 않게 네이티브가 알려 준다 —
     * 저장 위치는 알람 화면 사정이지 JS가 알아야 할 일이 아니다.
     */
    AsyncFunction("getAlarmImageTargets") {
      mapOf(
        "directory" to Uri.fromFile(AlarmBook.dir(context)).toString(),
        "background" to Uri.fromFile(AlarmBook.backgroundFile(context)).toString(),
        "cover" to Uri.fromFile(AlarmBook.coverFile(context)).toString()
      )
    }

    /**
     * 설정의 '알람 테스트' — 실제 알람 화면을 그대로 띄워 책마다 어떻게 보이는지 확인한다.
     * 소리·진동·버튼 동작은 없고, 화면을 누르면 다음 책으로 넘어간다.
     */
    AsyncFunction("previewAlarm") { books: List<AlarmPreviewBook> ->
      if (books.isEmpty()) return@AsyncFunction
      context.startActivity(
        AlarmActivity.previewIntent(
          context,
          names = books.map { it.name },
          coverStyles = books.map { it.coverStyle },
          backgroundUris = books.map { it.backgroundUri },
          coverUris = books.map { it.coverUri }
        )
      )
    }

    AsyncFunction("cancelAlarm") {
      val current = AlarmPrefs.load(context)
      AlarmPrefs.save(context, current.copy(enabled = false))
      AlarmScheduler.cancelAll(context)
    }

    AsyncFunction("getPermissionStatus") {
      mapOf(
        "notifications" to hasNotificationPermission(),
        "exactAlarm" to hasExactAlarmPermission(),
        "fullScreenIntent" to hasFullScreenIntentPermission(),
        "overlay" to hasOverlayPermission()
      )
    }

    /** 설정 화면의 권한 토글이 쓴다. */
    AsyncFunction("requestPermission") { kind: String -> requestPermission(kind) }

    /**
     * 첫 실행 안내의 '설정 열기' — 부족한 권한 중 가장 급한 것 하나로 보낸다.
     *
     * 한 번에 하나만 보낼 수 있어서(설정 화면이 권한마다 다르다) 순서가 곧 우선순위다.
     * 나머지는 설정 탭의 권한 카드에서 마저 켜게 된다.
     */
    AsyncFunction("openAlarmPermissionSettings") {
      val missing = MISSING_FIRST.firstOrNull { !isGranted(it) }
      if (missing != null) {
        requestPermission(missing)
      } else {
        openSettings(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      }
    }
  }

  /**
   * 안내 우선순위. 앞쪽일수록 없을 때 알람이 크게 망가진다.
   *
   * 오버레이가 마지막인 이유 — 이게 없어도 알람은 울리고 잠금 상태에서는 전체화면도 뜬다.
   * 기기를 쓰는 중에 전체화면으로 깨우는 것만 안 된다.
   */
  private val MISSING_FIRST = listOf("notifications", "exactAlarm", "fullScreenIntent", "overlay")

  private fun isGranted(kind: String): Boolean = when (kind) {
    "notifications" -> hasNotificationPermission()
    "exactAlarm" -> hasExactAlarmPermission()
    "fullScreenIntent" -> hasFullScreenIntentPermission()
    "overlay" -> hasOverlayPermission()
    else -> true
  }

  /**
   * 권한 하나를 요청한다.
   *
   * 알림만 진짜 시스템 팝업을 띄울 수 있다. 나머지 셋은 Android가 요청 API를 제공하지
   * 않아서 해당 권한의 시스템 설정 화면을 여는 것이 앱이 할 수 있는 전부다.
   */
  private fun requestPermission(kind: String) {
    when (kind) {
      "notifications" -> requestNotificationPermission()
      "exactAlarm" -> openSettings(
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
        } else {
          Settings.ACTION_APPLICATION_DETAILS_SETTINGS
        }
      )
      "fullScreenIntent" -> openSettings(
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
          Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT
        } else {
          Settings.ACTION_APPLICATION_DETAILS_SETTINGS
        }
      )
      "overlay" -> openSettings(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
      else -> Log.w(TAG, "알 수 없는 권한 종류: $kind")
    }
  }

  /** 해당 권한의 시스템 설정 화면을 연다. package: URI를 붙여 우리 앱 항목으로 바로 간다. */
  private fun openSettings(action: String) {
    val intent = Intent(action)
      .setData(Uri.parse("package:${context.packageName}"))
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  /**
   * 알림 권한 — 넷 중 유일하게 시스템 팝업을 띄울 수 있다(Android 13+의 런타임 권한).
   *
   * 사용자가 이미 두 번 거부했으면 Android가 팝업을 더 이상 띄우지 않는다. 그 경우 아무
   * 일도 일어나지 않으면 토글이 고장 난 것처럼 보이므로, 액티비티가 없거나 팝업을 띄울 수
   * 없는 상황에서는 알림 설정 화면으로 보낸다.
   */
  private fun requestNotificationPermission() {
    val activity = appContext.currentActivity
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && activity != null) {
      activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0)
      return
    }
    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
      .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  private fun hasNotificationPermission(): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.areNotificationsEnabled()
  }

  private fun hasExactAlarmPermission(): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return AlarmScheduler.canScheduleExact(alarmManager)
  }

  /**
   * '다른 앱 위에 표시' — 기기를 쓰는 중에도 전체화면 알람을 띄우려면 필요하다.
   *
   * Android는 백그라운드에서의 액티비티 실행을 막는데(BAL), 앱이 보이는 오버레이 창을
   * 가질 수 있으면 예외로 허용한다(BAL_ALLOW_NON_APP_VISIBLE_WINDOW). 이게 없으면
   * AlarmReceiver의 직접 실행이 BAL_BLOCK 되고 헤드업 알림으로만 남는다 — 실측 확인.
   */
  private fun hasOverlayPermission(): Boolean = Settings.canDrawOverlays(context)

  /** Android 14부터 사용자가 끄고 켤 수 있다. 그 이전 버전은 항상 허용. */
  private fun hasFullScreenIntentPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.canUseFullScreenIntent()
  }
}
