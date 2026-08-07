package expo.modules.alarmclock

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AlarmClock")

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
        "fullScreenIntent" to hasFullScreenIntentPermission()
      )
    }

    AsyncFunction("openAlarmPermissionSettings") {
      val intent = when {
        !hasExactAlarmPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:${context.packageName}"))

        !hasFullScreenIntentPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(Uri.parse("package:${context.packageName}"))

        else ->
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:${context.packageName}"))
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  private fun hasNotificationPermission(): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.areNotificationsEnabled()
  }

  private fun hasExactAlarmPermission(): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return AlarmScheduler.canScheduleExact(alarmManager)
  }

  /** Android 14부터 사용자가 끄고 켤 수 있다. 그 이전 버전은 항상 허용. */
  private fun hasFullScreenIntentPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.canUseFullScreenIntent()
  }
}
